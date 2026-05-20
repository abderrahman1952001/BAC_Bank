import { Module } from '@nestjs/common';
import { AdminRoleGuard } from '../admin/admin.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { FlashcardsModule } from '../flashcards/flashcards.module';
import { LabModule } from '../lab/lab.module';
import { StudyCommandAdminController } from './study-command-admin.controller';
import { StudyCommandBrainService } from './study-command-brain.service';
import { StudyCommandController } from './study-command.controller';
import { StudyCommandAiRouterService } from './study-command-ai-router.service';
import { StudyCommandService } from './study-command.service';
import { StudyCommandUsageGuardService } from './study-command-usage-guard.service';
import { StudyController } from './study.controller';
import { StudyReadModelService } from './study-read-model.service';
import { StudyExamActivityService } from './study-exam-activity.service';
import { StudyExerciseStateService } from './study-exercise-state.service';
import { StudyQuestionAiExplanationService } from './study-question-ai-explanation.service';
import { StudyCurriculumJourneyService } from './study-curriculum-journey.service';
import { StudyReviewService } from './study-review.service';
import { StudySessionService } from './study-session.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

@Module({
  imports: [CatalogModule, FlashcardsModule, LabModule],
  controllers: [
    StudyController,
    StudyCommandController,
    StudyCommandAdminController,
  ],
  providers: [
    StudyService,
    StudyCommandAiRouterService,
    StudyCommandBrainService,
    StudyCommandService,
    StudyCommandUsageGuardService,
    StudySessionService,
    StudyExamActivityService,
    StudyExerciseStateService,
    StudyQuestionAiExplanationService,
    StudyCurriculumJourneyService,
    StudyReadModelService,
    StudyReviewService,
    StudyWeakPointService,
    AdminRoleGuard,
  ],
  exports: [StudyCurriculumJourneyService, StudyService],
})
export class StudyModule {}
