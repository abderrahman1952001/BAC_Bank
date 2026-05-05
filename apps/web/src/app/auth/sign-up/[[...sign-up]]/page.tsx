import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <div className="auth-side-top">
            <p className="page-kicker">مِراس</p>
            <ThemeToggle />
          </div>
          <h1>ابدأ حسابك</h1>
          <p>
            أنشئ حسابك عبر البريد الإلكتروني أو Google. بعد الدخول الأول سنطلب
            منك فقط اسمك والشعبة.
          </p>
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link href="/auth">العودة</Link>
          </Button>
        </aside>

        <article className="auth-card">
          <SignUp
            forceRedirectUrl="/post-auth"
            path="/auth/sign-up"
            routing="path"
            signInUrl="/auth/sign-in"
          />
        </article>
      </section>
    </main>
  );
}
