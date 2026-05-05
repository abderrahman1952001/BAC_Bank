import { existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

export type ResolvedCourseAssetRequest = {
  absolutePath: string;
  contentType: string;
};

const imageContentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export function resolveCanonicalCourseRoot(cwd = process.cwd()) {
  const candidates = [
    resolve(cwd, "bac_theory_content/canonical"),
    resolve(cwd, "..", "..", "bac_theory_content/canonical"),
    resolve(cwd, "..", "..", "..", "bac_theory_content/canonical"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function resolveCanonicalCourseAssetRequest(
  assetPathSegments: string[],
  canonicalRootDir = resolveCanonicalCourseRoot(),
): ResolvedCourseAssetRequest | null {
  if (!canonicalRootDir || assetPathSegments.length === 0) {
    return null;
  }

  if (assetPathSegments.some((segment) => !segment || segment.includes("\0"))) {
    return null;
  }

  const canonicalRoot = resolve(canonicalRootDir);
  const absolutePath = resolve(canonicalRoot, ...assetPathSegments);

  if (
    absolutePath !== canonicalRoot &&
    !absolutePath.startsWith(`${canonicalRoot}${sep}`)
  ) {
    return null;
  }

  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null;
  }

  const contentType = imageContentTypes[extname(absolutePath).toLowerCase()];

  if (!contentType) {
    return null;
  }

  return {
    absolutePath,
    contentType,
  };
}
