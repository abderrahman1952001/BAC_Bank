export const INGESTION_STREAM_OPTIONS = [
  ["SE", "Sciences expérimentales"],
  ["M", "Mathématiques"],
  ["GE", "Gestion et économie"],
  ["LP", "Lettres et philosophie"],
  ["LE", "Langues étrangères"],
  ["ARTS", "Arts"],
  ["MT_CIVIL", "Technique mathématique · Génie civil"],
  ["MT_ELEC", "Technique mathématique · Génie électrique"],
  ["MT_MECH", "Technique mathématique · Génie mécanique"],
  ["MT_PROC", "Technique mathématique · Génie des procédés"],
] as const;

export const INGESTION_SUBJECT_OPTIONS = [
  ["ARABIC", "Arabe"],
  ["MATHEMATICS", "Mathématiques"],
  ["PHYSICS", "Physique"],
  ["NATURAL_SCIENCES", "Sciences naturelles"],
  ["HISTORY_GEOGRAPHY", "Histoire-Géographie"],
  ["ISLAMIC_STUDIES", "Sciences islamiques"],
  ["PHILOSOPHY", "Philosophie"],
  ["FRENCH", "Français"],
  ["ENGLISH", "Anglais"],
  ["AMAZIGH", "Tamazight"],
  ["LAW", "Droit"],
  ["ECONOMICS_MANAGEMENT", "Économie et management"],
  ["ACCOUNTING_FINANCE", "Comptabilité et finance"],
  ["GERMAN", "Allemand"],
  ["SPANISH", "Espagnol"],
  ["ITALIAN", "Italien"],
  ["TECHNOLOGY_CIVIL", "Génie civil"],
  ["TECHNOLOGY_ELECTRICAL", "Génie électrique"],
  ["TECHNOLOGY_MECHANICAL", "Génie mécanique"],
  ["TECHNOLOGY_PROCESS", "Génie des procédés"],
  ["ARTS", "Arts"],
] as const;

export const INGESTION_STATUS_ORDER = [
  "draft",
  "in_review",
  "approved",
  "published",
  "failed",
] as const;

export const INGESTION_STATUS_LABELS: Record<
  (typeof INGESTION_STATUS_ORDER)[number],
  string
> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
};

export function findStreamLabel(streamCode: string | null) {
  if (!streamCode) {
    return "Unmapped stream";
  }

  return (
    INGESTION_STREAM_OPTIONS.find(([code]) => code === streamCode)?.[1] ??
    streamCode
  );
}

export function findSubjectLabel(subjectCode: string | null) {
  if (!subjectCode) {
    return "Unmapped subject";
  }

  return (
    INGESTION_SUBJECT_OPTIONS.find(([code]) => code === subjectCode)?.[1] ??
    subjectCode
  );
}
