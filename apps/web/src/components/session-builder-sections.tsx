import { motion } from "motion/react";
import { SubjectIcon } from "@/components/subject-icon";
import { EmptyState } from "@/components/study-shell";
import {
  type BuilderStep,
  type BuilderYearMode,
  type BuilderZeroResultsGuidance,
  isBuilderStepCompleted,
  isBuilderStepEnabled,
  SESSION_BUILDER_SIZE_OPTIONS,
  SESSION_BUILDER_STEP_ITEMS,
  type TopicSelectionMode,
} from "@/lib/session-builder";
import {
  type FiltersResponse,
  formatSessionType,
  type SessionPreviewResponse,
  type SessionType,
} from "@/lib/qbank";
import {
  countSelectableTopics,
  type TopicTreeNode,
} from "@/lib/topic-taxonomy";

type SubjectOption = FiltersResponse["subjects"][number];
type StreamOption = FiltersResponse["streams"][number];
type TopicOption = FiltersResponse["topics"][number];

type SessionBuilderStepperProps = {
  currentStep: BuilderStep;
  subjectCode: string;
  topicSelectionComplete: boolean;
  yearSelectionComplete: boolean;
  hasPreviewResults: boolean;
  onGoToStep: (step: BuilderStep) => void;
};

type SessionBuilderSubjectStepProps = {
  loading: boolean;
  suggestedSubjects: SubjectOption[];
  subjectCode: string;
  onSelectSubject: (subjectCode: string) => void;
};

type SessionBuilderTopicsStepProps = {
  selectedSubject: SubjectOption | null;
  availableTopics: TopicOption[];
  topicSelectionMode: TopicSelectionMode;
  topicCodes: string[];
  chapterTopics: TopicTreeNode<TopicOption>[];
  selectableSubtopicsByChapter: Array<{
    chapter: TopicTreeNode<TopicOption>;
    subtopics: TopicTreeNode<TopicOption>[];
  }>;
  topicDescendantsByCode: Map<string, string[]>;
  topicSelectionComplete: boolean;
  onChangeTopicMode: (mode: Exclude<TopicSelectionMode, null>) => void;
  onToggleTopic: (topicCode: string) => void;
  onBack: () => void;
  onNext: () => void;
};

type SessionBuilderYearsStepProps = {
  filters: FiltersResponse;
  selectedSubject: SubjectOption | null;
  topicSelectionComplete: boolean;
  selectedTopicLabel: string;
  yearMode: BuilderYearMode;
  yearStart: number | null;
  yearEnd: number | null;
  advancedOpen: boolean;
  subjectCode: string;
  effectiveStreamCodes: string[];
  availableStreams: StreamOption[];
  sessionTypes: SessionType[];
  yearSelectionComplete: boolean;
  onBack: () => void;
  onNext: () => void;
  onReturnToTopics: () => void;
  onSetYearMode: (mode: BuilderYearMode) => void;
  onSetYearStart: (year: number | null) => void;
  onSetYearEnd: (year: number | null) => void;
  onToggleAdvanced: () => void;
  onOpenAllStreams: () => void;
  onToggleStream: (streamCode: string) => void;
  onToggleSessionType: (type: SessionType) => void;
};

type SessionBuilderReviewStepProps = {
  selectedSubject: SubjectOption | null;
  topicSelectionComplete: boolean;
  selectedTopicLabel: string;
  builderReadyToPreview: boolean;
  selectedYearsLabel: string;
  exerciseCount: number;
  maxExerciseCount: number;
  advancedOpen: boolean;
  title: string;
  previewLoading: boolean;
  preview: SessionPreviewResponse | null;
  selectedYears: number[];
  planText: string;
  zeroResultsGuidance: BuilderZeroResultsGuidance | null;
  creating: boolean;
  onBack: () => void;
  onReturnToYears: () => void;
  onSelectExerciseCount: (count: number) => void;
  onToggleAdvanced: () => void;
  onTitleChange: (title: string) => void;
  onZeroResultsAction: () => void;
  onCreateSession: () => void;
};

const YEAR_MODE_OPTIONS: Array<{
  value: BuilderYearMode;
  label: string;
}> = [
  { value: "3", label: "آخر 3 سنوات" },
  { value: "5", label: "آخر 5 سنوات" },
  { value: "8", label: "آخر 8 سنوات" },
  { value: "all", label: "كل السنوات" },
  { value: "custom", label: "مجال مخصص" },
];

export function SessionBuilderStepper({
  currentStep,
  subjectCode,
  topicSelectionComplete,
  yearSelectionComplete,
  hasPreviewResults,
  onGoToStep,
}: SessionBuilderStepperProps) {
  return (
    <div className="builder-stepper" aria-label="خطوات إنشاء الجلسة">
      {SESSION_BUILDER_STEP_ITEMS.map((item) => {
        const isActive = currentStep === item.step;
        const isCompleted = isBuilderStepCompleted(item.step, {
          subjectCode,
          topicSelectionComplete,
          yearSelectionComplete,
          hasPreviewResults,
        });
        const isEnabled = isBuilderStepEnabled(item.step, {
          subjectCode,
          topicSelectionComplete,
          yearSelectionComplete,
        });

        return (
          <button
            key={item.step}
            type="button"
            className={`builder-stepper-button${isActive ? " active" : ""}${
              isCompleted ? " completed" : ""
            }`}
            onClick={() => onGoToStep(item.step)}
            disabled={!isEnabled}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="builder-stepper-track" aria-hidden="true">
              {isActive || isCompleted ? (
                <motion.span
                  className="builder-stepper-fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                />
              ) : null}
            </span>
            <span className="builder-stepper-copy">
              <strong>{item.label}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SessionBuilderSubjectStep({
  loading,
  suggestedSubjects,
  subjectCode,
  onSelectSubject,
}: SessionBuilderSubjectStepProps) {
  return (
    <>
      <div className="builder-stage-head">
        <div>
          <p className="page-kicker">الخطوة 1</p>
          <h2>اختر المادة</h2>
        </div>
      </div>

      {suggestedSubjects.length ? (
        <div className="builder-subject-grid">
          {suggestedSubjects.map((subject) => (
            <button
              key={subject.code}
              type="button"
              className={`builder-choice-card builder-subject-card${
                subjectCode === subject.code ? " active" : ""
              }`}
              onClick={() => onSelectSubject(subject.code)}
              disabled={loading}
            >
              <span className="builder-card-icon" aria-hidden="true">
                <SubjectIcon
                  subjectCode={subject.code}
                  subjectName={subject.name}
                  size={24}
                />
              </span>
              <strong>{subject.name}</strong>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="لا توجد مواد مرتبطة بشعبتك حالياً"
          description="تحقق من الحساب."
        />
      )}
    </>
  );
}

export function SessionBuilderTopicsStep({
  selectedSubject,
  availableTopics,
  topicSelectionMode,
  topicCodes,
  chapterTopics,
  selectableSubtopicsByChapter,
  topicDescendantsByCode,
  topicSelectionComplete,
  onChangeTopicMode,
  onToggleTopic,
  onBack,
  onNext,
}: SessionBuilderTopicsStepProps) {
  return (
    <>
      <div className="builder-stage-head">
        <div>
          <p className="page-kicker">الخطوة 2</p>
          <h2>المحاور</h2>
        </div>
        <button type="button" className="btn-secondary" onClick={onBack}>
          تغيير المادة
        </button>
      </div>

      <div className="builder-summary-pills">
        {selectedSubject ? <span>{selectedSubject.name}</span> : null}
      </div>

      {!availableTopics.length ? (
        <EmptyState
          title="لا توجد محاور مطابقة حالياً"
          description="غيّر المادة أو النطاق."
        />
      ) : (
        <>
          <button
            type="button"
            className={`builder-choice-card builder-wide-choice${
              topicSelectionMode === "all" ? " active" : ""
            }`}
            onClick={() => onChangeTopicMode("all")}
          >
            <strong>كل المحاور</strong>
          </button>

          <div className="builder-subject-grid">
            {chapterTopics
              .filter((chapter) => chapter.isSelectable)
              .map((chapter) => {
                const selectedDescendants = (
                  topicDescendantsByCode.get(chapter.code) ?? []
                ).filter((code) => topicCodes.includes(code));
                const chapterActive =
                  (topicSelectionMode === "custom" &&
                    topicCodes.includes(chapter.code)) ||
                  selectedDescendants.length > 0;
                const subtopicCount = countSelectableTopics(chapter.children);

                return (
                  <button
                    key={chapter.code}
                    type="button"
                    className={`builder-choice-card builder-subject-card${
                      chapterActive ? " active" : ""
                    }`}
                    onClick={() => onToggleTopic(chapter.code)}
                  >
                    <strong>{chapter.name}</strong>
                    <span>
                      {selectedDescendants.length
                        ? `${selectedDescendants.length} مختارة`
                        : subtopicCount > 0
                          ? `${subtopicCount} فروع`
                          : "مباشر"}
                    </span>
                  </button>
                );
              })}
          </div>

          {selectableSubtopicsByChapter.some(
            ({ subtopics }) => subtopics.length > 0,
          ) ? (
            <div className="builder-preview-stack">
              {selectableSubtopicsByChapter.map(({ chapter, subtopics }) =>
                subtopics.length ? (
                  <section key={chapter.code} className="builder-preview-card">
                    <h3>{chapter.name}</h3>
                    <div className="chip-grid">
                      {subtopics.map((topic) => (
                        <button
                          key={topic.code}
                          type="button"
                          className={
                            topicSelectionMode === "custom" &&
                            topicCodes.includes(topic.code)
                              ? "choice-chip active"
                              : "choice-chip"
                          }
                          onClick={() => onToggleTopic(topic.code)}
                        >
                          {topic.name}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          ) : null}
        </>
      )}

      <div className="builder-stage-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          رجوع
        </button>
        <button
          type="button"
          data-testid="session-builder-next-topics"
          className="btn-primary"
          onClick={onNext}
          disabled={!topicSelectionComplete}
        >
          السنوات
        </button>
      </div>
    </>
  );
}

export function SessionBuilderYearsStep({
  filters,
  selectedSubject,
  topicSelectionComplete,
  selectedTopicLabel,
  yearMode,
  yearStart,
  yearEnd,
  advancedOpen,
  subjectCode,
  effectiveStreamCodes,
  availableStreams,
  sessionTypes,
  yearSelectionComplete,
  onBack,
  onNext,
  onReturnToTopics,
  onSetYearMode,
  onSetYearStart,
  onSetYearEnd,
  onToggleAdvanced,
  onOpenAllStreams,
  onToggleStream,
  onToggleSessionType,
}: SessionBuilderYearsStepProps) {
  return (
    <>
      <div className="builder-stage-head">
        <div>
          <p className="page-kicker">الخطوة 3</p>
          <h2>السنوات</h2>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={onReturnToTopics}
        >
          العودة للمحاور
        </button>
      </div>

      <div className="builder-summary-pills">
        {selectedSubject ? <span>{selectedSubject.name}</span> : null}
        {topicSelectionComplete ? <span>{selectedTopicLabel}</span> : null}
      </div>

      <div className="builder-year-grid">
        {YEAR_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`builder-choice-card builder-year-card${
              yearMode === option.value ? " active" : ""
            }`}
            onClick={() => onSetYearMode(option.value)}
          >
            <strong>{option.label}</strong>
            <span>{option.value === "custom" ? "مخصص" : "سريع"}</span>
          </button>
        ))}
      </div>

      {yearMode === "custom" && filters.years.length ? (
        <div className="builder-year-range">
          <label className="field">
            <span>من</span>
            <select
              value={yearStart ?? ""}
              onChange={(event) => onSetYearStart(Number(event.target.value) || null)}
            >
              {filters.years
                .slice()
                .sort((left, right) => left - right)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>

          <label className="field">
            <span>إلى</span>
            <select
              value={yearEnd ?? ""}
              onChange={(event) => onSetYearEnd(Number(event.target.value) || null)}
            >
              {filters.years
                .slice()
                .sort((left, right) => right - left)
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </label>
        </div>
      ) : null}

      <section className="builder-advanced-panel">
        <button
          type="button"
          className="builder-advanced-toggle"
          onClick={onToggleAdvanced}
        >
          <span>خيارات إضافية</span>
          <strong>{advancedOpen ? "إخفاء" : "إظهار"}</strong>
        </button>

        {advancedOpen ? (
          <div className="builder-advanced-grid">
            <div className="builder-subsection">
              <h3>الشعبة</h3>
              <div className="chip-grid">
                <button
                  type="button"
                  className={
                    !effectiveStreamCodes.length
                      ? "choice-chip active"
                      : "choice-chip"
                  }
                  onClick={onOpenAllStreams}
                  disabled={!subjectCode}
                >
                  كل الشعب
                </button>
                {availableStreams.map((stream) => (
                  <button
                    key={stream.code}
                    type="button"
                    className={
                      effectiveStreamCodes.includes(stream.code)
                        ? "choice-chip active"
                        : "choice-chip"
                    }
                    onClick={() => onToggleStream(stream.code)}
                    disabled={!subjectCode}
                  >
                    {stream.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-subsection">
              <h3>نوع الدورة</h3>
              <div className="chip-grid">
                {filters.sessionTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      sessionTypes.includes(type)
                        ? "choice-chip active"
                        : "choice-chip"
                    }
                    onClick={() => onToggleSessionType(type)}
                  >
                    {formatSessionType(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="builder-stage-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          رجوع
        </button>
        <button
          type="button"
          data-testid="session-builder-next-years"
          className="btn-primary"
          onClick={onNext}
          disabled={!yearSelectionComplete}
        >
          الحجم
        </button>
      </div>
    </>
  );
}

export function SessionBuilderReviewStep({
  selectedSubject,
  topicSelectionComplete,
  selectedTopicLabel,
  builderReadyToPreview,
  selectedYearsLabel,
  exerciseCount,
  maxExerciseCount,
  advancedOpen,
  title,
  previewLoading,
  preview,
  selectedYears,
  planText,
  zeroResultsGuidance,
  creating,
  onBack,
  onReturnToYears,
  onSelectExerciseCount,
  onToggleAdvanced,
  onTitleChange,
  onZeroResultsAction,
  onCreateSession,
}: SessionBuilderReviewStepProps) {
  return (
    <>
      <div className="builder-stage-head">
        <div>
          <p className="page-kicker">الخطوة 4</p>
          <h2>الحجم</h2>
        </div>
        <button type="button" className="btn-secondary" onClick={onReturnToYears}>
          العودة للسنوات
        </button>
      </div>

      <div className="builder-summary-pills">
        {selectedSubject ? <span>{selectedSubject.name}</span> : null}
        {topicSelectionComplete ? <span>{selectedTopicLabel}</span> : null}
        {builderReadyToPreview ? <span>{selectedYearsLabel}</span> : null}
      </div>

      <div className="builder-size-grid">
        {SESSION_BUILDER_SIZE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`builder-choice-card builder-size-card${
              exerciseCount === option.value ? " active" : ""
            }`}
            onClick={() => onSelectExerciseCount(option.value)}
            disabled={option.value > maxExerciseCount}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            <small>{option.helper}</small>
          </button>
        ))}
      </div>

      <section className="builder-advanced-panel">
        <button
          type="button"
          className="builder-advanced-toggle"
          onClick={onToggleAdvanced}
        >
          <span>خيارات إضافية</span>
          <strong>{advancedOpen ? "إخفاء" : "إظهار"}</strong>
        </button>

        {advancedOpen ? (
          <div className="builder-advanced-grid">
            <div className="builder-subsection">
              <h3>عدد مخصص</h3>
              <div className="chip-grid">
                {[4, 6, 8, 10, 12].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={
                      exerciseCount === count
                        ? "choice-chip active"
                        : "choice-chip"
                    }
                    onClick={() => onSelectExerciseCount(Math.min(count, maxExerciseCount))}
                    disabled={count > maxExerciseCount}
                  >
                    {count} تمارين
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-subsection">
              <h3>اسم الجلسة</h3>
              <label className="field">
                <span>اختياري</span>
                <input
                  type="text"
                  placeholder="اسم الجلسة"
                  value={title}
                  onChange={(event) => onTitleChange(event.target.value)}
                />
              </label>
            </div>
          </div>
        ) : null}
      </section>

      {previewLoading && !preview ? (
        <section className="builder-assembling-state">
          <span className="builder-loading-orb" aria-hidden="true" />
          <div>
            <strong>جاري التجميع</strong>
            <p>تحديث المعاينة</p>
          </div>
        </section>
      ) : null}

      {zeroResultsGuidance ? (
        <section className="builder-wizard-alert" role="status">
          <h3>{zeroResultsGuidance.title}</h3>
          <p>{zeroResultsGuidance.description}</p>
          {zeroResultsGuidance.actionLabel && zeroResultsGuidance.action ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={onZeroResultsAction}
            >
              {zeroResultsGuidance.actionLabel}
            </button>
          ) : null}
        </section>
      ) : null}

      {preview ? (
        <div className="builder-preview-stack">
          {previewLoading ? (
            <p className="builder-preview-inline-status">جاري التحديث</p>
          ) : null}

          <div className="builder-stat-grid">
            <article>
              <strong>{preview.matchingExerciseCount}</strong>
              <span>تمارين مطابقة</span>
            </article>
            <article>
              <strong>{preview.matchingSujetCount}</strong>
              <span>مواضيع متاحة</span>
            </article>
            <article>
              <strong>{selectedYears.length}</strong>
              <span>سنوات في النطاق</span>
            </article>
          </div>

          {preview.matchingExerciseCount > 0 ? (
            <>
              <section className="builder-preview-card builder-preview-summary-card">
                <h3>الخطة</h3>
                <p>{planText}</p>
              </section>

              <section className="builder-preview-card">
                <h3>عينة</h3>
                <div className="builder-preview-exercises">
                  {preview.sampleExercises.map((exercise) => (
                    <article
                      key={`${exercise.exerciseNodeId}:${exercise.examId}`}
                      className="builder-preview-exercise"
                    >
                      <div>
                        <strong>
                          {exercise.year} · {exercise.sujetLabel} · التمرين{" "}
                          {exercise.orderIndex}
                        </strong>
                        <p>
                          {exercise.stream.name} ·{" "}
                          {formatSessionType(exercise.sessionType)}
                        </p>
                      </div>
                      <span>
                        {exercise.questionCount} أسئلة
                        {exercise.title ? ` · ${exercise.title}` : ""}
                      </span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="builder-preview-card">
                <h3>السنوات</h3>
                <div className="preview-distribution-list">
                  {preview.yearsDistribution.map((item) => (
                    <div key={item.year} className="preview-distribution-row">
                      <div>
                        <strong>{item.year}</strong>
                        <span>{item.matchingExerciseCount} تمرين</span>
                      </div>
                      <div className="preview-bar">
                        <span
                          style={{
                            width: `${Math.max(
                              10,
                              (item.matchingExerciseCount /
                                Math.max(preview.matchingExerciseCount, 1)) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="builder-stage-actions">
        <button type="button" className="btn-secondary" onClick={onBack}>
          رجوع
        </button>
        <button
          type="button"
          data-testid="session-builder-create"
          className="btn-primary"
          onClick={onCreateSession}
          disabled={
            !builderReadyToPreview ||
            creating ||
            previewLoading ||
            !preview?.matchingExerciseCount
          }
        >
          {creating
            ? "جاري الإنشاء..."
            : previewLoading
              ? "جاري التحديث..."
              : "إنشاء الجلسة"}
        </button>
      </div>
    </>
  );
}
