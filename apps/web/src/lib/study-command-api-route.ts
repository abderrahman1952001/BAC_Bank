import { NextResponse } from "next/server";
import { ServerApiResponseError } from "@/lib/server-api";

export function studyCommandRouteErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof ServerApiResponseError) {
    return NextResponse.json(
      { message: error.message || fallbackMessage },
      { status: error.status },
    );
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 502 });
}
