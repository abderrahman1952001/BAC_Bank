import { NextRequest } from "next/server";
import {
  buildApiUpstreamRequestUrl,
  resolveApiUpstreamBaseUrl,
} from "@/lib/api-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  requestHeaders.delete("host");
  requestHeaders.delete("content-length");
  requestHeaders.set("x-forwarded-host", request.headers.get("host") ?? requestUrl.host);
  requestHeaders.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: requestHeaders,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers();

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
    return new Response("API upstream request failed.", { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
