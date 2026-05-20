import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerApiResponseError } from "@/lib/server-api";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  fetchServerApiJson: vi.fn(),
  readServerSessionUser: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  readServerSessionUser: mocks.readServerSessionUser,
}));

vi.mock("@/lib/server-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-api")>();

  return {
    ...actual,
    fetchServerApiJson: mocks.fetchServerApiJson,
  };
});

function buildJsonRequest(body: unknown) {
  return new Request("http://localhost/api/study-command/propose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as { message?: string };
}

describe("study command proposal route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.fetchServerApiJson.mockReset();
    mocks.readServerSessionUser.mockReset();
    mocks.readServerSessionUser.mockResolvedValue({ id: "user-1" });
  });

  it("rejects invalid command payloads before calling the API", async () => {
    const response = await POST(buildJsonRequest({ command: 42 }));

    expect(response.status).toBe(400);
    expect(mocks.fetchServerApiJson).not.toHaveBeenCalled();
    await expect(readJson(response)).resolves.toEqual({
      message: "Study command request is invalid.",
    });
  });

  it("preserves safe upstream error status and message", async () => {
    mocks.fetchServerApiJson.mockRejectedValue(
      new ServerApiResponseError("Too many study commands.", 429),
    );

    const response = await POST(
      buildJsonRequest({ command: "عندي فرض في الفيزياء غدوة" }),
    );

    expect(response.status).toBe(429);
    await expect(readJson(response)).resolves.toEqual({
      message: "Too many study commands.",
    });
  });

  it("returns a clean unavailable state for unexpected proxy failures", async () => {
    mocks.fetchServerApiJson.mockRejectedValue(new Error("invalid response"));

    const response = await POST(
      buildJsonRequest({ command: "أريد تدريب BAC في الرياضيات" }),
    );

    expect(response.status).toBe(502);
    await expect(readJson(response)).resolves.toEqual({
      message: "Study command proposal failed.",
    });
  });
});
