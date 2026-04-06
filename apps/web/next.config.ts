import type { NextConfig } from "next";
import { isAbsoluteUrl } from "./src/lib/api-upstream";

const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const publicApiOrigin = process.env.PUBLIC_API_BASE_URL ?? "";
const apiUpstream = process.env.API_UPSTREAM_URL ?? "";
const assetBaseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "";
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const isProduction = process.env.NODE_ENV === "production";

function toOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

function resolveClerkOriginFromPublishableKey(publishableKey: string) {
  if (!publishableKey) {
    return null;
  }

  const encodedHost = publishableKey.split("_").slice(2).join("_");

  if (!encodedHost) {
    return null;
  }

  try {
    const decodedHost = decodeBase64Url(encodedHost)
      .replace(/\$/g, "")
      .trim();

    if (!decodedHost) {
      return null;
    }

    return new URL(`https://${decodedHost}`).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy() {
  const scriptSources = new Set([
    "'self'",
    "'unsafe-inline'",
    "https://challenges.cloudflare.com",
  ]);
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
  const frameSources = new Set(["'self'", "https://challenges.cloudflare.com"]);

  const apiOrigin = toOrigin(
    isAbsoluteUrl(publicApiBaseUrl)
      ? publicApiBaseUrl
      : apiUpstream || publicApiOrigin,
  );
  const assetOrigin = toOrigin(assetBaseUrl);
  const clerkOrigin = resolveClerkOriginFromPublishableKey(clerkPublishableKey);

  if (clerkOrigin) {
    scriptSources.add(clerkOrigin);
    connectSources.add(clerkOrigin);
  }

  if (apiOrigin) {
    connectSources.add(apiOrigin);
    imageSources.add(apiOrigin);
    mediaSources.add(apiOrigin);
  }

  if (assetOrigin) {
    connectSources.add(assetOrigin);
    imageSources.add(assetOrigin);
    mediaSources.add(assetOrigin);
  }

  if (!isProduction) {
    connectSources.add("http://localhost:3001");
    connectSources.add("http://127.0.0.1:3001");
    scriptSources.add("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${[...scriptSources].join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${[...connectSources].join(" ")}`,
    `img-src ${[...imageSources].join(" ")}`,
    `media-src ${[...mediaSources].join(" ")}`,
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `frame-src ${[...frameSources].join(" ")}`,
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
};

export default nextConfig;
