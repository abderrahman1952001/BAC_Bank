import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">BAC Bank</p>
            <ThemeToggle />
          </div>
          <h1>ابدأ حسابك</h1>
          <p>
            أنشئ حسابك عبر البريد الإلكتروني أو Google. بعد الدخول الأول سنطلب
            منك فقط اسمك والشعبة.
          </p>
          <Link href="/auth" className="btn-secondary">
            العودة
          </Link>
        </aside>

        <article className="auth-card">
          <SignUp
            forceRedirectUrl="/auth"
            path="/auth/sign-up"
            routing="path"
            signInUrl="/auth/sign-in"
          />
        </article>
      </section>
    </main>
  );
}
