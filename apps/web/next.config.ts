import type { NextConfig } from "next";

const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const publicApiOriginFallback =
  process.env.PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function isAbsoluteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

const apiUpstream =
  process.env.API_UPSTREAM_URL ??
  (isAbsoluteUrl(publicApiBaseUrl)
    ? publicApiBaseUrl
    : `${publicApiOriginFallback.replace(/\/$/, "")}/api/v1`);
const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
const isProduction = process.env.NODE_ENV === "production";

function toOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy() {
  const connectSources = new Set([
    "'self'",
    "https:",
    "wss:",
  ]);
  const imageSources = new Set([
    "'self'",
    "data:",
    "blob:",
    "https:",
  ]);
  const mediaSources = new Set([
    "'self'",
    "data:",
    "blob:",
    "https:",
  ]);

  const apiOrigin = toOrigin(
    isAbsoluteUrl(publicApiBaseUrl) ? publicApiBaseUrl : apiUpstream,
  );
  const assetOrigin = toOrigin(assetBaseUrl);

  if (apiOrigin) {
    connectSources.add(apiOrigin);
  }

  if (assetOrigin) {
    connectSources.add(assetOrigin);
    imageSources.add(assetOrigin);
    mediaSources.add(assetOrigin);
  }

  if (!isProduction) {
    connectSources.add("http://localhost:3001");
    connectSources.add("http://127.0.0.1:3001");
  }

  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${[...connectSources].join(" ")}`,
    `img-src ${[...imageSources].join(" ")}`,
    `media-src ${[...mediaSources].join(" ")}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: isProduction ? undefined : ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    if (isAbsoluteUrl(publicApiBaseUrl)) {
      return [];
    }

    if (apiUpstream.startsWith("/")) {
      return [];
    }

    const normalizedPublicApiBaseUrl = publicApiBaseUrl.endsWith("/")
      ? publicApiBaseUrl.slice(0, -1)
      : publicApiBaseUrl;

    return [
      {
        source: `${normalizedPublicApiBaseUrl}/:path*`,
        destination: `${apiUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
