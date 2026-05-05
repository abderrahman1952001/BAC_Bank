import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCanonicalCourseAssetRequest } from "./course-assets";

describe("course asset route helpers", () => {
  it("resolves generated course assets inside the canonical root", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "web-course-assets-"));
    const assetPath = join(
      rootDir,
      "svt",
      "SE",
      "proteins",
      "assets",
      "generated",
      "field-opening",
      "hook.png",
    );
    mkdirSync(dirname(assetPath), { recursive: true });
    writeFileSync(assetPath, "fake-image");

    expect(
      resolveCanonicalCourseAssetRequest(
        [
          "svt",
          "SE",
          "proteins",
          "assets",
          "generated",
          "field-opening",
          "hook.png",
        ],
        rootDir,
      ),
    ).toMatchObject({
      absolutePath: assetPath,
      contentType: "image/png",
    });
  });

  it("rejects traversal outside the canonical root", () => {
    const rootDir = mkdtempSync(join(tmpdir(), "web-course-assets-"));

    expect(
      resolveCanonicalCourseAssetRequest(["..", "secret.png"], rootDir),
    ).toBeNull();
  });
});
