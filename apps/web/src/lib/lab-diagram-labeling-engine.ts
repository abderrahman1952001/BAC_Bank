export type LabDiagramHotspot = {
  x: number;
  y: number;
  radius?: number;
};

export type LabDiagramLabelTarget = {
  id: string;
  title: string;
  hotspot: LabDiagramHotspot;
  expectedLabel: string;
  acceptedLabels?: string[];
};

export type LabDiagramLabelAnswer = {
  targetId: string;
  label: string;
};

export type LabDiagramLabelEvaluation = {
  targetId: string;
  expectedLabel: string;
  actualLabel: string | null;
  passed: boolean;
};

export type LabDiagramEvaluation = {
  passed: boolean;
  correctCount: number;
  totalCount: number;
  labels: LabDiagramLabelEvaluation[];
};

function normalizeDiagramLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function evaluateDiagramLabels(
  targets: LabDiagramLabelTarget[],
  answers: LabDiagramLabelAnswer[],
): LabDiagramEvaluation {
  const answersByTarget = new Map(
    answers.map((answer) => [answer.targetId, answer.label]),
  );
  const labels = targets.map<LabDiagramLabelEvaluation>((target) => {
    const actualLabel = answersByTarget.get(target.id)?.trim() || null;
    const acceptedLabels = [
      target.expectedLabel,
      ...(target.acceptedLabels ?? []),
    ].map(normalizeDiagramLabel);
    const passed = actualLabel
      ? acceptedLabels.includes(normalizeDiagramLabel(actualLabel))
      : false;

    return {
      targetId: target.id,
      expectedLabel: target.expectedLabel,
      actualLabel,
      passed,
    };
  });
  const correctCount = labels.filter((label) => label.passed).length;

  return {
    passed: correctCount === labels.length,
    correctCount,
    totalCount: labels.length,
    labels,
  };
}

export function revealDiagramLabels(targets: LabDiagramLabelTarget[]) {
  return targets.map((target) => ({
    targetId: target.id,
    label: target.expectedLabel,
    hotspot: target.hotspot,
  }));
}
