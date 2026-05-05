import type {
  CourseConceptResponse,
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  parseCourseConceptResponse,
  parseCourseSubjectCardsResponse,
  parseCourseSubjectResponse,
  parseCourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  buildCourseConceptPageModel,
  buildCourseSubjectCards,
  buildCourseSubjectPageModel,
  buildCourseTopicPageModel,
} from "@/lib/courses-surface";
import {
  clonePlaywrightFixture,
  playwrightTestCourseConcept,
  playwrightTestCourseSubject,
  playwrightTestCourseSubjectCards,
  playwrightTestCourseTopic,
} from "@/lib/playwright-test-fixtures";
import {
  buildPlaywrightSvtCourseConceptResponse,
  buildPlaywrightSvtCourseSubjectCard,
  buildPlaywrightSvtCourseSubjectResponse,
  buildPlaywrightSvtCourseTopicResponse,
} from "@/lib/playwright-svt-course-preview";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export async function fetchServerCourseSubjectCards() {
  if (shouldUsePlaywrightFixtures()) {
    const svtCard = await buildPlaywrightSvtCourseSubjectCard();

    return buildCourseSubjectCards(
      [
        ...clonePlaywrightFixture(playwrightTestCourseSubjectCards).data,
        ...(svtCard ? [svtCard] : []),
      ],
    );
  }

  const response = await fetchServerApiJson<CourseSubjectCardsResponse>(
    "/courses/subjects",
    undefined,
    "Courses request failed.",
    parseCourseSubjectCardsResponse,
  );

  return buildCourseSubjectCards(response.data);
}

export async function fetchServerCourseSubjectPageModel(subjectCode: string) {
  if (
    shouldUsePlaywrightFixtures() &&
    subjectCode === playwrightTestCourseSubject.subject.code
  ) {
    return buildCourseSubjectPageModel(
      clonePlaywrightFixture(playwrightTestCourseSubject),
    );
  }

  if (shouldUsePlaywrightFixtures()) {
    const svtSubject = await buildPlaywrightSvtCourseSubjectResponse(
      subjectCode,
    );

    if (svtSubject) {
      return buildCourseSubjectPageModel(svtSubject);
    }
  }

  const response = await fetchServerApiJson<CourseSubjectResponse>(
    `/courses/subjects/${encodeURIComponent(subjectCode)}`,
    undefined,
    "Courses request failed.",
    parseCourseSubjectResponse,
  );

  return buildCourseSubjectPageModel(response);
}

export async function fetchServerCourseTopicPageModel(
  subjectCode: string,
  topicSlug: string,
) {
  if (
    shouldUsePlaywrightFixtures() &&
    subjectCode === playwrightTestCourseTopic.subject.code &&
    topicSlug === playwrightTestCourseTopic.topic.slug
  ) {
    return buildCourseTopicPageModel(
      clonePlaywrightFixture(playwrightTestCourseTopic),
    );
  }

  if (shouldUsePlaywrightFixtures()) {
    const svtTopic = await buildPlaywrightSvtCourseTopicResponse(
      subjectCode,
      topicSlug,
    );

    if (svtTopic) {
      return buildCourseTopicPageModel(svtTopic);
    }
  }

  const response = await fetchServerApiJson<CourseTopicResponse>(
    `/courses/subjects/${encodeURIComponent(subjectCode)}/topics/${encodeURIComponent(
      topicSlug,
    )}`,
    undefined,
    "Courses request failed.",
    parseCourseTopicResponse,
  );

  return buildCourseTopicPageModel(response);
}

export async function fetchServerCourseConceptPageModel(
  subjectCode: string,
  topicSlug: string,
  conceptSlug: string,
) {
  if (
    shouldUsePlaywrightFixtures() &&
    subjectCode === playwrightTestCourseConcept.subject.code &&
    topicSlug === playwrightTestCourseConcept.topic.slug &&
    conceptSlug === playwrightTestCourseConcept.concept.slug
  ) {
    return buildCourseConceptPageModel(
      clonePlaywrightFixture(playwrightTestCourseConcept),
    );
  }

  if (shouldUsePlaywrightFixtures()) {
    const svtConcept = await buildPlaywrightSvtCourseConceptResponse(
      subjectCode,
      topicSlug,
      conceptSlug,
    );

    if (svtConcept) {
      return buildCourseConceptPageModel(svtConcept);
    }
  }

  const response = await fetchServerApiJson<CourseConceptResponse>(
    `/courses/subjects/${encodeURIComponent(subjectCode)}/topics/${encodeURIComponent(
      topicSlug,
    )}/concepts/${encodeURIComponent(conceptSlug)}`,
    undefined,
    "Courses request failed.",
    parseCourseConceptResponse,
  );

  return buildCourseConceptPageModel(response);
}
