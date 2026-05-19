import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function buildAudioRequest(audio?: File) {
  const formData = new FormData();

  if (audio) {
    formData.set("audio", audio);
  }

  return new Request("http://localhost/api/study-command/transcribe", {
    method: "POST",
    body: formData,
  });
}

async function readJson(response: Response) {
  return (await response.json()) as { message?: string; text?: string };
}

describe("study command voice transcription route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a clean disabled state when transcription is not configured", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH", "true");
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await POST(
      buildAudioRequest(new File(["audio"], "voice.webm", { type: "audio/webm" })),
    );

    expect(response.status).toBe(503);
    await expect(readJson(response)).resolves.toEqual({
      message: "Voice transcription is not configured.",
    });
  });

  it("validates that an audio file is present", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");

    const response = await POST(buildAudioRequest());

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({
      message: "Audio file is required.",
    });
  });

  it("returns a gateway error when upstream transcription throws", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("failed"));

    const response = await POST(
      buildAudioRequest(new File(["audio"], "voice.webm", { type: "audio/webm" })),
    );

    expect(response.status).toBe(502);
    await expect(readJson(response)).resolves.toEqual({
      message: "Voice transcription failed.",
    });
  });

  it("returns trimmed text from the transcription provider", async () => {
    vi.stubEnv("PLAYWRIGHT_TEST_AUTH", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ text: "  عندي فرض في الفيزياء  " }),
    );

    const response = await POST(
      buildAudioRequest(new File(["audio"], "voice.webm", { type: "audio/webm" })),
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({
      text: "عندي فرض في الفيزياء",
    });
  });
});
