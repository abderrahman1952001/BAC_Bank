import { dirname, relative, sep } from 'node:path';
import type {
  CourseConceptVisual,
  CourseConceptVisualAsset,
} from '@bac-bank/contracts/courses';
import type {
  CourseBlueprint,
  CourseBlueprintVisualStyle,
} from './course-blueprint';

export type CourseVisualAssetJob = {
  id: string;
  conceptSlug: string;
  stepId: string;
  visualTitle: string;
  prompt: string;
  assetPath: string;
  assetUrl: string;
  status: CourseConceptVisualAsset['status'];
  model: string;
  width: number;
  height: number;
};

export type CourseVisualAssetPlan = {
  updatedBlueprint: CourseBlueprint;
  jobs: CourseVisualAssetJob[];
};

export function buildCourseVisualAssetPlan(input: {
  blueprint: CourseBlueprint;
  courseFilePath: string;
  canonicalRootDir: string;
  limit?: number;
  force?: boolean;
  includeExistingPending?: boolean;
}): CourseVisualAssetPlan {
  const updatedBlueprint = cloneBlueprint(input.blueprint);
  const jobs: CourseVisualAssetJob[] = [];
  const courseDir = dirname(input.courseFilePath);
  const courseRoutePrefix = normalizeRoutePath(
    relative(input.canonicalRootDir, courseDir),
  );
  const limit = input.limit ?? Number.POSITIVE_INFINITY;

  for (const concept of updatedBlueprint.concepts) {
    if (concept.quality !== 'POLISHED') {
      continue;
    }

    for (const step of concept.steps) {
      if (!step.visual) {
        continue;
      }

      if (step.visual.asset && !input.force) {
        if (
          input.includeExistingPending &&
          step.visual.asset.status === 'PENDING'
        ) {
          jobs.push(
            buildAssetJob({
              blueprint: updatedBlueprint,
              conceptSlug: concept.slug,
              stepId: step.id,
              visual: step.visual,
              asset: step.visual.asset,
            }),
          );

          if (jobs.length >= limit) {
            return { updatedBlueprint, jobs };
          }
        }

        continue;
      }

      const assetPath = buildAssetPath(concept.slug, step.id);
      const assetUrl = `/api/course-assets/${courseRoutePrefix}/${assetPath}`;
      const asset = buildPendingAsset({
        assetPath,
        assetUrl,
        model: updatedBlueprint.visualStyle.imageModel,
      });

      step.visual.asset = asset;
      jobs.push(
        buildAssetJob({
          blueprint: updatedBlueprint,
          conceptSlug: concept.slug,
          stepId: step.id,
          visual: step.visual,
          asset,
        }),
      );

      if (jobs.length >= limit) {
        return { updatedBlueprint, jobs };
      }
    }
  }

  return { updatedBlueprint, jobs };
}

function cloneBlueprint(blueprint: CourseBlueprint): CourseBlueprint {
  return JSON.parse(JSON.stringify(blueprint)) as CourseBlueprint;
}

function buildPendingAsset(input: {
  assetPath: string;
  assetUrl: string;
  model: string;
}): CourseConceptVisualAsset {
  return {
    status: 'PENDING',
    path: input.assetPath,
    url: input.assetUrl,
    mimeType: 'image/png',
    width: 1536,
    height: 1024,
    model: input.model,
    generatedAt: null,
    reviewStatus: 'UNREVIEWED',
  };
}

function buildAssetJob(input: {
  blueprint: CourseBlueprint;
  conceptSlug: string;
  stepId: string;
  visual: CourseConceptVisual;
  asset: CourseConceptVisualAsset;
}): CourseVisualAssetJob {
  return {
    id: `${input.blueprint.id}:${input.conceptSlug}:${input.stepId}`,
    conceptSlug: input.conceptSlug,
    stepId: input.stepId,
    visualTitle: input.visual.title,
    prompt: buildCourseVisualGenerationPrompt(
      input.blueprint.visualStyle,
      input.visual.prompt,
    ),
    assetPath: input.asset.path,
    assetUrl: input.asset.url,
    status: input.asset.status,
    model: input.asset.model,
    width: input.asset.width,
    height: input.asset.height,
  };
}

function buildAssetPath(conceptSlug: string, stepId: string) {
  return [
    'assets',
    'generated',
    sanitizePathSegment(conceptSlug),
    `${sanitizePathSegment(stepId)}.png`,
  ].join('/');
}

function normalizeRoutePath(path: string) {
  return path.split(sep).filter(Boolean).join('/');
}

function sanitizePathSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function collectGeneratedVisualAssets(blueprint: CourseBlueprint) {
  const assets: Array<{
    conceptSlug: string;
    stepId: string;
    visual: CourseConceptVisual;
  }> = [];

  for (const concept of blueprint.concepts) {
    for (const step of concept.steps) {
      if (step.visual?.asset) {
        assets.push({
          conceptSlug: concept.slug,
          stepId: step.id,
          visual: step.visual,
        });
      }
    }
  }

  return assets;
}

export function buildCourseVisualGenerationPrompt(
  visualStyle: CourseBlueprintVisualStyle,
  visualPrompt: string,
) {
  const prompt = visualPrompt.trim();
  const prefix = visualStyle.promptPrefix.trim();

  return [
    prompt.startsWith(prefix) ? null : prefix,
    prompt,
    `Avoid: ${visualStyle.negativePrompt.trim()}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildCourseVisualLocalSvg(input: {
  visualStyle: CourseBlueprintVisualStyle;
  visual: CourseConceptVisual;
  asset: CourseConceptVisualAsset;
  variantIndex?: number;
}) {
  const width = input.asset.width;
  const height = input.asset.height;
  const variantIndex = input.variantIndex ?? 0;
  const palette = resolveVisualPalette(variantIndex);
  const labels = extractArabicLabels(
    [input.visual.prompt, input.visual.description, input.visual.title].join(
      ' ',
    ),
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(input.visual.altText)}">`,
    '<defs>',
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#08111f"/><stop offset="0.55" stop-color="#0f172a"/><stop offset="1" stop-color="#111827"/></linearGradient>`,
    `<linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.primary}"/><stop offset="1" stop-color="${palette.secondary}"/></linearGradient>`,
    '<filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#020617" flood-opacity="0.45"/></filter>',
    '<pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M 64 0 L 0 0 0 64" fill="none" stroke="#ffffff" stroke-opacity="0.045" stroke-width="1"/></pattern>',
    '</defs>',
    '<rect width="100%" height="100%" fill="url(#bg)"/>',
    '<rect width="100%" height="100%" fill="url(#grid)"/>',
    '<path d="M92 804 C310 620 468 746 654 548 C842 346 1048 426 1392 190" fill="none" stroke="url(#accent)" stroke-opacity="0.14" stroke-width="38" stroke-linecap="round"/>',
    renderLocalVisualBody(input.visual.kind, labels, palette, width, height),
    renderLocalVisualHeader(input.visual.title, input.visual.description),
    renderLocalVisualFooter(input.visual.kind, input.visualStyle.name, palette),
    '</svg>',
  ].join('');
}

function renderLocalVisualHeader(title: string, description: string) {
  const titleLines = wrapText(title, 24, 2);
  const descriptionLines = wrapText(description, 56, 2);

  return [
    '<g font-family="Noto Sans Arabic, DejaVu Sans, Arial, sans-serif">',
    ...titleLines.map(
      (line, index) =>
        `<text x="92" y="${132 + index * 74}" text-anchor="start" fill="#f8fafc" font-size="64" font-weight="800">${escapeXml(line)}</text>`,
    ),
    ...descriptionLines.map(
      (line, index) =>
        `<text x="92" y="${278 + index * 42}" text-anchor="start" fill="#cbd5e1" font-size="32" font-weight="500">${escapeXml(line)}</text>`,
    ),
    '</g>',
  ].join('');
}

function renderLocalVisualFooter(
  kind: CourseConceptVisual['kind'],
  styleName: string,
  palette: VisualPalette,
) {
  return [
    '<g font-family="Inter, Noto Sans Arabic, DejaVu Sans, Arial, sans-serif">',
    `<rect x="92" y="856" width="328" height="72" rx="24" fill="${palette.primary}" fill-opacity="0.16" stroke="${palette.primary}" stroke-opacity="0.42"/>`,
    `<text x="256" y="902" text-anchor="middle" fill="${palette.primary}" font-size="26" font-weight="800">${escapeXml(kind)}</text>`,
    '<text x="92" y="958" fill="#94a3b8" font-size="24" font-weight="600">BAC Bank canonical visual · generated locally</text>',
    `<text x="1444" y="958" text-anchor="end" fill="#64748b" font-size="22" font-weight="600">${escapeXml(styleName)}</text>`,
    '</g>',
  ].join('');
}

function renderLocalVisualBody(
  kind: CourseConceptVisual['kind'],
  labels: string[],
  palette: VisualPalette,
  width: number,
  height: number,
) {
  switch (kind) {
    case 'COMPARISON':
      return renderComparisonBody(labels, palette);
    case 'SEQUENCE':
      return renderSequenceBody(labels, palette);
    case 'GRAPH':
      return renderGraphBody(labels, palette);
    case 'IMAGE':
    case 'DIAGRAM':
    default:
      return renderDiagramBody(labels, palette, width, height);
  }
}

function renderComparisonBody(labels: string[], palette: VisualPalette) {
  const panelLabels = resolveLabels(labels, [
    'نقطة البداية',
    'قاعدة الحركة',
    'النتيجة',
  ]);
  const panelWidth = 356;
  const panelGap = 36;
  const startX = 126;

  return [
    '<g font-family="Noto Sans Arabic, DejaVu Sans, Arial, sans-serif" direction="rtl">',
    ...panelLabels.slice(0, 3).map((label, index) => {
      const x = startX + index * (panelWidth + panelGap);
      const tone =
        index === 1
          ? palette.primary
          : index === 2
            ? palette.secondary
            : '#38bdf8';
      return [
        `<rect x="${x}" y="386" width="${panelWidth}" height="310" rx="34" fill="#0f172a" stroke="${tone}" stroke-opacity="0.48" filter="url(#softShadow)"/>`,
        `<circle cx="${x + panelWidth / 2}" cy="484" r="48" fill="${tone}" fill-opacity="0.18" stroke="${tone}" stroke-opacity="0.65" stroke-width="3"/>`,
        `<path d="M${x + 104} 584 H${x + panelWidth - 104}" stroke="${tone}" stroke-width="10" stroke-linecap="round"/>`,
        `<path d="M${x + panelWidth - 134} 552 L${x + panelWidth - 94} 584 L${x + panelWidth - 134} 616" fill="none" stroke="${tone}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
        ...wrapText(label, 18, 2).map(
          (line, lineIndex) =>
            `<text x="${x + panelWidth / 2}" y="${650 + lineIndex * 36}" text-anchor="middle" fill="#e2e8f0" font-size="28" font-weight="800">${escapeXml(line)}</text>`,
        ),
      ].join('');
    }),
    '</g>',
  ].join('');
}

function renderSequenceBody(labels: string[], palette: VisualPalette) {
  const stationLabels = resolveLabels(labels, [
    'اقرأ',
    'توقع',
    'أثبت',
    'حوّل',
    'استنتج',
  ]);
  const points = [
    [182, 612],
    [430, 540],
    [682, 604],
    [936, 486],
    [1196, 560],
  ];

  return [
    '<g font-family="Noto Sans Arabic, DejaVu Sans, Arial, sans-serif" direction="rtl">',
    `<path d="M${points.map(([x, y]) => `${x} ${y}`).join(' L')}" fill="none" stroke="${palette.primary}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`,
    ...points.map(([x, y], index) => {
      const tone =
        index === points.length - 1 ? palette.secondary : palette.primary;
      return [
        `<circle cx="${x}" cy="${y}" r="${index === points.length - 1 ? 42 : 34}" fill="#0f172a" stroke="${tone}" stroke-width="8"/>`,
        `<circle cx="${x}" cy="${y}" r="12" fill="${tone}"/>`,
        `<rect x="${x - 98}" y="${y + 62}" width="196" height="58" rx="22" fill="#111827" stroke="${tone}" stroke-opacity="0.32"/>`,
        `<text x="${x}" y="${y + 100}" text-anchor="middle" fill="#e2e8f0" font-size="25" font-weight="800">${escapeXml(stationLabels[index] ?? `مرحلة ${index + 1}`)}</text>`,
      ].join('');
    }),
    '</g>',
  ].join('');
}

function renderGraphBody(labels: string[], palette: VisualPalette) {
  const graphLabel =
    labels.find((label) => label.includes('u') || label.includes('f')) ??
    'u_{n+1}=f(u_n)';

  return [
    '<g font-family="Noto Sans Arabic, DejaVu Sans, Arial, sans-serif">',
    '<rect x="128" y="384" width="800" height="388" rx="34" fill="#0b1220" stroke="#334155" stroke-opacity="0.7" filter="url(#softShadow)"/>',
    '<path d="M212 704 H850 M212 704 V432" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>',
    '<path d="M212 704 C316 632 368 512 494 548 C604 580 668 460 850 444" fill="none" stroke="url(#accent)" stroke-width="10" stroke-linecap="round"/>',
    '<path d="M238 684 L820 452" fill="none" stroke="#f59e0b" stroke-width="5" stroke-dasharray="16 16" stroke-linecap="round"/>',
    `<path d="M302 704 V616 H440 V560 H566 V520 H690 V486" fill="none" stroke="${palette.primary}" stroke-width="8" stroke-linejoin="round"/>`,
    `<circle cx="690" cy="486" r="18" fill="${palette.secondary}"/>`,
    '<text x="844" y="738" fill="#cbd5e1" font-size="28" font-weight="700">n</text>',
    '<text x="176" y="446" fill="#cbd5e1" font-size="28" font-weight="700">u</text>',
    `<rect x="994" y="466" width="324" height="86" rx="28" fill="${palette.primary}" fill-opacity="0.14" stroke="${palette.primary}" stroke-opacity="0.42"/>`,
    `<text x="1156" y="520" text-anchor="middle" direction="rtl" fill="#f8fafc" font-size="28" font-weight="800">${escapeXml(graphLabel)}</text>`,
    '<text x="1156" y="596" text-anchor="middle" direction="rtl" fill="#cbd5e1" font-size="26" font-weight="600">الحركة تظهر قبل الحساب</text>',
    '</g>',
  ].join('');
}

function renderDiagramBody(
  labels: string[],
  palette: VisualPalette,
  width: number,
  height: number,
) {
  const nodeLabels = resolveLabels(labels, [
    'المعطى',
    'الأداة',
    'البرهان',
    'النتيجة',
  ]);
  const centerX = Math.round(width * 0.42);
  const centerY = Math.round(height * 0.56);
  const nodes = [
    [centerX - 310, centerY - 118],
    [centerX + 10, centerY - 172],
    [centerX - 80, centerY + 92],
    [centerX + 276, centerY + 48],
  ];

  return [
    '<g font-family="Noto Sans Arabic, DejaVu Sans, Arial, sans-serif" direction="rtl">',
    `<path d="M${nodes[0][0] + 112} ${nodes[0][1] + 48} C${nodes[0][0] + 248} ${nodes[0][1]} ${nodes[1][0] - 70} ${nodes[1][1]} ${nodes[1][0]} ${nodes[1][1] + 48}" fill="none" stroke="${palette.primary}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M${nodes[1][0] + 112} ${nodes[1][1] + 56} C${nodes[1][0] + 250} ${nodes[1][1] + 132} ${nodes[3][0] - 80} ${nodes[3][1] - 20} ${nodes[3][0]} ${nodes[3][1] + 48}" fill="none" stroke="${palette.secondary}" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M${nodes[0][0] + 104} ${nodes[0][1] + 108} C${nodes[0][0] + 132} ${nodes[2][1] + 36} ${nodes[2][0] - 80} ${nodes[2][1] + 38} ${nodes[2][0]} ${nodes[2][1] + 48}" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>`,
    `<path d="M${nodes[2][0] + 112} ${nodes[2][1] + 48} C${nodes[2][0] + 226} ${nodes[2][1] + 18} ${nodes[3][0] - 78} ${nodes[3][1] + 86} ${nodes[3][0]} ${nodes[3][1] + 48}" fill="none" stroke="${palette.primary}" stroke-width="8" stroke-linecap="round"/>`,
    ...nodes.map(([x, y], index) => {
      const tone =
        index === nodes.length - 1
          ? palette.secondary
          : index === 2
            ? '#38bdf8'
            : palette.primary;
      return [
        `<rect x="${x}" y="${y}" width="224" height="104" rx="32" fill="#0f172a" stroke="${tone}" stroke-opacity="0.54" filter="url(#softShadow)"/>`,
        `<text x="${x + 112}" y="${y + 64}" text-anchor="middle" fill="#f8fafc" font-size="28" font-weight="800">${escapeXml(nodeLabels[index] ?? `مرحلة ${index + 1}`)}</text>`,
      ].join('');
    }),
    '</g>',
  ].join('');
}

type VisualPalette = {
  primary: string;
  secondary: string;
};

function resolveVisualPalette(index: number): VisualPalette {
  const palettes: VisualPalette[] = [
    { primary: '#00e599', secondary: '#fbbf24' },
    { primary: '#38bdf8', secondary: '#f59e0b' },
    { primary: '#22c55e', secondary: '#fb7185' },
    { primary: '#14b8a6', secondary: '#eab308' },
  ];

  return palettes[index % palettes.length];
}

function resolveLabels(labels: string[], fallback: string[]) {
  return [...labels, ...fallback]
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label, index, allLabels) => allLabels.indexOf(label) === index);
}

function extractArabicLabels(text: string) {
  const matches =
    text.match(
      /[\u0600-\u06ff][\u0600-\u06ff\s0-9_{}=+\-*\/^<>≤≥().،:]{1,36}/g,
    ) ?? [];

  return matches
    .flatMap((match) => match.split(/[،,:]/g))
    .map((value) => value.trim())
    .filter((value) => value.length >= 2 && value.length <= 38)
    .slice(0, 8);
}

function wrapText(text: string, maxChars: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (!lines.length) {
    return [''];
  }

  return lines;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
