"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type {
  AuthStreamFamilyOption,
  AuthUser,
} from "@bac-bank/contracts/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { updateCurrentUserProfile } from "@/lib/client-auth";

type AuthOnboardingFormProps = {
  initialUser: AuthUser;
  streamFamilies: AuthStreamFamilyOption[];
};

export function AuthOnboardingForm({
  initialUser,
  streamFamilies,
}: AuthOnboardingFormProps) {
  const router = useRouter();
  const initialFamilyCode =
    streamFamilies.find((family) =>
      family.streams.some((stream) => stream.code === initialUser.stream?.code),
    )?.code ??
    streamFamilies[0]?.code ??
    "";
  const initialFamily =
    streamFamilies.find((family) => family.code === initialFamilyCode) ?? null;
  const initialStreamCode =
    initialUser.stream?.code ??
    initialFamily?.streams.find((stream) => stream.isDefault)?.code ??
    (initialFamily?.streams.length === 1 ? initialFamily.streams[0]?.code : "") ??
    "";
  const [username, setUsername] = useState(initialUser.username);
  const [streamFamilyCode, setStreamFamilyCode] = useState(initialFamilyCode);
  const [streamCode, setStreamCode] = useState(initialStreamCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedFamily =
    streamFamilies.find((family) => family.code === streamFamilyCode) ?? null;
  const requiresLeafSelection = (selectedFamily?.streams.length ?? 0) > 1;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = await updateCurrentUserProfile({
        username,
        streamCode,
      });

      router.replace(getPostAuthRoute(payload.user));
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "تعذر حفظ بياناتك الآن. حاول مرة أخرى.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">مِراس</p>
            <ThemeToggle />
          </div>
          <h1>أكمل حسابك</h1>
          <p>
            بقيت خطوة واحدة فقط حتى تصبح مساحة الطالب جاهزة: الاسم الذي يظهر لك
            داخل التطبيق والشعبة.
          </p>
        </aside>

        <article className="auth-card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>اسم المستخدم</span>
              <Input
                type="text"
                className="h-12 rounded-2xl"
                required
                minLength={2}
                maxLength={80}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                }}
              />
            </label>
            <label>
              <span>الشعبة</span>
              <NativeSelect
                className="h-12 rounded-2xl"
                required
                value={streamFamilyCode}
                onChange={(event) => {
                  const nextFamilyCode = event.target.value;
                  const nextFamily =
                    streamFamilies.find(
                      (family) => family.code === nextFamilyCode,
                    ) ?? null;
                  const nextStreamCode =
                    nextFamily?.streams.find((stream) => stream.isDefault)
                      ?.code ??
                    (nextFamily?.streams.length === 1
                      ? nextFamily.streams[0]?.code
                      : "") ??
                    "";

                  setStreamFamilyCode(nextFamilyCode);
                  setStreamCode(nextStreamCode);
                }}
              >
                <option value="" disabled>
                  اختر الشعبة
                </option>
                {streamFamilies.map((family) => (
                  <option key={family.code} value={family.code}>
                    {family.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {requiresLeafSelection ? (
              <label>
                <span>المسار</span>
                <NativeSelect
                  className="h-12 rounded-2xl"
                  required
                  value={streamCode}
                  onChange={(event) => {
                    setStreamCode(event.target.value);
                  }}
                >
                  <option value="" disabled>
                    اختر المسار
                  </option>
                  {selectedFamily?.streams.map((stream) => (
                    <option key={stream.code} value={stream.code}>
                      {stream.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            ) : null}
            {submitError ? <p className="auth-feedback">{submitError}</p> : null}
            <Button
              type="submit"
              className="h-14 rounded-full text-base"
              disabled={isSubmitting || !streamCode}
            >
              {isSubmitting ? "جارٍ الحفظ..." : "الدخول إلى مساحة الطالب"}
            </Button>
          </form>
        </article>
      </section>
    </main>
  );
}
