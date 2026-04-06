export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

export type ApiJsonParser<T> = (value: unknown) => T;

type ApiErrorPayload = {
  message?: string | string[];
};

export function createApiUrl(path: string) {
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith(API_BASE_URL)
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function withApiRequestDefaults(init?: RequestInit): RequestInit {
  return {
    ...init,
    cache: init?.cache ?? "no-store",
    credentials: init?.credentials ?? "include",
  };
}

export function withJsonRequest(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  const hasBody = init?.body !== undefined && init.body !== null;
  const usesFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (hasBody && !usesFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...withApiRequestDefaults(init),
    headers,
  };
}

export async function readApiErrorMessage(
  response: Response,
  fallbackMessage = `Request failed (${response.status})`,
) {
  try {
    const payload = (await response.json()) as ApiErrorPayload | null;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(" · ")
      : payload?.message;

    if (message?.trim()) {
      return message;
    }
  } catch {
    // Ignore JSON parse failures and fall through to text handling.
  }

  try {
    const text = await response.text();

    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parse failures and return the fallback.
  }

  return fallbackMessage;
}

export async function fetchApi(
  path: string,
  init?: RequestInit,
  fallbackMessage?: string,
): Promise<Response> {
  const response = await fetch(createApiUrl(path), withApiRequestDefaults(init));

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, fallbackMessage),
    );
  }

  return response;
}

export async function fetchApiJson<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage?: string,
  parser?: ApiJsonParser<T>,
): Promise<T> {
  const response = await fetchApi(path, init, fallbackMessage);
  const payload = (await response.json()) as unknown;

  return parser ? parser(payload) : (payload as T);
}
