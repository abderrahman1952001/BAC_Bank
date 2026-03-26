import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { GetExamQueryDto } from './dto/get-exam-query.dto';
import { GetPracticeSessionsQueryDto } from './dto/get-practice-sessions-query.dto';
import { UpdatePracticeSessionProgressDto } from './dto/update-practice-session-progress.dto';
import { QbankService } from './qbank.service';

@Controller('qbank')
export class QbankController {
  constructor(private readonly qbankService: QbankService) {}

  @Get('filters')
  getFilters() {
    return this.qbankService.getFilters();
  }

  @Get('catalog')
  getCatalog() {
    return this.qbankService.getCatalog();
  }

  @Get('exams/:id')
  getExamById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetExamQueryDto,
  ) {
    return this.qbankService.getExamById(id, query.sujetNumber);
  }

  @Get('sessions')
  listRecentPracticeSessions(@Query() query: GetPracticeSessionsQueryDto) {
    return this.qbankService.listRecentPracticeSessions(query.limit);
  }

  @Post('sessions/preview')
  previewPracticeSession(@Body() payload: CreatePracticeSessionDto) {
    return this.qbankService.previewPracticeSession(payload);
  }

  @Post('sessions')
  createPracticeSession(@Body() payload: CreatePracticeSessionDto) {
    return this.qbankService.createPracticeSession(payload);
  }

  @Get('sessions/:id')
  getPracticeSessionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.qbankService.getPracticeSessionById(id);
  }

  @Post('sessions/:id/progress')
  updatePracticeSessionProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdatePracticeSessionProgressDto,
  ) {
    return this.qbankService.updatePracticeSessionProgress(id, payload);
  }
}
