import { expect, Page, Route, test } from "@playwright/test";
import {
  playwrightTestAdminJobResponse,
  playwrightTestAdminJobSummary,
  playwrightTestAdminUser,
  playwrightTestAuthOptions,
  playwrightTestFilters,
  playwrightTestStudySession,
  playwrightTestPreview,
  playwrightTestStudyRoadmaps,
  playwrightTestStudentUser,
  playwrightTestWeakPointInsights,
} from "../src/lib/playwright-test-fixtures";

function jsonResponse(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installMockApi(
  page: Page,
  options: {
    sessionUser:
      | typeof playwrightTestStudentUser
      | typeof playwrightTestAdminUser
      | null;
  },
) {
  let progressWrites = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === "/api/v1/auth/me") {
      if (!options.sessionUser) {
        return jsonResponse(
          route,
          { message: "Authentication required." },
          401,
        );
      }

      return jsonResponse(route, {
        user: options.sessionUser,
      });
    }

    if (path === "/api/v1/auth/options") {
      return jsonResponse(route, playwrightTestAuthOptions);
    }

    if (path === "/api/v1/study/sessions" && method === "GET") {
      return jsonResponse(route, {
        data: [
          {
            id: "session-123",
            title: "Focused training",
            status: "IN_PROGRESS",
            requestedExerciseCount: 3,
            exerciseCount: 1,
            createdAt: "2026-03-28T12:00:00.000Z",
            updatedAt: "2026-03-29T12:00:00.000Z",
            progressSummary: {
              totalQuestionCount: 3,
              completedQuestionCount: 1,
              skippedQuestionCount: 0,
              unansweredQuestionCount: 2,
              solutionViewedCount: 1,
              trackedTimeSeconds: 0,
            },
          },
        ],
      });
    }

    if (path === "/api/v1/study/exam-activities" && method === "GET") {
      return jsonResponse(route, {
        data: [
          {
            id: "activity-1",
            examId: "exam-1",
            year: 2025,
            sessionType: "NORMAL",
            stream: {
              code: "SE",
              name: "Sciences experimentales",
            },
            subject: {
              code: "MATH",
              name: "Mathematics",
            },
            sujetNumber: 1,
            sujetLabel: "Sujet 1",
            totalQuestionCount: 10,
            completedQuestionCount: 4,
            openedQuestionCount: 5,
            solutionViewedCount: 2,
            createdAt: "2026-03-27T12:00:00.000Z",
            lastOpenedAt: "2026-03-30T08:30:00.000Z",
          },
        ],
      });
    }

    if (path === "/api/v1/study/filters") {
      return jsonResponse(route, playwrightTestFilters);
    }

    if (path === "/api/v1/study/roadmaps" && method === "GET") {
      return jsonResponse(route, playwrightTestStudyRoadmaps);
    }

    if (path === "/api/v1/study/sessions/preview" && method === "POST") {
      return jsonResponse(route, playwrightTestPreview);
    }

    if (path === "/api/v1/study/weak-points" && method === "GET") {
      return jsonResponse(route, playwrightTestWeakPointInsights);
    }

    if (path === "/api/v1/study/sessions" && method === "POST") {
      return jsonResponse(route, { id: "session-123" }, 201);
    }

    if (path === "/api/v1/study/sessions/session-123" && method === "GET") {
      return jsonResponse(route, playwrightTestStudySession);
    }

    if (
      path === "/api/v1/study/sessions/session-123/progress" &&
      method === "POST"
    ) {
      progressWrites += 1;
      return jsonResponse(route, {
        id: "session-123",
        status: "IN_PROGRESS",
        progress: {
          activeExerciseId: "exercise-1",
          activeQuestionId: "q1",
          mode: "SOLVE",
          questionStates: [
            {
              questionId: "q1",
              opened: true,
              completed: false,
              skipped: false,
              solutionViewed: true,
              timeSpentSeconds: 0,
              reflection: null,
              diagnosis: null,
            },
          ],
          summary: {
            totalQuestionCount: 1,
            completedQuestionCount: 0,
            skippedQuestionCount: 0,
            unansweredQuestionCount: 1,
            solutionViewedCount: 1,
            trackedTimeSeconds: 0,
          },
          updatedAt: "2026-03-28T12:01:00.000Z",
        },
        updatedAt: "2026-03-28T12:01:00.000Z",
      });
    }

    if (path === "/api/v1/study/exams/exam-1/activity" && method === "POST") {
      return jsonResponse(route, {
        id: "activity-1",
        lastOpenedAt: "2026-03-30T08:30:00.000Z",
      });
    }

    if (path === "/api/v1/admin/ingestion/jobs" && method === "GET") {
      return jsonResponse(route, {
        data: [playwrightTestAdminJobSummary],
      });
    }

    if (path === "/api/v1/admin/ingestion/intake/manual" && method === "POST") {
      return jsonResponse(route, playwrightTestAdminJobResponse, 201);
    }

    if (
      path === "/api/v1/admin/ingestion/jobs/job-1/process" &&
      method === "POST"
    ) {
      return jsonResponse(
        route,
        {
          ...playwrightTestAdminJobResponse,
          job: {
            ...playwrightTestAdminJobResponse.job,
            status: "queued",
          },
        },
        201,
      );
    }

    if (path === "/api/v1/ingestion/jobs/job-1/assets/asset-table/preview") {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    }

    return jsonResponse(
      route,
      { message: `Unhandled API route: ${method} ${path}` },
      404,
    );
  });

  return {
    getProgressWrites: () => progressWrites,
  };
}

async function installPlaywrightSession(page: Page, role: "student" | "admin") {
  await page.context().addCookies([
    {
      name: "bb_test_auth",
      value: role,
      url: "http://127.0.0.1:3000",
    },
  ]);
}

test("shows the custom auth entry links", async ({ page }) => {
  await installMockApi(page, { sessionUser: null });

  await page.goto("/auth");

  await expect(page.getByTestId("auth-register-link")).toBeVisible();
  await expect(page.getByTestId("auth-login-link")).toBeVisible();
  await expect(
    page.getByText("متاح الآن: البريد الإلكتروني وكلمة المرور أو Google."),
  ).toBeVisible();
});

test("redirects an authenticated student away from auth", async ({ page }) => {
  await installPlaywrightSession(page, "student");
  await page.goto("/auth");

  await expect(page).toHaveURL(/\/student\/my-space(?:\?.*)?$/);
});

test("creates a session from training and persists browser progress", async ({
  page,
}) => {
  await installPlaywrightSession(page, "student");
  const mockApi = await installMockApi(page, {
    sessionUser: playwrightTestStudentUser,
  });

  await page.goto("/student/training");

  await page.getByRole("link", { name: /جلسة دريل/ }).click();
  await expect(page).toHaveURL(/\/student\/training\/drill(?:\?.*)?$/);
  await page.getByRole("button", { name: "Mathematics" }).click();
  await page.getByRole("button", { name: "كل المحاور" }).click();
  await page.getByTestId("session-builder-next-topics").click();
  await page.getByTestId("session-builder-next-years").click();
  await expect(page.getByTestId("session-builder-create")).toBeEnabled();
  await page.getByTestId("session-builder-create").click();

  await expect(page).toHaveURL(/\/student\/training\/session-123(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", { name: "Focused training" }),
  ).toBeVisible();

  const writesBeforeAction = mockApi.getProgressWrites();
  await page.getByRole("button", { name: "اكشف الحل مباشرة" }).click();
  await expect
    .poll(() => mockApi.getProgressWrites())
    .toBeGreaterThan(writesBeforeAction);
});

test("opens the new courses surface and enters a subject", async ({ page }) => {
  await installPlaywrightSession(page, "student");
  await installMockApi(page, {
    sessionUser: playwrightTestStudentUser,
  });

  await page.goto("/student/courses");

  await expect(
    page.getByRole("heading", { name: "خارطة مفاهيمية دقيقة لكل مادة" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mathematics" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "افتح المادة" }).first().click();

  await expect(page).toHaveURL(/\/student\/courses\/MATH$/);
  await expect(
    page.getByRole("heading", { name: "Mathematics" }),
  ).toBeVisible();
});

test("renders an ingestion draft through the student preview surface", async ({
  page,
}) => {
  await installPlaywrightSession(page, "admin");
  await installMockApi(page, { sessionUser: playwrightTestAdminUser });

  await page.goto("/student/library/ingestion-preview/job-1");

  await expect(page.getByText("الرياضيات", { exact: true })).toBeVisible();
  const paper = page.getByRole("article");
  await expect(paper.getByText("التمرين 1")).toBeVisible();
  await expect(
    paper.getByText("استخرج المعلومة الأساسية من النص."),
  ).toBeVisible();
  await expect(paper.getByAltText("Table asset")).toBeVisible();

  await page.getByRole("button", { name: "إظهار الحل" }).click();
  await expect(
    page.getByText("المعلومة الأساسية واردة بوضوح في النص."),
  ).toBeVisible();
});

test("creates and queues an admin ingestion job from the browser", async ({
  page,
}) => {
  await installPlaywrightSession(page, "admin");
  await installMockApi(page, { sessionUser: playwrightTestAdminUser });

  await page.goto("/admin/intake");

  await page.getByLabel("Title").fill("BAC 2025 · MATHEMATICS · SE");
  await page.getByLabel("Exam PDF").setInputFiles({
    name: "exam.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 exam"),
  });
  await page.getByLabel("Correction PDF").setInputFiles({
    name: "correction.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 correction"),
  });
  await page.getByTestId("admin-ingestion-submit").click();

  await expect(page.getByText("Ingestion draft created.")).toBeVisible();

  await page.goto("/admin/drafts");
  await page.getByTestId("admin-process-job-job-1").click();
  await expect(
    page.getByText(
      "Queued BAC 2025 · MATHEMATICS · SE for background processing. The draft list will refresh while the worker runs.",
    ),
  ).toBeVisible();
});
