"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/client-auth";
import { getPostAuthRoute } from "@/lib/auth-routing";

const AUTH_RESOLUTION_ATTEMPTS = 5;
const AUTH_RESOLUTION_DELAY_MS = 500;

function sleep(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function PostAuthRedirect() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const [statusMessage, setStatusMessage] = useState(
    "جارٍ التحقق من حسابك ثم نقلك إلى مِراس...",
  );
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      startTransition(() => {
        router.replace("/auth/sign-in");
      });
      return;
    }

    let isActive = true;

    async function resolveSignedInUser() {
      setAuthFeedback(null);

      for (let attempt = 0; attempt < AUTH_RESOLUTION_ATTEMPTS; attempt += 1) {
        try {
          const payload = await getCurrentUser();

          if (!isActive) {
            return;
          }

          startTransition(() => {
            router.replace(getPostAuthRoute(payload.user));
            router.refresh();
          });
          return;
        } catch (error) {
          if (!isActive) {
            return;
          }

          if (attempt < AUTH_RESOLUTION_ATTEMPTS - 1) {
            setStatusMessage("تم تسجيل الدخول. جارٍ تجهيز حسابك...");
            await sleep(AUTH_RESOLUTION_DELAY_MS);
            continue;
          }

          setAuthFeedback(
            error instanceof Error
              ? error.message
              : "تم تسجيل الدخول لكن تعذر إكمال التوجيه الآن.",
          );
        }
      }
    }

    void resolveSignedInUser();

    return () => {
      isActive = false;
    };
  }, [isLoaded, router, userId]);

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">مِراس</p>
            <ThemeToggle />
          </div>
          <h1>لحظة واحدة</h1>
          <p>{statusMessage}</p>
          <div className="auth-side-pills" aria-label="حالة تسجيل الدخول">
            <span>Clerk</span>
            <span>API</span>
            <span>توجيه</span>
          </div>
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link href="/auth">العودة</Link>
          </Button>
        </aside>

        <article className="auth-card">
          <div className="auth-form">
            <p>
              بعد أول دخول نربط جلسة Clerk بملفك داخل مِراس ثم نوجهك إلى
              مساحة الطالب أو الإدارة.
            </p>
            <p className="auth-feedback">
              {authFeedback ?? "إذا تأخر التوجيه قليلا فذلك يعني أننا نكمل مزامنة الجلسة."}
            </p>
            <Button asChild variant="outline" className="h-12 rounded-full px-5">
              <Link href="/auth/sign-in">الرجوع إلى تسجيل الدخول</Link>
            </Button>
          </div>
        </article>
      </section>
    </main>
  );
}
