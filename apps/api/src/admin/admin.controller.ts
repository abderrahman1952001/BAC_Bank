import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminRoleGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(AdminRoleGuard)
  @Get('me')
  getMe(@Req() request: AuthenticatedRequest) {
    return this.adminService.getMe(request.user!);
  }

  @UseGuards(AdminRoleGuard)
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @UseGuards(AdminRoleGuard)
  @Get('filters')
  getFilters() {
    return this.adminService.getFilters();
  }
}
