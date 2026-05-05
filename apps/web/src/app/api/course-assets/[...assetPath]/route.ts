import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveCanonicalCourseAssetRequest } from "@/lib/course-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ assetPath: string[] }>;
  },
) {
  const { assetPath } = await params;
  const resolved = resolveCanonicalCourseAssetRequest(assetPath);

  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readFile(resolved.absolutePath);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": resolved.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
