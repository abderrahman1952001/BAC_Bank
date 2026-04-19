import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { AdminBillingController } from './admin-billing.controller';
import { BillingController } from './billing.controller';
import { BillingSettingsService } from './billing-settings.service';
import { BillingService } from './billing.service';
import { ChargilyClient } from './chargily.client';

@Module({
  controllers: [BillingController, AdminBillingController],
  providers: [
    BillingService,
    BillingSettingsService,
    ChargilyClient,
    AdminRoleGuard,
  ],
  exports: [BillingService, BillingSettingsService],
})
export class BillingModule {}
