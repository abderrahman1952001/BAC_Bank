import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [PrismaModule],
  controllers: [IngestionController],
  providers: [IngestionService, AdminRoleGuard],
})
export class IngestionModule {}
