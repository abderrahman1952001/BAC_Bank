const DEFAULT_ATTEMPTS = 3;
const DEFAULT_FETCH_TEXT_TIMEOUT_MS = 30_000;
const DEFAULT_FETCH_BUFFER_TIMEOUT_MS = 120_000;

type FetchTextInput = {
  userAgent: string;
  accept?: string;
  timeoutMs?: number;
  attempts?: number;
};

type FetchBufferInput = {
  userAgent: string;
  timeoutMs?: number;
  attempts?: number;
};

export async function fetchTextWithRetry(url: string, input: FetchTextInput) {
  const response = await retryWithBackoff(
    () =>
      fetch(url, {
        headers: {
          'user-agent': input.userAgent,
          ...(input.accept ? { accept: input.accept } : {}),
        },
        signal: AbortSignal.timeout(
          input.timeoutMs ?? DEFAULT_FETCH_TEXT_TIMEOUT_MS,
        ),
      }),
    input.attempts ?? DEFAULT_ATTEMPTS,
    `fetch text ${url}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} when fetching ${url}`);
  }

  return response.text();
}

export async function fetchBufferWithRetry(
  url: string,
  input: FetchBufferInput,
) {
  const candidates = buildDownloadUrlCandidates(url);
  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      const response = await retryWithBackoff(
        () =>
          fetch(candidate, {
            headers: {
              'user-agent': input.userAgent,
            },
            signal: AbortSignal.timeout(
              input.timeoutMs ?? DEFAULT_FETCH_BUFFER_TIMEOUT_MS,
            ),
          }),
        input.attempts ?? DEFAULT_ATTEMPTS,
        `fetch buffer ${candidate}`,
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} when downloading ${candidate}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      errors.push(`${candidate}: ${describeError(error)}`);
    }
  }

  throw new Error(errors.join(' | '));
}

export function buildDownloadUrlCandidates(url: string) {
  const normalizedInput = normalizeDownloadUrl(url);
  const candidates = [normalizedInput];

  try {
    const normalized = new URL(normalizedInput);

    if (normalized.protocol === 'http:') {
      normalized.protocol = 'https:';
      candidates.unshift(normalized.toString());
    }
  } catch {
    return candidates;
  }

  return [...new Set(candidates)];
}

function normalizeDownloadUrl(url: string) {
  const trimmed = url.trim();

  if (/^hhttps?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^h(http|https):\/\//i, '$1://');
  }

  return trimmed;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number,
  label: string,
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      console.warn(
        `${label} attempt ${attempt}/${attempts} failed: ${describeError(error)}`,
      );
      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed after ${attempts} attempts.`);
}

export async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<TResult>,
) {
  if (items.length === 0) {
    return [] as TResult[];
  }

  const results = new Array<TResult>(items.length);
  let cursor = 0;
  const runners = Array.from({
    length: Math.min(concurrency, items.length),
  }).map(async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message?.trim();

    if (message) {
      return message;
    }

    if (error.name?.trim()) {
      return error.name.trim();
    }
  }

  const fallback = String(error).trim();
  return fallback || 'Unknown error';
}
