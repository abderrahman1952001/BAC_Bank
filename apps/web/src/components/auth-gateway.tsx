'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type AuthMode = 'login' | 'register';

export function AuthGateway() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('register');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push('/app');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <header>
          <p>BAC Bank</p>
          <h1>مرحلة الدخول</h1>
          <span>سجل أو ادخل للحساب ثم أكمل مباشرة إلى بنك الأسئلة.</span>
        </header>

        <div className="auth-switch">
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            إنشاء حساب
          </button>
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            تسجيل الدخول
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <>
              <label>
                <span>الاسم الكامل</span>
                <input type="text" placeholder="مثال: ياسمين بن يوسف" required />
              </label>
              <label>
                <span>البريد الإلكتروني</span>
                <input type="email" placeholder="you@example.com" required />
              </label>
              <label>
                <span>الولاية</span>
                <input type="text" placeholder="مثال: الجزائر" required />
              </label>
              <label>
                <span>كلمة المرور</span>
                <input type="password" placeholder="********" required />
              </label>
              <button type="submit" className="btn-primary">
                إنشاء الحساب والدخول
              </button>
            </>
          ) : (
            <>
              <label>
                <span>البريد الإلكتروني</span>
                <input type="email" placeholder="you@example.com" required />
              </label>
              <label>
                <span>كلمة المرور</span>
                <input type="password" placeholder="********" required />
              </label>
              <button type="submit" className="btn-primary">
                دخول إلى المنصة
              </button>
            </>
          )}
        </form>

        <footer>
          <span>بالدخول أنت توافق على شروط الاستخدام وسياسة الخصوصية.</span>
          <Link href="/" className="btn-secondary">
            العودة للصفحة الرئيسية
          </Link>
        </footer>
      </section>
    </main>
  );
}
