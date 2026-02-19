import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateAttemptDto } from './dto/create-attempt.dto';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import { GetQuestionsQueryDto } from './dto/get-questions-query.dto';
import { GetPracticeSessionsQueryDto } from './dto/get-practice-sessions-query.dto';
import { QbankService } from './qbank.service';

@Controller('qbank')
export class QbankController {
  constructor(private readonly qbankService: QbankService) {}

  @Get('filters')
  getFilters() {
    return this.qbankService.getFilters();
  }

  @Get('questions')
  getQuestions(@Query() query: GetQuestionsQueryDto) {
    return this.qbankService.listQuestions(query);
  }

  @Get('questions/:id')
  getQuestionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.qbankService.getQuestionById(id);
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

  @Post('questions/:id/attempts')
  createAttempt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: CreateAttemptDto,
  ) {
    return this.qbankService.createAttempt(id, payload);
  }
}
