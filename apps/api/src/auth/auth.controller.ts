import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionAuthGuard } from './session-auth.guard';
import type { AuthenticatedRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authRateLimitService: AuthRateLimitService,
    private readonly authService: AuthService,
  ) {}

  @Get('options')
  getRegistrationOptions() {
    return this.authService.getRegistrationOptions();
  }

  @Post('register')
  async register(
    @Req() request: FastifyRequest,
    @Body() payload: RegisterDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const scope = {
      action: 'register' as const,
      email: payload.email,
      ip: request.ip,
    };
    await this.authRateLimitService.assertRequestAllowed(scope);

    try {
      const result = await this.authService.register(payload);
      await this.authRateLimitService.recordSuccess(scope);
      response.header('Set-Cookie', result.cookie);

      return {
        user: result.user,
      };
    } catch (error) {
      await this.authRateLimitService.recordFailure(scope);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Req() request: FastifyRequest,
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const scope = {
      action: 'login' as const,
      email: payload.email,
      ip: request.ip,
    };
    await this.authRateLimitService.assertRequestAllowed(scope);

    try {
      const result = await this.authService.login(payload);
      await this.authRateLimitService.recordSuccess(scope);
      response.header('Set-Cookie', result.cookie);

      return {
        user: result.user,
      };
    } catch (error) {
      await this.authRateLimitService.recordFailure(scope);
      throw error;
    }
  }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    await this.authService.invalidateSession(request.headers.cookie);
    response.header(
      'Set-Cookie',
      this.authService.createClearedSessionCookie(),
    );

    return {
      success: true,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserProfile(request.user!.id);
  }
}
