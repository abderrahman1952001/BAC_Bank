import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { StudyController } from './study.controller';
import { StudyReadModelService } from './study-read-model.service';
import { StudyExamActivityService } from './study-exam-activity.service';
import { StudyExerciseStateService } from './study-exercise-state.service';
import { StudyQuestionAiExplanationService } from './study-question-ai-explanation.service';
import { StudyRoadmapService } from './study-roadmap.service';
import { StudyReviewService } from './study-review.service';
import { StudySessionService } from './study-session.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

@Module({
  imports: [CatalogModule],
  controllers: [StudyController],
  providers: [
    StudyService,
    StudySessionService,
    StudyExamActivityService,
    StudyExerciseStateService,
    StudyQuestionAiExplanationService,
    StudyRoadmapService,
    StudyReadModelService,
    StudyReviewService,
    StudyWeakPointService,
  ],
  exports: [StudyRoadmapService, StudyService],
})
export class StudyModule {}
