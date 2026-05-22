export type LabSourceDocument = {
  id: string;
  title: string;
  kind: "graph" | "table" | "diagram" | "text" | "image" | "apparatus";
};

export type LabEvidenceItem = {
  id: string;
  documentId: string;
  label: string;
  keywords?: string[];
};

export type LabDocumentReasoningPrompt = {
  requiredEvidenceIds: string[];
  requiredConclusionKeywords?: string[];
};

export type LabDocumentReasoningAnswer = {
  selectedEvidenceIds: string[];
  conclusion: string;
};

export type LabDocumentReasoningEvaluation = {
  passed: boolean;
  selectedRequiredCount: number;
  requiredEvidenceCount: number;
  missingEvidenceIds: string[];
  missingKeywords: string[];
};

function normalizeReasoningText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function evaluateDocumentReasoning(
  prompt: LabDocumentReasoningPrompt,
  answer: LabDocumentReasoningAnswer,
): LabDocumentReasoningEvaluation {
  const selected = new Set(answer.selectedEvidenceIds);
  const missingEvidenceIds = prompt.requiredEvidenceIds.filter(
    (evidenceId) => !selected.has(evidenceId),
  );
  const conclusion = normalizeReasoningText(answer.conclusion);
  const missingKeywords = (prompt.requiredConclusionKeywords ?? []).filter(
    (keyword) => !conclusion.includes(normalizeReasoningText(keyword)),
  );

  return {
    passed: missingEvidenceIds.length === 0 && missingKeywords.length === 0,
    selectedRequiredCount:
      prompt.requiredEvidenceIds.length - missingEvidenceIds.length,
    requiredEvidenceCount: prompt.requiredEvidenceIds.length,
    missingEvidenceIds,
    missingKeywords,
  };
}

export function groupEvidenceByDocument(evidence: LabEvidenceItem[]) {
  const groups = new Map<string, LabEvidenceItem[]>();

  for (const item of evidence) {
    groups.set(item.documentId, [...(groups.get(item.documentId) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([documentId, items]) => ({
    documentId,
    items,
  }));
}

