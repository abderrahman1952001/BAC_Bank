import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
const DEFAULT_MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const DEFAULT_TRANSCRIPTION_TIMEOUT_MS = 30_000;

async function canUseTranscription() {
  if (process.env.PLAYWRIGHT_TEST_AUTH === "true") {
    return true;
  }

  const { userId } = await auth();
  return Boolean(userId);
}

function getAudioFileName(file: File) {
  if (file.name.trim()) {
    return file.name;
  }

  if (file.type.includes("mp4")) {
    return "study-command.m4a";
  }

  if (file.type.includes("mpeg")) {
    return "study-command.mp3";
  }

  return "study-command.webm";
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

function isVoiceTranscriptionEnabled() {
  const rawValue = process.env.STUDY_COMMAND_VOICE_ENABLED;

  return rawValue !== "false" && rawValue !== "0";
}

function readVoiceTranscriptionConfig() {
  return {
    enabled: isVoiceTranscriptionEnabled(),
    apiKey: process.env.OPENAI_API_KEY,
    model:
      process.env.STUDY_COMMAND_VOICE_TRANSCRIBE_MODEL ||
      process.env.OPENAI_TRANSCRIBE_MODEL ||
      DEFAULT_TRANSCRIBE_MODEL,
    maxAudioBytes: readPositiveIntegerEnv(
      "STUDY_COMMAND_VOICE_MAX_AUDIO_BYTES",
      DEFAULT_MAX_AUDIO_BYTES,
    ),
    timeoutMs: readPositiveIntegerEnv(
      "STUDY_COMMAND_VOICE_TIMEOUT_MS",
      DEFAULT_TRANSCRIPTION_TIMEOUT_MS,
    ),
  };
}

export async function POST(request: Request) {
  if (!(await canUseTranscription())) {
    return NextResponse.json(
      { message: "Authentication is required for voice transcription." },
      { status: 401 },
    );
  }

  const config = readVoiceTranscriptionConfig();

  if (!config.enabled) {
    return NextResponse.json(
      { message: "Voice transcription is disabled." },
      { status: 503 },
    );
  }

  if (!config.apiKey) {
    return NextResponse.json(
      { message: "Voice transcription is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Audio form data is invalid." },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json(
      { message: "Audio file is required." },
      { status: 400 },
    );
  }

  if (audio.size <= 0) {
    return NextResponse.json(
      { message: "Audio file is empty." },
      { status: 400 },
    );
  }

  if (audio.size > config.maxAudioBytes) {
    return NextResponse.json(
      { message: "Audio file is too large." },
      { status: 413 },
    );
  }

  const upstreamFormData = new FormData();
  upstreamFormData.set(
    "file",
    new File([audio], getAudioFileName(audio), {
      type: audio.type || "audio/webm",
    }),
  );
  upstreamFormData.set("model", config.model);
  upstreamFormData.set(
    "prompt",
    "The speaker is an Algerian BAC student. They may mix Arabic, Darija, French, Arabizi, and school-subject terminology.",
  );

  let response: Response;

  try {
    response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: upstreamFormData,
        signal: AbortSignal.timeout(config.timeoutMs),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Voice transcription failed." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: "Voice transcription failed." },
      { status: 502 },
    );
  }

  let payload: { text?: unknown };

  try {
    payload = (await response.json()) as { text?: unknown };
  } catch {
    return NextResponse.json(
      { message: "Voice transcription returned invalid data." },
      { status: 502 },
    );
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { message: "Voice transcription returned no text." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text });
}
