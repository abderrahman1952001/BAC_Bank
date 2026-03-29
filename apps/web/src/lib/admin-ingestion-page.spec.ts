import { describe, expect, it } from 'vitest';
import type {
  AdminIngestionJobResponse,
  AdminIngestionJobSummary,
} from '@/lib/admin';
import {
  buildGroupedStatuses,
  buildProcessJobActionState,
  buildStatusCounts,
  compareJobs,
  filterJobs,
  formatSession,
  toJobSummary,
} from './admin-ingestion-page';

function createJobSummary(
  overrides: Partial<AdminIngestionJobSummary> = {},
): AdminIngestionJobSummary {
  const base: AdminIngestionJobSummary = {
    id: 'job-1',
    label: 'BAC 2025 Mathematics SE',
    provider: 'manual',
    year: 2025,
    stream_code: 'SE',
    subject_code: 'MATHEMATICS',
    session: 'normal',
    min_year: 2008,
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
    created_at: '2026-03-29T09:00:00.000Z',
    updated_at: '2026-03-29T10:00:00.000Z',
  };

  return {
    ...base,
    ...overrides,
    workflow: overrides.workflow ?? base.workflow,
    published_exams: overrides.published_exams ?? base.published_exams,
  };
}

describe('admin ingestion page helpers', () => {
  it('formats sessions and compares jobs by year then recency', () => {
    const newer = createJobSummary({
      id: 'job-newer',
      updated_at: '2026-03-29T11:00:00.000Z',
    });
    const older = createJobSummary({
      id: 'job-older',
      updated_at: '2026-03-29T08:00:00.000Z',
    });
    const olderYear = createJobSummary({
      id: 'job-old-year',
      year: 2024,
      updated_at: '2026-03-29T12:00:00.000Z',
    });

    expect(formatSession('rattrapage')).toBe('Rattrapage');
    expect(formatSession('normal')).toBe('Normal');
    expect(compareJobs(newer, older)).toBeLessThan(0);
    expect(compareJobs(newer, olderYear)).toBeLessThan(0);
  });

  it('maps ingestion job responses to summaries with document and page totals', () => {
    const payload: AdminIngestionJobResponse = {
      job: {
        id: 'job-1',
        label: 'BAC 2025 Mathematics SE',
        provider: 'manual',
        year: 2025,
        stream_code: 'SE',
        subject_code: 'MATHEMATICS',
        session: 'normal',
        min_year: 2008,
        status: 'draft',
        review_notes: null,
        error_message: null,
        published_exam_id: null,
        published_paper_id: null,
        published_exams: [],
        created_at: '2026-03-29T09:00:00.000Z',
        updated_at: '2026-03-29T10:00:00.000Z',
      },
      workflow: {
        has_exam_document: true,
        has_correction_document: true,
        awaiting_correction: false,
        can_process: true,
        review_started: false,
      },
      documents: [
        {
          id: 'doc-exam',
          kind: 'exam',
          file_name: 'exam.pdf',
          mime_type: 'application/pdf',
          page_count: 2,
          sha256: null,
          source_url: null,
          storage_key: 'exam.pdf',
          download_url: 'https://example.com/exam.pdf',
          pages: [
            {
              id: 'page-1',
              page_number: 1,
              width: 1000,
              height: 1400,
              image_url: 'https://example.com/page-1.jpg',
            },
            {
              id: 'page-2',
              page_number: 2,
              width: 1000,
              height: 1400,
              image_url: 'https://example.com/page-2.jpg',
            },
          ],
        },
        {
          id: 'doc-correction',
          kind: 'correction',
          file_name: 'correction.pdf',
          mime_type: 'application/pdf',
          page_count: 1,
          sha256: null,
          source_url: null,
          storage_key: 'correction.pdf',
          download_url: 'https://example.com/correction.pdf',
          pages: [
            {
              id: 'page-3',
              page_number: 1,
              width: 1000,
              height: 1400,
              image_url: 'https://example.com/page-3.jpg',
            },
          ],
        },
      ],
      draft_json: {
        schema: '1',
        exam: {
          year: 2025,
          streamCode: 'SE',
          subjectCode: 'MATHEMATICS',
          sessionType: 'NORMAL',
          provider: 'manual',
          title: 'BAC 2025 Mathematics SE',
          minYear: 2008,
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
      asset_preview_base_url: 'https://example.com/assets',
      validation: {
        errors: [],
        warnings: [],
        issues: [],
        can_approve: true,
        can_publish: true,
      },
    };

    expect(toJobSummary(payload)).toMatchObject({
      id: 'job-1',
      source_document_count: 2,
      source_page_count: 3,
      workflow: payload.workflow,
    });
  });

  it('counts and filters jobs by status and searchable metadata', () => {
    const jobs = [
      createJobSummary({
        id: 'job-1',
        status: 'draft',
        workflow: {
          has_exam_document: true,
          has_correction_document: false,
          awaiting_correction: true,
          can_process: false,
          review_started: false,
        },
      }),
      createJobSummary({
        id: 'job-2',
        label: 'BAC 2024 Physics M',
        year: 2024,
        stream_code: 'M',
        subject_code: 'PHYSICS',
        status: 'queued',
      }),
    ];

    expect(buildStatusCounts(jobs)).toMatchObject({
      all: 2,
      draft: 1,
      queued: 1,
    });
    expect(
      filterJobs({
        jobs,
        jobQuery: 'waiting correction',
        statusFilter: 'all',
      }).map((job) => job.id),
    ).toEqual(['job-1']);
    expect(
      filterJobs({
        jobs,
        jobQuery: 'math',
        statusFilter: 'draft',
      }).map((job) => job.id),
    ).toEqual(['job-1']);
  });

  it('builds grouped status sections with scoped stream and year filters', () => {
    const jobs = [
      createJobSummary({
        id: 'job-se-2025',
        status: 'draft',
        stream_code: 'SE',
        year: 2025,
        updated_at: '2026-03-29T11:00:00.000Z',
      }),
      createJobSummary({
        id: 'job-se-2024',
        status: 'draft',
        stream_code: 'SE',
        year: 2024,
        updated_at: '2026-03-29T09:00:00.000Z',
      }),
      createJobSummary({
        id: 'job-unmapped',
        label: 'Fallback',
        status: 'draft',
        stream_code: null,
        year: 2025,
        updated_at: '2026-03-29T10:00:00.000Z',
      }),
      createJobSummary({
        id: 'job-approved',
        label: 'Approved',
        status: 'approved',
        year: 2025,
      }),
    ];

    const grouped = buildGroupedStatuses({
      filteredJobs: jobs,
      statusFilter: 'all',
      statusScopedFilters: {
        draft: {
          streamKey: 'SE',
          year: 2025,
        },
      },
    });

    expect(grouped.map((group) => group.status)).toEqual(['draft', 'approved']);
    expect(grouped[0]?.availableStreamGroups).toEqual([
      {
        streamKey: 'SE',
        label: 'Sciences expérimentales',
        count: 2,
      },
      {
        streamKey: 'UNMAPPED',
        label: 'Unmapped stream',
        count: 1,
      },
    ]);
    expect(grouped[0]?.availableYears).toEqual([
      {
        year: 2025,
        count: 1,
      },
      {
        year: 2024,
        count: 1,
      },
    ]);
    expect(grouped[0]?.streamGroups).toEqual([
      {
        streamKey: 'SE',
        streamLabel: 'Sciences expérimentales',
        yearGroups: [
          {
            year: 2025,
            jobs: [jobs[0]!],
          },
        ],
      },
    ]);
  });

  it('builds process action labels and disabled states from job workflow', () => {
    expect(
      buildProcessJobActionState({
        job: createJobSummary({
          id: 'job-awaiting',
          workflow: {
            has_exam_document: true,
            has_correction_document: false,
            awaiting_correction: true,
            can_process: false,
            review_started: false,
          },
        }),
        processingJobId: null,
      }),
    ).toEqual({
      disabled: true,
      label: 'Waiting',
    });

    expect(
      buildProcessJobActionState({
        job: createJobSummary({
          id: 'job-processing',
          workflow: {
            has_exam_document: true,
            has_correction_document: true,
            awaiting_correction: false,
            can_process: true,
            review_started: true,
          },
        }),
        processingJobId: 'job-processing',
      }),
    ).toEqual({
      disabled: true,
      label: 'Processing…',
    });

    expect(
      buildProcessJobActionState({
        job: createJobSummary({
          id: 'job-reprocess',
          workflow: {
            has_exam_document: true,
            has_correction_document: true,
            awaiting_correction: false,
            can_process: true,
            review_started: true,
          },
        }),
        processingJobId: null,
      }),
    ).toEqual({
      disabled: false,
      label: 'Queue reprocess',
    });
  });
});
