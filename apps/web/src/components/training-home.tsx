"use client";

import Link from "next/link";
import { BrainCircuit, PenTool, TimerReset } from "lucide-react";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  STUDENT_BILLING_ROUTE,
  STUDENT_TRAINING_DRILL_ROUTE,
  STUDENT_TRAINING_SIMULATION_ROUTE,
  STUDENT_TRAINING_WEAK_POINTS_ROUTE,
} from "@/lib/student-routes";

export function TrainingHome() {
  const { user } = useAuthSession();
  const studyEntitlements = user?.studyEntitlements ?? null;
  const drillQuota = studyEntitlements?.quotas.drillStarts ?? null;
  const simulationQuota = studyEntitlements?.quotas.simulationStarts ?? null;
  const weakPointDrillEnabled =
    studyEntitlements?.capabilities.weakPointDrill ?? false;

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader
          eyebrow="التدريب"
          title="اختر تمرينك التالي"
          subtitle="دريل سريع، محاكاة رسمية، أو جلسة علاجية مبنية على إشاراتك الأخيرة."
          meta={[
            ...(drillQuota
              ? [
                  {
                    label: "الدريل",
                    value:
                      drillQuota.monthlyLimit === null
                        ? "غير محدود"
                        : `${drillQuota.remaining}/${drillQuota.monthlyLimit}`,
                  },
                ]
              : []),
            ...(simulationQuota
              ? [
                  {
                    label: "المحاكاة",
                    value:
                      simulationQuota.monthlyLimit === null
                        ? "غير محدود"
                        : `${simulationQuota.remaining}/${simulationQuota.monthlyLimit}`,
                  },
                ]
              : []),
          ]}
        />

        <section className="builder-preview-card builder-preview-summary-card">
          <h3>الخطة الحالية</h3>
          <p>
            {studyEntitlements?.tier === "PREMIUM"
              ? "الخطة المتقدمة · وصول كامل للتدريب، المحاكاة، وجلسات نقاط الضعف."
              : "الخطة المجانية · حصص شهرية للتدريب والمحاكاة، مع بقاء المكتبة والاستكمال متاحين دائماً."}
          </p>
          <div className="billing-inline-actions">
            <Button asChild variant="outline" className="h-10 rounded-full px-5">
              <Link href={STUDENT_BILLING_ROUTE}>
                {studyEntitlements?.tier === "PREMIUM"
                  ? "إدارة الاشتراك"
                  : "الترقية للخطة المتقدمة"}
              </Link>
            </Button>
          </div>
        </section>

        <div className="training-mode-board">
          <Link
            href={STUDENT_TRAINING_DRILL_ROUTE}
            className="training-mode-row"
          >
            <span className="builder-card-icon" aria-hidden="true">
              <PenTool size={24} strokeWidth={2.1} />
            </span>
            <span className="training-mode-copy">
              <strong>جلسة دريل</strong>
              <p>تمارين مختارة حسب المادة، المحور، والسنوات التي تريد تثبيتها.</p>
            </span>
            <small>
              {drillQuota?.monthlyLimit === null
                ? "بدء غير محدود"
                : `المتبقي: ${drillQuota?.remaining ?? 0}`}
            </small>
          </Link>

          <Link
            href={STUDENT_TRAINING_SIMULATION_ROUTE}
            className="training-mode-row"
          >
            <span className="builder-card-icon" aria-hidden="true">
              <TimerReset size={24} strokeWidth={2.1} />
            </span>
            <span className="training-mode-copy">
              <strong>محاكاة امتحان كاملة</strong>
              <p>موضوع BAC رسمي بزمن مضبوط واستمرارية حتى بعد الخروج.</p>
            </span>
            <small>
              {simulationQuota?.monthlyLimit === null
                ? "بدء غير محدود"
                : `المتبقي: ${simulationQuota?.remaining ?? 0}`}
            </small>
          </Link>

          {weakPointDrillEnabled ? (
            <Link
              href={STUDENT_TRAINING_WEAK_POINTS_ROUTE}
              className="training-mode-row"
            >
              <span className="builder-card-icon" aria-hidden="true">
                <BrainCircuit size={24} strokeWidth={2.1} />
              </span>
              <span className="training-mode-copy">
                <strong>دريل نقاط الضعف</strong>
                <p>جلسة علاجية مبنية على أخطائك الحديثة ومحاورك الأضعف.</p>
              </span>
              <small>الخطة المتقدمة · مبني على إشاراتك الأخيرة</small>
            </Link>
          ) : (
            <article className="training-mode-row is-locked">
              <span className="builder-card-icon" aria-hidden="true">
                <BrainCircuit size={24} strokeWidth={2.1} />
              </span>
              <span className="training-mode-copy">
                <strong>دريل نقاط الضعف</strong>
                <p>يفتح جلسة علاجية مباشرة من الأخطاء والإشارات الحديثة.</p>
              </span>
              <Button asChild variant="outline" className="h-10 rounded-full px-5">
                <Link href={STUDENT_BILLING_ROUTE}>فعّل الخطة المتقدمة</Link>
              </Button>
            </article>
          )}
        </div>

        <section className="training-process-strip">
          <h3>ما الذي يحدث داخل الجلسة؟</h3>
          <div>
            <article>
              <div>
                <strong>الدريل</strong>
                <p>مسار مرن للتعلم، مع كشف الحل أثناء الدراسة واستكمال الجلسة لاحقاً.</p>
              </div>
            </article>
            <article>
              <div>
                <strong>المحاكاة الرسمية</strong>
                <p>بدء من موضوع BAC رسمي بزمن محدد، مع استمرار العد التنازلي بعد الخروج.</p>
              </div>
            </article>
          </div>
        </section>
      </section>
    </StudyShell>
  );
}
