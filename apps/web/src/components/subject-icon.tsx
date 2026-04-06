import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Leaf,
  Sigma,
} from "lucide-react";

const FALLBACK_ICON = BookOpen;

function resolveSubjectIcon(subjectCode?: string | null, subjectName?: string | null) {
  const normalizedCode = (subjectCode ?? "").toUpperCase();
  const normalizedName = subjectName ?? "";

  if (
    normalizedCode.includes("MATH") ||
    normalizedName.includes("رياض")
  ) {
    return Calculator;
  }

  if (
    normalizedCode.includes("PHYS") ||
    normalizedName.includes("فيزياء")
  ) {
    return Atom;
  }

  if (
    normalizedCode.includes("SCI") ||
    normalizedCode.includes("NAT") ||
    normalizedName.includes("العلوم الطبيعية")
  ) {
    return Leaf;
  }

  if (
    normalizedCode.includes("CHEM") ||
    normalizedName.includes("كيمياء")
  ) {
    return FlaskConical;
  }

  if (
    normalizedCode.includes("PHILO") ||
    normalizedName.includes("فلسف")
  ) {
    return Globe2;
  }

  if (
    normalizedCode.includes("ARAB") ||
    normalizedCode.includes("LANG") ||
    normalizedName.includes("لغة") ||
    normalizedName.includes("أدب")
  ) {
    return Sigma;
  }

  return FALLBACK_ICON;
}

export function SubjectIcon({
  subjectCode,
  subjectName,
  size = 24,
}: {
  subjectCode?: string | null;
  subjectName?: string | null;
  size?: number;
}) {
  const icon = resolveSubjectIcon(subjectCode, subjectName);

  if (icon === Calculator) {
    return <Calculator size={size} strokeWidth={2.1} />;
  }

  if (icon === Atom) {
    return <Atom size={size} strokeWidth={2.1} />;
  }

  if (icon === Leaf) {
    return <Leaf size={size} strokeWidth={2.1} />;
  }

  if (icon === FlaskConical) {
    return <FlaskConical size={size} strokeWidth={2.1} />;
  }

  if (icon === Globe2) {
    return <Globe2 size={size} strokeWidth={2.1} />;
  }

  if (icon === Sigma) {
    return <Sigma size={size} strokeWidth={2.1} />;
  }

  return <BookOpen size={size} strokeWidth={2.1} />;
}
