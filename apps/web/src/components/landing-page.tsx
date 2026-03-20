import Link from 'next/link';

const features = [
  {
    title: 'Structured by BAC reality',
    description: 'شعبة، مادة، سنة، Sujet 1/Sujet 2 ثم التمارين والأسئلة.',
  },
  {
    title: 'Premium exercise reading',
    description: 'عرض أنيق للتمارين مع الصور والمرفقات والتنقل السريع بين الأسئلة.',
  },
  {
    title: 'Smart study sessions',
    description: 'ابن جلسات مراجعة حسب المادة والمحاور مع نتائج مطابقة مباشرة.',
  },
];

const flow = [
  '1) اختر الشعبة',
  '2) اختر المادة',
  '3) اختر السنة ثم sujet',
  '4) راجع التمارين والأسئلة بتجربة نظيفة',
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          BAC Bank
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#flow">Flow</a>
          <a href="#start">Start</a>
        </nav>
        <Link href="/auth" className="btn-secondary">
          Login
        </Link>
      </header>

      <section className="landing-hero" id="start">
        <p className="page-kicker">Algerian BAC QBank</p>
        <h1>
          جميع sujets البكالوريا الجزائرية
          <br />
          في تجربة مراجعة premium
        </h1>
        <p>
          ليس PDF خام. كل sujet منظم بطريقة عملية: من الفهرسة إلى التمرين إلى
          السؤال، مع واجهة نظيفة وسريعة.
        </p>
        <div className="landing-actions">
          <Link href="/auth" className="btn-primary">
            إنشاء حساب
          </Link>
          <Link href="/auth" className="btn-secondary">
            تسجيل الدخول
          </Link>
        </div>
      </section>

      <section className="landing-feature-grid" id="features">
        {features.map((feature) => (
          <article key={feature.title} className="landing-feature-card">
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="landing-flow" id="flow">
        <h2>How students navigate BAC Bank</h2>
        <div className="flow-list">
          {flow.map((step) => (
            <p key={step}>{step}</p>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>جاهز تبدأ؟</h2>
        <p>ادخل الآن وابدأ المراجعة بنفس جودة منصات QBank الاحترافية.</p>
        <Link href="/auth" className="btn-primary">
          Start now
        </Link>
      </section>
    </main>
  );
}
