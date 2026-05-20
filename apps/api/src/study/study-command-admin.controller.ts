import { Controller, Get, UseGuards } from '@nestjs/common';
import type { StudyCommandDiagnosticsResponse } from '@bac-bank/contracts/study-command';
import { AdminRoleGuard } from '../admin/admin.guard';
import { StudyCommandService } from './study-command.service';

@UseGuards(AdminRoleGuard)
@Controller('admin/study-command')
export class StudyCommandAdminController {
  constructor(private readonly studyCommandService: StudyCommandService) {}

  @Get('diagnostics')
  getDiagnostics(): Promise<StudyCommandDiagnosticsResponse> {
    return this.studyCommandService.getDiagnostics();
  }
}
