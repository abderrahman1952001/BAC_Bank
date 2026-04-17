import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { AuthService } from './auth.service';

jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(),
  verifyToken: jest.fn(),
}));

const mockedCreateClerkClient = jest.mocked(createClerkClient);
const mockedVerifyToken = jest.mocked(verifyToken);
const freeStudyEntitlements = {
  tier: 'FREE',
  capabilities: {
    topicDrill: true,
    mixedDrill: true,
    weakPointDrill: false,
    paperSimulation: true,
    aiExplanation: false,
    weakPointInsight: false,
  },
  quotas: {
    drillStarts: {
      monthlyLimit: 5,
      used: 0,
      remaining: 5,
      exhausted: false,
      nearLimit: false,
      resetsAt: '2026-04-30T23:00:00.000Z',
    },
    simulationStarts: {
      monthlyLimit: 1,
      used: 0,
      remaining: 1,
      exhausted: false,
      nearLimit: false,
      resetsAt: '2026-04-30T23:00:00.000Z',
    },
  },
};

describe('AuthService', () => {
  let configService: Pick<ConfigService, 'get'>;
  let prisma: {
    streamFamily: {
      findMany: jest.Mock;
    };
    stream: {
      findUnique: jest.Mock;
    };
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    studySession: {
      count: jest.Mock;
    };
  };
  let service: AuthService;

  beforeEach(() => {
    const values: Record<string, string> = {
      AUTH_BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
      CLERK_SECRET_KEY: 'sk_test_example',
      CORS_ORIGIN: 'http://localhost:3000',
    };

    configService = {
      get: jest.fn((name: string) => values[name]),
    };
    prisma = {
      streamFamily: {
        findMany: jest.fn(),
      },
      stream: {
        findUnique: jest.fn(),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      studySession: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    mockedVerifyToken.mockReset();
    mockedCreateClerkClient.mockReset();

    service = new AuthService(prisma as never, configService as ConfigService);
  });

  it('provisions a Clerk-backed student account on first authenticated request', async () => {
    mockedVerifyToken.mockResolvedValue({
      sid: 'sess_123',
      sub: 'user_clerk_123',
    } as never);
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'user-1',
      clerkUserId: 'user_clerk_123',
      email: 'student@example.com',
      fullName: 'Student Example',
      role: UserRole.USER,
      subscriptionStatus: SubscriptionStatus.FREE,
      stream: null,
    });
    mockedCreateClerkClient.mockReturnValue({
      users: {
        getUser: jest.fn().mockResolvedValue({
          primaryEmailAddressId: 'email_1',
          emailAddresses: [
            {
              id: 'email_1',
              emailAddress: 'student@example.com',
            },
          ],
          firstName: 'Student',
          fullName: 'Student Example',
          lastName: 'Example',
          username: null,
        }),
      },
    } as never);

    await expect(
      service.authenticateRequest({
        authorizationHeader: 'Bearer test-token',
      }),
    ).resolves.toMatchObject({
      id: 'user-1',
      email: 'student@example.com',
      role: UserRole.USER,
    });

    expect(mockedVerifyToken).toHaveBeenCalledWith('test-token', {
      authorizedParties: ['http://localhost:3000'],
      secretKey: 'sk_test_example',
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: 'user_clerk_123',
          email: 'student@example.com',
          role: UserRole.USER,
          subscriptionStatus: SubscriptionStatus.FREE,
        }),
      }),
    );
  });

  it('attaches Clerk identity to an existing admin matched by email', async () => {
    mockedVerifyToken.mockResolvedValue({
      sid: 'sess_admin',
      sub: 'user_clerk_admin',
    } as never);
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'admin-1',
        clerkUserId: null,
        email: 'admin@example.com',
        fullName: 'Admin',
        role: UserRole.ADMIN,
        subscriptionStatus: SubscriptionStatus.FREE,
        stream: null,
      });
    prisma.user.update.mockResolvedValueOnce({
      id: 'admin-1',
      clerkUserId: 'user_clerk_admin',
      email: 'admin@example.com',
      fullName: 'Admin',
      role: UserRole.ADMIN,
      subscriptionStatus: SubscriptionStatus.FREE,
      stream: null,
    });
    mockedCreateClerkClient.mockReturnValue({
      users: {
        getUser: jest.fn().mockResolvedValue({
          primaryEmailAddressId: 'email_1',
          emailAddresses: [
            {
              id: 'email_1',
              emailAddress: 'admin@example.com',
            },
          ],
          firstName: 'Admin',
          fullName: 'Admin',
          lastName: null,
          username: null,
        }),
      },
    } as never);

    await expect(
      service.authenticateRequest({
        authorizationHeader: 'Bearer admin-token',
      }),
    ).resolves.toMatchObject({
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clerkUserId: 'user_clerk_admin',
          role: UserRole.ADMIN,
        }),
      }),
    );
  });

  it('updates the current user profile with username and stream selection', async () => {
    prisma.stream.findUnique.mockResolvedValueOnce({
      id: 'stream-1',
    });
    prisma.user.update.mockResolvedValueOnce({
      id: 'user-1',
      clerkUserId: 'user_clerk_123',
      email: 'student@example.com',
      fullName: 'Sara',
      role: UserRole.USER,
      subscriptionStatus: SubscriptionStatus.FREE,
      stream: {
        code: 'SE',
        name: 'Sciences experimentales',
      },
    });

    await expect(
      service.updateCurrentUserProfile('user-1', {
        streamCode: 'se',
        username: 'Sara',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        username: 'Sara',
        email: 'student@example.com',
        role: 'STUDENT',
        stream: {
          code: 'SE',
          name: 'Sciences experimentales',
        },
        subscriptionStatus: 'FREE',
        studyEntitlements: freeStudyEntitlements,
      },
    });
  });

  it('rejects requests that do not contain a Clerk token', async () => {
    await expect(
      service.authenticateRequest({
        authorizationHeader: null,
        cookieHeader: null,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
