import Link from 'next/link';

const highlights = [
  {
    title: 'فلاتر دقيقة وسريعة',
    description:
      'اختَر السنة، الشعبة، المادة والمحور للوصول المباشر إلى التمارين التي تحتاجها.',
  },
  {
    title: 'محتوى موثوق ومنظم',
    description:
      'أسئلة بصياغة واضحة مع مرفقات وصور عند الحاجة لتقريب الفهم قبل الحل.',
  },
  {
    title: 'تحليل تقدمك بسهولة',
    description:
      'تابع عدد الأسئلة التي راجعتها وحدد نقاط القوة والضعف أسبوعاً بعد أسبوع.',
  },
  {
    title: 'مرونة كاملة في التعلم',
    description:
      'استخدم المنصة على الهاتف أو الحاسوب وبنفس الجودة مع تجربة مناسبة للطالب الجزائري.',
  },
  {
    title: 'جلسات وتمارين متجددة',
    description:
      'ارجع إلى امتحانات سابقة وأنشئ قائمة مراجعة شخصية قبل كل اختبار.',
  },
  {
    title: 'واجهة عربية مريحة',
    description:
      'تصميم واضح باللغة العربية يساعدك على التركيز في المراجعة بدل تضييع الوقت.',
  },
];

const testimonials = [
  {
    name: 'سارة - ثالثة ثانوي',
    text: 'أكثر شيء ساعدني هو الفلترة حسب المحور، صرت أراجع بشكل مركز وفي وقت أقل.',
  },
  {
    name: 'محمد - شعبة علوم تجريبية',
    text: 'التصميم بسيط وسريع، وقدرت ننظم برنامج المراجعة بدون فوضى.',
  },
  {
    name: 'إيمان - مترشحة حرة',
    text: 'وجود المحتوى بالعربية خلاني نفهم بسرعة ونركز على الحل بدل الترجمة.',
  },
];

export function LandingPage() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <header className="landing-nav">
          <p className="brand">BAC Bank</p>
          <nav>
            <a href="#features">المزايا</a>
            <a href="#students">آراء الطلبة</a>
            <a href="#start">ابدأ الآن</a>
          </nav>
          <Link href="/auth" className="nav-cta">
            دخول
          </Link>
        </header>

        <div className="hero-content">
          <p className="hero-kicker">تحضير ذكي للبكالوريا</p>
          <h1>منصة عربية تساعد طلبة الجزائر على المراجعة بخطة واضحة ونتائج أفضل</h1>
          <p>
            جمعنا أفضل أفكار منصات المراجعة الحديثة: بداية قوية، وصول سريع للأسئلة،
            وتجربة دراسة عملية من أول دقيقة.
          </p>
          <div className="hero-actions" id="start">
            <Link href="/auth" className="btn-primary">
              أنشئ حسابك الآن
            </Link>
            <Link href="/auth" className="btn-secondary">
              تسجيل الدخول
            </Link>
          </div>
        </div>

        <div className="hero-metrics">
          <article>
            <span>10+</span>
            <p>سنوات امتحانات</p>
          </article>
          <article>
            <span>20+</span>
            <p>مادة ومحور</p>
          </article>
          <article>
            <span>سريع</span>
            <p>وصول مباشر للأسئلة</p>
          </article>
        </div>
      </section>

      <section className="highlights-grid" id="features">
        {highlights.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="student-section" id="students">
        <div className="student-head">
          <p>آراء حقيقية</p>
          <h2>طلاب البكالوريا يراجعون بثقة أكثر</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((item) => (
            <article key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>جاهز تبدأ؟</h2>
        <p>من التسجيل إلى المراجعة اليومية، كل شيء في مسار واضح وبواجهة عربية كاملة.</p>
        <Link href="/auth" className="btn-primary">
          ابدأ مجاناً
        </Link>
      </section>
    </main>
  );
}
