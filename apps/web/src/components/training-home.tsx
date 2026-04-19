"use client";

import Link from "next/link";
import { BrainCircuit, PenTool, TimerReset } from "lucide-react";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyHeader, StudyShell } from "@/components/study-shell";
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
          title="اختر مسار الدراسة"
          subtitle="ابدأ بدريل مرن أو بمحاكاة امتحان كاملة من نفس سطح التدريب."
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
              ? "Premium · وصول غير محدود للدريل والمحاكاة مع مسارات الدعم المتقدمة."
              : "Free · حصص شهرية منفصلة للدريل والمحاكاة، مع بقاء المكتبة والاستكمال متاحين دائماً."}
          </p>
          <div className="billing-inline-actions">
            <Link href={STUDENT_BILLING_ROUTE} className="btn-secondary">
              {studyEntitlements?.tier === "PREMIUM"
                ? "إدارة الاشتراك"
                : "الترقية إلى Premium"}
            </Link>
          </div>
        </section>

        <div className="builder-subject-grid">
          <Link
            href={STUDENT_TRAINING_DRILL_ROUTE}
            className="builder-choice-card builder-subject-card"
          >
            <span className="builder-card-icon" aria-hidden="true">
              <PenTool size={24} strokeWidth={2.1} />
            </span>
            <strong>جلسة دريل</strong>
            <p>دريل بالمحاور أو دريل مختلط مع معاينة مباشرة قبل البدء.</p>
            <small>
              {drillQuota?.monthlyLimit === null
                ? "بدء غير محدود"
                : `المتبقي هذا الشهر: ${drillQuota?.remaining ?? 0}`}
            </small>
          </Link>

          <Link
            href={STUDENT_TRAINING_SIMULATION_ROUTE}
            className="builder-choice-card builder-subject-card"
          >
            <span className="builder-card-icon" aria-hidden="true">
              <TimerReset size={24} strokeWidth={2.1} />
            </span>
            <strong>محاكاة امتحان كاملة</strong>
            <p>اختر موضوعاً رسمياً، راجع بياناته، ثم ابدأ محاكاة بزمن الامتحان.</p>
            <small>
              {simulationQuota?.monthlyLimit === null
                ? "بدء غير محدود"
                : `المتبقي هذا الشهر: ${simulationQuota?.remaining ?? 0}`}
            </small>
          </Link>

          {weakPointDrillEnabled ? (
            <Link
              href={STUDENT_TRAINING_WEAK_POINTS_ROUTE}
              className="builder-choice-card builder-subject-card"
            >
              <span className="builder-card-icon" aria-hidden="true">
                <BrainCircuit size={24} strokeWidth={2.1} />
              </span>
              <strong>دريل نقاط الضعف</strong>
              <p>جلسة علاجية مبنية على أخطائك الحديثة ومحاورك الأضعف داخل المادة.</p>
              <small>Premium · مبني على إشاراتك الأخيرة</small>
            </Link>
          ) : (
            <article className="builder-choice-card builder-subject-card is-locked">
              <span className="builder-card-icon" aria-hidden="true">
                <BrainCircuit size={24} strokeWidth={2.1} />
              </span>
              <strong>دريل نقاط الضعف</strong>
              <p>يبني جلسة علاجية مباشرة من الإشارات الحديثة بعد المراجعة.</p>
              <small>متاح ضمن Premium</small>
              <Link href={STUDENT_BILLING_ROUTE} className="btn-secondary">
                فعّل Premium
              </Link>
            </article>
          )}
        </div>

        <section className="builder-preview-card">
          <h3>ما الذي يدخل في هذا المرور؟</h3>
          <div className="builder-preview-exercises">
            <article className="builder-preview-exercise">
              <div>
                <strong>الدريل</strong>
                <p>مسار مرن للتعلم، مع كشف الحل أثناء الدراسة واستكمال الجلسة لاحقاً.</p>
              </div>
            </article>
            <article className="builder-preview-exercise">
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
