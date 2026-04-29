import {
  buildCourseSubjectCards,
  buildCourseSubjectPageModel,
  buildCourseTopicPageModel,
} from "@/lib/courses-surface";
import {
  fetchServerFilters,
  fetchServerStudyRoadmaps,
} from "@/lib/server-study-api";

export async function fetchServerCourseSubjectCards() {
  const roadmaps = await fetchServerStudyRoadmaps();
  return buildCourseSubjectCards(roadmaps.data);
}

export async function fetchServerCourseSubjectPageModel(subjectCode: string) {
  const [roadmaps, filters] = await Promise.all([
    fetchServerStudyRoadmaps({ subjectCode }),
    fetchServerFilters(),
  ]);

  return buildCourseSubjectPageModel({
    subjectCode,
    roadmaps: roadmaps.data,
    filters,
  });
}

export async function fetchServerCourseTopicPageModel(
  subjectCode: string,
  topicSlug: string,
) {
  const [roadmaps, filters] = await Promise.all([
    fetchServerStudyRoadmaps({ subjectCode }),
    fetchServerFilters(),
  ]);

  return buildCourseTopicPageModel({
    subjectCode,
    topicSlug,
    roadmaps: roadmaps.data,
    filters,
  });
}
