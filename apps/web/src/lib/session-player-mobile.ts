export type SessionPlayerMobileTools = {
  contextEnabled: boolean;
  supportEnabled: boolean;
  solutionEnabled: boolean;
  solutionLabel: string;
  solutionDescription: string;
};

export function buildSessionPlayerMobileTools(input: {
  hasHints: boolean;
  hasMethodGuidance: boolean;
  solutionVisible: boolean;
  canRevealSolution: boolean;
  isActiveSimulation: boolean;
}): SessionPlayerMobileTools {
  const supportEnabled =
    !input.solutionVisible &&
    !input.isActiveSimulation &&
    (input.hasHints || input.hasMethodGuidance);
  const solutionEnabled =
    input.solutionVisible || (!input.isActiveSimulation && input.canRevealSolution);

  if (input.solutionVisible) {
    return {
      contextEnabled: true,
      supportEnabled,
      solutionEnabled,
      solutionLabel: "الحل",
      solutionDescription: "راجع التصحيح الرسمي والتنقيط لهذا السؤال.",
    };
  }

  if (input.isActiveSimulation) {
    return {
      contextEnabled: true,
      supportEnabled,
      solutionEnabled: false,
      solutionLabel: "مقفل",
      solutionDescription: "التصحيح يفتح بعد تسليم المحاكاة أو انتهاء الوقت.",
    };
  }

  return {
    contextEnabled: true,
    supportEnabled,
    solutionEnabled,
    solutionLabel: "التصحيح",
    solutionDescription: input.canRevealSolution
      ? "افتح ورقة التصحيح عندما تنتهي من محاولتك."
      : "التصحيح غير متاح لهذا السؤال حالياً.",
  };
}
