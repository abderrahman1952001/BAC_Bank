"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/client-auth";
import { getPostAuthRoute } from "@/lib/auth-routing";

export function AuthGateway() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const [isCompletingSignIn, setIsCompletingSignIn] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) {
      return;
    }

    let isActive = true;

    async function completeSignIn() {
      setIsCompletingSignIn(true);
      setAuthFeedback(null);

      try {
        const payload = await getCurrentUser();

        if (!isActive) {
          return;
        }

        startTransition(() => {
          router.replace(getPostAuthRoute(payload.user));
          router.refresh();
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAuthFeedback(
          error instanceof Error
            ? error.message
            : "تم تسجيل الدخول لكن تعذر إكمال توجيهك الآن. حدّث الصفحة وحاول مرة أخرى.",
        );
        setIsCompletingSignIn(false);
      }
    }

    void completeSignIn();

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
          <h1>الدخول إلى مِراس</h1>
          <p>حساب واحد للوصول إلى التصفح والجلسات والقارئ.</p>
          <div className="auth-side-pills" aria-label="مزايا الدخول">
            <span>تصفح</span>
            <span>جلسات</span>
            <span>حفظ تلقائي</span>
          </div>
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link href="/">العودة</Link>
          </Button>
        </aside>

        <article className="auth-card">
          <div className="auth-mode-switch">
            <span className="active">Clerk</span>
            <span>Google</span>
          </div>

          <div className="auth-form">
            <p>
              اختر الطريقة المناسبة لك. بعد أول تسجيل دخول سنربط حساب Clerk
              بملفك داخل مِراس ثم نكمل الشعبة والاشتراك من قاعدة بياناتنا.
            </p>
            <Button asChild className="h-14 rounded-full text-base">
              <Link
                href="/auth/sign-up"
                data-testid="auth-register-link"
                aria-disabled={isCompletingSignIn}
              >
                إنشاء حساب
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-14 rounded-full text-base"
            >
              <Link
                href="/auth/sign-in"
                data-testid="auth-login-link"
                aria-disabled={isCompletingSignIn}
              >
                تسجيل الدخول
              </Link>
            </Button>
            <p className="auth-feedback">
              {isCompletingSignIn
                ? "تم تسجيل الدخول. جارٍ نقلك إلى حسابك..."
                : authFeedback ?? "متاح الآن: البريد الإلكتروني وكلمة المرور أو Google."}
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
