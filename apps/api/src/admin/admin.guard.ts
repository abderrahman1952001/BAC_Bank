import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

type GuardRequest = FastifyRequest & {
  user?: {
    role?: string;
  };
};

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    const headerRole = this.normalizeHeaderRole(request.headers['x-user-role']);
    const cookieRole = this.readCookieRole(request.headers.cookie);
    const userRole = request.user?.role?.toUpperCase();

    const role = userRole ?? headerRole ?? cookieRole;

    if (role !== 'ADMIN') {
      throw new ForbiddenException('ADMIN role is required to access this endpoint.');
    }

    return true;
  }

  private normalizeHeaderRole(headerValue: string | string[] | undefined) {
    if (!headerValue) {
      return null;
    }

    const firstValue = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    return firstValue.trim().toUpperCase();
  }

  private readCookieRole(cookieHeader?: string) {
    if (!cookieHeader) {
      return null;
    }

    const rolePair = cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith('bb_role='));

    if (!rolePair) {
      return null;
    }

    const role = rolePair.split('=')[1] ?? '';
    return decodeURIComponent(role).toUpperCase();
  }
}
