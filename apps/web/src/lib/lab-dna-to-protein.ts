export type DnaBase = "A" | "C" | "G" | "T";

export type MutationKind = "substitution" | "insertion" | "deletion";

export type MutationInput = {
  kind: MutationKind;
  index: number;
  base?: DnaBase;
};

export type SequenceCodon = {
  index: number;
  value: string;
  complete: boolean;
};

export type AminoAcidEntry = {
  codon: string;
  name: string;
  shortCode: string;
  isStop: boolean;
};

export type DnaAnalysis = {
  input: string;
  normalizedSequence: string;
  warnings: string[];
  dnaCodons: SequenceCodon[];
  mrnaSequence: string;
  mrnaCodons: SequenceCodon[];
  aminoAcids: AminoAcidEntry[];
};

export type MutationResult = {
  sequence: string;
  warnings: string[];
};

export type DnaComparisonKind =
  | "NO_VISIBLE_CHANGE"
  | "AMINO_ACID_CHANGE"
  | "PREMATURE_STOP"
  | "FRAMESHIFT";

export type DnaComparison = {
  kind: DnaComparisonKind;
  title: string;
  explanation: string;
};

export type DnaToProteinPreset = {
  id: "normal-stop" | "silent-change" | "frameshift-risk";
  title: string;
  sequence: string;
  note: string;
};

const codonTable: Record<string, Omit<AminoAcidEntry, "codon">> = {
  UUU: { name: "Phenylalanine", shortCode: "Phe", isStop: false },
  UUC: { name: "Phenylalanine", shortCode: "Phe", isStop: false },
  UUA: { name: "Leucine", shortCode: "Leu", isStop: false },
  UUG: { name: "Leucine", shortCode: "Leu", isStop: false },
  UCU: { name: "Serine", shortCode: "Ser", isStop: false },
  UCC: { name: "Serine", shortCode: "Ser", isStop: false },
  UCA: { name: "Serine", shortCode: "Ser", isStop: false },
  UCG: { name: "Serine", shortCode: "Ser", isStop: false },
  UAU: { name: "Tyrosine", shortCode: "Tyr", isStop: false },
  UAC: { name: "Tyrosine", shortCode: "Tyr", isStop: false },
  UAA: { name: "Stop", shortCode: "Stop", isStop: true },
  UAG: { name: "Stop", shortCode: "Stop", isStop: true },
  UGU: { name: "Cysteine", shortCode: "Cys", isStop: false },
  UGC: { name: "Cysteine", shortCode: "Cys", isStop: false },
  UGA: { name: "Stop", shortCode: "Stop", isStop: true },
  UGG: { name: "Tryptophan", shortCode: "Trp", isStop: false },
  CUU: { name: "Leucine", shortCode: "Leu", isStop: false },
  CUC: { name: "Leucine", shortCode: "Leu", isStop: false },
  CUA: { name: "Leucine", shortCode: "Leu", isStop: false },
  CUG: { name: "Leucine", shortCode: "Leu", isStop: false },
  CCU: { name: "Proline", shortCode: "Pro", isStop: false },
  CCC: { name: "Proline", shortCode: "Pro", isStop: false },
  CCA: { name: "Proline", shortCode: "Pro", isStop: false },
  CCG: { name: "Proline", shortCode: "Pro", isStop: false },
  CAU: { name: "Histidine", shortCode: "His", isStop: false },
  CAC: { name: "Histidine", shortCode: "His", isStop: false },
  CAA: { name: "Glutamine", shortCode: "Gln", isStop: false },
  CAG: { name: "Glutamine", shortCode: "Gln", isStop: false },
  CGU: { name: "Arginine", shortCode: "Arg", isStop: false },
  CGC: { name: "Arginine", shortCode: "Arg", isStop: false },
  CGA: { name: "Arginine", shortCode: "Arg", isStop: false },
  CGG: { name: "Arginine", shortCode: "Arg", isStop: false },
  AUU: { name: "Isoleucine", shortCode: "Ile", isStop: false },
  AUC: { name: "Isoleucine", shortCode: "Ile", isStop: false },
  AUA: { name: "Isoleucine", shortCode: "Ile", isStop: false },
  AUG: { name: "Methionine", shortCode: "Met", isStop: false },
  ACU: { name: "Threonine", shortCode: "Thr", isStop: false },
  ACC: { name: "Threonine", shortCode: "Thr", isStop: false },
  ACA: { name: "Threonine", shortCode: "Thr", isStop: false },
  ACG: { name: "Threonine", shortCode: "Thr", isStop: false },
  AAU: { name: "Asparagine", shortCode: "Asn", isStop: false },
  AAC: { name: "Asparagine", shortCode: "Asn", isStop: false },
  AAA: { name: "Lysine", shortCode: "Lys", isStop: false },
  AAG: { name: "Lysine", shortCode: "Lys", isStop: false },
  AGU: { name: "Serine", shortCode: "Ser", isStop: false },
  AGC: { name: "Serine", shortCode: "Ser", isStop: false },
  AGA: { name: "Arginine", shortCode: "Arg", isStop: false },
  AGG: { name: "Arginine", shortCode: "Arg", isStop: false },
  GUU: { name: "Valine", shortCode: "Val", isStop: false },
  GUC: { name: "Valine", shortCode: "Val", isStop: false },
  GUA: { name: "Valine", shortCode: "Val", isStop: false },
  GUG: { name: "Valine", shortCode: "Val", isStop: false },
  GCU: { name: "Alanine", shortCode: "Ala", isStop: false },
  GCC: { name: "Alanine", shortCode: "Ala", isStop: false },
  GCA: { name: "Alanine", shortCode: "Ala", isStop: false },
  GCG: { name: "Alanine", shortCode: "Ala", isStop: false },
  GAU: { name: "Aspartic acid", shortCode: "Asp", isStop: false },
  GAC: { name: "Aspartic acid", shortCode: "Asp", isStop: false },
  GAA: { name: "Glutamic acid", shortCode: "Glu", isStop: false },
  GAG: { name: "Glutamic acid", shortCode: "Glu", isStop: false },
  GGU: { name: "Glycine", shortCode: "Gly", isStop: false },
  GGC: { name: "Glycine", shortCode: "Gly", isStop: false },
  GGA: { name: "Glycine", shortCode: "Gly", isStop: false },
  GGG: { name: "Glycine", shortCode: "Gly", isStop: false },
};

export const dnaToProteinPresets = [
  {
    id: "normal-stop",
    title: "سلسلة قصيرة مع توقف",
    sequence: "ATGTTTGGGTAA",
    note: "تبدأ بـ ATG وتنتهي برمز توقف واضح.",
  },
  {
    id: "silent-change",
    title: "قابلية الطفرة الصامتة",
    sequence: "ATGGCTTAA",
    note: "بعض تغييرات القاعدة الثالثة لا تغير الحمض الأميني.",
  },
  {
    id: "frameshift-risk",
    title: "خطر انزياح القراءة",
    sequence: "ATGAAACCCGGGTAA",
    note: "الحذف أو الإضافة بقاعدة واحدة يغير تقسيم الثلاثيات.",
  },
] satisfies DnaToProteinPreset[];

export function normalizeDnaSequence(input: string): {
  sequence: string;
  warnings: string[];
} {
  const compact = input.toUpperCase().replace(/\s+/g, "");
  const invalidCharacters = Array.from(
    new Set(compact.replace(/[ACGT]/g, "").split("").filter(Boolean)),
  );
  const sequence = compact.replace(/[^ACGT]/g, "");
  const warnings: string[] = [];

  if (invalidCharacters.length) {
    warnings.push(`أزيلت رموز غير صالحة: ${invalidCharacters.join(", ")}`);
  }

  if (sequence && sequence.length % 3 !== 0) {
    warnings.push("طول السلسلة ليس مضاعفاً لـ 3، لذلك توجد ثلاثية غير مكتملة.");
  }

  if (sequence && !sequence.startsWith("ATG")) {
    warnings.push("السلسلة لا تبدأ بـ ATG؛ سنعرض الترجمة كما هي لأغراض الفهم.");
  }

  return { sequence, warnings };
}

export function groupSequenceCodons(sequence: string): SequenceCodon[] {
  const codons: SequenceCodon[] = [];

  for (let index = 0; index < sequence.length; index += 3) {
    const value = sequence.slice(index, index + 3);
    codons.push({
      index: index / 3,
      value,
      complete: value.length === 3,
    });
  }

  return codons;
}

export function transcribeCodingDnaToMrna(sequence: string): string {
  return sequence.replaceAll("T", "U");
}

export function translateMrnaCodons(codons: SequenceCodon[]): AminoAcidEntry[] {
  const aminoAcids: AminoAcidEntry[] = [];

  for (const codon of codons) {
    if (!codon.complete) {
      continue;
    }

    const entry = codonTable[codon.value];

    if (!entry) {
      continue;
    }

    aminoAcids.push({
      codon: codon.value,
      ...entry,
    });

    if (entry.isStop) {
      break;
    }
  }

  return aminoAcids;
}

export function analyzeDnaSequence(input: string): DnaAnalysis {
  const normalized = normalizeDnaSequence(input);
  const mrnaSequence = transcribeCodingDnaToMrna(normalized.sequence);

  return {
    input,
    normalizedSequence: normalized.sequence,
    warnings: normalized.warnings,
    dnaCodons: groupSequenceCodons(normalized.sequence),
    mrnaSequence,
    mrnaCodons: groupSequenceCodons(mrnaSequence),
    aminoAcids: translateMrnaCodons(groupSequenceCodons(mrnaSequence)),
  };
}

export function buildMutatedDnaSequence(
  sequence: string,
  mutation: MutationInput,
): MutationResult {
  const normalized = normalizeDnaSequence(sequence);
  const safeIndex = Math.max(0, Math.min(mutation.index, normalized.sequence.length));
  const base = mutation.base ?? "A";

  if (!normalized.sequence) {
    return {
      sequence: "",
      warnings: ["أدخل سلسلة DNA قبل تطبيق الطفرة."],
    };
  }

  if (mutation.kind === "substitution") {
    const index = Math.min(safeIndex, normalized.sequence.length - 1);
    return {
      sequence: `${normalized.sequence.slice(0, index)}${base}${normalized.sequence.slice(index + 1)}`,
      warnings: normalized.warnings,
    };
  }

  if (mutation.kind === "insertion") {
    return {
      sequence: `${normalized.sequence.slice(0, safeIndex)}${base}${normalized.sequence.slice(safeIndex)}`,
      warnings: normalized.warnings,
    };
  }

  const index = Math.min(safeIndex, normalized.sequence.length - 1);

  return {
    sequence: `${normalized.sequence.slice(0, index)}${normalized.sequence.slice(index + 1)}`,
    warnings: normalized.warnings,
  };
}

function aminoSignature(analysis: DnaAnalysis) {
  return analysis.aminoAcids.map((aminoAcid) => aminoAcid.shortCode).join("-");
}

function firstStopIndex(analysis: DnaAnalysis) {
  const index = analysis.aminoAcids.findIndex((aminoAcid) => aminoAcid.isStop);
  return index === -1 ? null : index;
}

export function compareDnaAnalyses(
  original: DnaAnalysis,
  mutated: DnaAnalysis,
  mutationKind: MutationKind,
): DnaComparison {
  if (
    (mutationKind === "insertion" || mutationKind === "deletion") &&
    Math.abs(mutated.normalizedSequence.length - original.normalizedSequence.length) %
      3 !==
      0
  ) {
    return {
      kind: "FRAMESHIFT",
      title: "انزياح إطار القراءة",
      explanation:
        "الإضافة أو الحذف لم يحافظ على مضاعفات 3، لذلك تتغير الثلاثيات بعد موضع الطفرة.",
    };
  }

  const originalStopIndex = firstStopIndex(original);
  const mutatedStopIndex = firstStopIndex(mutated);

  if (
    mutatedStopIndex !== null &&
    (originalStopIndex === null || mutatedStopIndex < originalStopIndex)
  ) {
    return {
      kind: "PREMATURE_STOP",
      title: "توقف مبكر",
      explanation:
        "الطفرة أظهرت رمز توقف قبل نهاية السلسلة الأصلية، وقد ينتج بروتين أقصر.",
    };
  }

  if (aminoSignature(original) === aminoSignature(mutated)) {
    return {
      kind: "NO_VISIBLE_CHANGE",
      title: "لا تغير ظاهر في السلسلة",
      explanation:
        "الترجمة المعروضة أعطت نفس تسلسل الأحماض الأمينية في هذا المقطع.",
    };
  }

  return {
    kind: "AMINO_ACID_CHANGE",
    title: "تغير في حمض أميني",
    explanation:
      "تغيرت واحدة أو أكثر من الثلاثيات، فظهر تغير في السلسلة البروتينية.",
  };
}
