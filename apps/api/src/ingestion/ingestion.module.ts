import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionController } from './ingestion.controller';
import { IngestionPublishedAssetsService } from './ingestion-published-assets.service';
import { IngestionPublishedVariantService } from './ingestion-published-variant.service';
import { IngestionStoredPageService } from './ingestion-stored-page.service';
import { IngestionSourceDocumentService } from './ingestion-source-document.service';
import { IngestionService } from './ingestion.service';
import { IngestionWorkerService } from './ingestion-worker.service';

@Module({
  imports: [PrismaModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionPublishedAssetsService,
    IngestionPublishedVariantService,
    IngestionStoredPageService,
    IngestionSourceDocumentService,
    IngestionWorkerService,
    AdminRoleGuard,
  ],
  exports: [IngestionService, IngestionWorkerService],
})
export class IngestionModule {}
