import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
const TRANSCRIPTION_TIMEOUT_MS = 30_000;

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

export async function POST(request: Request) {
  if (!(await canUseTranscription())) {
    return NextResponse.json(
      { message: "Authentication is required for voice transcription." },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: "Voice transcription is not configured." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
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

  if (audio.size > MAX_AUDIO_BYTES) {
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
  upstreamFormData.set(
    "model",
    process.env.OPENAI_TRANSCRIBE_MODEL || DEFAULT_TRANSCRIBE_MODEL,
  );
  upstreamFormData.set(
    "prompt",
    "The speaker is an Algerian BAC student. They may mix Arabic, Darija, French, Arabizi, and school-subject terminology.",
  );

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamFormData,
      signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { message: "Voice transcription failed." },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as { text?: unknown };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { message: "Voice transcription returned no text." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text });
}
