import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminRoleGuard } from './admin.guard';
import { AdminReferenceService } from './admin-reference.service';
import { AdminService } from './admin.service';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [AdminController],
  providers: [AdminService, AdminReferenceService, AdminRoleGuard],
})
export class AdminModule {}
