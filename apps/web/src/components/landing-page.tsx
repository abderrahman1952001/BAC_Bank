import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

const highlights = [
  {
    label: 'المكتبة',
    value: 'مواضيع منظمة حسب الشعبة والسنة',
  },
  {
    label: 'التدريب',
    value: 'جلسات موجهة حسب الهدف',
  },
  {
    label: 'المساحة',
    value: 'تقدم محفوظ ونشاط حديث',
  },
];

const surfaces = [
  {
    title: 'المكتبة',
    detail: 'شعبة، مادة، سنة، موضوع',
  },
  {
    title: 'التدريب',
    detail: 'جلسات موجهة بالمحاور والسنوات',
  },
  {
    title: 'مساحتي',
    detail: 'استكمال التعلم وحفظ تلقائي',
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
          <p className="landing-eyebrow">Algerian BAC Platform</p>
          <h1>منصة البكالوريا الجزائرية للمراجعة والتدريب.</h1>
          <p>مكتبة منظمة. تدريب موجه. ومساحة شخصية تحفظ تقدمك.</p>
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
          <h2>ابدأ من المكتبة أو من التدريب</h2>
          <p>حساب واحد. مكتبة كاملة. تدريب محفوظ. ومساحة شخصية واضحة.</p>
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
