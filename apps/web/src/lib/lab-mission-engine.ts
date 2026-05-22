import { evaluateDiagramLabels } from "./lab-diagram-labeling-engine";
import { evaluateDocumentReasoning } from "./lab-document-reasoning-engine";
import { evaluateLabMeasurements } from "./lab-formula-unit-engine";
import { evaluateLabTableCells } from "./lab-table-engine";

export type ReusableLabMissionCheckKind =
  | "TABLE_CELLS"
  | "DIAGRAM_LABELS"
  | "DOCUMENT_EVIDENCE"
  | "FORMULA_VALUE"
  | "GRAPH_POINT";

export type ReusableLabMissionEvaluation = {
  kind: ReusableLabMissionCheckKind | string | null;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readArray<T>(source: Record<string, unknown>, key: string): T[] {
  const value = source[key];

  return Array.isArray(value) ? (value as T[]) : [];
}

function buildEvaluation(
  kind: ReusableLabMissionEvaluation["kind"],
  passed: boolean,
  message: string,
  details?: Record<string, unknown>,
): ReusableLabMissionEvaluation {
  return details
    ? {
        kind,
        passed,
        message,
        details,
      }
    : {
        kind,
        passed,
        message,
      };
}

function evaluateGraphPoint(
  exitCheck: Record<string, unknown>,
  resultJson: Record<string, unknown>,
) {
  const expectedX = readNumber(exitCheck, "x");
  const expectedY = readNumber(exitCheck, "y");
  const tolerance = readNumber(exitCheck, "tolerance") ?? 0;
  const points = readArray<Record<string, unknown>>(resultJson, "graphPoints");
  const point = isRecord(resultJson.point) ? resultJson.point : null;
  const candidates = point ? [point, ...points] : points;
  const matched = candidates.some((candidate) => {
    const actualX = readNumber(candidate, "x");
    const actualY = readNumber(candidate, "y");

    return (
      expectedX !== null &&
      expectedY !== null &&
      actualX !== null &&
      actualY !== null &&
      Math.abs(actualX - expectedX) <= tolerance &&
      Math.abs(actualY - expectedY) <= tolerance
    );
  });

  return buildEvaluation(
    "GRAPH_POINT",
    matched,
    matched
      ? "النقطة المقروءة من المنحنى توافق المهمة."
      : "النقطة المقروءة من المنحنى لا تطابق المطلوب بعد.",
    {
      expected: { x: expectedX, y: expectedY, tolerance },
      candidates,
    },
  );
}

export function evaluateReusableLabMissionExitCheck(
  exitCheck: Record<string, unknown> | null | undefined,
  resultJson: Record<string, unknown> | null | undefined,
): ReusableLabMissionEvaluation {
  if (!exitCheck) {
    return buildEvaluation(null, true, "لا يوجد شرط تحقق لهذه المهمة.");
  }

  const kind = readString(exitCheck, "kind");

  if (!kind) {
    return buildEvaluation(
      null,
      false,
      "شرط تحقق المهمة غير مكتمل ولا يمكن اعتماد الإنجاز.",
    );
  }

  if (!resultJson) {
    return buildEvaluation(kind, false, "لم أجد نتيجة المختبر لهذه المهمة.");
  }

  switch (kind) {
    case "TABLE_CELLS": {
      const details = evaluateLabTableCells(
        readArray(exitCheck, "expectedCells"),
        readArray(resultJson, "answerCells"),
      );

      return buildEvaluation(
        kind,
        details.passed,
        details.passed
          ? "خلايا الجدول توافق المهمة."
          : "بعض خلايا الجدول لا تزال غير صحيحة.",
        { table: details },
      );
    }
    case "DIAGRAM_LABELS": {
      const details = evaluateDiagramLabels(
        readArray(exitCheck, "targets"),
        readArray(resultJson, "labels"),
      );

      return buildEvaluation(
        kind,
        details.passed,
        details.passed
          ? "تسميات الرسم توافق المهمة."
          : "بعض تسميات الرسم لا تزال غير صحيحة.",
        { diagram: details },
      );
    }
    case "DOCUMENT_EVIDENCE": {
      const details = evaluateDocumentReasoning(
        {
          requiredEvidenceIds: readArray(exitCheck, "requiredEvidenceIds"),
          requiredConclusionKeywords: readArray(
            exitCheck,
            "requiredConclusionKeywords",
          ),
        },
        {
          selectedEvidenceIds: readArray(resultJson, "selectedEvidenceIds"),
          conclusion: readString(resultJson, "conclusion") ?? "",
        },
      );

      return buildEvaluation(
        kind,
        details.passed,
        details.passed
          ? "الأدلة والاستنتاج يوافقان المهمة."
          : "الأدلة أو الاستنتاج لا تزال ناقصة.",
        { documentReasoning: details },
      );
    }
    case "FORMULA_VALUE": {
      const details = evaluateLabMeasurements(
        readArray(exitCheck, "expectedMeasurements"),
        readArray(resultJson, "measurements"),
      );

      return buildEvaluation(
        kind,
        details.passed,
        details.passed
          ? "القيم والوحدات توافق المهمة."
          : "راجع القيم أو الوحدات قبل إنهاء المهمة.",
        { formula: details },
      );
    }
    case "GRAPH_POINT":
      return evaluateGraphPoint(exitCheck, resultJson);
    default:
      return buildEvaluation(kind, false, "هذا النوع من تحقق المهمة غير مدعوم.");
  }
}
