import { describe, expect, it } from "vitest";
import { parseExamResponse } from "@bac-bank/contracts/study";
import type { AdminIngestionJobResponse } from "@/lib/admin";
import { buildAdminIngestionStudentPreviewExam } from "./admin-ingestion-student-preview";

function makePayload(): AdminIngestionJobResponse {
  return {
    job: {
      id: "job-svt-2025-se",
      label: "BAC 2025 · NATURAL_SCIENCES · SE",
      draft_kind: "ingestion",
      provider: "manual_upload",
      year: 2025,
      stream_codes: ["SE", "M"],
      subject_code: "NATURAL_SCIENCES",
      session: "normal",
      min_year: 2008,
      status: "in_review",
      review_notes: null,
      error_message: null,
      published_paper_id: null,
      published_exams: [],
      created_at: "2026-05-03T08:00:00.000Z",
      updated_at: "2026-05-03T08:30:00.000Z",
    },
    workflow: {
      has_exam_document: true,
      has_correction_document: true,
      awaiting_correction: false,
      can_process: false,
      review_started: true,
      active_operation: "idle",
    },
    documents: [],
    draft_json: {
      schema: "bac_ingestion_draft/v1",
      exam: {
        year: 2025,
        streamCode: null,
        subjectCode: "NATURAL_SCIENCES",
        sessionType: "NORMAL",
        provider: "manual_upload",
        title: "BAC 2025 · NATURAL_SCIENCES · SE",
        minYear: 2008,
        sourceListingUrl: "https://example.test/source",
        sourceExamPageUrl: null,
        sourceCorrectionPageUrl: null,
        examDocumentId: "doc-exam",
        correctionDocumentId: "doc-correction",
        examDocumentStorageKey: "exam.pdf",
        correctionDocumentStorageKey: "correction.pdf",
        metadata: {
          durationMinutes: 240,
          paperStreamCodes: ["SE", "M"],
          sourceReference: "Official archive",
        },
      },
      sourcePages: [],
      assets: [
        {
          id: "asset-doc-1",
          sourcePageId: "page-1",
          documentKind: "EXAM",
          pageNumber: 1,
          variantCode: "SUJET_2",
          role: "PROMPT",
          classification: "image",
          cropBox: {
            x: 20,
            y: 30,
            width: 400,
            height: 300,
          },
          label: "Document 1",
          notes: null,
        },
      ],
      variants: [
        {
          code: "SUJET_1",
          title: "الموضوع الأول",
          nodes: [
            {
              id: "s1-ex-1",
              nodeType: "EXERCISE",
              parentId: null,
              orderIndex: 1,
              label: "التمرين الأول",
              maxPoints: null,
              topicCodes: ["GENETICS"],
              blocks: [],
            },
            {
              id: "s1-q-1",
              nodeType: "QUESTION",
              parentId: "s1-ex-1",
              orderIndex: 1,
              label: "1",
              maxPoints: 2,
              topicCodes: [],
              blocks: [
                {
                  id: "s1-q-1-prompt",
                  role: "PROMPT",
                  type: "paragraph",
                  value: "حلل الوثيقة.",
                  assetId: null,
                  data: null,
                },
              ],
            },
          ],
        },
        {
          code: "SUJET_2",
          title: "الموضوع الثاني",
          nodes: [
            {
              id: "s2-ex-1",
              nodeType: "EXERCISE",
              parentId: null,
              orderIndex: 1,
              label: "التمرين الأول",
              maxPoints: null,
              topicCodes: ["IMMUNITY"],
              blocks: [
                {
                  id: "s2-ex-1-context",
                  role: "PROMPT",
                  type: "image",
                  value: "",
                  assetId: "asset-doc-1",
                  data: null,
                },
              ],
            },
            {
              id: "s2-part-1",
              nodeType: "PART",
              parentId: "s2-ex-1",
              orderIndex: 1,
              label: "الجزء الأول",
              maxPoints: null,
              topicCodes: [],
              blocks: [],
            },
            {
              id: "s2-q-1",
              nodeType: "QUESTION",
              parentId: "s2-part-1",
              orderIndex: 1,
              label: "1",
              maxPoints: 3,
              topicCodes: [],
              blocks: [
                {
                  id: "s2-q-1-prompt",
                  role: "PROMPT",
                  type: "paragraph",
                  value: "استخرج المعلومة.",
                  assetId: null,
                  data: null,
                },
                {
                  id: "s2-q-1-solution",
                  role: "SOLUTION",
                  type: "paragraph",
                  value: "المعلومة المستخرجة.",
                  assetId: null,
                  data: null,
                },
              ],
            },
            {
              id: "s2-q-1-a",
              nodeType: "SUBQUESTION",
              parentId: "s2-q-1",
              orderIndex: 1,
              label: "أ",
              maxPoints: 1,
              topicCodes: [],
              blocks: [],
            },
          ],
        },
      ],
    },
    asset_preview_base_url: "/api/v1/ingestion/jobs/job-svt-2025-se/assets",
    validation: {
      errors: [],
      warnings: [],
      issues: [],
      can_approve: true,
      can_publish: true,
    },
  };
}

describe("admin ingestion student preview", () => {
  it("builds a contract-compatible student exam from a reviewed draft graph", () => {
    const exam = buildAdminIngestionStudentPreviewExam(makePayload(), {
      sujetNumber: 2,
      streamCode: "M",
    });

    expect(exam).not.toBeNull();
    expect(() => parseExamResponse(exam)).not.toThrow();
    expect(exam).toMatchObject({
      id: "draft-preview:job-svt-2025-se:SUJET_2",
      year: 2025,
      durationMinutes: 240,
      officialSourceReference: "Official archive",
      selectedSujetNumber: 2,
      stream: {
        code: "M",
        name: "رياضيات",
      },
      subject: {
        code: "NATURAL_SCIENCES",
        name: "علوم الطبيعة والحياة",
      },
      exerciseCount: 1,
    });
    expect(exam?.availableSujets).toEqual([
      { sujetNumber: 1, label: "الموضوع الأول" },
      { sujetNumber: 2, label: "الموضوع الثاني" },
    ]);
    expect(exam?.exercises).toEqual([
      {
        id: "s2-ex-1",
        orderIndex: 1,
        title: "التمرين الأول",
        totalPoints: 4,
        questionCount: 2,
      },
    ]);
    expect(
      exam?.hierarchy?.exercises[0]?.blocks[0]?.media?.url,
    ).toBe("/api/v1/ingestion/jobs/job-svt-2025-se/assets/asset-doc-1/preview");
    expect(exam?.hierarchy?.exercises[0]?.status).toBe("DRAFT");
  });

  it("falls back to the first populated variant and first valid stream", () => {
    const exam = buildAdminIngestionStudentPreviewExam(makePayload(), {
      sujetNumber: "9",
      streamCode: "UNKNOWN",
    });

    expect(exam?.selectedSujetNumber).toBe(1);
    expect(exam?.stream.code).toBe("SE");
  });

  it("returns null when a draft has no populated variants", () => {
    const payload = makePayload();
    payload.draft_json.variants = [];

    expect(buildAdminIngestionStudentPreviewExam(payload)).toBeNull();
  });
});
