import { describe, expect, it } from "vitest";
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_MY_SPACE_ROUTE,
  STUDENT_TRAINING_ROUTE,
  STUDENT_TRAINING_DRILL_ROUTE,
  STUDENT_TRAINING_SIMULATION_ROUTE,
  STUDENT_TRAINING_WEAK_POINTS_ROUTE,
  buildRouteWithSearchParams,
  buildStudentLibraryExamRoute,
  buildStudentLibraryExamRouteWithSearch,
  buildStudentMySpaceRoadmapRoute,
  buildStudentTrainingDrillRoute,
  buildStudentTrainingSessionRoute,
  buildStudentTrainingWeakPointsRoute,
  isStudentSurfaceActive,
} from "./student-routes";

describe("student route helpers", () => {
  it("matches only canonical student surface paths", () => {
    expect(isStudentSurfaceActive(STUDENT_MY_SPACE_ROUTE, "mySpace")).toBe(true);
    expect(isStudentSurfaceActive("/student/overview", "mySpace")).toBe(false);
    expect(
      isStudentSurfaceActive(
        "/student/library/SE/MATH/2024/exam-1/1",
        "library",
      ),
    ).toBe(true);
    expect(
      isStudentSurfaceActive("/student/archive/SE/MATH/2024/exam-1/1", "library"),
    ).toBe(false);
    expect(isStudentSurfaceActive(STUDENT_TRAINING_ROUTE, "training")).toBe(
      true,
    );
    expect(isStudentSurfaceActive("/student/practice/new", "training")).toBe(
      false,
    );
  });

  it("builds query routes without empty values", () => {
    expect(
      buildRouteWithSearchParams(STUDENT_LIBRARY_ROUTE, {
        stream: "SE",
        subject: "MATH",
        year: "2024",
        examId: undefined,
      }),
    ).toBe("/student/library?stream=SE&subject=MATH&year=2024");
  });

  it("builds canonical study routes for library and training", () => {
    expect(
      buildStudentLibraryExamRoute({
        streamCode: "SE",
        subjectCode: "MATH",
        year: 2024,
        examId: "exam-1",
        sujetNumber: 2,
      }),
    ).toBe("/student/library/SE/MATH/2024/exam-1/2");

    expect(
      buildStudentLibraryExamRouteWithSearch({
        streamCode: "SE",
        subjectCode: "MATH",
        year: 2024,
        examId: "exam-1",
        sujetNumber: 2,
        exercise: 3,
      }),
    ).toBe("/student/library/SE/MATH/2024/exam-1/2?exercise=3");

    expect(buildStudentTrainingSessionRoute("session-1")).toBe(
      "/student/training/session-1",
    );
    expect(STUDENT_TRAINING_DRILL_ROUTE).toBe("/student/training/drill");
    expect(STUDENT_TRAINING_SIMULATION_ROUTE).toBe(
      "/student/training/simulation",
    );
    expect(STUDENT_TRAINING_WEAK_POINTS_ROUTE).toBe(
      "/student/training/weak-points",
    );
    expect(buildStudentMySpaceRoadmapRoute("MATH")).toBe(
      "/student/my-space/roadmaps/MATH",
    );
    expect(buildStudentMySpaceRoadmapRoute("MATH", "mistakes")).toBe(
      "/student/my-space/roadmaps/MATH#mistakes",
    );
    expect(
      buildStudentTrainingDrillRoute({
        subjectCode: "MATH",
        topicCodes: ["ALGEBRA", "FUNCTIONS"],
      }),
    ).toBe("/student/training/drill?subject=MATH&topic=ALGEBRA&topic=FUNCTIONS");
    expect(buildStudentTrainingWeakPointsRoute("MATH")).toBe(
      "/student/training/weak-points?subject=MATH",
    );
  });
});
