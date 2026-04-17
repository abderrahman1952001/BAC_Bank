export function formatStudyTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatStudyDuration(seconds: number) {
  if (seconds <= 0) {
    return "أقل من دقيقة";
  }

  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (totalMinutes <= 0) {
    return `${remainingSeconds} ث`;
  }

  if (remainingSeconds === 0) {
    return `${totalMinutes} د`;
  }

  return `${totalMinutes} د ${remainingSeconds} ث`;
}

export function formatStudyCountdown(ms: number) {
  const safeMs = Math.max(ms, 0);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export function formatRelativeStudyTimestamp(timestamp: string) {
  const value = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(diffMs / oneDay);

  if (diffDays <= 0) {
    return "اليوم";
  }

  if (diffDays === 1) {
    return "أمس";
  }

  if (diffDays === 2) {
    return "منذ يومين";
  }

  if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  }

  const diffWeeks = Math.floor(diffDays / 7);

  if (diffWeeks === 1) {
    return "منذ أسبوع";
  }

  if (diffWeeks < 5) {
    return `منذ ${diffWeeks} أسابيع`;
  }

  return formatStudyTimestamp(timestamp);
}
