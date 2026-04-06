import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import {
  buildApiUpstreamRequestUrl,
  resolveApiUpstreamBaseUrl,
} from "@/lib/api-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const DEFAULT_API_PROXY_TIMEOUT_MS = 8_000;
export const INGESTION_API_PROXY_TIMEOUT_MS = 120_000;
export const SAFE_API_PROXY_RETRY_COUNT = 2;
const SAFE_API_PROXY_RETRY_DELAYS_MS = [200, 500];

async function proxyRequest(request: NextRequest) {
  const upstreamBaseUrl = resolveApiUpstreamBaseUrl({
    requestUrl: request.url,
    apiUpstreamUrl: process.env.API_UPSTREAM_URL,
    publicApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    publicApiOrigin: process.env.PUBLIC_API_BASE_URL,
  });

  if (!upstreamBaseUrl) {
    return new Response("API upstream is not configured.", { status: 500 });
  }

  const upstreamUrl = buildApiUpstreamRequestUrl({
    requestUrl: request.url,
    upstreamBaseUrl,
  });
  const requestHeaders = new Headers(request.headers);
  const requestUrl = new URL(request.url);
  const { getToken } = await auth();
  const token = await getToken();

  requestHeaders.delete("host");
  requestHeaders.delete("content-length");
  if (token && !requestHeaders.has("authorization")) {
    requestHeaders.set("authorization", `Bearer ${token}`);
  }
  requestHeaders.set(
    "x-forwarded-host",
    request.headers.get("host") ?? requestUrl.host,
  );
  requestHeaders.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const upstreamResponse = await fetchApiUpstreamWithRetry({
      request,
      upstreamUrl,
      requestHeaders,
      requestBody,
    });
    const responseHeaders = new Headers();
    responseHeaders.set("x-bac-api-proxy", "route-handler");
    responseHeaders.set("x-bac-api-upstream", upstreamUrl.toString());

    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") {
        return;
      }

      if (key.toLowerCase() === "set-cookie") {
        return;
      }

      responseHeaders.append(key, value);
    });

    if ("getSetCookie" in upstreamResponse.headers) {
      for (const cookie of upstreamResponse.headers.getSetCookie()) {
        responseHeaders.append("set-cookie", cookie);
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response("API upstream request failed.", {
      status: 502,
      headers: {
        "x-bac-api-proxy": "route-handler",
        "x-bac-api-upstream": upstreamUrl.toString(),
      },
    });
  }
}

async function fetchApiUpstreamWithRetry(input: {
  request: NextRequest;
  upstreamUrl: URL;
  requestHeaders: Headers;
  requestBody?: ArrayBuffer;
}) {
  const retryCount = resolveApiProxyRetryCount(input.request.method);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await fetch(input.upstreamUrl, {
        method: input.request.method,
        headers: input.requestHeaders,
        body: input.requestBody,
        signal: AbortSignal.timeout(resolveApiProxyTimeoutMs(input.request.url)),
        cache: "no-store",
        redirect: "manual",
      });
    } catch (error) {
      lastError = error;

      if (
        attempt >= retryCount ||
        !shouldRetryApiProxyRequest(input.request.method, error)
      ) {
        throw error;
      }

      await sleep(SAFE_API_PROXY_RETRY_DELAYS_MS[attempt] ?? 500);
    }
  }

  throw lastError;
}

export function resolveApiProxyRetryCount(requestMethod: string) {
  return isSafeApiProxyMethod(requestMethod) ? SAFE_API_PROXY_RETRY_COUNT : 0;
}

export function isSafeApiProxyMethod(requestMethod: string) {
  const normalizedMethod = requestMethod.trim().toUpperCase();
  return (
    normalizedMethod === "GET" ||
    normalizedMethod === "HEAD" ||
    normalizedMethod === "OPTIONS"
  );
}

export function shouldRetryApiProxyRequest(
  requestMethod: string,
  error: unknown,
) {
  if (!isSafeApiProxyMethod(requestMethod)) {
    return false;
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.trim().toLowerCase();

  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("socket") ||
    message.includes("econnrefused")
  );
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function resolveApiProxyTimeoutMs(requestUrl: string) {
  const pathname = new URL(requestUrl).pathname;

  if (
    pathname === "/api/v1/admin/ingestion/jobs" ||
    pathname.startsWith("/api/v1/admin/ingestion/") ||
    pathname.startsWith("/api/v1/ingestion/")
  ) {
    return INGESTION_API_PROXY_TIMEOUT_MS;
  }

  return DEFAULT_API_PROXY_TIMEOUT_MS;
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
