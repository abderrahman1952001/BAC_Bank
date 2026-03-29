import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import {
  AUTH_SESSION_COOKIE_NAME,
  createAuthSessionToken,
  readCookieValue,
  serializeAuthSessionCookie,
  serializeClearedAuthSessionCookie,
  verifyAuthSessionToken,
} from './auth-session';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';
import {
  resolveAuthSessionSecret,
  resolveBooleanFlag,
} from '../runtime/runtime-config';

const scrypt = promisify(scryptCallback);

type UserProfileRecord = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    fullName: true;
    role: true;
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
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (!this.shouldBootstrapAdminOnStartup()) {
      return;
    }

    await this.ensureBootstrapAdmin();
  }

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

  async register(payload: RegisterDto) {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email.');
    }

    const streamSelection = await this.resolveUserStreamSelection(
      payload.streamCode,
    );
    const passwordHash = await this.hashPassword(payload.password);

    const createdUser = await this.prisma.user.create({
      data: {
        email,
        fullName: payload.username.trim(),
        passwordHash,
        role: UserRole.USER,
        streamFamilyId: streamSelection.streamFamilyId,
        streamId: streamSelection.streamId,
      },
      select: this.userProfileSelect,
    });

    return await this.buildAuthResult(createdUser);
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email.trim().toLowerCase() },
      select: {
        ...this.userProfileSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.verifyPassword(
      payload.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const profile: UserProfileRecord = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      streamFamily: user.streamFamily,
      stream: user.stream,
    };

    return await this.buildAuthResult(profile);
  }

  async authenticateRequest(cookieHeader?: string) {
    const sessionPayload = this.readVerifiedSessionPayload(cookieHeader);
    const persistedSession = await this.prisma.authSession.findUnique({
      where: { id: sessionPayload.sid },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (
      !persistedSession ||
      persistedSession.userId !== sessionPayload.sub ||
      persistedSession.revokedAt ||
      persistedSession.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Authentication required.');
    }

    return {
      id: persistedSession.user.id,
      email: persistedSession.user.email,
      role: this.normalizeRole(persistedSession.user.role),
      sessionId: persistedSession.id,
    } satisfies AuthenticatedUser;
  }

  async invalidateSession(cookieHeader?: string) {
    const sessionPayload = this.tryReadVerifiedSessionPayload(cookieHeader);

    if (!sessionPayload) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        id: sessionPayload.sid,
        userId: sessionPayload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
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

  createClearedSessionCookie() {
    return serializeClearedAuthSessionCookie(this.isSecureCookieEnabled());
  }

  private get userProfileSelect() {
    return {
      id: true,
      email: true,
      fullName: true,
      role: true,
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

  private async buildAuthResult(user: UserProfileRecord) {
    const ttlSeconds = this.getSessionTtlSeconds(user.role);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);
    const persistedSession = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        expiresAt,
      },
      select: {
        id: true,
      },
    });
    const nowInSeconds = Math.floor(issuedAt.getTime() / 1000);
    const role = this.normalizeRole(user.role);
    const sessionToken = createAuthSessionToken(
      {
        sub: user.id,
        sid: persistedSession.id,
        role,
        iat: nowInSeconds,
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      this.getSessionSecret(),
    );

    return {
      user: this.mapUserProfile(user),
      cookie: serializeAuthSessionCookie(
        sessionToken,
        ttlSeconds,
        this.isSecureCookieEnabled(),
      ),
    };
  }

  private mapUserProfile(user: UserProfileRecord) {
    const selectedStream = user.streamFamily ?? user.stream;

    return {
      id: user.id,
      username: user.fullName ?? user.email.split('@')[0] ?? 'Student',
      email: user.email,
      role: this.normalizeRole(user.role),
      stream: selectedStream
        ? {
            code: selectedStream.code,
            name: selectedStream.name,
          }
        : null,
    };
  }

  private normalizeRole(role: UserRole): 'USER' | 'ADMIN' {
    return role === UserRole.ADMIN ? 'ADMIN' : 'USER';
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

  private async hashPassword(password: string) {
    const salt = randomBytes(16);
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string) {
    const [algorithm, saltHex, hashHex] = storedHash.split('$');

    if (
      algorithm !== 'scrypt' ||
      typeof saltHex !== 'string' ||
      typeof hashHex !== 'string'
    ) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const candidateHash = (await scrypt(
      password,
      salt,
      expectedHash.length,
    )) as Buffer;

    return timingSafeEqual(expectedHash, candidateHash);
  }

  private getSessionSecret() {
    return resolveAuthSessionSecret({
      nodeEnv: this.configService.get<string>('NODE_ENV'),
      authSessionSecret: this.configService.get<string>('AUTH_SESSION_SECRET'),
      legacyJwtSecret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  private getSessionTtlSeconds(role: UserRole) {
    if (role === UserRole.ADMIN) {
      return (
        this.readPositiveIntegerConfig('AUTH_ADMIN_SESSION_TTL_HOURS', 12) *
        60 *
        60
      );
    }

    return (
      this.readPositiveIntegerConfig('AUTH_SESSION_TTL_DAYS', 7) * 24 * 60 * 60
    );
  }

  private isSecureCookieEnabled() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private readPositiveIntegerConfig(name: string, fallback: number) {
    const rawValue = this.configService.get<string>(name);
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return fallback;
    }

    return parsedValue;
  }

  private readVerifiedSessionPayload(cookieHeader?: string) {
    const sessionPayload = this.tryReadVerifiedSessionPayload(cookieHeader);

    if (!sessionPayload) {
      throw new UnauthorizedException('Authentication required.');
    }

    return sessionPayload;
  }

  private tryReadVerifiedSessionPayload(cookieHeader?: string) {
    const token = readCookieValue(cookieHeader, AUTH_SESSION_COOKIE_NAME);

    if (!token) {
      return null;
    }

    return verifyAuthSessionToken(token, this.getSessionSecret());
  }

  private shouldBootstrapAdminOnStartup() {
    return resolveBooleanFlag({
      value: this.configService.get<string>('AUTH_BOOTSTRAP_ADMIN_ON_STARTUP'),
      fallback: false,
    });
  }

  private async ensureBootstrapAdmin() {
    const email = this.configService
      .get<string>('AUTH_BOOTSTRAP_ADMIN_EMAIL')
      ?.trim()
      .toLowerCase();
    const password = this.configService.get<string>(
      'AUTH_BOOTSTRAP_ADMIN_PASSWORD',
    );

    if (!email || !password) {
      return;
    }

    const username =
      this.configService.get<string>('AUTH_BOOTSTRAP_ADMIN_USERNAME')?.trim() ||
      'BAC Admin';
    const streamCode =
      this.configService
        .get<string>('AUTH_BOOTSTRAP_ADMIN_STREAM_CODE')
        ?.trim()
        .toUpperCase() || 'SE';
    const streamSelection = await this.resolveUserStreamSelection(streamCode);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        fullName: true,
        streamFamilyId: true,
        streamId: true,
      },
    });

    if (existingUser) {
      const updateData: Prisma.UserUpdateInput = {};

      if (existingUser.role !== UserRole.ADMIN) {
        updateData.role = UserRole.ADMIN;
      }

      if (!existingUser.fullName) {
        updateData.fullName = username;
      }

      if (!existingUser.streamFamilyId) {
        updateData.streamFamily = {
          connect: {
            id: streamSelection.streamFamilyId,
          },
        };
      }

      if (!existingUser.streamId && streamSelection.streamId) {
        updateData.stream = {
          connect: {
            id: streamSelection.streamId,
          },
        };
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: updateData,
        });
      }

      return;
    }

    await this.prisma.user.create({
      data: {
        email,
        fullName: username,
        passwordHash: await this.hashPassword(password),
        role: UserRole.ADMIN,
        streamFamilyId: streamSelection.streamFamilyId,
        streamId: streamSelection.streamId,
      },
    });

    this.logger.log(`Bootstrapped admin account for ${email}.`);
  }
}
