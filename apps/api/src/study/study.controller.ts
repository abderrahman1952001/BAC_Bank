import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import type {
    CatalogResponse,
    CreateSessionResponse,
    ExamResponse,
    FiltersResponse,
    MyMistakesResponse,
    RecordReviewQueueOutcomeResponse,
    RecentExerciseStatesResponse,
    RecentExamActivitiesResponse,
    RecentStudySessionsResponse,
    SessionPreviewResponse,
    StudyQuestionAiExplanationResponse,
    StudyRoadmapsResponse,
  UpdateReviewQueueItemStatusResponse,
  StudySessionResponse,
  StudentExerciseStatesLookupResponse,
  UpsertExerciseStateResponse,
  UpsertExamActivityResponse,
  UpdateSessionProgressResponse,
  WeakPointInsightsResponse,
} from '@bac-bank/contracts/study';
import { CreateStudySessionDto } from './dto/create-study-session.dto';
import { GetExamQueryDto } from './dto/get-exam-query.dto';
import { GetStudyExerciseStateLookupQueryDto } from './dto/get-study-exercise-state-lookup-query.dto';
import { GetStudyRoadmapsQueryDto } from './dto/get-study-roadmaps-query.dto';
import { GetStudyReviewQueueQueryDto } from './dto/get-study-review-queue-query.dto';
import { GetStudySessionsQueryDto } from './dto/get-study-sessions-query.dto';
import { GetStudyWeakPointsQueryDto } from './dto/get-study-weak-points-query.dto';
import { CreateStudyReviewVaultSessionDto } from './dto/create-study-review-vault-session.dto';
import { RecordStudyReviewQueueOutcomeDto } from './dto/record-study-review-queue-outcome.dto';
import { UpdateStudyReviewQueueStatusDto } from './dto/update-study-review-queue-status.dto';
import { SubmitStudyQuestionEvaluationDto } from './dto/submit-study-question-evaluation.dto';
import { SubmitStudyQuestionAnswerDto } from './dto/submit-study-question-answer.dto';
import { UpsertStudyExerciseStateDto } from './dto/upsert-study-exercise-state.dto';
import { UpsertExamActivityDto } from './dto/upsert-exam-activity.dto';
import { UpdateStudySessionProgressDto } from './dto/update-study-session-progress.dto';
import { StudyExerciseStateService } from './study-exercise-state.service';
import { StudyRoadmapService } from './study-roadmap.service';
import { StudyReviewService } from './study-review.service';
import { StudyService } from './study.service';
import { StudyWeakPointService } from './study-weak-point.service';

@Controller('study')
export class StudyController {
  constructor(
    private readonly studyService: StudyService,
    private readonly studyExerciseStateService: StudyExerciseStateService,
    private readonly studyRoadmapService: StudyRoadmapService,
    private readonly studyReviewService: StudyReviewService,
    private readonly studyWeakPointService: StudyWeakPointService,
  ) {}

  @Get('filters')
  getFilters(): Promise<FiltersResponse> {
    return this.studyService.getFilters();
  }

  @Get('catalog')
  getCatalog(): Promise<CatalogResponse> {
    return this.studyService.getCatalog();
  }

  @Get('exams/:id')
  getExamById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetExamQueryDto,
  ): Promise<ExamResponse> {
    return this.studyService.getExamById(id, query.sujetNumber);
  }

  @UseGuards(ClerkAuthGuard)
  @Get('sessions')
  listRecentStudySessions(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudySessionsQueryDto,
  ): Promise<RecentStudySessionsResponse> {
    return this.studyService.listRecentStudySessions(
      request.user!.id,
      query.limit,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Get('exam-activities')
  listRecentExamActivities(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudySessionsQueryDto,
  ): Promise<RecentExamActivitiesResponse> {
    return this.studyService.listRecentExamActivities(
      request.user!.id,
      query.limit,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Get('exercise-states')
  listRecentExerciseStates(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudySessionsQueryDto,
  ): Promise<RecentExerciseStatesResponse> {
    return this.studyExerciseStateService.listRecentExerciseStates(
      request.user!.id,
      query.limit,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Get('exercise-states/lookup')
  lookupExerciseStates(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudyExerciseStateLookupQueryDto,
  ): Promise<StudentExerciseStatesLookupResponse> {
    return this.studyExerciseStateService.lookupExerciseStates(
      request.user!.id,
      query.exerciseNodeIds ?? [],
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Get('roadmaps')
  listStudyRoadmaps(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudyRoadmapsQueryDto,
  ): Promise<StudyRoadmapsResponse> {
    return this.studyRoadmapService.listStudyRoadmaps(request.user!.id, {
      limit: query.limit,
      subjectCode: query.subjectCode,
    });
  }

  @UseGuards(ClerkAuthGuard)
  @Get('my-mistakes')
  listMyMistakes(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudyReviewQueueQueryDto,
  ): Promise<MyMistakesResponse> {
    return this.studyReviewService.listMyMistakes(request.user!.id, {
      limit: query.limit,
      subjectCode: query.subjectCode,
      status: query.status,
    });
  }

  @UseGuards(ClerkAuthGuard)
  @Post('review-queue/status')
  updateReviewQueueStatus(
    @Req() request: AuthenticatedRequest,
    @Body() payload: UpdateStudyReviewQueueStatusDto,
  ): Promise<UpdateReviewQueueItemStatusResponse> {
    return this.studyReviewService.updateReviewQueueStatus(request.user!.id, payload);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('review-queue/review')
  recordReviewQueueOutcome(
    @Req() request: AuthenticatedRequest,
    @Body() payload: RecordStudyReviewQueueOutcomeDto,
  ): Promise<RecordReviewQueueOutcomeResponse> {
    return this.studyReviewService.recordReviewQueueOutcome(request.user!.id, payload);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('review-queue/clear-vault')
  clearReviewQueueVault(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateStudyReviewVaultSessionDto,
  ): Promise<CreateSessionResponse> {
    return this.studyReviewService.clearMistakeVault(request.user!.id, payload);
  }

  @UseGuards(ClerkAuthGuard)
  @Get('weak-points')
  listWeakPointInsights(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetStudyWeakPointsQueryDto,
  ): Promise<WeakPointInsightsResponse> {
    return this.studyWeakPointService.listWeakPointInsights(request.user!.id, {
      limit: query.limit,
      subjectCode: query.subjectCode,
    });
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions/preview')
  previewStudySession(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateStudySessionDto,
  ): Promise<SessionPreviewResponse> {
    return this.studyService.previewStudySession(request.user!.id, payload);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions')
  createStudySession(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreateStudySessionDto,
  ): Promise<CreateSessionResponse> {
    return this.studyService.createStudySession(request.user!.id, payload);
  }

  @UseGuards(ClerkAuthGuard)
  @Get('sessions/:id')
  getStudySessionById(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StudySessionResponse> {
    return this.studyService.getStudySessionById(request.user!.id, id);
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions/:sessionId/questions/:questionId/answer')
  submitStudyQuestionAnswer(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() payload: SubmitStudyQuestionAnswerDto,
  ): Promise<UpdateSessionProgressResponse> {
    return this.studyService.submitStudyQuestionAnswer(
      request.user!.id,
      sessionId,
      questionId,
      payload,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions/:sessionId/questions/:questionId/evaluation')
  submitStudyQuestionEvaluation(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() payload: SubmitStudyQuestionEvaluationDto,
  ): Promise<UpdateSessionProgressResponse> {
    return this.studyService.submitStudyQuestionEvaluation(
      request.user!.id,
      sessionId,
      questionId,
      payload,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions/:sessionId/questions/:questionId/ai-explanation')
  getStudyQuestionAiExplanation(
    @Req() request: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<StudyQuestionAiExplanationResponse> {
    return this.studyService.getStudyQuestionAiExplanation(
      request.user!.id,
      sessionId,
      questionId,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('sessions/:id/progress')
  updateStudySessionProgress(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateStudySessionProgressDto,
  ): Promise<UpdateSessionProgressResponse> {
    return this.studyService.updateStudySessionProgress(
      request.user!.id,
      id,
      payload,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('exercises/:id/state')
  upsertExerciseState(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpsertStudyExerciseStateDto,
  ): Promise<UpsertExerciseStateResponse> {
    return this.studyExerciseStateService.upsertExerciseState(
      request.user!.id,
      id,
      payload,
    );
  }

  @UseGuards(ClerkAuthGuard)
  @Post('exams/:id/activity')
  upsertExamActivity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpsertExamActivityDto,
  ): Promise<UpsertExamActivityResponse> {
    return this.studyService.upsertExamActivity(request.user!.id, id, payload);
  }
}
