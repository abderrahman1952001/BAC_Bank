import { describe, expect, it } from "vitest";
import {
  buildApiUpstreamRequestUrl,
  deriveRenderApiBaseUrl,
  resolveApiUpstreamBaseUrl,
} from "@/lib/api-upstream";

describe("api upstream helpers", () => {
  it("prefers an explicit upstream URL when configured", () => {
    expect(
      resolveApiUpstreamBaseUrl({
        requestUrl: "https://bac-bank-web-staging.onrender.com/api/v1/auth/options",
        apiUpstreamUrl: "https://example.com/api/v1",
      }),
    ).toBe("https://example.com/api/v1");
  });

  it("derives the Render API hostname when only the staging web hostname is known", () => {
    expect(
      deriveRenderApiBaseUrl(
        "https://bac-bank-web-staging.onrender.com/api/v1/auth/options",
      ),
    ).toBe("https://bac-bank-api-staging.onrender.com/api/v1");
  });

  it("builds an upstream URL that preserves the API path and query string", () => {
    const upstreamUrl = buildApiUpstreamRequestUrl({
      requestUrl:
        "https://bac-bank-web-staging.onrender.com/api/v1/auth/options?lang=ar",
      upstreamBaseUrl: "https://bac-bank-api-staging.onrender.com/api/v1",
    });

    expect(upstreamUrl.toString()).toBe(
      "https://bac-bank-api-staging.onrender.com/api/v1/auth/options?lang=ar",
    );
  });
});
