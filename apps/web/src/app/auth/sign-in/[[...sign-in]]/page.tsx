import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">BAC Bank</p>
            <ThemeToggle />
          </div>
          <h1>مرحبا بعودتك</h1>
          <p>سجّل الدخول بحسابك ثم نوجّهك تلقائيا إلى مساحة الطالب أو الإدارة.</p>
          <Link href="/auth" className="btn-secondary">
            العودة
          </Link>
        </aside>

        <article className="auth-card">
          <SignIn
            forceRedirectUrl="/auth"
            path="/auth/sign-in"
            routing="path"
            signUpUrl="/auth/sign-up"
          />
        </article>
      </section>
    </main>
  );
}
