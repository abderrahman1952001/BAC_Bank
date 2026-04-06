import { describe, expect, it } from "vitest";
import {
  DEFAULT_API_PROXY_TIMEOUT_MS,
  INGESTION_API_PROXY_TIMEOUT_MS,
  SAFE_API_PROXY_RETRY_COUNT,
  isSafeApiProxyMethod,
  resolveApiProxyTimeoutMs,
  resolveApiProxyRetryCount,
  shouldRetryApiProxyRequest,
} from "./route";

describe("resolveApiProxyTimeoutMs", () => {
  it("keeps the short default timeout for non-ingestion API traffic", () => {
    expect(
      resolveApiProxyTimeoutMs("http://localhost:3000/api/v1/admin/exams"),
    ).toBe(DEFAULT_API_PROXY_TIMEOUT_MS);
  });

  it("uses the extended timeout for ingestion admin routes", () => {
    expect(
      resolveApiProxyTimeoutMs(
        "http://localhost:3000/api/v1/admin/ingestion/intake/manual",
      ),
    ).toBe(INGESTION_API_PROXY_TIMEOUT_MS);
    expect(
      resolveApiProxyTimeoutMs(
        "http://localhost:3000/api/v1/admin/ingestion/jobs/123/correction",
      ),
    ).toBe(INGESTION_API_PROXY_TIMEOUT_MS);
  });

  it("uses the extended timeout for ingestion asset and document routes", () => {
    expect(
      resolveApiProxyTimeoutMs(
        "http://localhost:3000/api/v1/ingestion/documents/doc-1/file",
      ),
    ).toBe(INGESTION_API_PROXY_TIMEOUT_MS);
    expect(
      resolveApiProxyTimeoutMs(
        "http://localhost:3000/api/v1/ingestion/jobs/job-1/assets/asset-1/preview",
      ),
    ).toBe(INGESTION_API_PROXY_TIMEOUT_MS);
  });
});

describe("resolveApiProxyRetryCount", () => {
  it("retries safe read requests", () => {
    expect(resolveApiProxyRetryCount("GET")).toBe(SAFE_API_PROXY_RETRY_COUNT);
    expect(resolveApiProxyRetryCount("HEAD")).toBe(SAFE_API_PROXY_RETRY_COUNT);
    expect(resolveApiProxyRetryCount("OPTIONS")).toBe(
      SAFE_API_PROXY_RETRY_COUNT,
    );
  });

  it("does not retry mutating requests", () => {
    expect(resolveApiProxyRetryCount("POST")).toBe(0);
    expect(resolveApiProxyRetryCount("PATCH")).toBe(0);
  });
});

describe("isSafeApiProxyMethod", () => {
  it("matches the safe methods used by the proxy retry logic", () => {
    expect(isSafeApiProxyMethod("get")).toBe(true);
    expect(isSafeApiProxyMethod("POST")).toBe(false);
  });
});

describe("shouldRetryApiProxyRequest", () => {
  it("retries safe request failures caused by transient fetch errors", () => {
    expect(
      shouldRetryApiProxyRequest("GET", new TypeError("fetch failed")),
    ).toBe(true);
  });

  it("does not retry timeouts or unsafe methods", () => {
    expect(
      shouldRetryApiProxyRequest(
        "GET",
        new DOMException("The operation timed out.", "TimeoutError"),
      ),
    ).toBe(false);
    expect(
      shouldRetryApiProxyRequest("POST", new TypeError("fetch failed")),
    ).toBe(false);
  });
});
