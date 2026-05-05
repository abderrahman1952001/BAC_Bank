import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from '@bac-bank/contracts/courses';
import { StudyRoadmapService } from '../study/study-roadmap.service';
import { StudyService } from '../study/study.service';
import {
  getAuthoredCourseTopicContent,
  listAuthoredCourseTopicContent,
} from './course-authored-content';
import {
  buildCourseConceptResponse,
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

  async listCourseSubjects(
    userId: string,
  ): Promise<CourseSubjectCardsResponse> {
    const roadmaps = await this.studyRoadmapService.listStudyRoadmaps(userId);
    return buildCourseSubjectCardsResponse(
      roadmaps.data,
      listAuthoredCourseTopicContent(),
    );
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
      authoredTopics: listAuthoredCourseTopicContent(normalizedSubjectCode),
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
    const authoredTopic = getAuthoredCourseTopicContent(
      normalizedSubjectCode,
      normalizedTopicSlug,
    );
    const response = buildCourseTopicResponse({
      subjectCode: normalizedSubjectCode,
      topicSlug: normalizedTopicSlug,
      roadmaps: roadmaps.data,
      filters,
      authoredTopic,
    });

    if (!response) {
      throw new NotFoundException('Course topic not found.');
    }

    return response;
  }

  async getCourseConcept(
    userId: string,
    subjectCode: string,
    topicSlug: string,
    conceptSlug: string,
  ): Promise<CourseConceptResponse> {
    const normalizedSubjectCode = subjectCode.trim().toUpperCase();
    const normalizedTopicSlug = topicSlug.trim().toLowerCase();
    const normalizedConceptSlug = conceptSlug.trim().toLowerCase();
    const [roadmaps, filters] = await Promise.all([
      this.studyRoadmapService.listStudyRoadmaps(userId, {
        subjectCode: normalizedSubjectCode,
        limit: 1,
      }),
      this.studyService.getFilters(),
    ]);
    const authoredTopic = getAuthoredCourseTopicContent(
      normalizedSubjectCode,
      normalizedTopicSlug,
    );
    const response = buildCourseConceptResponse({
      subjectCode: normalizedSubjectCode,
      topicSlug: normalizedTopicSlug,
      conceptSlug: normalizedConceptSlug,
      roadmaps: roadmaps.data,
      filters,
      authoredTopic,
    });

    if (!response) {
      throw new NotFoundException('Course concept not found.');
    }

    return response;
  }
}
