export const SESSION_YEAR_MIN = 2008;

export function resolveSessionYearMax(rawValue?: string, now = new Date()) {
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : Number.NaN;

  if (Number.isInteger(parsed) && parsed >= SESSION_YEAR_MIN) {
    return parsed;
  }

  return now.getUTCFullYear();
}

export const SESSION_YEAR_MAX = resolveSessionYearMax(
  process.env.SESSION_YEAR_MAX,
);
