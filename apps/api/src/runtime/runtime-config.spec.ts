import {
  buildRequestOriginFromHeaders,
  DEFAULT_DEV_CORS_ORIGINS,
  extractRequestSourceOrigin,
  isTrustedRequestOrigin,
  resolveBooleanFlag,
  resolveCorsOrigins,
  resolvePositiveInteger,
  resolveTrustProxy,
  resolveTrustedRequestOrigins,
} from './runtime-config';

describe('runtime config helpers', () => {
  describe('resolveCorsOrigins', () => {
    it('returns explicit origins when configured', () => {
      expect(
        resolveCorsOrigins({
          corsOrigin: 'https://bacbank.example, https://admin.bacbank.example ',
          nodeEnv: 'production',
        }),
      ).toEqual(['https://bacbank.example', 'https://admin.bacbank.example']);
    });

    it('falls back to localhost origins outside production', () => {
      expect(resolveCorsOrigins({ nodeEnv: 'development' })).toEqual(
        DEFAULT_DEV_CORS_ORIGINS,
      );
    });

    it('throws when production cors origins are missing', () => {
      expect(() =>
        resolveCorsOrigins({
          nodeEnv: 'production',
        }),
      ).toThrow(
        'CORS_ORIGIN must be configured in production for credentialed requests.',
      );
    });
  });

  describe('trusted request origins', () => {
    it('includes configured web origins plus the public API origin', () => {
      expect(
        resolveTrustedRequestOrigins({
          nodeEnv: 'production',
          corsOrigin: 'https://bacbank.example, https://admin.bacbank.example',
          publicApiBaseUrl: 'https://api.bacbank.example/api/v1',
        }),
      ).toEqual([
        'https://bacbank.example',
        'https://admin.bacbank.example',
        'https://api.bacbank.example',
      ]);
    });

    it('extracts a source origin from origin or referer headers', () => {
      expect(
        extractRequestSourceOrigin(
          'https://bacbank.example',
          'https://ignored.example/path',
        ),
      ).toBe('https://bacbank.example');
      expect(
        extractRequestSourceOrigin(
          undefined,
          'https://bacbank.example/app/sessions/new',
        ),
      ).toBe('https://bacbank.example');
    });

    it('allows trusted configured origins and the request host origin', () => {
      expect(
        isTrustedRequestOrigin({
          sourceOrigin: 'https://bacbank.example',
          trustedOrigins: ['https://bacbank.example'],
          requestOrigin: 'https://api.bacbank.example',
        }),
      ).toBe(true);

      expect(
        isTrustedRequestOrigin({
          sourceOrigin: 'https://api.bacbank.example',
          trustedOrigins: ['https://bacbank.example'],
          requestOrigin: 'https://api.bacbank.example',
        }),
      ).toBe(true);
    });

    it('builds the request origin from forwarded headers', () => {
      expect(
        buildRequestOriginFromHeaders({
          host: 'internal-api:3001',
          forwardedHost: 'api.bacbank.example',
          forwardedProto: 'https',
        }),
      ).toBe('https://api.bacbank.example');
    });
  });

  describe('resolveBooleanFlag', () => {
    it('accepts common truthy variants', () => {
      expect(resolveBooleanFlag({ value: 'true' })).toBe(true);
      expect(resolveBooleanFlag({ value: 'YES' })).toBe(true);
      expect(resolveBooleanFlag({ value: '1' })).toBe(true);
    });

    it('accepts common falsy variants', () => {
      expect(resolveBooleanFlag({ value: 'false', fallback: true })).toBe(
        false,
      );
      expect(resolveBooleanFlag({ value: 'off', fallback: true })).toBe(false);
      expect(resolveBooleanFlag({ value: '0', fallback: true })).toBe(false);
    });

    it('falls back for empty or invalid values', () => {
      expect(resolveBooleanFlag({ value: undefined, fallback: true })).toBe(
        true,
      );
      expect(resolveBooleanFlag({ value: 'maybe', fallback: false })).toBe(
        false,
      );
    });
  });

  describe('resolvePositiveInteger', () => {
    it('returns the parsed value when valid', () => {
      expect(resolvePositiveInteger({ value: '12', fallback: 5 })).toBe(12);
    });

    it('falls back when the value is missing or invalid', () => {
      expect(resolvePositiveInteger({ value: undefined, fallback: 5 })).toBe(5);
      expect(resolvePositiveInteger({ value: 'abc', fallback: 5 })).toBe(5);
      expect(resolvePositiveInteger({ value: '0', fallback: 5, min: 1 })).toBe(
        5,
      );
    });
  });

  describe('resolveTrustProxy', () => {
    it('parses boolean trust proxy values', () => {
      expect(resolveTrustProxy({ trustProxy: 'true' })).toBe(true);
      expect(resolveTrustProxy({ trustProxy: 'false' })).toBe(false);
    });

    it('parses hop counts', () => {
      expect(resolveTrustProxy({ trustProxy: '2' })).toBe(2);
    });

    it('defaults to false when unset', () => {
      expect(resolveTrustProxy({ trustProxy: undefined })).toBe(false);
    });

    it('throws for invalid values', () => {
      expect(() => resolveTrustProxy({ trustProxy: 'behind-nginx' })).toThrow(
        'TRUST_PROXY must be a boolean flag or hop count integer.',
      );
    });
  });
});
