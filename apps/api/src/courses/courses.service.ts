import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from '@bac-bank/contracts/courses';
import { StudyRoadmapService } from '../study/study-roadmap.service';
import { StudyService } from '../study/study.service';
import {
  buildCourseSubjectCardsResponse,
  buildCourseSubjectResponse,
  buildCourseTopicResponse,
} from './courses-read-model';

@Injectable()
export class CoursesService {
  constructor(
    private readonly studyRoadmapService: StudyRoadmapService,
    private readonly studyService: StudyService,
  ) {}

  async listCourseSubjects(userId: string): Promise<CourseSubjectCardsResponse> {
    const roadmaps = await this.studyRoadmapService.listStudyRoadmaps(userId);
    return buildCourseSubjectCardsResponse(roadmaps.data);
  }

  async getCourseSubject(
    userId: string,
    subjectCode: string,
  ): Promise<CourseSubjectResponse> {
    const normalizedSubjectCode = subjectCode.trim().toUpperCase();
    const [roadmaps, filters] = await Promise.all([
      this.studyRoadmapService.listStudyRoadmaps(userId, {
        subjectCode: normalizedSubjectCode,
        limit: 1,
      }),
      this.studyService.getFilters(),
    ]);
    const response = buildCourseSubjectResponse({
      subjectCode: normalizedSubjectCode,
      roadmaps: roadmaps.data,
      filters,
    });

    if (!response) {
      throw new NotFoundException('Course subject not found.');
    }

    return response;
  }

  async getCourseTopic(
    userId: string,
    subjectCode: string,
    topicSlug: string,
  ): Promise<CourseTopicResponse> {
    const normalizedSubjectCode = subjectCode.trim().toUpperCase();
    const normalizedTopicSlug = topicSlug.trim().toLowerCase();
    const [roadmaps, filters] = await Promise.all([
      this.studyRoadmapService.listStudyRoadmaps(userId, {
        subjectCode: normalizedSubjectCode,
        limit: 1,
      }),
      this.studyService.getFilters(),
    ]);
    const response = buildCourseTopicResponse({
      subjectCode: normalizedSubjectCode,
      topicSlug: normalizedTopicSlug,
      roadmaps: roadmaps.data,
      filters,
    });

    if (!response) {
      throw new NotFoundException('Course topic not found.');
    }

    return response;
  }
}
