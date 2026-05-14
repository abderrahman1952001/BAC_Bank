import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type {
  CompleteLabMissionAttemptResponse,
  LabToolMissionsResponse,
  LabToolsResponse,
  StartLabMissionAttemptResponse,
} from '@bac-bank/contracts/lab';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CompleteLabMissionAttemptDto } from './dto/complete-lab-mission-attempt.dto';
import { LabService } from './lab.service';

@UseGuards(ClerkAuthGuard)
@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Get('tools')
  listTools(@Req() request: AuthenticatedRequest): Promise<LabToolsResponse> {
    return this.labService.listTools(request.user!.id);
  }

  @Get('tools/:toolSlug/missions')
  listToolMissions(
    @Req() request: AuthenticatedRequest,
    @Param('toolSlug') toolSlug: string,
  ): Promise<LabToolMissionsResponse> {
    return this.labService.listToolMissions(request.user!.id, toolSlug);
  }

  @Post('missions/:missionId/start')
  startMissionAttempt(
    @Req() request: AuthenticatedRequest,
    @Param('missionId', ParseUUIDPipe) missionId: string,
  ): Promise<StartLabMissionAttemptResponse> {
    return this.labService.startMissionAttempt(request.user!.id, missionId);
  }

  @Post('attempts/:attemptId/complete')
  completeMissionAttempt(
    @Req() request: AuthenticatedRequest,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() payload: CompleteLabMissionAttemptDto,
  ): Promise<CompleteLabMissionAttemptResponse> {
    return this.labService.completeMissionAttempt(
      request.user!.id,
      attemptId,
      payload,
    );
  }
}
