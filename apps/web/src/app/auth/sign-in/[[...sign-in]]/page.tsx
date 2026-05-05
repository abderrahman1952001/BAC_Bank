import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">مِراس</p>
            <ThemeToggle />
          </div>
          <h1>مرحبا بعودتك</h1>
          <p>سجّل الدخول بحسابك ثم نوجّهك تلقائيا إلى مساحة الطالب أو الإدارة.</p>
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link href="/auth">العودة</Link>
          </Button>
        </aside>

        <article className="auth-card">
          <SignIn
            forceRedirectUrl="/post-auth"
            path="/auth/sign-in"
            routing="path"
            signUpUrl="/auth/sign-up"
          />
        </article>
      </section>
    </main>
  );
}
