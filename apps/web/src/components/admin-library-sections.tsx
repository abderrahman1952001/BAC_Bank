import Link from "next/link";
import { EmptyState } from "@/components/study-shell";
import { formatPublishedSessionLabel } from "@/lib/admin-library";
import { type CatalogResponse, type ExamResponse } from "@/lib/study-api";

type StreamOption = CatalogResponse["streams"][number];
type SubjectOption = StreamOption["subjects"][number];
type YearOption = SubjectOption["years"][number];

type AdminLibraryFiltersRailProps = {
  catalog: CatalogResponse | null;
  stream: StreamOption | null;
  subject: SubjectOption | null;
  selectedStreamCode: string;
  selectedSubjectCode: string;
  selectedYear: number | null;
  onClearStream: () => void;
  onClearSubject: () => void;
  onClearYear: () => void;
  onSelectStream: (streamCode: string) => void;
  onSelectSubject: (subjectCode: string) => void;
  onSelectYear: (year: number) => void;
};

type AdminLibrarySujetsPanelProps = {
  stream: StreamOption | null;
  subject: SubjectOption | null;
  selectedYear: number | null;
  yearEntry: YearOption | null;
  sujetsCount: number;
  selectionPrompt: string;
  selectedExamId: string | null;
  selectedSujetNumber: number | null;
  onSelectSujet: (examId: string, sujetNumber: number) => void;
};

type AdminLibraryPreviewPanelProps = {
  studentPreviewHref: string | null;
  startingRevision: boolean;
  canStartRevision: boolean;
  onStartRevision: () => void;
  hasActiveRevisionDraft: boolean;
  revisionError: string | null;
  loadingExam: boolean;
  examError: string | null;
  selectedExam: ExamResponse | null;
  selectedSujetLabel: string | null;
  onRetryPreview: () => void;
};

export function AdminLibraryFiltersRail({
  catalog,
  stream,
  subject,
  selectedStreamCode,
  selectedSubjectCode,
  selectedYear,
  onClearStream,
  onClearSubject,
  onClearYear,
  onSelectStream,
  onSelectSubject,
  onSelectYear,
}: AdminLibraryFiltersRailProps) {
  return (
    <aside className="study-sidebar">
      <div className="study-sidebar-header">
        <h2>Catalog</h2>
      </div>

      <div className="library-filter-group">
        <div className="library-filter-head">
          <h3>Stream</h3>
          {selectedStreamCode ? (
            <button
              type="button"
              className="library-clear-button"
              onClick={onClearStream}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="chip-grid">
          {(catalog?.streams ?? []).map((item) => (
            <button
              key={item.code}
              type="button"
              className={
                item.code === selectedStreamCode
                  ? "choice-chip active"
                  : "choice-chip"
              }
              onClick={() => onSelectStream(item.code)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="library-filter-group">
        <div className="library-filter-head">
          <h3>Subject</h3>
          {selectedSubjectCode ? (
            <button
              type="button"
              className="library-clear-button"
              onClick={onClearSubject}
            >
              Clear
            </button>
          ) : null}
        </div>
        {!stream ? (
          <p className="muted-text">Select a stream.</p>
        ) : (
          <div className="chip-grid">
            {stream.subjects.map((item) => (
              <button
                key={item.code}
                type="button"
                className={
                  item.code === selectedSubjectCode
                    ? "choice-chip active"
                    : "choice-chip"
                }
                onClick={() => onSelectSubject(item.code)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="library-filter-group">
        <div className="library-filter-head">
          <h3>Year</h3>
          {selectedYear ? (
            <button
              type="button"
              className="library-clear-button"
              onClick={onClearYear}
            >
              Clear
            </button>
          ) : null}
        </div>
        {!subject ? (
          <p className="muted-text">Select a subject.</p>
        ) : (
          <div className="library-year-list">
            {subject.years.map((item) => (
              <button
                key={item.year}
                type="button"
                className={
                  item.year === selectedYear
                    ? "library-year-button active"
                    : "library-year-button"
                }
                onClick={() => onSelectYear(item.year)}
              >
                <strong>{item.year}</strong>
                <span>{item.sujets.length} sujets</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

export function AdminLibrarySujetsPanel({
  stream,
  subject,
  selectedYear,
  yearEntry,
  sujetsCount,
  selectionPrompt,
  selectedExamId,
  selectedSujetNumber,
  onSelectSujet,
}: AdminLibrarySujetsPanelProps) {
  return (
    <section className="library-panel">
      <div className="library-panel-head">
        <h2>Published Sujets</h2>
        {subject && selectedYear ? (
          <span className="admin-page-meta-pill">
            <strong>{sujetsCount}</strong> sujet{sujetsCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {!stream || !subject || !selectedYear ? (
        <EmptyState
          title="Finish the catalog path"
          description={selectionPrompt}
        />
      ) : yearEntry && yearEntry.sujets.length ? (
        <div className="library-sujet-grid">
          {yearEntry.sujets.map((item) => {
            const isActive =
              item.examId === selectedExamId &&
              item.sujetNumber === selectedSujetNumber;

            return (
              <button
                key={`${item.examId}:${item.sujetNumber}`}
                type="button"
                className={
                  isActive ? "library-sujet-card active" : "library-sujet-card"
                }
                onClick={() => onSelectSujet(item.examId, item.sujetNumber)}
              >
                <div className="library-sujet-card-top">
                  <strong>{item.label}</strong>
                  <span>{item.exerciseCount} exercises</span>
                </div>
                <p>{formatPublishedSessionLabel(item.sessionType)}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No published sujets here yet"
          description="Try another year or subject to find a live paper to revise."
        />
      )}
    </section>
  );
}

export function AdminLibraryPreviewPanel({
  studentPreviewHref,
  startingRevision,
  canStartRevision,
  onStartRevision,
  hasActiveRevisionDraft,
  revisionError,
  loadingExam,
  examError,
  selectedExam,
  selectedSujetLabel,
  onRetryPreview,
}: AdminLibraryPreviewPanelProps) {
  return (
    <section className="library-panel library-preview-panel">
      <div className="library-panel-head">
        <h2>Paper Preview</h2>
        <div className="table-actions">
          {studentPreviewHref ? (
            <Link href={studentPreviewHref} className="btn-secondary">
              Student Preview
            </Link>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            onClick={onStartRevision}
            disabled={startingRevision || !canStartRevision}
          >
            {startingRevision
              ? "Opening…"
              : hasActiveRevisionDraft
                ? "Resume Revision Draft"
                : "Open Revision Draft"}
          </button>
        </div>
      </div>

      {revisionError ? <p className="error-text">{revisionError}</p> : null}

      {loadingExam ? (
        <div className="library-preview-layout">
          <div className="study-skeleton block" />
          <div className="study-skeleton block tall" />
        </div>
      ) : examError ? (
        <EmptyState
          title="Preview unavailable"
          description={examError}
          action={
            <button
              type="button"
              className="btn-secondary"
              onClick={onRetryPreview}
            >
              Retry
            </button>
          }
        />
      ) : selectedExam ? (
        <div className="library-preview-layout">
          <article className="library-preview-summary">
            <div className="study-meta-row">
              <span className="study-meta-pill">
                <strong>Session</strong>
                <span>
                  {formatPublishedSessionLabel(selectedExam.sessionType)}
                </span>
              </span>
              <span className="study-meta-pill">
                <strong>Duration</strong>
                <span>{selectedExam.durationMinutes} min</span>
              </span>
            </div>

            <div className="library-preview-copy">
              <h3>{selectedExam.selectedSujetLabel ?? selectedSujetLabel}</h3>
              <p>
                {selectedExam.subject.name} · {selectedExam.stream.name} ·{" "}
                {selectedExam.year}
              </p>
              <p className="muted-text">
                Opening a revision creates or resumes a draft for the shared
                canonical paper, then sends you to the ingestion review editor
                for validation and republishing.
              </p>
              {hasActiveRevisionDraft ? (
                <p className="muted-text">
                  An active revision draft already exists for this paper, so
                  opening it will resume that work instead of creating a second
                  draft.
                </p>
              ) : null}
              {selectedExam.officialSourceReference ? (
                <p className="muted-text">
                  Source reference: {selectedExam.officialSourceReference}
                </p>
              ) : null}
            </div>
          </article>

          <div className="library-exercise-list">
            {selectedExam.exercises.map((exercise) => (
              <article key={exercise.id} className="library-exercise-card">
                <div>
                  <strong>Exercise {exercise.orderIndex}</strong>
                  <span>{exercise.questionCount} questions</span>
                </div>
                <p>{exercise.title ?? "Untitled exercise"}</p>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Choose a published sujet"
          description="Its live structure and exercises will appear here before you open the revision flow."
        />
      )}
    </section>
  );
}
