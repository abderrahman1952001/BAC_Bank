import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { Logger, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import {
  buildRequestOriginFromHeaders,
  extractRequestSourceOrigin,
  isProductionEnvironment,
  resolveBooleanFlag,
  isTrustedRequestOrigin,
  resolveCorsOrigins,
  resolveTrustProxy,
  resolveTrustedRequestOrigins,
} from './runtime/runtime-config';
import { describeError, serializeLogEvent } from './runtime/logging';

export const API_GLOBAL_PREFIX = 'api/v1';

const MULTIPART_LIMITS = {
  files: 2,
  fileSize: 32 * 1024 * 1024,
  fields: 16,
} as const;
const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REQUEST_STARTED_AT = Symbol('requestStartedAt');
const httpLogger = new Logger('Http');

type LoggedFastifyRequest = FastifyRequest & {
  [REQUEST_STARTED_AT]?: bigint;
};

export function createApiAdapter() {
  return new FastifyAdapter({
    trustProxy: resolveTrustProxy({
      trustProxy: process.env.TRUST_PROXY,
    }),
  });
}

export async function configureApiApp(app: NestFastifyApplication) {
  const nodeEnv = process.env.NODE_ENV;
  const corsOrigin = process.env.CORS_ORIGIN;
  const publicApiBaseUrl = process.env.PUBLIC_API_BASE_URL;
  const httpRequestLoggingEnabled = resolveBooleanFlag({
    value: process.env.LOG_HTTP_REQUESTS,
    fallback: nodeEnv !== 'test',
  });
  const trustedOrigins = resolveTrustedRequestOrigins({
    nodeEnv,
    corsOrigin,
    publicApiBaseUrl,
  });

  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  await app.register(multipart, {
    limits: MULTIPART_LIMITS,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    frameguard: {
      action: 'deny',
    },
    hsts: isProductionEnvironment(nodeEnv)
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    noSniff: true,
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
    referrerPolicy: {
      policy: 'same-origin',
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: resolveCorsOrigins({
      nodeEnv,
      corsOrigin,
    }),
    credentials: true,
  });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', async (request, reply) => {
      const loggedRequest = request as LoggedFastifyRequest;
      loggedRequest[REQUEST_STARTED_AT] = process.hrtime.bigint();
      reply.header('x-request-id', request.id);

      if (!UNSAFE_HTTP_METHODS.has(request.method)) {
        return;
      }

      if (!request.headers.cookie?.trim()) {
        return;
      }

      const sourceOrigin = extractRequestSourceOrigin(
        request.headers.origin,
        request.headers.referer,
      );

      if (!sourceOrigin) {
        reply.code(403).send({
          message:
            'Missing Origin or Referer for cookie-authenticated write request.',
        });
        return reply;
      }

      const requestOrigin = buildRequestOriginFromHeaders({
        host: request.headers.host,
        forwardedHost: request.headers['x-forwarded-host'],
        forwardedProto: request.headers['x-forwarded-proto'],
      });

      if (
        !isTrustedRequestOrigin({
          sourceOrigin,
          trustedOrigins,
          requestOrigin,
        })
      ) {
        reply.code(403).send({
          message:
            'Cross-site cookie-authenticated write requests are not allowed from this origin.',
        });
        return reply;
      }
    });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onResponse', async (request, reply) => {
      if (!httpRequestLoggingEnabled) {
        return;
      }

      const loggedRequest = request as LoggedFastifyRequest;
      const startedAt = loggedRequest[REQUEST_STARTED_AT];
      const durationMs = startedAt
        ? Number(process.hrtime.bigint() - startedAt) / 1_000_000
        : null;

      httpLogger.log(
        serializeLogEvent('http_request_completed', {
          requestId: request.id,
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          durationMs:
            typeof durationMs === 'number'
              ? Number(durationMs.toFixed(2))
              : null,
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        }),
      );
    });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onError', async (request, reply, error) => {
      httpLogger.error(
        serializeLogEvent('http_request_failed', {
          requestId: request.id,
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          message: describeError(error),
          ip: request.ip,
        }),
      );
    });

  return app;
}
