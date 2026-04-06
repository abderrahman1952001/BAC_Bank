"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthGateway() {
  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">BAC Bank</p>
            <ThemeToggle />
          </div>
          <h1>الدخول إلى BAC Bank</h1>
          <p>حساب واحد للوصول إلى التصفح والجلسات والقارئ.</p>
          <div className="auth-side-pills" aria-label="مزايا الدخول">
            <span>تصفح</span>
            <span>جلسات</span>
            <span>حفظ تلقائي</span>
          </div>
          <Link href="/" className="btn-secondary">
            العودة
          </Link>
        </aside>

        <article className="auth-card">
          <div className="auth-mode-switch">
            <span className="active">Clerk</span>
            <span>Google</span>
          </div>

          <div className="auth-form">
            <p>
              اختر الطريقة المناسبة لك. بعد أول تسجيل دخول سنربط حساب Clerk
              بملفك داخل BAC Bank ثم نكمل الشعبة والاشتراك من قاعدة بياناتنا.
            </p>
            <Link
              href="/auth/sign-up"
              className="btn-primary"
              data-testid="auth-register-link"
            >
              إنشاء حساب
            </Link>
            <Link
              href="/auth/sign-in"
              className="btn-secondary"
              data-testid="auth-login-link"
            >
              تسجيل الدخول
            </Link>
            <p className="auth-feedback">
              متاح الآن: البريد الإلكتروني وكلمة المرور أو Google.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
