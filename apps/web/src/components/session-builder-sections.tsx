import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { SubjectIcon } from "@/components/subject-icon";
import { EmptyState } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectionCard } from "@/components/ui/selection-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
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
} from "@/lib/study-api";
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
  timingEnabled: boolean;
  previewLoading: boolean;
  preview: SessionPreviewResponse | null;
  selectedYears: number[];
  planText: string;
  sessionKindLabel: string;
  zeroResultsGuidance: BuilderZeroResultsGuidance | null;
  startBlocked: boolean;
  startBlockedMessage: string | null;
  creating: boolean;
  onBack: () => void;
  onReturnToYears: () => void;
  onSelectExerciseCount: (count: number) => void;
  onSetTimingEnabled: (enabled: boolean) => void;
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
          <Button
            key={item.step}
            type="button"
            variant="ghost"
            className={cn(
              "h-auto min-w-0 flex-col items-stretch justify-start gap-2 rounded-none bg-transparent p-0 text-right shadow-none hover:bg-transparent hover:text-foreground",
              !isEnabled && "opacity-45",
            )}
            onClick={() => onGoToStep(item.step)}
            disabled={!isEnabled}
            aria-current={isActive ? "step" : undefined}
          >
            <span
              className="relative h-2 overflow-hidden rounded-full bg-primary/10"
              aria-hidden="true"
            >
              {isActive || isCompleted ? (
                <motion.span
                  className="absolute inset-0 origin-right rounded-full bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{
                    duration: 0.28,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                />
              ) : null}
            </span>
            <span>
              <strong
                className={cn(
                  "text-sm text-muted-foreground",
                  (isActive || isCompleted) && "text-primary",
                )}
              >
                {item.label}
              </strong>
            </span>
          </Button>
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
            <SelectionCard
              key={subject.code}
              type="button"
              active={subjectCode === subject.code}
              className="min-h-44 content-start border-primary/20 bg-secondary/60"
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
            </SelectionCard>
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
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5"
          onClick={onBack}
        >
          تغيير المادة
        </Button>
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
          <SelectionCard
            type="button"
            active={topicSelectionMode === "all"}
            className="min-h-24 w-full content-center"
            onClick={() => onChangeTopicMode("all")}
          >
            <strong>كل المحاور</strong>
          </SelectionCard>

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
                  <SelectionCard
                    key={chapter.code}
                    type="button"
                    active={chapterActive}
                    className="min-h-44 content-start border-primary/20 bg-secondary/60"
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
                  </SelectionCard>
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
                        <FilterChip
                          key={topic.code}
                          type="button"
                          active={
                            topicSelectionMode === "custom" &&
                            topicCodes.includes(topic.code)
                          }
                          onClick={() => onToggleTopic(topic.code)}
                        >
                          {topic.name}
                        </FilterChip>
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
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={onBack}
        >
          رجوع
        </Button>
        <Button
          type="button"
          data-testid="session-builder-next-topics"
          className="h-11 rounded-full px-5"
          onClick={onNext}
          disabled={!topicSelectionComplete}
        >
          السنوات
        </Button>
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
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5"
          onClick={onReturnToTopics}
        >
          العودة للمحاور
        </Button>
      </div>

      <div className="builder-summary-pills">
        {selectedSubject ? <span>{selectedSubject.name}</span> : null}
        {topicSelectionComplete ? <span>{selectedTopicLabel}</span> : null}
      </div>

      <div className="builder-year-grid">
        {YEAR_MODE_OPTIONS.map((option) => (
          <SelectionCard
            key={option.value}
            type="button"
            active={yearMode === option.value}
            className="min-h-28"
            onClick={() => onSetYearMode(option.value)}
          >
            <strong>{option.label}</strong>
            <span>{option.value === "custom" ? "مخصص" : "سريع"}</span>
          </SelectionCard>
        ))}
      </div>

      {yearMode === "custom" && filters.years.length ? (
        <div className="builder-year-range">
          <label className="field">
            <span>من</span>
            <NativeSelect
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
            </NativeSelect>
          </label>

          <label className="field">
            <span>إلى</span>
            <NativeSelect
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
            </NativeSelect>
          </label>
        </div>
      ) : null}

      <section className="builder-advanced-panel">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between rounded-2xl px-4 py-3 text-right"
          onClick={onToggleAdvanced}
        >
          <span>خيارات إضافية</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              advancedOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>

        {advancedOpen ? (
          <div className="builder-advanced-grid">
            <div className="builder-subsection">
              <h3>الشعبة</h3>
              <div className="chip-grid">
                <FilterChip
                  type="button"
                  active={!effectiveStreamCodes.length}
                  onClick={onOpenAllStreams}
                  disabled={!subjectCode}
                >
                  كل الشعب
                </FilterChip>
                {availableStreams.map((stream) => (
                  <FilterChip
                    key={stream.code}
                    type="button"
                    active={effectiveStreamCodes.includes(stream.code)}
                    onClick={() => onToggleStream(stream.code)}
                    disabled={!subjectCode}
                  >
                    {stream.name}
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="builder-subsection">
              <h3>نوع الدورة</h3>
              <div className="chip-grid">
                {filters.sessionTypes.map((type) => (
                  <FilterChip
                    key={type}
                    type="button"
                    active={sessionTypes.includes(type)}
                    onClick={() => onToggleSessionType(type)}
                  >
                    {formatSessionType(type)}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="builder-stage-actions">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={onBack}
        >
          رجوع
        </Button>
        <Button
          type="button"
          data-testid="session-builder-next-years"
          className="h-11 rounded-full px-5"
          onClick={onNext}
          disabled={!yearSelectionComplete}
        >
          الحجم
        </Button>
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
  timingEnabled,
  previewLoading,
  preview,
  selectedYears,
  planText,
  sessionKindLabel,
  zeroResultsGuidance,
  startBlocked,
  startBlockedMessage,
  creating,
  onBack,
  onReturnToYears,
  onSelectExerciseCount,
  onSetTimingEnabled,
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
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-full px-5"
          onClick={onReturnToYears}
        >
          العودة للسنوات
        </Button>
      </div>

      <div className="builder-summary-pills">
        {selectedSubject ? <span>{selectedSubject.name}</span> : null}
        {topicSelectionComplete ? <span>{selectedTopicLabel}</span> : null}
        {builderReadyToPreview ? <span>{selectedYearsLabel}</span> : null}
        <span>{sessionKindLabel}</span>
      </div>

      <div className="builder-size-grid">
        {SESSION_BUILDER_SIZE_OPTIONS.map((option) => (
          <SelectionCard
            key={option.value}
            type="button"
            active={exerciseCount === option.value}
            className="min-h-32 content-start [&_strong]:text-2xl"
            onClick={() => onSelectExerciseCount(option.value)}
            disabled={option.value > maxExerciseCount}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            <small>{option.helper}</small>
          </SelectionCard>
        ))}
      </div>

      <section className="builder-advanced-panel">
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between rounded-2xl px-4 py-3 text-right"
          onClick={onToggleAdvanced}
        >
          <span>خيارات إضافية</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              advancedOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>

        {advancedOpen ? (
          <div className="builder-advanced-grid">
            <div className="builder-subsection">
              <h3>عدد مخصص</h3>
              <div className="chip-grid">
                {[1, 2, 3, 4, 6].map((count) => (
                  <FilterChip
                    key={count}
                    type="button"
                    active={exerciseCount === count}
                    onClick={() => onSelectExerciseCount(Math.min(count, maxExerciseCount))}
                    disabled={count > maxExerciseCount}
                  >
                    {count} تمارين
                  </FilterChip>
                ))}
              </div>
            </div>

            <div className="builder-subsection">
              <h3>اسم الجلسة</h3>
              <label className="field">
                <span>اختياري</span>
                <Input
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

      <section className="builder-preview-card">
        <h3>تحليل الوقت</h3>
        <p>اختياري. عند التفعيل سنعرض لك ملاحظات وصفية قصيرة بعد كل تمرين.</p>
        <ToggleGroup
          type="single"
          value={timingEnabled ? "on" : "off"}
          onValueChange={(value) => {
            if (value === "on") {
              onSetTimingEnabled(true);
            }

            if (value === "off") {
              onSetTimingEnabled(false);
            }
          }}
          variant="outline"
          className="flex-wrap"
        >
          <ToggleGroupItem value="on" className="h-10 rounded-full px-4">
            فعّل التتبع
          </ToggleGroupItem>
          <ToggleGroupItem value="off" className="h-10 rounded-full px-4">
            بدون تتبع
          </ToggleGroupItem>
        </ToggleGroup>
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
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-5"
              onClick={onZeroResultsAction}
            >
              {zeroResultsGuidance.actionLabel}
            </Button>
          ) : null}
        </section>
      ) : null}

      {startBlocked && startBlockedMessage ? (
        <section className="builder-wizard-alert" role="status">
          <h3>البدء غير متاح حالياً</h3>
          <p>{startBlockedMessage}</p>
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
                <p>{sessionKindLabel}</p>
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
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          onClick={onBack}
        >
          رجوع
        </Button>
        <Button
          type="button"
          data-testid="session-builder-create"
          className="h-11 rounded-full px-5"
          onClick={onCreateSession}
          disabled={
            !builderReadyToPreview ||
            startBlocked ||
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
        </Button>
      </div>
    </>
  );
}
