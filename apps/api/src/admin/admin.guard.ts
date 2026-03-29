import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedRequest } from '../auth/auth.types';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.authService.authenticateRequest(
      request.headers.cookie,
    );

    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'ADMIN role is required to access this endpoint.',
      );
    }

    return true;
  }
}
