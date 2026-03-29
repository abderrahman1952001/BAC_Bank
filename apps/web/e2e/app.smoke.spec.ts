import { expect, Page, Route, test } from '@playwright/test';

const studentUser = {
  id: 'user-1',
  username: 'Sara',
  email: 'sara@example.com',
  role: 'USER',
  stream: {
    code: 'SE',
    name: 'Sciences experimentales',
  },
} as const;

const adminUser = {
  id: 'admin-1',
  username: 'BAC Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
  stream: {
    code: 'SE',
    name: 'Sciences experimentales',
  },
} as const;

const sessionFixture = {
  id: 'session-123',
  title: 'Focused training',
  status: 'IN_PROGRESS',
  requestedExerciseCount: 3,
  exerciseCount: 1,
  progress: null,
  filters: {
    years: [2025, 2024],
    streamCodes: ['SE'],
    subjectCode: 'MATH',
    topicCodes: ['ALG'],
    sessionTypes: ['NORMAL'],
  },
  exercises: [
    {
      sessionOrder: 1,
      id: 'exercise-1',
      orderIndex: 1,
      title: 'Exercise 1',
      totalPoints: 8,
      questionCount: 1,
      hierarchy: {
        exerciseNodeId: 'exercise-1',
        exerciseLabel: 'Exercise 1',
        contextBlocks: [],
        questions: [
          {
            id: 'q1',
            orderIndex: 1,
            label: 'Q1',
            points: 8,
            depth: 0,
            topics: [{ code: 'ALG', name: 'Algebra' }],
            promptBlocks: [
              {
                id: 'prompt-1',
                role: 'PROMPT',
                orderIndex: 1,
                blockType: 'PARAGRAPH',
                textValue: 'Solve x + 1 = 2',
                data: null,
                media: null,
              },
            ],
            solutionBlocks: [
              {
                id: 'solution-1',
                role: 'SOLUTION',
                orderIndex: 1,
                blockType: 'PARAGRAPH',
                textValue: 'x = 1',
                data: null,
                media: null,
              },
            ],
            hintBlocks: [],
            rubricBlocks: [],
          },
        ],
      },
      exam: {
        year: 2025,
        sessionType: 'NORMAL',
        subject: {
          code: 'MATH',
          name: 'Mathematics',
        },
        stream: {
          code: 'SE',
          name: 'Sciences experimentales',
        },
      },
    },
  ],
} as const;

const authOptionsFixture = {
  streams: [
    {
      code: 'SE',
      name: 'Sciences experimentales',
    },
  ],
} as const;

const filtersFixture = {
  streams: [
    {
      code: 'SE',
      name: 'Sciences experimentales',
      isDefault: true,
      subjectCodes: ['MATH'],
    },
  ],
  subjects: [
    {
      code: 'MATH',
      name: 'Mathematics',
      isDefault: true,
      streams: [
        {
          code: 'SE',
          name: 'Sciences experimentales',
        },
      ],
      streamCodes: ['SE'],
    },
  ],
  years: [2025, 2024, 2023],
  topics: [
    {
      code: 'ALG',
      name: 'Algebra',
      slug: 'algebra',
      parentCode: null,
      displayOrder: 1,
      isSelectable: true,
      subject: {
        code: 'MATH',
        name: 'Mathematics',
      },
      streamCodes: ['SE'],
    },
  ],
  sessionTypes: ['NORMAL', 'MAKEUP'],
} as const;

const previewFixture = {
  matchingExerciseCount: 3,
  matchingSujetCount: 2,
  sampleExercises: [
    {
      examId: 'exam-1',
      exerciseNodeId: 'exercise-1',
      orderIndex: 1,
      questionCount: 1,
      title: 'Exercise 1',
      year: 2025,
      sujetLabel: 'Sujet 1',
      sessionType: 'NORMAL',
      stream: {
        code: 'SE',
        name: 'Sciences experimentales',
      },
    },
  ],
  yearsDistribution: [
    {
      year: 2025,
      matchingExerciseCount: 2,
    },
    {
      year: 2024,
      matchingExerciseCount: 1,
    },
  ],
  streamsDistribution: [
    {
      stream: {
        code: 'SE',
        name: 'Sciences experimentales',
      },
      matchingExerciseCount: 3,
    },
  ],
  maxSelectableExercises: 12,
} as const;

const adminJobSummary = {
  id: 'job-1',
  label: 'BAC 2025 · MATHEMATICS · SE',
  provider: 'manual_upload',
  year: 2025,
  stream_code: 'SE',
  subject_code: 'MATHEMATICS',
  session: 'normal',
  min_year: 2025,
  status: 'draft',
  source_document_count: 2,
  source_page_count: 6,
  workflow: {
    has_exam_document: true,
    has_correction_document: true,
    awaiting_correction: false,
    can_process: true,
    review_started: false,
  },
  published_exam_id: null,
  published_paper_id: null,
  published_exams: [],
  created_at: '2026-03-28T12:00:00.000Z',
  updated_at: '2026-03-28T12:00:00.000Z',
} as const;

const adminJobResponse = {
  job: {
    ...adminJobSummary,
    review_notes: null,
    error_message: null,
  },
  workflow: adminJobSummary.workflow,
  documents: [
    {
      id: 'doc-exam',
      kind: 'exam',
      file_name: 'exam.pdf',
      mime_type: 'application/pdf',
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: 'exam.pdf',
      download_url: '/api/v1/ingestion/documents/doc-exam/file',
      pages: [
        {
          id: 'page-1',
          page_number: 1,
          width: 1200,
          height: 1600,
          image_url: '/api/v1/ingestion/pages/page-1/image',
        },
      ],
    },
    {
      id: 'doc-correction',
      kind: 'correction',
      file_name: 'correction.pdf',
      mime_type: 'application/pdf',
      page_count: 3,
      sha256: null,
      source_url: null,
      storage_key: 'correction.pdf',
      download_url: '/api/v1/ingestion/documents/doc-correction/file',
      pages: [],
    },
  ],
  draft_json: {
    schema: 'bac_ingestion_draft/v1',
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'MATHEMATICS',
      sessionType: 'NORMAL',
      provider: 'manual_upload',
      title: 'BAC 2025 · MATHEMATICS · SE',
      minYear: 2025,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: 'doc-exam',
      correctionDocumentId: 'doc-correction',
      examDocumentStorageKey: 'exam.pdf',
      correctionDocumentStorageKey: 'correction.pdf',
      metadata: {},
    },
    sourcePages: [],
    assets: [],
    variants: [],
  },
  asset_preview_base_url: '/api/v1/ingestion/jobs/job-1/assets',
  validation: {
    errors: [],
    warnings: [],
    issues: [],
    can_approve: false,
    can_publish: false,
  },
} as const;

function jsonResponse(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installMockApi(
  page: Page,
  options: {
    sessionUser: typeof studentUser | typeof adminUser | null;
  },
) {
  let progressWrites = 0;

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/auth/me') {
      if (!options.sessionUser) {
        return jsonResponse(route, { message: 'Authentication required.' }, 401);
      }

      return jsonResponse(route, {
        user: options.sessionUser,
      });
    }

    if (path === '/api/v1/auth/options') {
      return jsonResponse(route, authOptionsFixture);
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      return jsonResponse(
        route,
        {
          user: studentUser,
        },
        201,
      );
    }

    if (path === '/api/v1/auth/login' && method === 'POST') {
      return jsonResponse(route, {
        user: studentUser,
      });
    }

    if (path === '/api/v1/qbank/sessions' && method === 'GET') {
      return jsonResponse(route, {
        data: [
          {
            id: 'session-123',
            title: 'Focused training',
            status: 'IN_PROGRESS',
            requestedExerciseCount: 3,
            exerciseCount: 1,
            createdAt: '2026-03-28T12:00:00.000Z',
          },
        ],
      });
    }

    if (path === '/api/v1/qbank/filters') {
      return jsonResponse(route, filtersFixture);
    }

    if (path === '/api/v1/qbank/sessions/preview' && method === 'POST') {
      return jsonResponse(route, previewFixture);
    }

    if (path === '/api/v1/qbank/sessions' && method === 'POST') {
      return jsonResponse(route, { id: 'session-123' }, 201);
    }

    if (path === '/api/v1/qbank/sessions/session-123' && method === 'GET') {
      return jsonResponse(route, sessionFixture);
    }

    if (path === '/api/v1/qbank/sessions/session-123/progress' && method === 'POST') {
      progressWrites += 1;
      return jsonResponse(route, {
        id: 'session-123',
        status: 'IN_PROGRESS',
        progress: {
          activeExerciseId: 'exercise-1',
          activeQuestionId: 'q1',
          mode: 'SOLVE',
          questionStates: [
            {
              questionId: 'q1',
              opened: true,
              completed: false,
              skipped: false,
              solutionViewed: true,
            },
          ],
          summary: {
            totalQuestionCount: 1,
            completedQuestionCount: 0,
            skippedQuestionCount: 0,
            unansweredQuestionCount: 1,
            solutionViewedCount: 1,
          },
          updatedAt: '2026-03-28T12:01:00.000Z',
        },
        updatedAt: '2026-03-28T12:01:00.000Z',
      });
    }

    if (path === '/api/v1/admin/ingestion/jobs' && method === 'GET') {
      return jsonResponse(route, {
        data: [adminJobSummary],
      });
    }

    if (path === '/api/v1/admin/ingestion/intake/manual' && method === 'POST') {
      return jsonResponse(route, adminJobResponse, 201);
    }

    if (path === '/api/v1/admin/ingestion/jobs/job-1/process' && method === 'POST') {
      return jsonResponse(
        route,
        {
          ...adminJobResponse,
          job: {
            ...adminJobResponse.job,
            status: 'queued',
          },
        },
        201,
      );
    }

    return jsonResponse(route, { message: `Unhandled API route: ${method} ${path}` }, 404);
  });

  return {
    getProgressWrites: () => progressWrites,
  };
}

test('registers a user in the browser and lands on the student hub', async ({ page }) => {
  await installMockApi(page, { sessionUser: null });

  await page.goto('/auth');

  await page.getByPlaceholder('مثال: sarah_benali').fill('Sara');
  await page.getByPlaceholder('you@example.com').first().fill('sara@example.com');
  await page.getByRole('combobox').selectOption('SE');
  await page.getByPlaceholder('********').fill('password123');
  await page.getByTestId('auth-register-submit').click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('link', { name: 'متابعة الجلسة' })).toBeVisible();
});

test('creates a session from the builder and persists browser progress', async ({ page }) => {
  const mockApi = await installMockApi(page, { sessionUser: studentUser });

  await page.goto('/app/sessions/new');

  await page.getByRole('button', { name: 'Mathematics' }).click();
  await page.getByRole('button', { name: 'كل فصول المادة' }).click();
  await page.getByTestId('session-builder-next-topics').click();
  await page.getByTestId('session-builder-next-years').click();
  await expect(page.getByTestId('session-builder-create')).toBeEnabled();
  await page.getByTestId('session-builder-create').click();

  await expect(page).toHaveURL(/\/app\/sessions\/session-123(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Focused training' })).toBeVisible();

  const writesBeforeAction = mockApi.getProgressWrites();
  await page.getByTestId('session-primary-action').click();
  await expect
    .poll(() => mockApi.getProgressWrites())
    .toBeGreaterThan(writesBeforeAction);
});

test('creates and queues an admin ingestion job from the browser', async ({ page }) => {
  await installMockApi(page, { sessionUser: adminUser });

  await page.goto('/admin/ingestion');

  await page.getByLabel('Title').fill('BAC 2025 · MATHEMATICS · SE');
  await page
    .getByLabel('Exam PDF')
    .setInputFiles({
      name: 'exam.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 exam'),
    });
  await page
    .getByLabel('Correction PDF')
    .setInputFiles({
      name: 'correction.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 correction'),
    });
  await page.getByTestId('admin-ingestion-submit').click();

  await expect(page.getByText('Manual intake created.')).toBeVisible();
  await page.getByTestId('admin-process-job-job-1').click();
  await expect(
    page.getByText('Queued BAC 2025 · MATHEMATICS · SE for background processing.'),
  ).toBeVisible();
});
