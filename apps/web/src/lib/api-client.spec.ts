import { describe, expect, it } from "vitest";
import {
  API_BASE_URL,
  createApiUrl,
  readApiErrorMessage,
  withApiRequestDefaults,
  withJsonRequest,
} from "@/lib/api-client";

describe("api client helpers", () => {
  it("prefixes relative API paths with the configured base URL", () => {
    expect(createApiUrl("/auth/me")).toBe(`${API_BASE_URL}/auth/me`);
    expect(createApiUrl("qbank/catalog")).toBe(
      `${API_BASE_URL}/qbank/catalog`,
    );
  });

  it("leaves absolute URLs and fully-qualified API URLs unchanged", () => {
    expect(createApiUrl("https://example.com/health")).toBe(
      "https://example.com/health",
    );
    expect(createApiUrl(`${API_BASE_URL}/qbank/catalog`)).toBe(
      `${API_BASE_URL}/qbank/catalog`,
    );
  });

  it("applies consistent fetch defaults", () => {
    expect(withApiRequestDefaults()).toMatchObject({
      cache: "no-store",
      credentials: "include",
    });
  });

  it("adds a JSON content type when sending a non-form body", () => {
    const request = withJsonRequest({
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });

    expect(new Headers(request.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("reads array-based API validation messages", async () => {
    const response = new Response(
      JSON.stringify({
        message: ["Email is required", "Password is required"],
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    await expect(readApiErrorMessage(response)).resolves.toBe(
      "Email is required · Password is required",
    );
  });
});
