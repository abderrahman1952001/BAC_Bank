import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AdminRoleGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('uploads/images/:fileName')
  getImage(
    @Param('fileName') fileName: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const image = this.adminService.getImage(fileName);

    response.header('Content-Type', image.mimeType);
    return new StreamableFile(image.data);
  }

  @UseGuards(AdminRoleGuard)
  @Get('me')
  getMe() {
    return this.adminService.getMe();
  }

  @UseGuards(AdminRoleGuard)
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @UseGuards(AdminRoleGuard)
  @Get('filters')
  getFilters() {
    return this.adminService.getFilters();
  }

  @UseGuards(AdminRoleGuard)
  @Get('exams')
  listExams(@Query('subject') subject?: string, @Query('year') year?: string) {
    const parsedYear =
      typeof year === 'string' && year.trim().length
        ? Number.parseInt(year, 10)
        : undefined;

    return this.adminService.listExams(
      subject,
      Number.isInteger(parsedYear) ? parsedYear : undefined,
    );
  }

  @UseGuards(AdminRoleGuard)
  @Post('exams/bootstrap')
  bootstrapExamsFromQbank() {
    return this.adminService.bootstrapExamsFromQbank();
  }

  @UseGuards(AdminRoleGuard)
  @Post('exams')
  createExam(@Body() payload: Record<string, unknown>) {
    return this.adminService.createExam(payload);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('exams/:examId')
  updateExam(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.updateExam(examId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Delete('exams/:examId')
  deleteExam(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.adminService.deleteExam(examId);
  }

  @UseGuards(AdminRoleGuard)
  @Get('exams/:examId/exercises')
  getExamExercises(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.adminService.getExamExercises(examId);
  }

  @UseGuards(AdminRoleGuard)
  @Post('exams/:examId/exercises')
  createExercise(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.createExercise(examId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('exams/:examId/exercises/reorder')
  reorderExercises(
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.reorderExercises(examId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('exercises/:exerciseId')
  updateExercise(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.updateExercise(exerciseId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Delete('exercises/:exerciseId')
  deleteExercise(@Param('exerciseId', ParseUUIDPipe) exerciseId: string) {
    return this.adminService.deleteExercise(exerciseId);
  }

  @UseGuards(AdminRoleGuard)
  @Get('exercises/:exerciseId/editor')
  getExerciseEditor(@Param('exerciseId', ParseUUIDPipe) exerciseId: string) {
    return this.adminService.getExerciseEditor(exerciseId);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('exercises/:exerciseId/metadata')
  updateExerciseMetadata(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.updateExerciseMetadata(exerciseId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('exercises/:exerciseId/questions')
  createQuestion(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.createQuestion(exerciseId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('questions/:questionId')
  updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.updateQuestion(questionId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Delete('questions/:questionId')
  deleteQuestion(@Param('questionId', ParseUUIDPipe) questionId: string) {
    return this.adminService.deleteQuestion(questionId);
  }

  @UseGuards(AdminRoleGuard)
  @Patch('exercises/:exerciseId/questions/reorder')
  reorderQuestions(
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.adminService.reorderQuestions(exerciseId, payload);
  }

  @UseGuards(AdminRoleGuard)
  @Post('uploads/images')
  uploadImage(@Body() payload: Record<string, unknown>) {
    return this.adminService.uploadImage(payload);
  }
}
