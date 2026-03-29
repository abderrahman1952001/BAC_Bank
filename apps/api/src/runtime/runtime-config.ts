import { InternalServerErrorException } from '@nestjs/common';

export const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

type CorsOptions = {
  nodeEnv?: string;
  corsOrigin?: string;
};

type TrustedOriginOptions = CorsOptions & {
  publicApiBaseUrl?: string;
};

type SessionSecretOptions = {
  nodeEnv?: string;
  authSessionSecret?: string;
  legacyJwtSecret?: string;
};

type BooleanFlagOptions = {
  value?: string | null;
  fallback?: boolean;
};

type PositiveIntegerOptions = {
  value?: string | null;
  fallback: number;
  min?: number;
};

const PLACEHOLDER_SECRET_PATTERNS = [
  'change_this',
  'replace_with',
  'placeholder',
  'example',
];
const TRUE_BOOLEAN_FLAG_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_BOOLEAN_FLAG_VALUES = new Set(['0', 'false', 'no', 'off']);

export function isProductionEnvironment(nodeEnv?: string) {
  return nodeEnv?.trim().toLowerCase() === 'production';
}

export function resolveBooleanFlag({
  value,
  fallback = false,
}: BooleanFlagOptions = {}) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  if (TRUE_BOOLEAN_FLAG_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSE_BOOLEAN_FLAG_VALUES.has(normalizedValue)) {
    return false;
  }

  return fallback;
}

export function resolvePositiveInteger({
  value,
  fallback,
  min = 1,
}: PositiveIntegerOptions) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }

  return parsed;
}

export function resolveCorsOrigins({ nodeEnv, corsOrigin }: CorsOptions = {}) {
  const configuredOrigins = corsOrigin
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configuredOrigins?.length) {
    return configuredOrigins;
  }

  if (isProductionEnvironment(nodeEnv)) {
    throw new Error(
      'CORS_ORIGIN must be configured in production for credentialed requests.',
    );
  }

  return DEFAULT_DEV_CORS_ORIGINS;
}

export function normalizeOrigin(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

export function extractRequestSourceOrigin(
  originHeader?: string | string[] | null,
  refererHeader?: string | string[] | null,
) {
  const originValue = Array.isArray(originHeader)
    ? originHeader[0]
    : originHeader;
  const refererValue = Array.isArray(refererHeader)
    ? refererHeader[0]
    : refererHeader;

  return normalizeOrigin(originValue) ?? normalizeOrigin(refererValue);
}

export function resolveTrustedRequestOrigins({
  nodeEnv,
  corsOrigin,
  publicApiBaseUrl,
}: TrustedOriginOptions = {}) {
  const trustedOrigins = new Set(resolveCorsOrigins({ nodeEnv, corsOrigin }));
  const publicApiOrigin = normalizeOrigin(publicApiBaseUrl);

  if (publicApiOrigin) {
    trustedOrigins.add(publicApiOrigin);
  }

  return [...trustedOrigins];
}

export function buildRequestOriginFromHeaders(input: {
  host?: string | string[] | null;
  forwardedHost?: string | string[] | null;
  forwardedProto?: string | string[] | null;
}) {
  const hostValue = Array.isArray(input.forwardedHost)
    ? input.forwardedHost[0]
    : input.forwardedHost;
  const fallbackHostValue = Array.isArray(input.host)
    ? input.host[0]
    : input.host;
  const protoValue = Array.isArray(input.forwardedProto)
    ? input.forwardedProto[0]
    : input.forwardedProto;
  const host = hostValue?.trim() || fallbackHostValue?.trim();

  if (!host) {
    return null;
  }

  const protocol = protoValue?.trim() || 'http';
  return normalizeOrigin(`${protocol}://${host}`);
}

export function resolveTrustProxy({
  trustProxy,
}: {
  trustProxy?: string | null;
}) {
  const normalizedValue = trustProxy?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  if (TRUE_BOOLEAN_FLAG_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSE_BOOLEAN_FLAG_VALUES.has(normalizedValue)) {
    return false;
  }

  const hopCount = Number.parseInt(normalizedValue, 10);

  if (Number.isInteger(hopCount) && hopCount >= 0) {
    return hopCount;
  }

  throw new Error('TRUST_PROXY must be a boolean flag or hop count integer.');
}

export function isTrustedRequestOrigin(input: {
  sourceOrigin?: string | null;
  trustedOrigins: string[];
  requestOrigin?: string | null;
}) {
  const normalizedSourceOrigin = normalizeOrigin(input.sourceOrigin);

  if (!normalizedSourceOrigin) {
    return false;
  }

  if (
    input.trustedOrigins.some(
      (trustedOrigin) =>
        normalizeOrigin(trustedOrigin) === normalizedSourceOrigin,
    )
  ) {
    return true;
  }

  return normalizeOrigin(input.requestOrigin) === normalizedSourceOrigin;
}

export function resolveAuthSessionSecret({
  nodeEnv,
  authSessionSecret,
  legacyJwtSecret,
}: SessionSecretOptions) {
  const primarySecret = authSessionSecret?.trim();

  if (primarySecret) {
    return validateSessionSecret(primarySecret, nodeEnv, 'AUTH_SESSION_SECRET');
  }

  const legacySecret = legacyJwtSecret?.trim();

  if (legacySecret) {
    return validateSessionSecret(legacySecret, nodeEnv, 'JWT_ACCESS_SECRET');
  }

  throw new InternalServerErrorException(
    'Auth session secret is not configured. Set AUTH_SESSION_SECRET.',
  );
}

export function validateSessionSecret(
  secret: string,
  nodeEnv?: string,
  source = 'Auth session secret',
) {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    throw new InternalServerErrorException(`${source} is not configured.`);
  }

  if (!isProductionEnvironment(nodeEnv)) {
    return trimmedSecret;
  }

  const normalized = trimmedSecret.toLowerCase();
  const looksLikePlaceholder = PLACEHOLDER_SECRET_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );

  if (looksLikePlaceholder) {
    throw new InternalServerErrorException(
      `${source} must not use a placeholder value in production.`,
    );
  }

  if (trimmedSecret.length < 32) {
    throw new InternalServerErrorException(
      `${source} must be at least 32 characters in production.`,
    );
  }

  return trimmedSecret;
}
