const API_PREFIX = "/api/v1";

export function isAbsoluteUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function deriveRenderApiBaseUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const derivedHost = url.host
    .replace("-web-staging.", "-api-staging.")
    .replace("-web.", "-api.");

  if (derivedHost === url.host) {
    return null;
  }

  return `${url.protocol}//${derivedHost}${API_PREFIX}`;
}

export function resolveApiUpstreamBaseUrl(input: {
  requestUrl: string;
  apiUpstreamUrl?: string | null;
  publicApiBaseUrl?: string | null;
  publicApiOrigin?: string | null;
}) {
  const candidates = [
    input.apiUpstreamUrl,
    input.publicApiBaseUrl,
    input.publicApiOrigin,
  ];

  for (const candidate of candidates) {
    if (isAbsoluteUrl(candidate)) {
      return trimTrailingSlash(candidate!);
    }
  }

  return deriveRenderApiBaseUrl(input.requestUrl);
}

export function buildApiUpstreamRequestUrl(input: {
  requestUrl: string;
  upstreamBaseUrl: string;
}) {
  const sourceUrl = new URL(input.requestUrl);
  const normalizedPath = sourceUrl.pathname.startsWith(API_PREFIX)
    ? sourceUrl.pathname.slice(API_PREFIX.length)
    : sourceUrl.pathname;

  return new URL(
    `${trimTrailingSlash(input.upstreamBaseUrl)}${normalizedPath}${sourceUrl.search}`,
  );
}
