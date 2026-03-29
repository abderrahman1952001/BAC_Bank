export function serializeLogEvent(
  event: string,
  fields: Record<string, unknown> = {},
) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...fields,
  });
}

export function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
