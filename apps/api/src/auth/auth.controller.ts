import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('options')
  getRegistrationOptions() {
    return this.authService.getRegistrationOptions();
  }

  @HttpCode(200)
  @Post('logout')
  logout() {
    return {
      success: true,
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserProfile(request.user!.id);
  }

  @UseGuards(SessionAuthGuard)
  @Post('profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.authService.updateCurrentUserProfile(request.user!.id, payload);
  }
}
