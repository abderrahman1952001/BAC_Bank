import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { LabMissionPanel } from "@/components/lab-mission-panel";
import { StudentNavbar } from "@/components/student-navbar";
import { StudyBadge, StudyHeader, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import type { LabToolMissionsResponse, LabToolSummary } from "@/lib/lab-api";
import {
  listLabSubjectGroups,
  listLabToolsForSubjectCode,
  type LabTool,
} from "@/lib/lab-surface";

function LabToolInstrument({ tool }: { tool: LabTool }) {
  const isDnaTool = tool.id === "dna-to-protein";

  return (
    <div
      className={`instrument-visual lab-tool-visual ${
        isDnaTool ? "is-biology" : "is-function"
      }`}
      aria-hidden="true"
    >
      {isDnaTool ? (
        <svg
          className="instrument-vector lab-tool-vector"
          viewBox="0 0 240 150"
          fill="none"
        >
          <path d="M82 18c60 0 78 114 78 114" />
          <path d="M158 18c-60 0-78 114-78 114" />
          <path d="M92 38h56" />
          <path d="M84 66h72" />
          <path d="M84 94h72" />
          <path d="M92 122h56" />
        </svg>
      ) : (
        <svg
          className="instrument-vector lab-tool-vector"
          viewBox="0 0 240 150"
          fill="none"
        >
          <path d="M28 106c38-88 62-88 92 0s56 88 92 0" />
          <path d="M28 108h184" />
          <path d="M120 24v104" />
          <path d="M54 76h132" />
        </svg>
      )}

      <div className="instrument-mini-ui lab-tool-mini">
        {isDnaTool ? (
          <>
            <span>A</span>
            <span>T</span>
            <span>C</span>
            <span>G</span>
          </>
        ) : (
          <>
            <span>f(x)</span>
            <span>f&apos;</span>
            <span>0</span>
          </>
        )}
      </div>
    </div>
  );
}

export function LabHomePage({
  initialTools,
  initialToolMissions,
  requestedSubjectCode,
}: {
  initialTools?: LabToolSummary[];
  initialToolMissions?: Record<string, LabToolMissionsResponse>;
  requestedSubjectCode?: string | null;
}) {
  const groups = listLabSubjectGroups();
  const requestedSubjectTools = listLabToolsForSubjectCode(
    requestedSubjectCode,
  );
  const requestedSubjectUnavailable = Boolean(
    requestedSubjectCode && requestedSubjectTools.length === 0,
  );
  const toolEntries = groups.flatMap((group) =>
    group.tools.map((tool) => ({
      group,
      tool,
    })),
  );
  const toolCount = groups.reduce((sum, group) => sum + group.tools.length, 0);
  const missionCount =
    initialTools?.reduce((sum, tool) => sum + tool.missionCount, 0) ?? 0;
  const completedMissionCount =
    initialTools?.reduce((sum, tool) => sum + tool.completedMissionCount, 0) ??
    0;

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame lab-page">
        <StudyHeader
          eyebrow="المختبر"
          title="مختبر الأدوات"
          meta={[
            { label: "الأدوات", value: `${toolCount}` },
            { label: "المواد", value: `${groups.length}` },
            ...(initialTools
              ? [
                  {
                    label: "المهمات",
                    value: `${completedMissionCount}/${missionCount}`,
                  },
                ]
              : []),
          ]}
        />

        {requestedSubjectUnavailable ? (
          <section className="builder-wizard-alert" role="status">
            <h3>لا يوجد مختبر جاهز لهذه المادة بعد</h3>
            <p>
              طلب Study Command مادة {requestedSubjectCode}. الأدوات المنشورة
              الآن تظهر بالأسفل فقط.
            </p>
          </section>
        ) : null}

        {initialTools === undefined ? (
          <div className="hub-sync-notice">
            <p>تعذر تحميل تقدم مهمات المختبر الآن. الأدوات الأساسية متاحة.</p>
          </div>
        ) : null}

        <div className="lab-tool-grid">
          {toolEntries.map(({ group, tool }) => (
            <article
              key={tool.id}
              className={`instrument-card lab-tool-card lab-tool-card-${tool.id}`}
            >
              <LabToolInstrument tool={tool} />
              <div className="lab-tool-card-main">
                <div className="lab-tool-card-head">
                  <div>
                    <p className="page-kicker">{group.title}</p>
                    <h3>{tool.title}</h3>
                  </div>
                  <StudyBadge tone="success">جاهز</StudyBadge>
                </div>
                <p>{tool.description}</p>
                <Button asChild className="h-11 rounded-full px-5">
                  <Link href={tool.href}>
                    افتح الأداة
                    <ArrowUpLeft size={17} strokeWidth={2.1} />
                  </Link>
                </Button>
              </div>

              <LabMissionPanel
                missions={initialToolMissions?.[tool.id]?.missions ?? []}
                toolHref={tool.href}
              />
            </article>
          ))}
        </div>
      </section>
    </StudyShell>
  );
}
