import { headers } from "next/headers";
import {
  createApiUrl,
  readApiErrorMessage,
  type ApiJsonParser,
} from "@/lib/api-client";

export function getRequestOriginFromHeaders(requestHeaders: Headers): string {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Request host header is missing.");
  }

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto?.split(",")[0]?.trim() ||
    (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function fetchServerApi(
  path: string,
  init?: RequestInit,
  fallbackMessage?: string,
): Promise<Response> {
  const requestHeaders = await headers();
  const forwardedHeaders = new Headers(init?.headers ?? {});
  const cookieHeader = requestHeaders.get("cookie");

  if (cookieHeader && !forwardedHeaders.has("cookie")) {
    forwardedHeaders.set("cookie", cookieHeader);
  }

  const apiUrl = new URL(
    createApiUrl(path),
    getRequestOriginFromHeaders(requestHeaders),
  );
  const response = await fetch(apiUrl, {
    ...init,
    headers: forwardedHeaders,
    cache: init?.cache ?? "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, fallbackMessage));
  }

  return response;
}

export async function fetchServerApiJson<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage?: string,
  parser?: ApiJsonParser<T>,
): Promise<T> {
  const response = await fetchServerApi(path, init, fallbackMessage);
  const payload = (await response.json()) as unknown;

  return parser ? parser(payload) : (payload as T);
}
