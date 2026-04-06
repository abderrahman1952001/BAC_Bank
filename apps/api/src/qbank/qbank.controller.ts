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
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type {
  CatalogResponse,
  CreateSessionResponse,
  ExamResponse,
  FiltersResponse,
  PracticeSessionResponse,
  RecentExamActivitiesResponse,
  RecentPracticeSessionsResponse,
  SessionPreviewResponse,
  UpsertExamActivityResponse,
  UpdateSessionProgressResponse,
} from '@bac-bank/contracts/qbank';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { GetExamQueryDto } from './dto/get-exam-query.dto';
import { GetPracticeSessionsQueryDto } from './dto/get-practice-sessions-query.dto';
import { UpsertExamActivityDto } from './dto/upsert-exam-activity.dto';
import { UpdatePracticeSessionProgressDto } from './dto/update-practice-session-progress.dto';
import { QbankService } from './qbank.service';

@Controller('qbank')
export class QbankController {
  constructor(private readonly qbankService: QbankService) {}

  @Get('filters')
  getFilters(): Promise<FiltersResponse> {
    return this.qbankService.getFilters();
  }

  @Get('catalog')
  getCatalog(): Promise<CatalogResponse> {
    return this.qbankService.getCatalog();
  }

  @Get('exams/:id')
  getExamById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetExamQueryDto,
  ): Promise<ExamResponse> {
    return this.qbankService.getExamById(id, query.sujetNumber);
  }

  @UseGuards(SessionAuthGuard)
  @Get('sessions')
  listRecentPracticeSessions(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetPracticeSessionsQueryDto,
  ): Promise<RecentPracticeSessionsResponse> {
    return this.qbankService.listRecentPracticeSessions(
      request.user!.id,
      query.limit,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Get('exam-activities')
  listRecentExamActivities(
    @Req() request: AuthenticatedRequest,
    @Query() query: GetPracticeSessionsQueryDto,
  ): Promise<RecentExamActivitiesResponse> {
    return this.qbankService.listRecentExamActivities(
      request.user!.id,
      query.limit,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Post('sessions/preview')
  previewPracticeSession(
    @Body() payload: CreatePracticeSessionDto,
  ): Promise<SessionPreviewResponse> {
    return this.qbankService.previewPracticeSession(payload);
  }

  @UseGuards(SessionAuthGuard)
  @Post('sessions')
  createPracticeSession(
    @Req() request: AuthenticatedRequest,
    @Body() payload: CreatePracticeSessionDto,
  ): Promise<CreateSessionResponse> {
    return this.qbankService.createPracticeSession(request.user!.id, payload);
  }

  @UseGuards(SessionAuthGuard)
  @Get('sessions/:id')
  getPracticeSessionById(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PracticeSessionResponse> {
    return this.qbankService.getPracticeSessionById(request.user!.id, id);
  }

  @UseGuards(SessionAuthGuard)
  @Post('sessions/:id/progress')
  updatePracticeSessionProgress(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdatePracticeSessionProgressDto,
  ): Promise<UpdateSessionProgressResponse> {
    return this.qbankService.updatePracticeSessionProgress(
      request.user!.id,
      id,
      payload,
    );
  }

  @UseGuards(SessionAuthGuard)
  @Post('exams/:id/activity')
  upsertExamActivity(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpsertExamActivityDto,
  ): Promise<UpsertExamActivityResponse> {
    return this.qbankService.upsertExamActivity(request.user!.id, id, payload);
  }
}
