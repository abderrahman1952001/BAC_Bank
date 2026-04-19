'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { StudyClearVaultButton } from '@/components/study-clear-vault-button';
import { StudyReviewQueueActions } from '@/components/study-review-queue-actions';
import { EmptyState, StudyBadge } from '@/components/study-shell';
import type {
  HubActivityItem,
  MyMistakeItem,
  RoadmapActivityItem,
  SavedExerciseItem,
  WeakPointItem,
} from '@/lib/student-hub';
import { STUDENT_LIBRARY_ROUTE, STUDENT_TRAINING_ROUTE } from '@/lib/student-routes';

function HubDualActions({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <div className="study-action-row">
      <Link href={primaryHref} className="btn-primary">
        {primaryLabel}
      </Link>
      <Link href={secondaryHref} className="btn-secondary">
        {secondaryLabel}
      </Link>
    </div>
  );
}

export function HubRoadmapSection({
  roadmapItems,
}: {
  roadmapItems: RoadmapActivityItem[];
}) {
  return (
    <section className="hub-activity-section">
      <div className="hub-activity-head">
        <h2>خارطة التقدم</h2>
      </div>

      {roadmapItems.length === 0 ? (
        <EmptyState
          title="لم تُجهّز خارطة بعد"
          description="ستظهر لك مسارات المواد هنا عندما تتوفر خارطة المنهج لهذه المادة."
          action={
            <HubDualActions
              primaryHref={STUDENT_TRAINING_ROUTE}
              primaryLabel="ابدأ التدريب"
              secondaryHref={STUDENT_LIBRARY_ROUTE}
              secondaryLabel="المكتبة"
            />
          }
        />
      ) : (
        <div className="hub-activity-list">
          {roadmapItems.map((item, index) => (
            <motion.article
              key={item.key}
              className="hub-activity-card kind-session"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <div className="hub-activity-top">
                <div className="hub-activity-copy">
                  <span className="hub-activity-kicker">خارطة المنهج</span>
                  <h3>
                    <Link href={item.detailsHref}>{item.title}</Link>
                  </h3>
                  <small>{item.subtitle}</small>
                </div>
                <span className="hub-activity-time">{item.relativeTimestamp}</span>
              </div>

              <div className="hub-activity-foot hub-activity-progress-row">
                <Link
                  href={item.actionHref}
                  className={`hub-activity-action tone-${item.tone}`}
                >
                  {item.actionLabel}
                </Link>
                <div className="hub-activity-metric">
                  <strong>{item.progressPercent}%</strong>
                  <small>{item.progressLabel}</small>
                </div>
                <div className="hub-activity-progress-track" aria-hidden="true">
                  <div
                    className={`hub-activity-progress-fill tone-${item.tone}`}
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="hub-activity-foot">
                <Link href={item.detailsHref} className="hub-activity-action tone-neutral">
                  افتح الخارطة
                </Link>
                <StudyBadge
                  tone={
                    item.tone === 'success'
                      ? 'success'
                      : item.tone === 'brand'
                        ? 'brand'
                        : 'warning'
                  }
                >
                  {item.summaryLabel}
                </StudyBadge>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HubWeakPointsSection({
  enabled,
  weakPointItems,
}: {
  enabled: boolean;
  weakPointItems: WeakPointItem[];
}) {
  if (!enabled) {
    return null;
  }

  return (
    <section className="hub-activity-section">
      <div className="hub-activity-head">
        <h2>نقاط الضعف</h2>
      </div>

      {weakPointItems.length === 0 ? (
        <EmptyState
          title="لا توجد إشارات ضعف كافية بعد"
          description="أكمل بعض المراجعات وحدد الأسئلة التي فاتتك أو بدت صعبة حتى نكوّن لك دريل علاجياً مباشراً."
          action={
            <HubDualActions
              primaryHref={STUDENT_TRAINING_ROUTE}
              primaryLabel="ابدأ جلسة تدريب"
              secondaryHref={STUDENT_LIBRARY_ROUTE}
              secondaryLabel="المكتبة"
            />
          }
        />
      ) : (
        <div className="hub-activity-list">
          {weakPointItems.map((item, index) => (
            <motion.article
              key={item.key}
              className="hub-activity-card kind-weak-point"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <div className="hub-activity-top">
                <div className="hub-activity-copy">
                  <span className="hub-activity-kicker">{item.topicsLabel}</span>
                  <h3>{item.title}</h3>
                  <small>{item.subtitle}</small>
                </div>
                <span className="hub-activity-time">{item.relativeTimestamp}</span>
              </div>

              <div className="hub-activity-foot">
                <Link href={item.href} className="hub-activity-action tone-brand">
                  أصلحها الآن
                </Link>
                <StudyBadge tone="warning">
                  {item.flaggedExerciseCount > 0
                    ? `${item.weakSignalCount} إشارات · ${item.flaggedExerciseCount} تمارين معلّمة`
                    : `${item.weakSignalCount} إشارات علاجية`}
                </StudyBadge>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HubMistakesSection({
  myMistakeItems,
}: {
  myMistakeItems: MyMistakeItem[];
}) {
  return (
    <section className="hub-activity-section">
      <div className="hub-activity-head">
        <h2>أخطائي الأخيرة</h2>
        {myMistakeItems.length > 0 ? <StudyClearVaultButton /> : null}
      </div>

      {myMistakeItems.length === 0 ? (
        <EmptyState
          title="لا توجد أخطاء مراجعة بعد"
          description="بعد إنهاء المراجعة، ستظهر هنا الأسئلة التي علّمتها بأنها فاتتك أو بدت صعبة."
          action={
            <HubDualActions
              primaryHref={STUDENT_TRAINING_ROUTE}
              primaryLabel="ابدأ جلسة تدريب"
              secondaryHref={STUDENT_LIBRARY_ROUTE}
              secondaryLabel="المكتبة"
            />
          }
        />
      ) : (
        <div className="hub-activity-list">
          {myMistakeItems.map((item, index) => (
            <motion.article
              key={item.key}
              className={
                item.flagged
                  ? 'hub-activity-card kind-mistake is-flagged'
                  : 'hub-activity-card kind-mistake'
              }
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <div className="hub-activity-top">
                <div className="hub-activity-copy">
                  <span className="hub-activity-kicker">{item.reasonsLabel}</span>
                  <h3>{item.title}</h3>
                  <small>{item.subtitle}</small>
                </div>
                <span className="hub-activity-time">{item.relativeTimestamp}</span>
              </div>

              <div className="hub-activity-foot">
                <Link href={item.href} className="hub-activity-action tone-brand">
                  راجع الآن
                </Link>
                <StudyBadge tone={item.flagged ? 'brand' : 'warning'}>
                  {item.questionSignalCount > 0
                    ? `${item.questionSignalCount} أسئلة تحتاج رجوعاً`
                    : 'تمرين يحتاج رجوعاً'}
                </StudyBadge>
                <StudyBadge tone={item.cadenceTone}>{item.cadenceLabel}</StudyBadge>
              </div>

              <div className="hub-activity-foot">
                <StudyReviewQueueActions
                  exerciseNodeId={item.exerciseNodeId}
                  statuses={['DONE', 'SNOOZED', 'REMOVED']}
                  labels={{
                    DONE: 'تمت',
                    SNOOZED: 'لاحقاً',
                    REMOVED: 'إخفاء',
                  }}
                />
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HubSavedExercisesSection({
  savedExerciseItems,
}: {
  savedExerciseItems: SavedExerciseItem[];
}) {
  return (
    <section className="hub-activity-section">
      <div className="hub-activity-head">
        <h2>المحفوظات والمراجعة</h2>
      </div>

      {savedExerciseItems.length === 0 ? (
        <EmptyState
          title="لا توجد تمارين محفوظة بعد"
          description="احفظ تمريناً من المكتبة أو علّمه للمراجعة داخل جلساتك."
          action={
            <HubDualActions
              primaryHref={STUDENT_LIBRARY_ROUTE}
              primaryLabel="افتح المكتبة"
              secondaryHref={STUDENT_TRAINING_ROUTE}
              secondaryLabel="ابدأ التدريب"
            />
          }
        />
      ) : (
        <div className="hub-activity-list">
          {savedExerciseItems.map((item, index) => (
            <motion.article
              key={item.key}
              className={
                item.flagged
                  ? 'hub-activity-card kind-saved is-flagged'
                  : 'hub-activity-card kind-saved'
              }
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <div className="hub-activity-top">
                <div className="hub-activity-copy">
                  <span className="hub-activity-kicker">{item.stateLabel}</span>
                  <h3>{item.title}</h3>
                  <small>{item.subtitle}</small>
                </div>
                <span className="hub-activity-time">{item.relativeTimestamp}</span>
              </div>

              <div className="hub-activity-foot">
                <Link
                  href={item.href}
                  className={`hub-activity-action tone-${item.tone}`}
                >
                  افتح في المكتبة
                </Link>
                <StudyBadge tone={item.flagged ? 'brand' : 'accent'}>
                  {item.flagged ? 'راجع هذا التمرين' : 'تمرين محفوظ'}
                </StudyBadge>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HubRecentActivitySection({
  activityItems,
}: {
  activityItems: HubActivityItem[];
}) {
  return (
    <section className="hub-activity-section">
      <div className="hub-activity-head">
        <h2>النشاط الأخير</h2>
      </div>

      {activityItems.length === 0 ? (
        <EmptyState
          title="لا يوجد نشاط بعد"
          description="ابدأ من جلسة أو موضوع."
          action={
            <HubDualActions
              primaryHref={STUDENT_TRAINING_ROUTE}
              primaryLabel="ابدأ التدريب"
              secondaryHref={STUDENT_LIBRARY_ROUTE}
              secondaryLabel="المكتبة"
            />
          }
        />
      ) : (
        <div className="hub-activity-list">
          {activityItems.map((item, index) => (
            <motion.article
              key={item.key}
              className={`hub-activity-card kind-${item.kind}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: 0.04 * index,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              <div className="hub-activity-top">
                <div className="hub-activity-copy">
                  <span className="hub-activity-kicker">{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <small>{item.subtitle}</small>
                </div>
                <span className="hub-activity-time">{item.relativeTimestamp}</span>
              </div>

              <div className="hub-activity-foot hub-activity-progress-row">
                <Link
                  href={item.href}
                  className={`hub-activity-action tone-${item.tone}`}
                >
                  {item.actionLabel}
                </Link>
                <div className="hub-activity-metric">
                  <strong>{item.progressPercent}%</strong>
                  <small>{item.progressLabel}</small>
                </div>
                <div className="hub-activity-progress-track" aria-hidden="true">
                  <div
                    className={`hub-activity-progress-fill tone-${item.tone}`}
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
