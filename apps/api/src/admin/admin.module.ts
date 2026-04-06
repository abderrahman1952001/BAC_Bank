import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminRoleGuard } from './admin.guard';
import { AdminReferenceService } from './admin-reference.service';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminReferenceService, AdminRoleGuard],
})
export class AdminModule {}
