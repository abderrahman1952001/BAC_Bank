import Link from "next/link";
import { ArrowUpLeft, FlaskConical } from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { listLabSubjectGroups } from "@/lib/lab-surface";

export function LabHomePage() {
  const groups = listLabSubjectGroups();
  const toolCount = groups.reduce((sum, group) => sum + group.tools.length, 0);

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page">
        <StudyHeader
          eyebrow="المختبر"
          title="جرّب المفهوم قبل أن تحله"
          subtitle="أدوات صغيرة مرتبطة بالمنهاج تساعدك على رؤية الفكرة وهي تتحرك، ثم العودة إلى الدرس أو التدريب بثقة أكبر."
          meta={[
            { label: "الأدوات", value: `${toolCount}` },
            { label: "المواد", value: `${groups.length}` },
          ]}
        />

        <section className="lab-hero-strip">
          <span className="lab-hero-icon" aria-hidden="true">
            <FlaskConical size={28} strokeWidth={2.1} />
          </span>
          <div>
            <StudyBadge tone="brand">BAC-ready</StudyBadge>
            <h2>المختبر ليس آلة جواب، بل مساحة فهم.</h2>
            <p>
              كل أداة هنا مصممة لتشرح علاقة تظهر في الدروس والوثائق: منحنى
              دالة، أثر طفرة، أو آلية تحتاج أن تراها بدل أن تحفظها فقط.
            </p>
          </div>
        </section>

        <div className="lab-subject-sections">
          {groups.map((group) => (
            <section key={group.subjectSlug} className="lab-subject-section">
              <div className="lab-section-head">
                <div>
                  <p className="page-kicker">{group.title}</p>
                  <h2>{group.subjectSlug === "math" ? "Math Lab" : "SVT Lab"}</h2>
                  <p>{group.description}</p>
                </div>
                <StudyBadge tone="accent">{group.tools.length} أداة</StudyBadge>
              </div>

              <div className="lab-tool-grid">
                {group.tools.map((tool) => (
                  <article key={tool.id} className="lab-tool-card">
                    <div className="lab-tool-card-head">
                      <div>
                        <p className="page-kicker">{tool.shortTitle}</p>
                        <h3>{tool.title}</h3>
                      </div>
                      <StudyBadge tone="success">جاهز</StudyBadge>
                    </div>
                    <p>{tool.description}</p>
                    <div className="lab-tool-use-case">
                      <span>استعمال BAC</span>
                      <strong>{tool.bacUseCase}</strong>
                    </div>
                    <Button asChild className="h-11 rounded-full px-5">
                      <Link href={tool.href}>
                        افتح الأداة
                        <ArrowUpLeft size={17} strokeWidth={2.1} />
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </StudyShell>
  );
}
