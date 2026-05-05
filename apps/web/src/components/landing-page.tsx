import Link from 'next/link';
import { ArrowLeft, BookOpen, BrainCircuit, CheckCircle2, LineChart, Play } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const proofPoints = [
  {
    label: 'مكتبة رسمية',
    value: 'مواضيع BAC منظمة حسب الشعبة والمادة والسنة.',
  },
  {
    label: 'تدريب موجه',
    value: 'جلسات تبنى من المحاور، السنوات، ونقاط الضعف.',
  },
  {
    label: 'إتقان قابل للقياس',
    value: 'خارطة تقدم، أخطاء محفوظة، واستكمال تلقائي.',
  },
];

const learningLoop = [
  {
    icon: BookOpen,
    title: 'افتح الموضوع الرسمي',
    detail: 'ابدأ من ورقة BAC حقيقية بدل أمثلة عشوائية.',
  },
  {
    icon: BrainCircuit,
    title: 'افهم بخطوات تفاعلية',
    detail: 'اكشف التلميح، الحل، والمنطق بدون ضجيج بصري.',
  },
  {
    icon: LineChart,
    title: 'ارجع لما يحتاج تثبيتاً',
    detail: 'كل جلسة تترك أثراً واضحاً في خارطة المراجعة.',
  },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">
          مِراس
        </Link>
        <div className="landing-nav-actions">
          <ThemeToggle />
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href="/auth">دخول</Link>
          </Button>
          <Button asChild className="h-11 rounded-full px-5">
            <Link href="/auth">ابدأ</Link>
          </Button>
        </div>
      </header>

      <section className="landing-hero" id="start">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">مِراس</p>
          <h1>مختبر إتقان تفاعلي للبكالوريا الجزائرية.</h1>
          <p>
            ادرس من المواضيع الرسمية، افهم الحلول خطوة بخطوة، واترك النظام
            يحوّل أخطاءك إلى خطة مراجعة واضحة.
          </p>
          <div className="landing-actions">
            <Button asChild className="h-12 rounded-full px-5">
              <Link href="/auth">
                ابدأ التدريب
                <Play data-icon="inline-end" strokeWidth={2.2} />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-full px-5">
              <Link href="/auth">
                استكشف المكتبة
                <ArrowLeft data-icon="inline-end" strokeWidth={2.2} />
              </Link>
            </Button>
          </div>
          <div className="landing-trust-row" aria-label="نقاط الثقة">
            <span>مواضيع رسمية</span>
            <span>تقدم محفوظ</span>
            <span>تجربة عربية أولاً</span>
          </div>
        </div>

        <div className="landing-product-stage" aria-label="معاينة تجربة الدراسة">
          <div className="landing-product-topline">
            <span>BAC 2025 · Mathematics</span>
            <strong>جلسة دريل نشطة</strong>
          </div>
          <div className="landing-product-board">
            <div className="landing-paper-preview">
              <span className="landing-paper-kicker">Sujet 1 · Exercise 1</span>
              <h2>حل المعادلة التالية</h2>
              <div className="landing-equation">x + 1 = 2</div>
              <div className="landing-paper-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="landing-solution-panel">
              <span>منطق الحل</span>
              <ol>
                <li>نحافظ على توازن طرفي المعادلة.</li>
                <li>نطرح 1 من الطرفين.</li>
                <li>
                  <strong>x = 1</strong>
                </li>
              </ol>
            </div>
          </div>
          <div className="landing-mastery-strip">
            <div>
              <span>الإتقان</span>
              <strong>42%</strong>
            </div>
            <div className="landing-mastery-track" aria-hidden="true">
              <span />
            </div>
            <p>المحور التالي: Algebra</p>
          </div>
        </div>
      </section>

      <section className="landing-proof" aria-label="ما الذي يجعل مِراس مختلفاً">
        <div className="landing-section-copy">
          <p className="page-kicker">برهان المنتج</p>
          <h2>ليس بنك ملفات. نظام دراسة كامل.</h2>
        </div>
        <div className="landing-proof-list">
          {proofPoints.map((item) => (
            <article key={item.label} className="landing-proof-item">
              <CheckCircle2 size={19} strokeWidth={2.1} />
              <div>
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-learning-loop" aria-label="منهجية الدراسة">
        <div className="landing-section-copy">
          <p className="page-kicker">منهجية الدراسة</p>
          <h2>صرامة UWorld، تفاعل Brilliant، بدون طفولية.</h2>
        </div>
        <div className="landing-loop-grid">
          {learningLoop.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="landing-loop-item">
                <span aria-hidden="true">
                  <Icon size={22} strokeWidth={2.1} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-final">
        <div>
          <p className="page-kicker">ابدأ</p>
          <h2>ابدأ من موضوع رسمي، وانته بخطة مراجعة تعرفك جيداً.</h2>
          <p>
            حساب واحد يجمع المكتبة، التدريب، التقدم، والأخطاء التي تستحق العودة
            إليها.
          </p>
        </div>
        <div className="landing-actions">
          <Button asChild className="h-12 rounded-full px-5">
            <Link href="/auth">ادخل إلى مِراس</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full px-5">
            <Link href="/auth">إنشاء حساب</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
