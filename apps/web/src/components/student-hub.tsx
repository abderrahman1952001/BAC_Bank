"use client";

import {
  parseStudyCommandProposalResponse,
  type StudyCommandCreateSessionRequest,
  type StudyCommandProposal,
} from "@bac-bank/contracts/study-command";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpLeft,
  BookOpen,
  Brain,
  CircleStop,
  Flame,
  FlaskConical,
  Layers3,
  Map,
  Mic,
  PenTool,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import {
  type CSSProperties,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { StudentNavbar } from "@/components/student-navbar";
import { useAuthSession } from "@/components/auth-provider";
import {
  HubMistakesSection,
  HubRecentActivitySection,
  HubCurriculumJourneySection,
  HubSavedExercisesSection,
  HubWeakPointsSection,
} from "@/components/student-hub-sections";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  API_BASE_URL,
  fetchJson,
  formatStudySessionKind,
  parseCreateSessionResponse,
  parseSessionPreviewResponse,
  type CatalogResponse,
  type CreateSessionResponse,
  type FiltersResponse,
  type MyMistakesResponse,
  type RecentExerciseStatesResponse,
  type CurriculumJourneysResponse,
  type RecentExamActivitiesResponse,
  type RecentStudySessionsResponse,
  type SessionPreviewResponse,
  type WeakPointInsightsResponse,
} from "@/lib/study-api";
import type { DueFlashcardsResponse } from "@/lib/flashcards-api";
import type { LabToolsResponse } from "@/lib/lab-api";
import {
  describeFlashcardSource,
  getFlashcardContextLabel,
} from "@/lib/flashcards-surface";
import {
  buildHubActivityItems,
  buildCurriculumJourneyItems,
  buildMyMistakeItems,
  buildSavedExerciseItems,
  buildWeakPointItems,
  findActiveHubSession,
  studentHubStatusLabels,
  studentHubStatusTones,
} from "@/lib/student-hub";
import {
  buildStudyCommandStarters,
  buildStudyCommandMixedDrillFallbackRequest,
} from "@/lib/study-command";
import {
  STUDENT_LIBRARY_ROUTE,
  STUDENT_FLASHCARDS_ROUTE,
  STUDENT_LAB_ROUTE,
  STUDENT_TRAINING_ROUTE,
  buildStudentTrainingSessionRoute,
} from "@/lib/student-routes";
import { formatRelativeStudyTimestamp } from "@/lib/study-time";

export function StudentHub({
  initialRecentStudySessions,
  initialRecentExamActivities,
  initialRecentExerciseStates,
  initialMyMistakes,
  initialCurriculumJourneys,
  initialWeakPointInsights,
  initialDueFlashcards,
  initialLabTools,
  initialFilters,
  initialCatalog,
}: {
  initialRecentStudySessions?: RecentStudySessionsResponse["data"];
  initialRecentExamActivities?: RecentExamActivitiesResponse["data"];
  initialRecentExerciseStates?: RecentExerciseStatesResponse["data"];
  initialMyMistakes?: MyMistakesResponse["data"];
  initialCurriculumJourneys?: CurriculumJourneysResponse["data"];
  initialWeakPointInsights?: WeakPointInsightsResponse;
  initialDueFlashcards?: DueFlashcardsResponse["data"];
  initialLabTools?: LabToolsResponse["data"];
  initialFilters?: FiltersResponse;
  initialCatalog?: CatalogResponse;
}) {
  const router = useRouter();
  const [refreshingHub, startRefreshingHub] = useTransition();
  const [commandDraft, setCommandDraft] = useState("");
  const [commandProposal, setCommandProposal] =
    useState<StudyCommandProposal | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [creatingCommandSession, setCreatingCommandSession] = useState(false);
  const [voiceState, setVoiceState] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const { user } = useAuthSession();
  const weakPointInsightEnabled =
    user?.studyEntitlements.capabilities.weakPointInsight ??
    initialWeakPointInsights?.enabled ??
    false;
  const missingHubData =
    initialRecentStudySessions === undefined ||
    initialRecentExamActivities === undefined ||
    initialRecentExerciseStates === undefined ||
    initialMyMistakes === undefined ||
    initialCurriculumJourneys === undefined ||
    (weakPointInsightEnabled && initialWeakPointInsights === undefined);
  const sessions = useMemo<RecentStudySessionsResponse["data"]>(
    () => initialRecentStudySessions ?? [],
    [initialRecentStudySessions],
  );
  const examActivities = useMemo<RecentExamActivitiesResponse["data"]>(
    () => initialRecentExamActivities ?? [],
    [initialRecentExamActivities],
  );
  const recentExerciseStates = useMemo<RecentExerciseStatesResponse["data"]>(
    () => initialRecentExerciseStates ?? [],
    [initialRecentExerciseStates],
  );
  const myMistakes = useMemo<MyMistakesResponse["data"]>(
    () => initialMyMistakes ?? [],
    [initialMyMistakes],
  );
  const curriculumJourneys = useMemo<CurriculumJourneysResponse["data"]>(
    () => initialCurriculumJourneys ?? [],
    [initialCurriculumJourneys],
  );
  const weakPointInsights = useMemo<WeakPointInsightsResponse["data"]>(
    () => initialWeakPointInsights?.data ?? [],
    [initialWeakPointInsights],
  );
  const dueFlashcards = useMemo<DueFlashcardsResponse["data"]>(
    () => initialDueFlashcards ?? [],
    [initialDueFlashcards],
  );
  const labTools = useMemo<LabToolsResponse["data"]>(
    () => initialLabTools ?? [],
    [initialLabTools],
  );
  const hubUnavailable =
    !sessions.length &&
    !examActivities.length &&
    !recentExerciseStates.length &&
    !curriculumJourneys.length &&
    !weakPointInsights.length &&
    !labTools.length &&
    !myMistakes.length &&
    missingHubData;

  const activeSession = useMemo(
    () => findActiveHubSession(sessions),
    [sessions],
  );
  const latestSession = sessions[0] ?? null;
  const spotlightSession = activeSession ?? latestSession;
  const displayName = user?.username ?? "مِراس";
  const spotlightTitle =
    spotlightSession?.title ??
    (spotlightSession
      ? formatStudySessionKind(spotlightSession.kind)
      : "ابدأ جلسة مركزة اليوم");
  const spotlightMeta = spotlightSession
    ? [
        formatRelativeStudyTimestamp(
          spotlightSession.lastInteractedAt ?? spotlightSession.updatedAt,
        ),
        spotlightSession.family === "SIMULATION" &&
        spotlightSession.durationMinutes
          ? `${spotlightSession.durationMinutes} دقيقة`
          : `${spotlightSession.exerciseCount} تمارين`,
      ].join(" · ")
    : user?.stream?.name
      ? `${user.stream.name} · اختر مساراً مبنياً على هدفك`
      : "اختر مساراً مبنياً على هدفك";
  const activityItems = useMemo(
    () =>
      buildHubActivityItems({
        sessions,
        examActivities,
      }),
    [examActivities, sessions],
  );
  const savedExerciseItems = useMemo(
    () => buildSavedExerciseItems(recentExerciseStates),
    [recentExerciseStates],
  );
  const myMistakeItems = useMemo(
    () => buildMyMistakeItems(myMistakes),
    [myMistakes],
  );
  const weakPointItems = useMemo(
    () => buildWeakPointItems(weakPointInsights),
    [weakPointInsights],
  );
  const curriculumJourneyItems = useMemo(
    () => buildCurriculumJourneyItems(curriculumJourneys),
    [curriculumJourneys],
  );
  const labMissionCount = labTools.reduce(
    (sum, tool) => sum + tool.missionCount,
    0,
  );
  const completedLabMissionCount = labTools.reduce(
    (sum, tool) => sum + tool.completedMissionCount,
    0,
  );
  const hubMetrics = [
    {
      label: "جلسات",
      value: sessions.length.toString(),
    },
    {
      label: "محفوظات",
      value: savedExerciseItems.length.toString(),
    },
    {
      label: "أخطاء",
      value: myMistakeItems.length.toString(),
    },
    {
      label: "بطاقات",
      value: dueFlashcards.length.toString(),
    },
    {
      label: "مختبر",
      value: labMissionCount
        ? `${completedLabMissionCount}/${labMissionCount}`
        : "0",
    },
  ];
  const primaryWeakPoint = weakPointItems[0] ?? null;
  const primaryCurriculumJourney = curriculumJourneyItems[0] ?? null;
  const primaryMistake = myMistakeItems[0] ?? null;
  const primarySavedExercise = savedExerciseItems[0] ?? null;
  const primaryDueFlashcard = dueFlashcards[0] ?? null;
  const primaryLabTool =
    labTools.find((tool) => tool.inProgressMissionCount > 0) ??
    labTools.find((tool) => tool.completedMissionCount < tool.missionCount) ??
    null;
  const studyCommandContext = useMemo(
    () => ({
      sessions,
      recentExamActivities: examActivities,
      myMistakes,
      curriculumJourneys,
      weakPointInsights,
      dueFlashcards,
      labTools,
      filters: initialFilters ?? null,
      catalog: initialCatalog ?? null,
      userStreamCode: user?.stream?.code ?? null,
    }),
    [
      curriculumJourneys,
      dueFlashcards,
      examActivities,
      initialCatalog,
      initialFilters,
      labTools,
      myMistakes,
      sessions,
      user?.stream?.code,
      weakPointInsights,
    ],
  );
  const studyCommandStarters = useMemo(
    () => buildStudyCommandStarters(studyCommandContext),
    [studyCommandContext],
  );
  const reviewCount =
    dueFlashcards.length + myMistakeItems.length + savedExerciseItems.length;
  const spotlightHref = activeSession
    ? buildStudentTrainingSessionRoute(activeSession.id)
    : STUDENT_TRAINING_ROUTE;
  const spotlightActionLabel = activeSession ? "مواصلة الآن" : "ابدأ جلسة";
  const spotlightProgressPercent = spotlightSession?.progressSummary
    ?.totalQuestionCount
    ? Math.round(
        (spotlightSession.progressSummary.completedQuestionCount /
          spotlightSession.progressSummary.totalQuestionCount) *
          100,
      )
    : spotlightSession?.status === "COMPLETED"
      ? 100
      : 0;
  const insightHref = primaryWeakPoint?.href ?? STUDENT_TRAINING_ROUTE;
  const insightTitle =
    primaryWeakPoint?.title ??
    (weakPointInsightEnabled ? "اجمع إشارات الضعف" : "دريل مركز جاهز");
  const insightCopy =
    primaryWeakPoint?.subtitle ??
    (weakPointInsightEnabled
      ? "أكمل بعض الأسئلة حتى تظهر لك توصية علاجية دقيقة."
      : "ابدأ تدريباً قصيراً لتحديد أول نقطة تحتاج تثبيتاً.");
  const curriculumJourneyHref =
    primaryCurriculumJourney?.detailsHref ?? STUDENT_TRAINING_ROUTE;
  const curriculumJourneyProgress =
    primaryCurriculumJourney?.progressPercent ?? 0;
  const reviewHref = primaryDueFlashcard
    ? STUDENT_FLASHCARDS_ROUTE
    : (primaryMistake?.href ??
      primarySavedExercise?.href ??
      STUDENT_LIBRARY_ROUTE);
  const reviewTitle = primaryDueFlashcard
    ? `${dueFlashcards.length} بطاقة مستحقة`
    : (primaryMistake?.title ??
      primarySavedExercise?.title ??
      "لا توجد مراجعة مستحقة");
  const reviewCopy = primaryDueFlashcard
    ? `${describeFlashcardSource(
        primaryDueFlashcard.card.sourceType,
      )} · ${getFlashcardContextLabel(primaryDueFlashcard.card)}`
    : (primaryMistake?.subtitle ??
      primarySavedExercise?.subtitle ??
      "عندما تحفظ تمريناً أو تفوّت سؤالاً سيظهر هنا مباشرة.");

  async function createProposal(nextCommand: string) {
    setCommandError(null);

    try {
      const response = await fetch("/api/study-command/propose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: nextCommand,
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error("تعذر تحضير الجلسة الآن.");
      }

      setCommandProposal(parseStudyCommandProposalResponse(payload).proposal);
    } catch (error: unknown) {
      setCommandError(
        error instanceof Error ? error.message : "تعذر تحضير الجلسة الآن.",
      );
    }
  }

  function handleCommandSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createProposal(commandDraft);
  }

  function handleStarterClick(prompt: string) {
    setCommandDraft(prompt);
    void createProposal(prompt);
  }

  function handleFineTune(option: string) {
    const nextCommand = commandDraft
      ? `${commandDraft}، ${option}`
      : option;
    setCommandDraft(nextCommand);
    void createProposal(nextCommand);
  }

  async function previewCommandSession(
    request: StudyCommandCreateSessionRequest,
  ) {
    return fetchJson<SessionPreviewResponse>(
      `${API_BASE_URL}/study/sessions/preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
      parseSessionPreviewResponse,
    );
  }

  async function resolveCreateSessionRequest(
    request: StudyCommandCreateSessionRequest,
  ) {
    const preview = await previewCommandSession(request);

    if (preview.matchingExerciseCount > 0) {
      return request;
    }

    const fallbackRequest = buildStudyCommandMixedDrillFallbackRequest(request);

    if (!fallbackRequest) {
      return null;
    }

    const fallbackPreview = await previewCommandSession(fallbackRequest);

    return fallbackPreview.matchingExerciseCount > 0 ? fallbackRequest : null;
  }

  async function handleStartCommandProposal(proposal: StudyCommandProposal) {
    if (proposal.primaryAction.kind === "OPEN_ROUTE") {
      router.push(proposal.primaryAction.href);
      return;
    }

    if (creatingCommandSession) {
      return;
    }

    setCreatingCommandSession(true);
    setCommandError(null);

    try {
      const createSessionRequest = await resolveCreateSessionRequest(
        proposal.primaryAction.request,
      );

      if (!createSessionRequest) {
        setCommandError(
          "لم نجد تمارين مطابقة لهذا الاختيار حالياً. افتح إعداد الجلسة ووسّع المادة أو السنوات.",
        );
        return;
      }

      const payload = await fetchJson<CreateSessionResponse>(
        `${API_BASE_URL}/study/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createSessionRequest),
        },
        parseCreateSessionResponse,
      );

      router.push(buildStudentTrainingSessionRoute(payload.id));
    } catch (error: unknown) {
      setCommandError(
        error instanceof Error ? error.message : "تعذر إنشاء الجلسة.",
      );
    } finally {
      setCreatingCommandSession(false);
    }
  }

  async function transcribeAudio(blob: Blob) {
    const formData = new FormData();
    formData.set(
      "audio",
      new File([blob], "study-command.webm", {
        type: blob.type || "audio/webm",
      }),
    );

    const response = await fetch("/api/study-command/transcribe", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as {
      text?: unknown;
      message?: unknown;
    } | null;

    if (!response.ok) {
      throw new Error(
        typeof payload?.message === "string"
          ? payload.message
          : "تعذر تحويل الصوت إلى نص.",
      );
    }

    if (typeof payload?.text !== "string" || !payload.text.trim()) {
      throw new Error("لم يرجع التسجيل نصاً واضحاً.");
    }

    return payload.text.trim();
  }

  async function handleVoiceCommand() {
    setVoiceError(null);

    if (voiceState === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (voiceState === "transcribing") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setVoiceError("المتصفح لا يدعم التسجيل الصوتي هنا.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });
        stream.getTracks().forEach((track) => track.stop());
        setVoiceState("transcribing");

        void transcribeAudio(audioBlob)
          .then((text) => {
            setCommandDraft(text);
            void createProposal(text);
          })
          .catch((error: unknown) => {
            setVoiceError(
              error instanceof Error
                ? error.message
                : "تعذر تحويل الصوت إلى نص.",
            );
          })
          .finally(() => {
            setVoiceState("idle");
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
          });
      });

      recorder.start();
      setVoiceState("recording");
    } catch {
      setVoiceError("لم نستطع فتح الميكروفون. تأكد من صلاحيات المتصفح.");
      setVoiceState("idle");
    }
  }

  if (hubUnavailable) {
    return (
      <StudyShell>
        <StudentNavbar />
        <EmptyState
          title="تعذر تحميل مساحة الطالب"
          description="أعد المحاولة."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? "جارٍ التحديث..." : "إعادة المحاولة"}
            </Button>
          }
        />
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page">
        {missingHubData ? (
          <div className="hub-sync-notice">
            <p>بعض البيانات لم تتحدث الآن. يمكنك المتابعة أو إعادة المحاولة.</p>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-5"
              onClick={() => {
                startRefreshingHub(() => {
                  router.refresh();
                });
              }}
              disabled={refreshingHub}
            >
              {refreshingHub ? "جارٍ التحديث..." : "إعادة المحاولة"}
            </Button>
          </div>
        ) : null}

        <motion.section
          className="hub-intro"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div>
            <p className="page-kicker">Study Command</p>
            <h1>مرحباً بك، {displayName}</h1>
          </div>
          <p>اكتب أو قل ما تريد دراسته الآن، ونحوّله إلى جلسة واضحة.</p>
        </motion.section>

        <motion.section
          className="hub-command-entry"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.04, ease: [0.2, 0.8, 0.2, 1] }}
          aria-label="مدخل أوامر الدراسة"
        >
          <div className="hub-command-entry-head">
            <span className="hub-command-entry-icon" aria-hidden="true">
              <Sparkles size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h2>ما الذي تريد دراسته في هذه الجلسة؟</h2>
              <p>
                اكتب بحرية: فرض قريب، حصة دعم، تمارين BAC، حفظ، فهم درس، أو
                خطأ تريد إصلاحه.
              </p>
            </div>
          </div>

          <form
            className="hub-command-form"
            onSubmit={handleCommandSubmit}
          >
            <Textarea
              value={commandDraft}
              onChange={(event) => {
                setCommandDraft(event.target.value);
              }}
              placeholder="مثال: عندي فرض في الفيزياء غدوة على الكهرباء، أريد مراجعة وتمارين..."
              className="hub-command-input"
              rows={3}
            />
            <div className="hub-command-form-actions">
              <Button
                type="button"
                variant={voiceState === "recording" ? "secondary" : "outline"}
                className="hub-command-voice-button"
                onClick={() => void handleVoiceCommand()}
                disabled={voiceState === "transcribing"}
                aria-pressed={voiceState === "recording"}
                title={
                  voiceState === "recording"
                    ? "إيقاف التسجيل الصوتي"
                    : "إملاء أمر الدراسة صوتياً"
                }
              >
                {voiceState === "recording" ? (
                  <CircleStop data-icon aria-hidden="true" />
                ) : (
                  <Mic data-icon aria-hidden="true" />
                )}
                {voiceState === "recording"
                  ? "إيقاف التسجيل"
                  : voiceState === "transcribing"
                    ? "جارٍ التحويل..."
                    : "تحدث"}
              </Button>
              <Button type="submit" className="hub-command-submit">
                <Send data-icon aria-hidden="true" />
                حضّر الجلسة
              </Button>
            </div>
          </form>

          {voiceError ? (
            <p className="hub-command-error" role="status">
              {voiceError}
            </p>
          ) : null}

          {commandError ? (
            <p className="hub-command-error" role="status">
              {commandError}
            </p>
          ) : null}

          <div className="hub-smart-starters" aria-label="اقتراحات ذكية">
            {studyCommandStarters.map((starter) => (
              <Button
                key={starter.id}
                type="button"
                variant="outline"
                className={`hub-smart-starter tone-${starter.tone}`}
                onClick={() => handleStarterClick(starter.prompt)}
              >
                <span>{starter.title}</span>
                <small>{starter.reason}</small>
              </Button>
            ))}
          </div>

          {commandProposal ? (
            <article className="hub-command-proposal" aria-live="polite">
              <div className="hub-command-proposal-head">
                <div>
                  <span>مسودة جلسة</span>
                  <h3>{commandProposal.title}</h3>
                  <p>{commandProposal.subtitle}</p>
                </div>
                <StudyBadge tone="brand">
                  {commandProposal.estimatedMinutes} دقيقة
                </StudyBadge>
              </div>

              <div className="hub-command-proposal-steps">
                {commandProposal.steps.map((step, index) => (
                  <div key={`${step.title}:${index}`}>
                    <b>{index + 1}</b>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </span>
                  </div>
                ))}
              </div>

              <p className="hub-command-proposal-rationale">
                {commandProposal.rationale}
              </p>

              <div className="hub-command-proposal-actions">
                {commandProposal.primaryAction.kind === "OPEN_ROUTE" ? (
                  <Button asChild className="h-11 rounded-full px-5">
                    <Link href={commandProposal.primaryAction.href}>
                      {commandProposal.primaryLabel}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-11 rounded-full px-5"
                    onClick={() => void handleStartCommandProposal(commandProposal)}
                    disabled={creatingCommandSession}
                  >
                    {creatingCommandSession
                      ? "جارٍ إنشاء الجلسة..."
                      : commandProposal.primaryLabel}
                  </Button>
                )}
                <div>
                  {commandProposal.fineTuneOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleFineTune(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </article>
          ) : null}
        </motion.section>

        <motion.section
          className="hub-command-bento"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.06, ease: [0.2, 0.8, 0.2, 1] }}
          aria-label="مركز الدراسة"
        >
          <Link
            href={spotlightHref}
            className={`hub-bento-card hub-bento-continue${
              activeSession ? " is-active" : ""
            }`}
          >
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-primary" aria-hidden="true">
                <Target size={19} strokeWidth={2.1} />
              </span>
              {spotlightSession ? (
                <StudyBadge
                  tone={studentHubStatusTones[spotlightSession.status]}
                >
                  {studentHubStatusLabels[spotlightSession.status]}
                </StudyBadge>
              ) : (
                <StudyBadge tone="accent">جاهز</StudyBadge>
              )}
            </div>
            <div className="hub-bento-copy">
              <span>Continue</span>
              <h2>{spotlightTitle}</h2>
              {spotlightMeta ? <p>{spotlightMeta}</p> : null}
            </div>
            <div className="hub-bento-progress">
              <div aria-hidden="true">
                <span style={{ width: `${spotlightProgressPercent}%` }} />
              </div>
              <strong>{spotlightActionLabel}</strong>
              <ArrowUpLeft size={17} strokeWidth={2.1} aria-hidden="true" />
            </div>
          </Link>

          <Link href={insightHref} className="hub-bento-card hub-bento-insight">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-cool" aria-hidden="true">
                <Brain size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Insight</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{insightTitle}</h3>
              <p>{insightCopy}</p>
            </div>
            <span className="hub-bento-action">ابدأ الإصلاح</span>
          </Link>

          <div className="hub-bento-card hub-bento-momentum">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-warm" aria-hidden="true">
                <Flame size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Momentum</span>
            </div>
            <strong>{sessions.length}</strong>
            <p>
              {activeSession ? "جلسة مفتوحة الآن" : "جلسات حديثة في المساحة"}
            </p>
            <div className="hub-bento-mini-metrics">
              {hubMetrics.map((metric) => (
                <span key={metric.label}>
                  <b>{metric.value}</b>
                  {metric.label}
                </span>
              ))}
            </div>
          </div>

          <Link
            href={curriculumJourneyHref}
            className="hub-bento-card hub-bento-journey"
          >
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-neutral" aria-hidden="true">
                <Map size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Journey</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{primaryCurriculumJourney?.title ?? "مسار المنهج"}</h3>
              <p>
                {primaryCurriculumJourney?.progressLabel ??
                  "اختر مساراً لتظهر خطواتك."}
              </p>
            </div>
            <div
              className="hub-bento-ring"
              style={
                {
                  "--hub-ring": `${curriculumJourneyProgress}%`,
                } as CSSProperties
              }
            >
              <strong>{curriculumJourneyProgress}%</strong>
            </div>
          </Link>

          <Link href={reviewHref} className="hub-bento-card hub-bento-review">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-danger" aria-hidden="true">
                {primaryDueFlashcard ? (
                  <Layers3 size={19} strokeWidth={2.1} />
                ) : (
                  <AlertTriangle size={19} strokeWidth={2.1} />
                )}
              </span>
              <span className="hub-bento-label">{reviewCount} مراجعة</span>
            </div>
            <div className="hub-bento-copy">
              <h3>{reviewTitle}</h3>
              <p>{reviewCopy}</p>
            </div>
          </Link>

          <div className="hub-bento-card hub-bento-actions">
            <div className="hub-bento-topline">
              <span className="hub-bento-icon tone-primary" aria-hidden="true">
                <Activity size={19} strokeWidth={2.1} />
              </span>
              <span className="hub-bento-label">Quick Start</span>
            </div>
            <div className="hub-bento-action-grid">
              <Link href={STUDENT_TRAINING_ROUTE}>
                <PenTool size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>تدريب</span>
              </Link>
              <Link href={STUDENT_LIBRARY_ROUTE}>
                <BookOpen size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>مكتبة</span>
              </Link>
              <Link href={STUDENT_LAB_ROUTE}>
                <FlaskConical size={18} strokeWidth={2.1} aria-hidden="true" />
                <span>
                  {primaryLabTool?.inProgressMissionCount
                    ? "مهمة مختبر"
                    : "مختبر"}
                </span>
              </Link>
            </div>
          </div>
        </motion.section>

        <div className="hub-workstream-grid">
          <HubCurriculumJourneySection
            curriculumJourneyItems={curriculumJourneyItems}
          />
          <HubWeakPointsSection
            enabled={weakPointInsightEnabled}
            weakPointItems={weakPointItems}
          />
          <HubMistakesSection myMistakeItems={myMistakeItems} />
          <HubSavedExercisesSection savedExerciseItems={savedExerciseItems} />
          <HubRecentActivitySection activityItems={activityItems} />
        </div>
      </div>
    </StudyShell>
  );
}
