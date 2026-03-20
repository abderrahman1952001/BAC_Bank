'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { setClientRole, UserRole } from '@/lib/client-auth';

type AuthMode = 'login' | 'register';

export function AuthGateway() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('register');
  const [role, setRole] = useState<UserRole>('USER');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientRole(role);
    router.push('/app');
  }

  return (
    <main className="auth-page">
      <section className="auth-layout">
        <aside className="auth-side">
          <p className="page-kicker">BAC Bank</p>
          <h1>دخول الطالب</h1>
          <p>
            أنشئ حسابك أو سجل الدخول، ثم انتقل مباشرة إلى الصفحة الرئيسية مع navbar
            كامل للتصفح وبناء جلسات الدراسة.
          </p>
          <Link href="/" className="btn-secondary">
            العودة للـ Landing
          </Link>
        </aside>

        <article className="auth-card">
          <div className="auth-mode-switch">
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <>
                <label>
                  <span>الاسم الكامل</span>
                  <input type="text" required placeholder="مثال: سارة بن علي" />
                </label>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input type="email" required placeholder="you@example.com" />
                </label>
                <label>
                  <span>الشعبة</span>
                  <input type="text" required placeholder="علوم تجريبية" />
                </label>
                <label>
                  <span>كلمة المرور</span>
                  <input type="password" required placeholder="********" />
                </label>
                <label>
                  <span>الدور</span>
                  <select
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value as UserRole);
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
                <button type="submit" className="btn-primary">
                  إنشاء الحساب
                </button>
              </>
            ) : (
              <>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input type="email" required placeholder="you@example.com" />
                </label>
                <label>
                  <span>كلمة المرور</span>
                  <input type="password" required placeholder="********" />
                </label>
                <label>
                  <span>الدور</span>
                  <select
                    value={role}
                    onChange={(event) => {
                      setRole(event.target.value as UserRole);
                    }}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
                <button type="submit" className="btn-primary">
                  تسجيل الدخول
                </button>
              </>
            )}
          </form>
        </article>
      </section>
    </main>
  );
}
