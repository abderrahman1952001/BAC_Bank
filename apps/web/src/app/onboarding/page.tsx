import {
  parseAuthOptionsResponse,
  type AuthOptionsResponse,
} from "@bac-bank/contracts/auth";
import { AuthOnboardingForm } from "@/components/auth-onboarding-form";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { fetchServerApiJson } from "@/lib/server-api";
import { requireServerSessionUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await requireServerSessionUser({ allowIncompleteProfile: true });

  if (user.role === "ADMIN" || user.stream) {
    redirect(getPostAuthRoute(user));
  }

  const payload = await fetchServerApiJson<AuthOptionsResponse>(
    "/auth/options",
    undefined,
    "Authentication request failed.",
    parseAuthOptionsResponse,
  );

  return (
    <AuthOnboardingForm
      initialUser={user}
      streamFamilies={payload.streamFamilies}
    />
  );
}
