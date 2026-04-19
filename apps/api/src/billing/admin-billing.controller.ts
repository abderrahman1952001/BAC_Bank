import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type {
  AdminBillingSettingsResponse,
  UpdateAdminBillingSettingsRequest,
} from '@bac-bank/contracts/admin';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { AdminRoleGuard } from '../admin/admin.guard';
import { BillingSettingsService } from './billing-settings.service';
import { UpdateAdminBillingSettingsDto } from './dto/update-admin-billing-settings.dto';

@Controller('admin/billing')
export class AdminBillingController {
  constructor(
    private readonly billingSettingsService: BillingSettingsService,
  ) {}

  @UseGuards(AdminRoleGuard)
  @Get('settings')
  getBillingSettings(): Promise<AdminBillingSettingsResponse> {
    return this.billingSettingsService.getAdminBillingSettings();
  }

  @UseGuards(AdminRoleGuard)
  @Put('settings')
  updateBillingSettings(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateAdminBillingSettingsDto,
  ): Promise<AdminBillingSettingsResponse> {
    return this.billingSettingsService.updateAdminBillingSettings(
      request.user!,
      payload as UpdateAdminBillingSettingsRequest,
    );
  }
}
