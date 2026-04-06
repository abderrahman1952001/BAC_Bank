import { z } from "zod";

export { z };

export const dateLikeSchema: z.ZodType<string | Date> = z.union([
  z.string(),
  z.date(),
]);

export const jsonRecordSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);

function formatIssuePath(path: PropertyKey[]) {
  if (!path.length) {
    return "root";
  }

  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : String(segment),
    )
    .join(".");
}

export function parseContract<T>(
  schema: z.ZodType<T>,
  value: unknown,
  contractName: string,
) {
  const parsed = schema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .slice(0, 5)
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join("; ");

  throw new Error(`${contractName} is invalid. ${details}`);
}
