import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminSourceCropBox,
  AdminSourceCropStatus,
  AdminSourceWorkbenchCrop,
  AdminSourceWorkbenchSourceDetail,
  AdminSourceWorkbenchSourceSummary,
  UpdateAdminSourceCropRequest,
} from '@bac-bank/contracts/admin';
import { existsSync, type Dirent } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import {
  dirname,
  extname,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from 'node:path';
import sharp from 'sharp';
import type {
  SourceCropManifest,
  SourceCropRecord,
  SourceFrontmatter,
} from './source-workbench.types';

const SOURCE_WORKBENCH_ROOT_ENV = 'BAC_THEORY_CONTENT_SOURCES_ROOT';
const CROPS_FILE_NAME = 'crops.json';
const EXTRACTED_FILE_NAME = 'extracted.md';
const DEFAULT_CROP_STATUS: AdminSourceCropStatus = 'needs-review';

@Injectable()
export class SourceWorkbenchService {
  private readonly sourcesRoot = this.resolveSourcesRoot();

  async listSources() {
    const sourceDirs = await this.findSourceDirs(this.sourcesRoot);
    const summaries = await Promise.all(
      sourceDirs.map((sourceDir) => this.buildSourceSummary(sourceDir)),
    );

    return summaries.sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath, 'en'),
    );
  }

  async getSource(sourceId: string): Promise<AdminSourceWorkbenchSourceDetail> {
    const sourceDir = await this.resolveSourceDir(sourceId);
    await this.assertFileExists(join(sourceDir, EXTRACTED_FILE_NAME));
    await this.assertFileExists(join(sourceDir, CROPS_FILE_NAME));

    const [summary, markdown, crops] = await Promise.all([
      this.buildSourceSummary(sourceDir),
      readFile(join(sourceDir, EXTRACTED_FILE_NAME), 'utf8'),
      this.readWorkbenchCrops(sourceDir),
    ]);

    return {
      source: summary,
      markdown,
      crops,
    };
  }

  async getAsset(sourceId: string, assetPath: string) {
    const sourceDir = await this.resolveSourceDir(sourceId);
    const absolutePath = this.resolveInside(sourceDir, assetPath);
    await this.assertFileExists(absolutePath);

    return {
      data: await readFile(absolutePath),
      mimeType: this.resolveMimeType(absolutePath),
      fileName: assetPath.split('/').pop() ?? 'source-asset',
    };
  }

  async updateCrop(
    sourceId: string,
    cropId: string,
    payload: UpdateAdminSourceCropRequest,
  ) {
    const sourceDir = await this.resolveSourceDir(sourceId);
    const manifestPath = join(sourceDir, CROPS_FILE_NAME);
    const manifest = await this.readManifest(manifestPath);
    const normalizedCrops = this.normalizeCropRecords(manifest.crops);
    const cropIndex = normalizedCrops.findIndex((crop) => crop.id === cropId);

    if (cropIndex === -1) {
      throw new NotFoundException(`Crop "${cropId}" was not found.`);
    }

    const crop = normalizedCrops[cropIndex];
    const sourceImagePath = this.resolveInside(sourceDir, crop.source);
    const sourceMetadata = await sharp(sourceImagePath).metadata();

    if (!sourceMetadata.width || !sourceMetadata.height) {
      throw new BadRequestException('Source image dimensions are unavailable.');
    }

    const clampedBox = this.clampCropBox(
      payload.box,
      sourceMetadata.width,
      sourceMetadata.height,
    );
    const updatedCrop = {
      ...crop,
      box: clampedBox,
      status: payload.status ?? crop.status ?? DEFAULT_CROP_STATUS,
      notes: payload.notes === undefined ? (crop.notes ?? null) : payload.notes,
    };
    normalizedCrops[cropIndex] = updatedCrop;

    const nextManifest: SourceCropManifest = {
      ...manifest,
      crops: normalizedCrops,
    };

    await this.regenerateCropAsset(sourceDir, updatedCrop, clampedBox);
    await this.writeManifest(manifestPath, nextManifest);

    const source = await this.getSource(sourceId);
    const updatedWorkbenchCrop = source.crops.find(
      (sourceCrop) => sourceCrop.id === cropId,
    );

    if (!updatedWorkbenchCrop) {
      throw new InternalServerErrorException('Updated crop disappeared.');
    }

    return {
      source,
      crop: updatedWorkbenchCrop,
    };
  }

  encodeSourceId(relativePath: string) {
    return Buffer.from(relativePath, 'utf8').toString('base64url');
  }

  private async buildSourceSummary(
    sourceDir: string,
  ): Promise<AdminSourceWorkbenchSourceSummary> {
    const relativePath = this.toSourceRelativePath(sourceDir);
    const [markdown, crops, sourceStat] = await Promise.all([
      readFile(join(sourceDir, EXTRACTED_FILE_NAME), 'utf8').catch(() => ''),
      this.readManifest(join(sourceDir, CROPS_FILE_NAME)).catch(
        () =>
          ({
            crops: [],
          }) as SourceCropManifest,
      ),
      stat(sourceDir).catch(() => null),
    ]);
    const frontmatter = this.readFrontmatter(markdown);
    const normalizedCrops = this.normalizeCropRecords(crops.crops);
    const reviewCounts = this.buildReviewCounts(normalizedCrops);

    return {
      id: this.encodeSourceId(relativePath),
      title: this.buildSourceTitle(frontmatter, relativePath),
      relativePath,
      subject: frontmatter.subject,
      subjectCode: frontmatter.subjectCode,
      streams: frontmatter.streams,
      unit: frontmatter.unit,
      topicCode: frontmatter.topicCode,
      source: frontmatter.source,
      sourceSection: frontmatter.sourceSection,
      cropCount: normalizedCrops.length,
      reviewCounts,
      updatedAt: sourceStat?.mtime ? sourceStat.mtime.toISOString() : null,
    };
  }

  private async readWorkbenchCrops(sourceDir: string) {
    const manifest = await this.readManifest(join(sourceDir, CROPS_FILE_NAME));
    const crops = this.normalizeCropRecords(manifest.crops);
    const dimensionsBySource = new Map<
      string,
      AdminSourceWorkbenchCrop['sourceDimensions']
    >();

    return Promise.all(
      crops.map(async (crop) => {
        let sourceDimensions = dimensionsBySource.get(crop.source);

        if (sourceDimensions === undefined) {
          sourceDimensions = await this.readImageDimensions(
            this.resolveInside(sourceDir, crop.source),
          );
          dimensionsBySource.set(crop.source, sourceDimensions);
        }

        const assetPath = this.resolveInside(sourceDir, crop.asset);
        const assetStat = await stat(assetPath).catch(() => null);

        return {
          id: crop.id,
          source: crop.source,
          asset: crop.asset,
          caption: crop.caption ?? null,
          status: crop.status ?? DEFAULT_CROP_STATUS,
          notes: crop.notes ?? null,
          box: this.resolveWorkbenchCropBox(crop.box, sourceDimensions),
          sourceDimensions,
          assetUpdatedAt: assetStat?.mtime
            ? assetStat.mtime.toISOString()
            : null,
        } satisfies AdminSourceWorkbenchCrop;
      }),
    );
  }

  private async regenerateCropAsset(
    sourceDir: string,
    crop: SourceCropRecord,
    box: AdminSourceCropBox,
  ) {
    const sourcePath = this.resolveInside(sourceDir, crop.source);
    const assetPath = this.resolveInside(sourceDir, crop.asset);
    await mkdir(dirname(assetPath), { recursive: true });

    await sharp(sourcePath)
      .extract({
        left: Math.round(box.x),
        top: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      })
      .jpeg({ quality: 95 })
      .toFile(assetPath);
  }

  private normalizeCropRecords(crops: SourceCropRecord[]) {
    const usedIds = new Set<string>();

    return crops.map((crop) => {
      const baseId = this.normalizeCropId(crop.id ?? crop.asset);
      const id = this.dedupeCropId(baseId, usedIds);

      return {
        ...crop,
        id,
        status: crop.status ?? DEFAULT_CROP_STATUS,
        notes: crop.notes ?? null,
        caption: crop.caption ?? null,
        box: this.isCropBox(crop.box) ? this.roundCropBox(crop.box) : undefined,
      };
    });
  }

  private resolveWorkbenchCropBox(
    box: AdminSourceCropBox | undefined,
    sourceDimensions: AdminSourceWorkbenchCrop['sourceDimensions'],
  ) {
    if (this.isCropBox(box)) {
      return this.roundCropBox(box);
    }

    if (sourceDimensions) {
      return {
        x: 0,
        y: 0,
        width: sourceDimensions.width,
        height: sourceDimensions.height,
      };
    }

    return {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
  }

  private isCropBox(value: unknown): value is AdminSourceCropBox {
    return (
      this.isRecord(value) &&
      typeof value.x === 'number' &&
      typeof value.y === 'number' &&
      typeof value.width === 'number' &&
      typeof value.height === 'number'
    );
  }

  private normalizeCropId(value: string) {
    const withoutExtension = value
      .replace(/^assets\//, '')
      .replace(/\.[a-z0-9]+$/i, '');
    const normalized = withoutExtension
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || `crop-${Date.now()}`;
  }

  private dedupeCropId(baseId: string, usedIds: Set<string>) {
    let id = baseId;
    let index = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${index}`;
      index += 1;
    }

    usedIds.add(id);
    return id;
  }

  private clampCropBox(
    box: AdminSourceCropBox,
    sourceWidth: number,
    sourceHeight: number,
  ) {
    const x = this.clamp(Math.round(box.x), 0, sourceWidth - 1);
    const y = this.clamp(Math.round(box.y), 0, sourceHeight - 1);
    const width = this.clamp(Math.round(box.width), 1, sourceWidth - x);
    const height = this.clamp(Math.round(box.height), 1, sourceHeight - y);

    return { x, y, width, height };
  }

  private roundCropBox(box: AdminSourceCropBox) {
    return {
      x: Math.max(0, Math.round(box.x)),
      y: Math.max(0, Math.round(box.y)),
      width: Math.max(1, Math.round(box.width)),
      height: Math.max(1, Math.round(box.height)),
    };
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  private async readImageDimensions(absolutePath: string) {
    const metadata = await sharp(absolutePath)
      .metadata()
      .catch(() => null);

    if (!metadata?.width || !metadata.height) {
      return null;
    }

    return {
      width: metadata.width,
      height: metadata.height,
    };
  }

  private async readManifest(path: string): Promise<SourceCropManifest> {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;

    if (!this.isRecord(parsed) || !Array.isArray(parsed.crops)) {
      throw new BadRequestException('Invalid crops.json manifest.');
    }

    return parsed as SourceCropManifest;
  }

  private async writeManifest(path: string, manifest: SourceCropManifest) {
    const tempPath = `${path}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await rename(tempPath, path);
  }

  private readFrontmatter(markdown: string): SourceFrontmatter {
    const fallback: SourceFrontmatter = {
      subject: null,
      subjectCode: null,
      streams: [],
      unit: null,
      topicCode: null,
      source: null,
      sourceSection: null,
    };

    if (!markdown.startsWith('---')) {
      return fallback;
    }

    const endIndex = markdown.indexOf('\n---', 3);

    if (endIndex === -1) {
      return fallback;
    }

    const lines = markdown.slice(3, endIndex).split(/\r?\n/);
    const frontmatter = { ...fallback };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const keyValue = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);

      if (!keyValue) {
        continue;
      }

      const [, key, rawValue] = keyValue;

      if (key === 'streams') {
        frontmatter.streams = this.readYamlList(lines, index + 1);
        continue;
      }

      const value = rawValue.trim().replace(/^"|"$/g, '');

      if (key === 'subject') frontmatter.subject = value || null;
      if (key === 'subjectCode') frontmatter.subjectCode = value || null;
      if (key === 'unit') frontmatter.unit = value || null;
      if (key === 'topicCode') frontmatter.topicCode = value || null;
      if (key === 'source') frontmatter.source = value || null;
      if (key === 'sourceSection') frontmatter.sourceSection = value || null;
    }

    return frontmatter;
  }

  private readYamlList(lines: string[], startIndex: number) {
    const values: string[] = [];

    for (let index = startIndex; index < lines.length; index += 1) {
      const match = lines[index].match(/^\s*-\s*(.+)$/);

      if (!match) {
        break;
      }

      values.push(match[1].trim().replace(/^"|"$/g, ''));
    }

    return values;
  }

  private buildSourceTitle(
    frontmatter: SourceFrontmatter,
    relativePath: string,
  ) {
    if (frontmatter.unit && frontmatter.source) {
      return `${frontmatter.unit} · ${frontmatter.source}`;
    }

    if (frontmatter.unit) {
      return frontmatter.unit;
    }

    return relativePath.split('/').at(-1) ?? relativePath;
  }

  private buildReviewCounts(crops: SourceCropRecord[]) {
    return crops.reduce(
      (counts, crop) => {
        counts[crop.status ?? DEFAULT_CROP_STATUS] += 1;
        return counts;
      },
      {
        'needs-review': 0,
        reviewed: 0,
        approved: 0,
      } satisfies Record<AdminSourceCropStatus, number>,
    );
  }

  private async findSourceDirs(root: string): Promise<string[]> {
    const found: string[] = [];

    async function walk(directory: string) {
      const entries: Dirent[] = await readdir(directory, {
        withFileTypes: true,
      }).catch((): Dirent[] => []);
      const names = new Set(entries.map((entry) => entry.name));

      if (names.has(EXTRACTED_FILE_NAME) && names.has(CROPS_FILE_NAME)) {
        found.push(directory);
        return;
      }

      await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => walk(join(directory, entry.name))),
      );
    }

    await walk(root);
    return found;
  }

  private resolveSourcesRoot() {
    const configured = process.env[SOURCE_WORKBENCH_ROOT_ENV];

    if (configured?.trim()) {
      return resolve(configured.trim());
    }

    let current = process.cwd();

    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = join(current, 'bac_theory_content', 'sources');

      try {
        if (!existsSync(candidate)) {
          throw new Error('not found');
        }
        return candidate;
      } catch {
        const parent = resolve(current, '..');

        if (parent === current) {
          break;
        }

        current = parent;
      }
    }

    return resolve(process.cwd(), 'bac_theory_content', 'sources');
  }

  private async resolveSourceDir(sourceId: string) {
    if (!/^[A-Za-z0-9_-]+$/.test(sourceId)) {
      throw new BadRequestException('Invalid source id.');
    }

    let decoded: string;

    try {
      decoded = Buffer.from(sourceId, 'base64url').toString('utf8');
    } catch {
      throw new BadRequestException('Invalid source id.');
    }

    const directSourceDir = this.resolveInside(this.sourcesRoot, decoded);

    if (await this.isSourceDir(directSourceDir)) {
      return directSourceDir;
    }

    const sourceDirs = await this.findSourceDirs(this.sourcesRoot);
    const matchedSourceDir = sourceDirs.find(
      (sourceDir) =>
        this.encodeSourceId(this.toSourceRelativePath(sourceDir)) === sourceId,
    );

    if (!matchedSourceDir) {
      throw new NotFoundException('Source workbench source was not found.');
    }

    return matchedSourceDir;
  }

  private resolveInside(root: string, requestedPath: string) {
    const normalized = normalize(requestedPath);

    if (
      normalized.startsWith('..') ||
      normalized.includes(`${sep}..${sep}`) ||
      normalized === '..'
    ) {
      throw new BadRequestException('Path traversal is not allowed.');
    }

    const absolutePath = resolve(root, normalized);
    const relativePath = relative(root, absolutePath);

    if (
      relativePath.startsWith('..') ||
      relativePath === '' ||
      resolve(root, relativePath) !== absolutePath
    ) {
      throw new BadRequestException('Path is outside the source workbench.');
    }

    return absolutePath;
  }

  private toSourceRelativePath(sourceDir: string) {
    return relative(this.sourcesRoot, sourceDir).split(sep).join('/');
  }

  private async assertFileExists(path: string) {
    const fileStat = await stat(path).catch(() => null);

    if (!fileStat?.isFile()) {
      throw new NotFoundException('Source workbench file was not found.');
    }
  }

  private async isSourceDir(sourceDir: string) {
    const [markdown, crops] = await Promise.all([
      stat(join(sourceDir, EXTRACTED_FILE_NAME)).catch(() => null),
      stat(join(sourceDir, CROPS_FILE_NAME)).catch(() => null),
    ]);

    return Boolean(markdown?.isFile() && crops?.isFile());
  }

  private resolveMimeType(path: string) {
    const extension = extname(path).toLowerCase();

    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    if (extension === '.png') return 'image/png';
    if (extension === '.webp') return 'image/webp';
    if (extension === '.md') return 'text/markdown; charset=utf-8';
    if (extension === '.json') return 'application/json; charset=utf-8';

    return 'application/octet-stream';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
