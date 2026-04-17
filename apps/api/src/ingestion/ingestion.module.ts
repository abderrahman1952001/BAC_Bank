import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IngestionController } from './ingestion.controller';
import { IngestionDraftIntakeService } from './ingestion-draft-intake.service';
import { IngestionPublishedAssetsService } from './ingestion-published-assets.service';
import { IngestionPaperSourceService } from './ingestion-paper-source.service';
import { IngestionProcessingEngineService } from './ingestion-processing-engine.service';
import { IngestionOpsService } from './ingestion-ops.service';
import { IngestionPublicationService } from './ingestion-publication.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { IngestionReadService } from './ingestion-read.service';
import { IngestionRecoveryService } from './ingestion-recovery.service';
import { IngestionReviewService } from './ingestion-review.service';
import { IngestionPublishedVariantService } from './ingestion-published-variant.service';
import { IngestionSourceIntakeService } from './ingestion-source-intake.service';
import { IngestionStoredPageService } from './ingestion-stored-page.service';
import { IngestionSourceDocumentService } from './ingestion-source-document.service';
import { IngestionService } from './ingestion.service';
import { IngestionWorkerService } from './ingestion-worker.service';

@Module({
  imports: [PrismaModule, CatalogModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionReadService,
    IngestionOpsService,
    IngestionDraftIntakeService,
    IngestionPublicationService,
    IngestionQueueService,
    IngestionRecoveryService,
    IngestionReviewService,
    IngestionPublishedAssetsService,
    IngestionPaperSourceService,
    IngestionPublishedVariantService,
    IngestionProcessingEngineService,
    IngestionStoredPageService,
    IngestionSourceDocumentService,
    IngestionSourceIntakeService,
    IngestionWorkerService,
    AdminRoleGuard,
  ],
  exports: [
    IngestionService,
    IngestionOpsService,
    IngestionQueueService,
    IngestionWorkerService,
    IngestionProcessingEngineService,
    IngestionPaperSourceService,
    IngestionSourceIntakeService,
  ],
})
export class IngestionModule {}
