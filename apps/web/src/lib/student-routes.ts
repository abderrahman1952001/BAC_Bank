export const STUDENT_MY_SPACE_ROUTE = "/student/my-space";
export const STUDENT_LIBRARY_ROUTE = "/student/library";
export const STUDENT_TRAINING_ROUTE = "/student/training";
export const STUDENT_TRAINING_DRILL_ROUTE = "/student/training/drill";
export const STUDENT_TRAINING_SIMULATION_ROUTE = "/student/training/simulation";
export const STUDENT_TRAINING_WEAK_POINTS_ROUTE = "/student/training/weak-points";

const studentSurfaceRoutes = {
  mySpace: STUDENT_MY_SPACE_ROUTE,
  library: STUDENT_LIBRARY_ROUTE,
  training: STUDENT_TRAINING_ROUTE,
} as const;

export type StudentSurface = keyof typeof studentSurfaceRoutes;

export type StudentLibraryExamRouteInput = {
  streamCode: string;
  subjectCode: string;
  year: string | number;
  examId: string;
  sujetNumber: string | number;
};

export function isStudentSurfaceActive(
  pathname: string,
  surface: StudentSurface,
): boolean {
  const href = studentSurfaceRoutes[surface];
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function buildRouteWithSearchParams(
  pathname: string,
  searchParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildStudentLibraryExamRoute(
  input: StudentLibraryExamRouteInput,
): string {
  return `${STUDENT_LIBRARY_ROUTE}/${encodeURIComponent(
    input.streamCode,
  )}/${encodeURIComponent(input.subjectCode)}/${encodeURIComponent(
    String(input.year),
  )}/${encodeURIComponent(input.examId)}/${encodeURIComponent(
    String(input.sujetNumber),
  )}`;
}

export function buildStudentLibraryExamRouteWithSearch(
  input: StudentLibraryExamRouteInput & {
    exercise?: string | number | null;
    question?: string | number | null;
  },
): string {
  return buildRouteWithSearchParams(buildStudentLibraryExamRoute(input), {
    exercise:
      input.exercise === null || input.exercise === undefined
        ? undefined
        : String(input.exercise),
    question:
      input.question === null || input.question === undefined
        ? undefined
        : String(input.question),
  });
}

export function buildStudentTrainingSessionRoute(sessionId: string): string {
  return `${STUDENT_TRAINING_ROUTE}/${encodeURIComponent(sessionId)}`;
}

export function buildStudentMySpaceRoadmapRoute(
  subjectCode: string,
  section?: "mistakes",
): string {
  const pathname = `${STUDENT_MY_SPACE_ROUTE}/roadmaps/${encodeURIComponent(
    subjectCode,
  )}`;

  return section ? `${pathname}#${section}` : pathname;
}

export function buildStudentTrainingDrillRoute(input?: {
  subjectCode?: string | null;
  topicCodes?: string[] | null;
}) {
  const params = new URLSearchParams();

  if (input?.subjectCode) {
    params.set('subject', input.subjectCode);
  }

  for (const topicCode of input?.topicCodes ?? []) {
    if (topicCode) {
      params.append('topic', topicCode);
    }
  }

  const query = params.toString();

  return query
    ? `${STUDENT_TRAINING_DRILL_ROUTE}?${query}`
    : STUDENT_TRAINING_DRILL_ROUTE;
}

export function buildStudentTrainingWeakPointsRoute(subjectCode?: string | null) {
  return buildRouteWithSearchParams(STUDENT_TRAINING_WEAK_POINTS_ROUTE, {
    subject: subjectCode ?? undefined,
  });
}
