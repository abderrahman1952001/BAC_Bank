"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  BillingCheckout,
  BillingOverviewResponse,
  BillingPlan,
} from "@/lib/billing-api";
import { createBillingCheckout, syncBillingCheckout } from "@/lib/billing-api";
import { useAuthSession } from "@/components/auth-provider";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import {
  STUDENT_BILLING_ROUTE,
  STUDENT_TRAINING_ROUTE,
} from "@/lib/student-routes";

function formatAmountDzd(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DZD`;
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPlanAccessSummary(plan: BillingPlan) {
  if (plan.accessType === "FIXED_DAYS" && plan.durationDays) {
    return `${plan.durationDays} يوماً من الوصول الممتاز`;
  }

  if (plan.accessType === "SEASON_END" && plan.seasonEndsAt) {
    return `وصول حتى ${formatDate(plan.seasonEndsAt) ?? "نهاية الموسم"}`;
  }

  return "وصول Premium مدفوع";
}

function formatPlanName(planCode: BillingPlan["code"]) {
  switch (planCode) {
    case "PREMIUM_30_DAYS":
      return "Premium لمدة 30 يوماً";
    case "PREMIUM_90_DAYS":
      return "Premium لثلاثة أشهر (سداسي)";
    case "PREMIUM_BAC_SEASON":
      return "Premium لموسم الباك";
  }
}

function formatCheckoutStatus(status: BillingCheckout["status"]) {
  switch (status) {
    case "PAID":
      return "مدفوع";
    case "PROCESSING":
      return "قيد المعالجة";
    case "FAILED":
      return "فشل الدفع";
    case "CANCELED":
      return "ملغي";
    case "EXPIRED":
      return "منتهي";
    case "PENDING":
      return "بانتظار الدفع";
  }
}

function getStatusTone(status: BillingCheckout["status"]) {
  switch (status) {
    case "PAID":
      return "success" as const;
    case "PROCESSING":
    case "PENDING":
      return "warning" as const;
    case "FAILED":
    case "CANCELED":
    case "EXPIRED":
      return "danger" as const;
  }
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "تعذر إكمال العملية حالياً.";
}

function isCheckoutSyncable(checkout: BillingCheckout | null) {
  return checkout?.status === "PENDING" || checkout?.status === "PROCESSING";
}

export function StudentBillingPage({
  initialOverview,
}: {
  initialOverview?: BillingOverviewResponse;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendingPlanCode, setPendingPlanCode] = useState<
    BillingPlan["code"] | null
  >(null);
  const [creatingCheckout, startCreatingCheckout] = useTransition();

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader
          eyebrow="الاشتراك"
          title="مِراس Premium"
          subtitle="حوّل مسارك إلى تدريب علاجي أعمق مع دفع محلي عبر CIB و EDAHABIA. السعر الظاهر نهائي ورسوم الدفع تتحملها المنصة."
          meta={
            initialOverview
              ? [
                  {
                    label: "الحالة",
                    value: initialOverview.currentAccess.isPremium
                      ? "Premium"
                      : "Free",
                  },
                  {
                    label: "الانتهاء",
                    value:
                      formatDate(
                        initialOverview.currentAccess.subscriptionEndsAt,
                      ) ?? "غير نشط",
                  },
                ]
              : undefined
          }
          actions={
            <Button asChild variant="outline" className="h-12 rounded-full px-5">
              <Link href={STUDENT_TRAINING_ROUTE}>العودة إلى التدريب</Link>
            </Button>
          }
        />

        {!initialOverview ? (
          <section className="builder-preview-card">
            <h3>تعذر تحميل الاشتراك</h3>
            <p>
              لم نتمكن من قراءة بيانات الفوترة حالياً. أعد تحديث الصفحة ثم حاول
              من جديد.
            </p>
          </section>
        ) : (
          <>
            <section className="billing-layout">
              <article className="builder-preview-card billing-access-card">
                <div className="billing-access-head">
                  <div>
                    <h3>حالتك الحالية</h3>
                    <p>
                      {initialOverview.currentAccess.isPremium
                        ? "وصولك الممتاز نشط الآن، ويمكنك تمديده قبل انتهاء المدة حتى لا ينقطع."
                        : "أنت حالياً على الخطة المجانية. الترقية تفعّل مزايا الدعم المتقدمة فور تأكيد الدفع."}
                    </p>
                  </div>
                  <StudyBadge
                    tone={
                      initialOverview.currentAccess.isPremium
                        ? "success"
                        : "neutral"
                    }
                  >
                    {initialOverview.currentAccess.isPremium
                      ? "Premium نشط"
                      : "الخطة المجانية"}
                  </StudyBadge>
                </div>
                <div className="billing-access-grid">
                  <div className="billing-access-metric">
                    <span>ينتهي في</span>
                    <strong>
                      {formatDate(
                        initialOverview.currentAccess.subscriptionEndsAt,
                      ) ?? "لا يوجد وصول مدفوع"}
                    </strong>
                  </div>
                  <div className="billing-access-metric">
                    <span>المزود</span>
                    <strong>{initialOverview.provider}</strong>
                  </div>
                </div>
              </article>

              <section className="billing-plan-grid">
                {initialOverview.availablePlans.map((plan) => (
                  <BillingPlanCard
                    key={plan.code}
                    plan={plan}
                    disabled={creatingCheckout}
                    isPending={pendingPlanCode === plan.code}
                    onCheckout={() => {
                      setError(null);
                      setPendingPlanCode(plan.code);
                      startCreatingCheckout(() => {
                        void createBillingCheckout({
                          planCode: plan.code,
                          locale: "ar",
                        })
                          .then((response) => {
                            window.location.assign(response.redirectUrl);
                          })
                          .catch((requestError) => {
                            setError(readErrorMessage(requestError));
                            setPendingPlanCode(null);
                          });
                      });
                    }}
                  />
                ))}
              </section>
            </section>

            {error ? <p className="error-text">{error}</p> : null}

            <section className="builder-preview-card">
              <h3>المدفوعات الأخيرة</h3>
              {initialOverview.recentCheckouts.length ? (
                <div className="billing-history-list">
                  {initialOverview.recentCheckouts.map((checkout) => (
                    <article key={checkout.id} className="billing-history-item">
                      <div className="billing-history-copy">
                        <strong>{formatAmountDzd(checkout.amount)}</strong>
                        <p>{formatPlanName(checkout.planCode)}</p>
                        <small>
                          {formatDate(checkout.createdAt) ?? "غير معروف"}
                        </small>
                      </div>
                      <div className="billing-history-status">
                        <StudyBadge tone={getStatusTone(checkout.status)}>
                          {formatCheckoutStatus(checkout.status)}
                        </StudyBadge>
                        {checkout.accessEndsAt ? (
                          <small>
                            ينتهي في {formatDate(checkout.accessEndsAt) ?? "-"}
                          </small>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>
                  لا توجد عمليات دفع بعد. عند نجاح أول عملية، ستظهر هنا للمراجعة
                  والتتبّع.
                </p>
              )}
            </section>
          </>
        )}
      </section>
    </StudyShell>
  );
}

function BillingPlanCard({
  plan,
  disabled,
  isPending,
  onCheckout,
}: {
  plan: BillingPlan;
  disabled: boolean;
  isPending: boolean;
  onCheckout: () => void;
}) {
  return (
    <article
      className={`builder-preview-card billing-plan-card${
        plan.recommended ? " is-recommended" : ""
      }`}
    >
      <div className="billing-plan-head">
        <div>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
        </div>
        {plan.recommended ? (
          <StudyBadge tone="brand">الاختيار الأنسب</StudyBadge>
        ) : null}
      </div>
      <div className="billing-plan-price">
        <strong>{formatAmountDzd(plan.amount)}</strong>
        <span>{formatPlanAccessSummary(plan)}</span>
      </div>
      <p className="billing-plan-price-note">
        السعر النهائي يشمل رسوم الدفع، ولا نضيف أي رسوم Chargily على الطالب.
      </p>
      <ul className="billing-feature-list">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Button
        type="button"
        className="h-12 w-full rounded-full"
        onClick={onCheckout}
        disabled={disabled}
      >
        {isPending ? "جارٍ تجهيز الدفع..." : "ادفع الآن"}
      </Button>
    </article>
  );
}

export function StudentBillingStatusPage({
  mode,
  initialOverview,
  initialCheckout,
  checkoutId,
}: {
  mode: "success" | "failure";
  initialOverview?: BillingOverviewResponse;
  initialCheckout?: BillingCheckout | null;
  checkoutId?: string | null;
}) {
  const { refreshSession } = useAuthSession();
  const [checkout, setCheckout] = useState<BillingCheckout | null>(
    initialCheckout ?? null,
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, startSyncing] = useTransition();
  const hasAttemptedAutoSync = useRef(false);

  function refreshCheckout() {
    if (!checkoutId) {
      return;
    }

    setSyncError(null);
    startSyncing(() => {
      void syncBillingCheckout(checkoutId)
        .then(async (response) => {
          setCheckout(response.checkout);

          if (response.checkout.status === "PAID") {
            await refreshSession();
          }
        })
        .catch((error) => {
          setSyncError(readErrorMessage(error));
        });
    });
  }

  const runAutoRefreshCheckout = useEffectEvent(() => {
    refreshCheckout();
  });

  useEffect(() => {
    if (
      mode !== "success" ||
      !checkoutId ||
      !isCheckoutSyncable(checkout) ||
      hasAttemptedAutoSync.current
    ) {
      return;
    }

    hasAttemptedAutoSync.current = true;
    const timeoutId = window.setTimeout(() => {
      runAutoRefreshCheckout();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [checkout, checkoutId, mode]);

  const headerTitle =
    mode === "success" ? "التحقق من عملية الدفع" : "انتهت محاولة الدفع";
  const headerSubtitle =
    mode === "success"
      ? "إذا عاد بك المزود قبل وصول الإشعار النهائي، سنُحدّث الحالة من هنا مباشرة."
      : "يمكنك مراجعة الحالة ثم إعادة المحاولة من صفحة الاشتراك.";

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-builder">
        <StudyHeader
          eyebrow="الدفع"
          title={headerTitle}
          subtitle={headerSubtitle}
          actions={
            <Button asChild variant="outline" className="h-12 rounded-full px-5">
              <Link href={STUDENT_BILLING_ROUTE}>صفحة الاشتراك</Link>
            </Button>
          }
        />

        <section className="builder-preview-card billing-status-card">
          <div className="billing-access-head">
            <div>
              <h3>حالة العملية</h3>
              <p>
                {checkout
                  ? "هذه هي آخر حالة نعرفها لهذه العملية. يمكنك تحديثها إذا كانت ما تزال معلقة."
                  : "لم نعثر على عملية دفع مطابقة للرابط الحالي."}
              </p>
            </div>
            {checkout ? (
              <StudyBadge tone={getStatusTone(checkout.status)}>
                {formatCheckoutStatus(checkout.status)}
              </StudyBadge>
            ) : null}
          </div>

          {checkout ? (
            <div className="billing-status-grid">
              <div className="billing-access-metric">
                <span>المبلغ</span>
                <strong>{formatAmountDzd(checkout.amount)}</strong>
              </div>
              <div className="billing-access-metric">
                <span>أُنشئت في</span>
                <strong>{formatDate(checkout.createdAt) ?? "-"}</strong>
              </div>
              <div className="billing-access-metric">
                <span>ينتهي الوصول في</span>
                <strong>
                  {formatDate(checkout.accessEndsAt) ?? "لم يُفعّل بعد"}
                </strong>
              </div>
            </div>
          ) : null}

          {checkout?.failureReason ? (
            <p className="error-text">{checkout.failureReason}</p>
          ) : null}
          {syncError ? <p className="error-text">{syncError}</p> : null}

          <div className="billing-status-actions">
            {checkoutId && isCheckoutSyncable(checkout) ? (
              <Button
                type="button"
                className="h-11 rounded-full px-5"
                onClick={refreshCheckout}
                disabled={syncing}
              >
                {syncing ? "جارٍ تحديث الحالة..." : "تحديث الحالة الآن"}
              </Button>
            ) : null}
            <Button asChild variant="outline" className="h-11 rounded-full px-5">
              <Link href={STUDENT_BILLING_ROUTE}>العودة إلى صفحة الاشتراك</Link>
            </Button>
          </div>
        </section>

        {initialOverview ? (
          <section className="builder-preview-card">
            <h3>وصولك الحالي</h3>
            <p>
              {initialOverview.currentAccess.isPremium
                ? `وصول Premium نشط حتى ${formatDate(
                    initialOverview.currentAccess.subscriptionEndsAt,
                  )}.`
                : "ما زلت على الخطة المجانية. يمكنك إعادة تشغيل عملية الدفع من صفحة الاشتراك."}
            </p>
          </section>
        ) : null}
      </section>
    </StudyShell>
  );
}
