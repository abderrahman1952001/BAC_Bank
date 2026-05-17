import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from '@bac-bank/contracts/courses';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { CoursesService } from './courses.service';

@UseGuards(ClerkAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('subjects')
  listCourseSubjects(
    @Req() request: AuthenticatedRequest,
  ): Promise<CourseSubjectCardsResponse> {
    return this.coursesService.listCourseSubjects(request.user!.id);
  }

  @Get('subjects/:subjectCode')
  getCourseSubject(
    @Req() request: AuthenticatedRequest,
    @Param('subjectCode') subjectCode: string,
  ): Promise<CourseSubjectResponse> {
    return this.coursesService.getCourseSubject(request.user!.id, subjectCode);
  }

  @Get('subjects/:subjectCode/topics/:topicSlug')
  getCourseTopic(
    @Req() request: AuthenticatedRequest,
    @Param('subjectCode') subjectCode: string,
    @Param('topicSlug') topicSlug: string,
  ): Promise<CourseTopicResponse> {
    return this.coursesService.getCourseTopic(
      request.user!.id,
      subjectCode,
      topicSlug,
    );
  }

  @Get('subjects/:subjectCode/topics/:topicSlug/concepts/:conceptSlug')
  getCourseConcept(
    @Req() request: AuthenticatedRequest,
    @Param('subjectCode') subjectCode: string,
    @Param('topicSlug') topicSlug: string,
    @Param('conceptSlug') conceptSlug: string,
  ): Promise<CourseConceptResponse> {
    return this.coursesService.getCourseConcept(
      request.user!.id,
      subjectCode,
      topicSlug,
      conceptSlug,
    );
  }

  @Get('assets')
  async getCourseAsset(
    @Query('path') assetPath: string,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    if (!assetPath) {
      throw new BadRequestException('path is required.');
    }

    const asset = await this.coursesService.getCourseAsset(assetPath);
    const fileName = asset.fileName.replace(/["\r\n]/g, '');
    response.header('Content-Type', asset.mimeType);
    response.header('Content-Disposition', `inline; filename="${fileName}"`);
    response.header('Cache-Control', 'public, max-age=300');

    return new StreamableFile(asset.data);
  }
}
