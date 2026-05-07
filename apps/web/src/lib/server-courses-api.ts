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
  buildPlaywrightCanonicalCourseConceptResponse,
  buildPlaywrightCanonicalCourseSubjectCards,
  buildPlaywrightCanonicalCourseSubjectResponse,
  buildPlaywrightCanonicalCourseTopicResponse,
} from "@/lib/playwright-svt-course-preview";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export async function fetchServerCourseSubjectCards() {
  if (shouldUsePlaywrightFixtures()) {
    const canonicalCards = await buildPlaywrightCanonicalCourseSubjectCards();

    return buildCourseSubjectCards([
      ...clonePlaywrightFixture(playwrightTestCourseSubjectCards).data,
      ...canonicalCards,
    ]);
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
    const canonicalSubject =
      await buildPlaywrightCanonicalCourseSubjectResponse(subjectCode);

    if (canonicalSubject) {
      return buildCourseSubjectPageModel(canonicalSubject);
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
    const canonicalTopic = await buildPlaywrightCanonicalCourseTopicResponse(
      subjectCode,
      topicSlug,
    );

    if (canonicalTopic) {
      return buildCourseTopicPageModel(canonicalTopic);
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
    const canonicalConcept =
      await buildPlaywrightCanonicalCourseConceptResponse(
        subjectCode,
        topicSlug,
        conceptSlug,
      );

    if (canonicalConcept) {
      return buildCourseConceptPageModel(canonicalConcept);
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
