import { Body, Controller, Get, Req, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('options')
  getRegistrationOptions() {
    return this.authService.getRegistrationOptions();
  }

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserProfile(request.user!.id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('profile')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.authService.updateCurrentUserProfile(request.user!.id, payload);
  }
}
