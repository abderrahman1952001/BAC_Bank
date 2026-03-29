import { describe, expect, it } from 'vitest';
import type {
  AdminIngestionDraft,
  AdminIngestionValidationIssue,
} from '@/lib/admin';
import {
  buildDraftWithSelectedStreamCodes,
  buildExtractionSummary,
  buildFocusRequest,
  buildIssueCountBySection,
  buildProcessActionLabel,
  buildReviewActionState,
  buildReviewSessionSnapshot,
  formatAutosaveTimestamp,
  formatIssueLocation,
  mergeExamMetadata,
  readDraftSelectedStreamCodes,
  resolveIssueSection,
} from './admin-ingestion-review';

function createDraft(): AdminIngestionDraft {
  return {
    schema: '1',
    exam: {
      year: 2025,
      streamCode: 'SE',
      subjectCode: 'MATH',
      sessionType: 'NORMAL',
      provider: 'manual',
      title: 'Mathematics',
      minYear: 2020,
      sourceListingUrl: null,
      sourceExamPageUrl: null,
      sourceCorrectionPageUrl: null,
      examDocumentId: 'doc-exam',
      correctionDocumentId: null,
      examDocumentStorageKey: 'exam.pdf',
      correctionDocumentStorageKey: null,
      metadata: {
        sharedStreamCodes: ['SE', 'TM'],
        extraction: {
          engine: 'gemini',
          model: '2.5',
          exerciseCount: 3,
          questionCount: 8,
          assetCount: 4,
          uncertainties: ['u1', 'u2'],
        },
      },
    },
    sourcePages: [],
    assets: [],
    variants: [],
  };
}

const issues: AdminIngestionValidationIssue[] = [
  {
    id: 'issue-1',
    severity: 'error',
    code: 'metadata',
    target: 'exam',
    message: 'Missing subject',
    variantCode: null,
    nodeId: null,
    blockId: null,
    assetId: null,
    sourcePageId: null,
    pageNumber: null,
    field: 'subjectCode',
  },
  {
    id: 'issue-2',
    severity: 'warning',
    code: 'node',
    target: 'node',
    message: 'Check node',
    variantCode: 'SUJET_1',
    nodeId: 'node-12345678',
    blockId: 'block-abcdefgh',
    assetId: null,
    sourcePageId: null,
    pageNumber: null,
    field: null,
  },
  {
    id: 'issue-3',
    severity: 'warning',
    code: 'asset',
    target: 'asset',
    message: 'Check asset',
    variantCode: null,
    nodeId: null,
    blockId: null,
    assetId: 'asset-abcdef12',
    sourcePageId: 'page-1',
    pageNumber: 3,
    field: null,
  },
];

describe('admin ingestion review helpers', () => {
  it('formats issue locations and resolves issue sections', () => {
    expect(formatIssueLocation(issues[1]!)).toBe(
      'SUJET 1 · node node-123 · block block-ab',
    );
    expect(resolveIssueSection(issues[0]!)).toBe('metadata');
    expect(resolveIssueSection(issues[1]!)).toBe('structure');
    expect(resolveIssueSection(issues[2]!)).toBe('sources');
  });

  it('builds review snapshots and merges exam metadata', () => {
    const draft = createDraft();

    expect(buildReviewSessionSnapshot(draft, 'Ready')).toContain('"reviewNotes":"Ready"');
    expect(
      mergeExamMetadata(
        {
          sharedStreamCodes: ['SE'],
          source: 'legacy',
        },
        {
          sharedStreamCodes: ['SE', 'TM'],
        },
      ),
    ).toEqual({
      sharedStreamCodes: ['SE', 'TM'],
      source: 'legacy',
    });
  });

  it('formats autosave timestamps and ignores invalid values', () => {
    expect(formatAutosaveTimestamp('invalid')).toBeNull();
    expect(formatAutosaveTimestamp('2026-03-29T12:34:56.000Z')).not.toBeNull();
  });

  it('builds extraction summaries and selected stream codes from review drafts', () => {
    const draft = createDraft();

    expect(buildExtractionSummary(draft)).toEqual({
      engine: 'gemini',
      model: '2.5',
      exerciseCount: 3,
      questionCount: 8,
      assetCount: 4,
      uncertaintyCount: 2,
    });
    expect(readDraftSelectedStreamCodes(draft.exam)).toEqual(['SE', 'TM']);
  });

  it('builds focus requests and issue counts by review section', () => {
    expect(buildFocusRequest(issues[1]!)).toEqual({
      issueId: 'issue-2',
      variantCode: 'SUJET_1',
      nodeId: 'node-12345678',
      blockId: 'block-abcdefgh',
      assetId: null,
      sourcePageId: null,
    });
    expect(buildIssueCountBySection(issues)).toEqual({
      overview: 0,
      metadata: 1,
      structure: 1,
      sources: 1,
      assets: 0,
    });
  });

  it('builds review action state and process labels', () => {
    expect(
      buildReviewActionState({
        job: {
          status: 'draft',
          provider: 'manual',
        },
        saving: false,
        autosaving: false,
        autosaveError: null,
        hasUnsavedChanges: true,
        formattedLastSavedAt: null,
        processing: false,
        attachingCorrection: false,
      }),
    ).toEqual({
      actionBusy: false,
      primaryActionLabel: 'Approve & Publish',
      isPublishedRevisionJob: false,
      autosaveStatusMessage: 'Unsaved changes detected. Autosave will run shortly.',
      autosaveStatusClassName: 'muted-text',
    });

    expect(
      buildReviewActionState({
        job: {
          status: 'published',
          provider: 'published_revision',
        },
        saving: false,
        autosaving: false,
        autosaveError: null,
        hasUnsavedChanges: false,
        formattedLastSavedAt: '12:34:56',
        processing: false,
        attachingCorrection: false,
      }),
    ).toEqual({
      actionBusy: false,
      primaryActionLabel: 'Publish',
      isPublishedRevisionJob: true,
      autosaveStatusMessage: 'All review changes saved at 12:34:56.',
      autosaveStatusClassName: 'success-text',
    });

    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: true,
          review_started: false,
        },
        jobStatus: 'draft',
        processing: false,
      }),
    ).toBe('Waiting');
    expect(
      buildProcessActionLabel({
        workflow: {
          awaiting_correction: false,
          review_started: true,
        },
        jobStatus: 'draft',
        processing: false,
      }),
    ).toBe('Queue reprocess');
  });

  it('updates selected stream codes while preserving valid primary streams', () => {
    const draft = createDraft();

    expect(
      buildDraftWithSelectedStreamCodes(draft, [' tm ', 'se', '', 'TM']).exam,
    ).toMatchObject({
      streamCode: 'SE',
      metadata: {
        sharedStreamCodes: ['TM', 'SE'],
      },
    });

    expect(
      buildDraftWithSelectedStreamCodes(draft, ['LP']).exam,
    ).toMatchObject({
      streamCode: 'LP',
      metadata: {
        sharedStreamCodes: ['LP'],
      },
    });
  });
});
