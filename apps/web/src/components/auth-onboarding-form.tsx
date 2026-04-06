"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { AuthStreamOption, AuthUser } from "@bac-bank/contracts/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPostAuthRoute } from "@/lib/auth-routing";
import { updateCurrentUserProfile } from "@/lib/client-auth";

type AuthOnboardingFormProps = {
  initialUser: AuthUser;
  streams: AuthStreamOption[];
};

export function AuthOnboardingForm({
  initialUser,
  streams,
}: AuthOnboardingFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUser.username);
  const [streamCode, setStreamCode] = useState(
    initialUser.stream?.code ?? streams[0]?.code ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
            <p className="page-kicker">BAC Bank</p>
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
              <input
                type="text"
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
              <select
                required
                value={streamCode}
                onChange={(event) => {
                  setStreamCode(event.target.value);
                }}
              >
                <option value="" disabled>
                  اختر الشعبة
                </option>
                {streams.map((stream) => (
                  <option key={stream.code} value={stream.code}>
                    {stream.name}
                  </option>
                ))}
              </select>
            </label>
            {submitError ? <p className="auth-feedback">{submitError}</p> : null}
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !streamCode}
            >
              {isSubmitting ? "جارٍ الحفظ..." : "الدخول إلى مساحة الطالب"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}
