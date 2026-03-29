import { createHmac, timingSafeEqual } from 'crypto';

export const AUTH_SESSION_COOKIE_NAME = 'bb_session';

export type AuthSessionPayload = {
  sub: string;
  sid: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
};

type SameSite = 'Lax' | 'Strict' | 'None';

type CookieOptions = {
  httpOnly?: boolean;
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: SameSite;
  secure?: boolean;
};

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function signValue(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest();
}

export function createAuthSessionToken(
  payload: AuthSessionPayload,
  secret: string,
) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = signValue(unsignedToken, secret).toString('base64url');

  return `${unsignedToken}.${signature}`;
}

export function verifyAuthSessionToken(token: string, secret: string) {
  const segments = token.split('.');

  if (segments.length !== 3) {
    return null;
  }

  const [headerValue, bodyValue, signatureValue] = segments;
  const header = fromBase64Url<{ alg?: string; typ?: string }>(headerValue);
  const payload = fromBase64Url<AuthSessionPayload>(bodyValue);

  if (header?.alg !== 'HS256' || header?.typ !== 'JWT' || !payload) {
    return null;
  }

  try {
    const expectedSignature = signValue(`${headerValue}.${bodyValue}`, secret);
    const actualSignature = Buffer.from(signatureValue, 'base64url');

    if (expectedSignature.length !== actualSignature.length) {
      return null;
    }

    if (!timingSafeEqual(expectedSignature, actualSignature)) {
      return null;
    }
  } catch {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (
    typeof payload.sub !== 'string' ||
    payload.sub.length === 0 ||
    typeof payload.sid !== 'string' ||
    payload.sid.length === 0 ||
    (payload.role !== 'USER' && payload.role !== 'ADMIN') ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= nowInSeconds
  ) {
    return null;
  }

  return payload;
}

export function readCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
) {
  if (!cookieHeader) {
    return null;
  }

  const cookiePair = cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${cookieName}=`));

  if (!cookiePair) {
    return null;
  }

  return decodeURIComponent(cookiePair.slice(cookieName.length + 1));
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
) {
  const segments = [`${name}=${encodeURIComponent(value)}`];

  if (typeof options.maxAgeSeconds === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  segments.push(`Path=${options.path ?? '/'}`);
  segments.push(`SameSite=${options.sameSite ?? 'Lax'}`);

  if (options.httpOnly !== false) {
    segments.push('HttpOnly');
  }

  if (options.secure) {
    segments.push('Secure');
  }

  return segments.join('; ');
}

export function serializeAuthSessionCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
) {
  return serializeCookie(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAgeSeconds,
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}

export function serializeClearedAuthSessionCookie(secure: boolean) {
  return serializeCookie(AUTH_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAgeSeconds: 0,
    path: '/',
    sameSite: 'Lax',
    secure,
  });
}
