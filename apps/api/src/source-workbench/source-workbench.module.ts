import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { SourceWorkbenchController } from './source-workbench.controller';
import { SourceWorkbenchService } from './source-workbench.service';

@Module({
  controllers: [SourceWorkbenchController],
  providers: [SourceWorkbenchService, AdminRoleGuard],
})
export class SourceWorkbenchModule {}
