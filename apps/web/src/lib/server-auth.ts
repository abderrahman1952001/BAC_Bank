import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { AuthUser } from "@bac-bank/contracts/auth";
import {
  parseAuthSessionResponse,
  type AuthSessionResponse,
} from "@bac-bank/contracts/auth";
import { getPostAuthRoute } from "@/lib/auth-routing";
import {
  clonePlaywrightFixture,
  playwrightTestAdminUser,
  playwrightTestStudentUser,
} from "@/lib/playwright-test-fixtures";
import { fetchServerApiJson } from "@/lib/server-api";

async function readPlaywrightTestSessionUser(): Promise<AuthUser | null> {
  if (process.env.PLAYWRIGHT_TEST_AUTH !== "true") {
    return null;
  }

  const cookieStore = await cookies();
  const testSession = cookieStore.get("bb_test_auth")?.value;

  if (testSession === "admin") {
    return clonePlaywrightFixture(playwrightTestAdminUser);
  }

  if (testSession === "student") {
    return clonePlaywrightFixture(playwrightTestStudentUser);
  }

  return null;
}

export async function readServerSessionUser(): Promise<AuthUser | null> {
  const playwrightUser = await readPlaywrightTestSessionUser();

  if (playwrightUser) {
    return playwrightUser;
  }

  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const payload = await fetchServerApiJson<AuthSessionResponse>(
      "/auth/me",
      undefined,
      "Authentication request failed.",
      parseAuthSessionResponse,
    );

    return payload.user;
  } catch {
    return null;
  }
}

export async function requireServerSessionUser(options?: {
  allowIncompleteProfile?: boolean;
}): Promise<AuthUser> {
  const user = await readServerSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (
    !options?.allowIncompleteProfile &&
    user.role !== "ADMIN" &&
    !user.stream
  ) {
    redirect("/onboarding");
  }

  return user;
}

export async function redirectAuthenticatedUser() {
  const user = await readServerSessionUser();

  if (user) {
    redirect(getPostAuthRoute(user));
  }
}
