import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  parseStudyCommandAcceptRequest,
  parseStudyCommandProposalRequest,
  type StudyCommandAcceptResponse,
  type StudyCommandProposalResponse,
  type StudyCommandStartersResponse,
} from '@bac-bank/contracts/study-command';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { StudyCommandService } from './study-command.service';

@UseGuards(ClerkAuthGuard)
@Controller('study/command')
export class StudyCommandController {
  constructor(private readonly studyCommandService: StudyCommandService) {}

  @Get('starters')
  listStarters(
    @Req() request: AuthenticatedRequest,
  ): Promise<StudyCommandStartersResponse> {
    return this.studyCommandService.listStarters(request.user!.id);
  }

  @Post('propose')
  propose(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ): Promise<StudyCommandProposalResponse> {
    const parsed = parseStudyCommandProposalRequest(payload);

    return this.studyCommandService.propose(request.user!.id, parsed.command);
  }

  @Post('accept')
  accept(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ): Promise<StudyCommandAcceptResponse> {
    const parsed = parseStudyCommandAcceptRequest(payload);

    return this.studyCommandService.accept(request.user!.id, parsed.command);
  }
}
