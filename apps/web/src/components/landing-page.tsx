import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

const highlights = [
  {
    label: 'الفهرسة',
    value: 'Sujet 1 · Sujet 2',
  },
  {
    label: 'القارئ',
    value: 'Exercise -> Question',
  },
  {
    label: 'الجلسات',
    value: 'Builder سريع',
  },
];

const surfaces = [
  {
    title: 'تصفح',
    detail: 'شعبة، مادة، سنة',
  },
  {
    title: 'جلسة',
    detail: 'محاور، سنوات، حجم',
  },
  {
    title: 'دراسة',
    detail: 'تنقل هادئ وحفظ تلقائي',
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          BAC Bank
        </Link>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Link href="/auth" className="btn-secondary">
            دخول
          </Link>
          <Link href="/auth" className="btn-primary">
            ابدأ
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="start">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Algerian BAC QBank</p>
          <h1>بنك البكالوريا بواجهة هادئة وواضحة.</h1>
          <p>اختيار سريع. قراءة نظيفة. دراسة بلا ضجيج.</p>
          <div className="landing-actions">
            <Link href="/auth" className="btn-primary">
              إنشاء حساب
            </Link>
            <Link href="/auth" className="btn-secondary">
              تسجيل الدخول
            </Link>
          </div>
        </div>

        <div className="landing-hero-panel" aria-label="سطوح التطبيق">
          {highlights.map((item) => (
            <article key={item.label} className="landing-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-utility-strip">
        {surfaces.map((item) => (
          <article key={item.title} className="landing-utility-item">
            <span>{item.title}</span>
            <strong>{item.detail}</strong>
          </article>
        ))}
      </section>

      <section className="landing-cta">
        <div>
          <h2>ادخل مباشرة إلى المذاكرة</h2>
          <p>حساب واحد. موضوع أو جلسة. والباقي واضح.</p>
        </div>
        <div className="landing-actions">
          <Link href="/auth" className="btn-primary">
            دخول
          </Link>
          <Link href="/" className="btn-secondary">
            الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
