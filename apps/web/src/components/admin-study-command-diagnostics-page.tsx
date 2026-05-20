import type {
  StudyCommandDiagnosticsBucket,
  StudyCommandDiagnosticsResponse,
  StudyCommandStarterMode,
} from "@bac-bank/contracts/study-command";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const modeLabels: Partial<Record<StudyCommandStarterMode, string>> = {
  SCHOOL_TEST_PREP: "School test",
  TUTOR_REPLAY: "Tutor replay",
  BAC_TRAINING: "BAC training",
  LESSON_UNDERSTANDING: "Lesson",
  MEMORIZATION_REVIEW: "Memorization",
  MISTAKE_REPAIR: "Mistake repair",
  SIMULATION: "Simulation",
  LAB_EXPLORATION: "Lab",
  LIBRARY_SEARCH: "Library",
  CONTINUE_SESSION: "Continue",
};

const diagnosticKeyLabels: Record<string, string> = {
  READY: "Ready",
  NEEDS_CONTENT: "Needs content",
  UNAVAILABLE: "Unavailable",
  CREATE_STUDY_SESSION: "Creates sessions",
  OPEN_ROUTE: "Opens route",
  SUCCESS: "AI success",
  "SKIPPED:DISABLED": "AI disabled",
  "FAILED:LOW_CONFIDENCE": "Low confidence",
  "FAILED:INVALID_OUTPUT": "Invalid AI output",
  "FAILED:TIMEOUT": "AI timeout",
  "FAILED:PROVIDER_ERROR": "Provider error",
};

function formatPercent(numerator: number, denominator: number) {
  if (!denominator) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat("en-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBucketKey(key: string) {
  return (
    diagnosticKeyLabels[key] ??
    modeLabels[key as StudyCommandStarterMode] ??
    key.replaceAll("_", " ")
  );
}

function DiagnosticsBucketList({
  title,
  buckets,
  emptyLabel,
}: {
  title: string;
  buckets: StudyCommandDiagnosticsBucket[];
  emptyLabel: string;
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <section className="admin-command-panel">
      <h2>{title}</h2>
      {buckets.length ? (
        <div className="admin-command-bucket-list">
          {buckets.map((bucket) => (
            <div key={bucket.key} className="admin-command-bucket-row">
              <div>
                <strong>{formatBucketKey(bucket.key)}</strong>
                <span>{bucket.count}</span>
              </div>
              <div aria-hidden="true">
                <span style={{ width: `${(bucket.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-command-empty">{emptyLabel}</p>
      )}
    </section>
  );
}

export function AdminStudyCommandDiagnosticsPage({
  diagnostics,
}: {
  diagnostics?: StudyCommandDiagnosticsResponse;
}) {
  if (!diagnostics) {
    return (
      <section className="admin-study-command-page">
        <header className="admin-page-head">
          <div className="admin-page-intro">
            <p className="page-kicker">Study Command</p>
            <h1>Command brain</h1>
            <p>
              Diagnostics are unavailable right now. The student app keeps
              working because Study Command falls back to deterministic routing.
            </p>
          </div>
        </header>
        <div className="admin-command-panel">
          <p className="admin-command-empty">
            Reload once the API is reachable to inspect routing quality,
            accepted proposals, and missing-content pressure.
          </p>
        </div>
      </section>
    );
  }

  const acceptanceRate = formatPercent(
    diagnostics.summary.accepted,
    diagnostics.summary.proposals,
  );
  const sessionCreationRate = formatPercent(
    diagnostics.summary.createdStudySessions,
    diagnostics.summary.accepted,
  );
  const clarificationRate = formatPercent(
    diagnostics.summary.clarifications,
    diagnostics.sampledEventCount,
  );
  const missingContentCount = diagnostics.missingContentSignals.reduce(
    (sum, signal) => sum + signal.count,
    0,
  );
  const metricCards = [
    {
      label: "Acceptance",
      value: acceptanceRate,
      detail: `${diagnostics.summary.accepted}/${diagnostics.summary.proposals} proposals`,
      icon: Target,
    },
    {
      label: "Created sessions",
      value: sessionCreationRate,
      detail: `${diagnostics.summary.createdStudySessions} real sessions`,
      icon: CheckCircle2,
    },
    {
      label: "Clarifications",
      value: clarificationRate,
      detail: `${diagnostics.summary.clarifications} one-question turns`,
      icon: GitBranch,
    },
    {
      label: "Missing content",
      value: String(missingContentCount),
      detail: `${diagnostics.missingContentSignals.length} grouped signals`,
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="admin-study-command-page">
      <header className="admin-page-head">
        <div className="admin-page-intro">
          <p className="page-kicker">Study Command</p>
          <h1>Command brain</h1>
          <p>
            Routing quality, proposal outcomes, AI fallback behavior, and
            content gaps from safe metadata only.
          </p>
        </div>
        <div className="admin-page-meta-row">
          <span className="admin-page-meta-pill">
            <strong>{diagnostics.windowDays}</strong> day window
          </span>
          <span className="admin-page-meta-pill">
            <strong>{diagnostics.sampledEventCount}</strong> events
          </span>
          <span className="admin-page-meta-pill">
            {formatGeneratedAt(diagnostics.generatedAt)}
          </span>
        </div>
      </header>

      <div className="admin-command-metric-grid">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="admin-command-metric-card">
              <span aria-hidden="true">
                <Icon size={19} strokeWidth={2.1} />
              </span>
              <div>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
            </article>
          );
        })}
      </div>

      <div className="admin-command-diagnostics-grid">
        <DiagnosticsBucketList
          title="Modes"
          buckets={diagnostics.modes}
          emptyLabel="No routed modes yet."
        />
        <DiagnosticsBucketList
          title="Availability"
          buckets={diagnostics.availability}
          emptyLabel="No availability checks yet."
        />
        <DiagnosticsBucketList
          title="Actions"
          buckets={diagnostics.actions}
          emptyLabel="No accepted actions yet."
        />
        <DiagnosticsBucketList
          title="AI routing"
          buckets={diagnostics.aiRouting}
          emptyLabel="No AI routing telemetry yet."
        />
      </div>

      <div className="admin-command-diagnostics-grid">
        <DiagnosticsBucketList
          title="Top subjects"
          buckets={diagnostics.topSubjects}
          emptyLabel="No subject signals yet."
        />
        <DiagnosticsBucketList
          title="Top topics"
          buckets={diagnostics.topTopics}
          emptyLabel="No topic signals yet."
        />
      </div>

      <section className="admin-command-panel">
        <div className="admin-command-panel-head">
          <div>
            <h2>Missing-content pressure</h2>
            <p>
              These are grouped from NEEDS_CONTENT proposals and should feed the
              content backlog, not hidden fallbacks.
            </p>
          </div>
          <Badge variant="outline">
            <Layers3 size={13} strokeWidth={2} aria-hidden="true" />
            {diagnostics.missingContentSignals.length}
          </Badge>
        </div>

        {diagnostics.missingContentSignals.length ? (
          <div className="admin-command-signal-list">
            {diagnostics.missingContentSignals.map((signal) => (
              <article key={signal.key} className="admin-command-signal-row">
                <span aria-hidden="true">
                  <Sparkles size={16} strokeWidth={2.1} />
                </span>
                <div>
                  <strong>
                    {signal.mode ? formatBucketKey(signal.mode) : "Unknown"} ·{" "}
                    {signal.subjectCode ?? "No subject"}
                  </strong>
                  <p>
                    {signal.topicCodes.length
                      ? signal.topicCodes.join("، ")
                      : "No mapped topic"}{" "}
                    · {signal.count} requests ·{" "}
                    {formatGeneratedAt(signal.lastSeenAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-command-empty">
            No missing-content signals in the current window.
          </p>
        )}
      </section>

      <section className="admin-command-panel admin-command-guardrail">
        <span aria-hidden="true">
          <BrainCircuit size={18} strokeWidth={2.1} />
        </span>
        <div>
          <h2>Guardrail</h2>
          <p>
            This page intentionally reports counts, modes, safe hrefs, subjects,
            topics, and AI status only. It does not expose raw student commands,
            transcripts, prompts, source blobs, or API credentials.
          </p>
        </div>
      </section>
    </section>
  );
}
