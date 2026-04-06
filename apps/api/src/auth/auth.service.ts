import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type User, verifyToken } from '@clerk/backend';
import { Prisma, SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';
import { UpdateProfileDto } from './dto/update-profile.dto';

type AuthenticateRequestInput = {
  authorizationHeader?: string | string[] | null;
  cookieHeader?: string | string[] | null;
};

type UserProfileRecord = Prisma.UserGetPayload<{
  select: {
    id: true;
    clerkUserId: true;
    email: true;
    fullName: true;
    role: true;
    subscriptionStatus: true;
    streamFamily: {
      select: {
        code: true;
        name: true;
      };
    };
    stream: {
      select: {
        code: true;
        name: true;
      };
    };
  };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getRegistrationOptions() {
    const streamFamilies = await this.prisma.streamFamily.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        code: true,
        name: true,
      },
    });

    return {
      streams: streamFamilies,
    };
  }

  async authenticateRequest(
    input: AuthenticateRequestInput,
  ): Promise<AuthenticatedUser> {
    const token = this.readRequestToken(input);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload = await verifyToken(token, {
        authorizedParties: this.getAuthorizedParties(),
        secretKey: this.getClerkSecretKey(),
      });
      const clerkUserId =
        typeof payload.sub === 'string' ? payload.sub.trim() : '';

      if (!clerkUserId) {
        throw new UnauthorizedException('Authentication required.');
      }

      const user = await this.findOrProvisionUser(clerkUserId);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        sessionId: typeof payload.sid === 'string' ? payload.sid : null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication required.');
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userProfileSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    return {
      user: this.mapUserProfile(user),
    };
  }

  async updateCurrentUserProfile(userId: string, payload: UpdateProfileDto) {
    const streamSelection = await this.resolveUserStreamSelection(
      payload.streamCode,
    );
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: payload.username.trim(),
        streamFamilyId: streamSelection.streamFamilyId,
        streamId: streamSelection.streamId,
      },
      select: this.userProfileSelect,
    });

    return {
      user: this.mapUserProfile(updatedUser),
    };
  }

  private get userProfileSelect() {
    return {
      id: true,
      clerkUserId: true,
      email: true,
      fullName: true,
      role: true,
      subscriptionStatus: true,
      streamFamily: {
        select: {
          code: true,
          name: true,
        },
      },
      stream: {
        select: {
          code: true,
          name: true,
        },
      },
    } satisfies Prisma.UserSelect;
  }

  private async findOrProvisionUser(clerkUserId: string) {
    const existingByClerkId = await this.prisma.user.findUnique({
      where: { clerkUserId },
      select: this.userProfileSelect,
    });

    if (existingByClerkId) {
      return this.ensureBootstrapAdminRole(existingByClerkId);
    }

    const clerkUser = await this.getClerkClient().users.getUser(clerkUserId);
    const email = this.readPrimaryClerkEmail(clerkUser);
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: this.userProfileSelect,
    });
    const fullName = this.resolveDisplayName(clerkUser, email);

    if (existingByEmail) {
      if (
        existingByEmail.clerkUserId &&
        existingByEmail.clerkUserId !== clerkUserId
      ) {
        throw new UnauthorizedException(
          'This email is already linked to another account.',
        );
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkUserId,
          fullName: existingByEmail.fullName ?? fullName,
          role: this.resolveBootstrapRole(email, existingByEmail.role),
        },
        select: this.userProfileSelect,
      });

      return updatedUser;
    }

    return this.prisma.user.create({
      data: {
        clerkUserId,
        email,
        fullName,
        role: this.resolveBootstrapRole(email),
        subscriptionStatus: SubscriptionStatus.FREE,
      },
      select: this.userProfileSelect,
    });
  }

  private async ensureBootstrapAdminRole(user: UserProfileRecord) {
    const bootstrapRole = this.resolveBootstrapRole(user.email, user.role);

    if (bootstrapRole === user.role) {
      return user;
    }

    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        role: bootstrapRole,
      },
      select: this.userProfileSelect,
    });
  }

  private resolveBootstrapRole(
    email: string,
    fallback: UserRole = UserRole.USER,
  ) {
    const normalizedBootstrapEmail = this.configService
      .get<string>('AUTH_BOOTSTRAP_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();

    if (
      normalizedBootstrapEmail &&
      email.trim().toLowerCase() === normalizedBootstrapEmail
    ) {
      return UserRole.ADMIN;
    }

    return fallback;
  }

  private resolveDisplayName(clerkUser: User, email: string) {
    const fullName = clerkUser.fullName?.trim();

    if (fullName) {
      return fullName;
    }

    const username = clerkUser.username?.trim();

    if (username) {
      return username;
    }

    const firstName = clerkUser.firstName?.trim() ?? '';
    const lastName = clerkUser.lastName?.trim() ?? '';
    const joinedName = `${firstName} ${lastName}`.trim();

    if (joinedName) {
      return joinedName;
    }

    return email.split('@')[0] ?? 'Student';
  }

  private readPrimaryClerkEmail(clerkUser: User) {
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      ) ?? clerkUser.emailAddresses[0];

    const email = primaryEmail?.emailAddress?.trim().toLowerCase();

    if (!email) {
      throw new UnauthorizedException('A verified email is required.');
    }

    return email;
  }

  private mapUserProfile(user: UserProfileRecord) {
    const selectedStream = user.streamFamily ?? user.stream;

    return {
      id: user.id,
      username: user.fullName?.trim() || user.email.split('@')[0] || 'Student',
      email: user.email,
      role: this.normalizeRole(user.role),
      stream: selectedStream
        ? {
            code: selectedStream.code,
            name: selectedStream.name,
          }
        : null,
      subscriptionStatus: user.subscriptionStatus,
    };
  }

  private normalizeRole(role: UserRole): 'STUDENT' | 'ADMIN' {
    return role === UserRole.ADMIN ? 'ADMIN' : 'STUDENT';
  }

  private async resolveUserStreamSelection(streamCode: string) {
    const normalizedCode = streamCode.trim().toUpperCase();
    const streamFamily = await this.prisma.streamFamily.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        pathways: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            isDefault: true,
          },
        },
      },
    });

    if (!streamFamily) {
      throw new BadRequestException('Selected stream is invalid.');
    }

    const defaultPathway =
      streamFamily.pathways.find((pathway) => pathway.isDefault) ??
      (streamFamily.pathways.length === 1 ? streamFamily.pathways[0] : null);

    return {
      streamFamilyId: streamFamily.id,
      streamId: defaultPathway?.id ?? null,
    };
  }

  private getClerkClient() {
    return createClerkClient({
      secretKey: this.getClerkSecretKey(),
    });
  }

  private getClerkSecretKey() {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY')?.trim();

    if (!secretKey) {
      throw new UnauthorizedException(
        'Authentication provider is not configured.',
      );
    }

    return secretKey;
  }

  private getAuthorizedParties() {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN');

    if (!corsOrigin?.trim()) {
      return undefined;
    }

    const origins = corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return origins.length > 0 ? origins : undefined;
  }

  private readRequestToken(input: AuthenticateRequestInput) {
    const authorizationHeader = this.readHeaderValue(input.authorizationHeader);

    if (authorizationHeader?.toLowerCase().startsWith('bearer ')) {
      return authorizationHeader.slice('bearer '.length).trim();
    }

    const cookieHeader = this.readHeaderValue(input.cookieHeader);

    if (!cookieHeader) {
      return null;
    }

    const sessionCookie = cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith('__session='));

    if (!sessionCookie) {
      return null;
    }

    const token = decodeURIComponent(sessionCookie.slice('__session='.length));
    return token.trim() || null;
  }

  private readHeaderValue(
    value?: string | string[] | null,
  ): string | null {
    if (Array.isArray(value)) {
      return value[0]?.trim() || null;
    }

    return value?.trim() || null;
  }
}
