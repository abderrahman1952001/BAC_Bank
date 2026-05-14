import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from '@bac-bank/contracts/courses';
import { StudyCurriculumJourneyService } from '../study/study-curriculum-journey.service';
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
    private readonly studyCurriculumJourneyService: StudyCurriculumJourneyService,
    private readonly studyService: StudyService,
  ) {}

  async listCourseSubjects(
    userId: string,
  ): Promise<CourseSubjectCardsResponse> {
    const curriculumJourneys =
      await this.studyCurriculumJourneyService.listCurriculumJourneys(userId);
    return buildCourseSubjectCardsResponse(
      curriculumJourneys.data,
      listAuthoredCourseTopicContent(),
    );
  }

  async getCourseSubject(
    userId: string,
    subjectCode: string,
  ): Promise<CourseSubjectResponse> {
    const normalizedSubjectCode = subjectCode.trim().toUpperCase();
    const [curriculumJourneys, filters] = await Promise.all([
      this.studyCurriculumJourneyService.listCurriculumJourneys(userId, {
        subjectCode: normalizedSubjectCode,
        limit: 1,
      }),
      this.studyService.getFilters(),
    ]);
    const response = buildCourseSubjectResponse({
      subjectCode: normalizedSubjectCode,
      curriculumJourneys: curriculumJourneys.data,
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
    const [curriculumJourneys, filters] = await Promise.all([
      this.studyCurriculumJourneyService.listCurriculumJourneys(userId, {
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
      curriculumJourneys: curriculumJourneys.data,
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
    const [curriculumJourneys, filters] = await Promise.all([
      this.studyCurriculumJourneyService.listCurriculumJourneys(userId, {
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
      curriculumJourneys: curriculumJourneys.data,
      filters,
      authoredTopic,
    });

    if (!response) {
      throw new NotFoundException('Course concept not found.');
    }

    return response;
  }
}
