import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { scrypt as scryptCallback, randomBytes } from 'crypto';
import { promisify } from 'util';
import {
  AUTH_SESSION_COOKIE_NAME,
  createAuthSessionToken,
  readCookieValue,
  verifyAuthSessionToken,
} from './auth-session';
import { AuthService } from './auth.service';

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

describe('AuthService', () => {
  let configService: Pick<ConfigService, 'get'>;
  let prisma: {
    authSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    streamFamily: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: AuthService;

  beforeEach(() => {
    const values: Record<string, string> = {
      AUTH_ADMIN_SESSION_TTL_HOURS: '12',
      AUTH_SESSION_SECRET: 'test-session-secret-that-is-long-enough',
      AUTH_SESSION_TTL_DAYS: '7',
      NODE_ENV: 'test',
    };

    configService = {
      get: jest.fn((name: string) => values[name]),
    };
    prisma = {
      authSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      streamFamily: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new AuthService(prisma as never, configService as ConfigService);
  });

  it('creates persisted sessions for successful logins and authenticates against them', async () => {
    const password = 'correct horse battery staple';
    const storedHash = await hashPassword(password);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'student@example.com',
      fullName: 'Student',
      passwordHash: storedHash,
      role: UserRole.USER,
      streamFamily: null,
      stream: null,
    });
    prisma.authSession.create.mockResolvedValueOnce({
      id: 'session-1',
    });

    const result = await service.login({
      email: 'student@example.com',
      password,
    });
    const token = readCookieValue(result.cookie, AUTH_SESSION_COOKIE_NAME);

    expect(token).not.toBeNull();
    const createCalls = prisma.authSession.create.mock.calls as Array<
      [unknown]
    >;
    const createArgs = createCalls[0]?.[0] as
      | {
          data: {
            expiresAt: Date;
            userId: string;
          };
          select: {
            id: true;
          };
        }
      | undefined;

    expect(createArgs).toBeDefined();
    expect(createArgs?.data.userId).toBe('user-1');
    expect(createArgs?.data.expiresAt).toBeInstanceOf(Date);
    expect(createArgs?.select).toEqual({
      id: true,
    });

    const payload = verifyAuthSessionToken(
      token!,
      'test-session-secret-that-is-long-enough',
    );

    expect(payload).toMatchObject({
      sid: 'session-1',
      sub: 'user-1',
    });

    prisma.authSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: UserRole.USER,
      },
    });

    await expect(
      service.authenticateRequest(
        `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(token!)}`,
      ),
    ).resolves.toMatchObject({
      id: 'user-1',
      role: UserRole.USER,
      sessionId: 'session-1',
    });
  });

  it('revokes the current session on logout and rejects revoked sessions', async () => {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const token = createAuthSessionToken(
      {
        sub: 'user-1',
        sid: 'session-1',
        role: 'USER',
        iat: nowInSeconds,
        exp: nowInSeconds + 3600,
      },
      'test-session-secret-that-is-long-enough',
    );

    prisma.authSession.updateMany.mockResolvedValueOnce({ count: 1 });

    await service.invalidateSession(
      `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    );

    const updateCalls = prisma.authSession.updateMany.mock.calls as Array<
      [unknown]
    >;
    const updateArgs = updateCalls[0]?.[0] as
      | {
          data: {
            revokedAt: Date;
          };
          where: {
            id: string;
            revokedAt: null;
            userId: string;
          };
        }
      | undefined;

    expect(updateArgs).toBeDefined();
    expect(updateArgs?.where).toEqual({
      id: 'session-1',
      userId: 'user-1',
      revokedAt: null,
    });
    expect(updateArgs?.data.revokedAt).toBeInstanceOf(Date);

    prisma.authSession.findUnique.mockResolvedValueOnce({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: {
        id: 'user-1',
        email: 'student@example.com',
        role: UserRole.USER,
      },
    });

    await expect(
      service.authenticateRequest(
        `${AUTH_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
