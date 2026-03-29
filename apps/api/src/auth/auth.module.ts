import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthRateLimitService, AuthService, SessionAuthGuard],
  exports: [AuthRateLimitService, AuthService, SessionAuthGuard],
})
export class AuthModule {}
