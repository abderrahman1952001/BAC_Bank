"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAuthOptions, loginUser, registerUser } from "@/lib/client-auth";
import { getDefaultRouteForRole } from "@/lib/auth-routing";

type AuthMode = "login" | "register";

type StreamOption = {
  code: string;
  name: string;
};

export function AuthGateway() {
  const router = useRouter();
  const { status, user, setSessionUser } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("register");
  const [streams, setStreams] = useState<StreamOption[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    streamCode: "",
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [router, status, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadStreams() {
      setLoadingStreams(true);

      try {
        const payload = await getAuthOptions();

        if (cancelled) {
          return;
        }

        setStreams(payload.streams);
        setRegisterForm((current) => ({
          ...current,
          streamCode: current.streamCode || payload.streams[0]?.code || "",
        }));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "تعذر تحميل قائمة الشعب.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStreams(false);
        }
      }
    }

    void loadStreams();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload =
        mode === "register"
          ? await registerUser(registerForm)
          : await loginUser(loginForm);

      setSessionUser(payload.user);
      router.replace(getDefaultRouteForRole(payload.user.role));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إكمال عملية تسجيل الدخول.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="auth-page">
        <section className="auth-layout">
          <article className="auth-card">
            <p>جارٍ التحقق من الجلسة...</p>
          </article>
        </section>
      </main>
    );
  }

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
            <button
              type="button"
              data-testid="auth-register-tab"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              حساب جديد
            </button>
            <button
              type="button"
              data-testid="auth-login-tab"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              دخول
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label>
                  <span>اسم المستخدم</span>
                  <input
                    type="text"
                    required
                    placeholder="مثال: sarah_benali"
                    value={registerForm.username}
                    onChange={(event) => {
                      setRegisterForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }));
                    }}
                  />
                </label>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(event) => {
                      setRegisterForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }));
                    }}
                  />
                </label>
                <label>
                  <span>الشعبة</span>
                  <select
                    required
                    value={registerForm.streamCode}
                    onChange={(event) => {
                      setRegisterForm((current) => ({
                        ...current,
                        streamCode: event.target.value,
                      }));
                    }}
                    disabled={loadingStreams}
                  >
                    <option value="" disabled>
                      {loadingStreams ? "جارٍ تحميل الشعب..." : "اختر الشعبة"}
                    </option>
                    {streams.map((stream) => (
                      <option key={stream.code} value={stream.code}>
                        {stream.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>كلمة المرور</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="********"
                    value={registerForm.password}
                    onChange={(event) => {
                      setRegisterForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                    }}
                  />
                </label>
                {error ? <p className="auth-feedback">{error}</p> : null}
                <button
                  type="submit"
                  data-testid="auth-register-submit"
                  className="btn-primary"
                  disabled={
                    submitting || loadingStreams || !registerForm.streamCode
                  }
                >
                  {submitting ? "جارٍ إنشاء الحساب..." : "إنشاء الحساب"}
                </button>
              </>
            ) : (
              <>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(event) => {
                      setLoginForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }));
                    }}
                  />
                </label>
                <label>
                  <span>كلمة المرور</span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="********"
                    value={loginForm.password}
                    onChange={(event) => {
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }));
                    }}
                  />
                </label>
                {error ? <p className="auth-feedback">{error}</p> : null}
                <button
                  type="submit"
                  data-testid="auth-login-submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
              </>
            )}
          </form>
        </article>
      </section>
    </main>
  );
}
