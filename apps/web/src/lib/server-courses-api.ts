import type {
  CourseSubjectCardsResponse,
  CourseSubjectResponse,
  CourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  parseCourseSubjectCardsResponse,
  parseCourseSubjectResponse,
  parseCourseTopicResponse,
} from "@bac-bank/contracts/courses";
import {
  buildCourseSubjectCards,
  buildCourseSubjectPageModel,
  buildCourseTopicPageModel,
} from "@/lib/courses-surface";
import {
  clonePlaywrightFixture,
  playwrightTestCourseSubject,
  playwrightTestCourseSubjectCards,
  playwrightTestCourseTopic,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

function shouldUsePlaywrightFixtures() {
  return process.env.PLAYWRIGHT_TEST_AUTH === "true";
}

export async function fetchServerCourseSubjectCards() {
  if (shouldUsePlaywrightFixtures()) {
    return buildCourseSubjectCards(
      clonePlaywrightFixture(playwrightTestCourseSubjectCards).data,
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
