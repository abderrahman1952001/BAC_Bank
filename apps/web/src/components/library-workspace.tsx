'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/components/auth-provider';
import { StudentNavbar } from '@/components/student-navbar';
import {
  EmptyState,
  StudyHeader,
  StudyShell,
  StudySidebar,
} from '@/components/study-shell';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { SelectionCard } from '@/components/ui/selection-card';
import {
  CatalogResponse,
  createExerciseDrillSession,
  createOfficialPaperSimulationSession,
  ExamResponse,
  formatSessionType,
} from '@/lib/study-api';
import {
  buildLibraryContext,
  buildLibraryQuery,
  buildInitialLibrarySelection,
  findLibraryStream,
  findLibrarySubject,
  findLibraryYearEntry,
  findSelectedLibrarySujet,
  reconcileLibrarySubjectCode,
  reconcileLibrarySujetSelection,
  reconcileLibraryYear,
} from '@/lib/library-workspace';
import {
  STUDENT_LIBRARY_ROUTE,
  buildStudentLibraryExamRouteWithSearch,
  buildStudentTrainingSessionRoute,
} from '@/lib/student-routes';

export function LibraryWorkspace({
  initialSearch,
  initialCatalog,
  initialExam,
}: {
  initialSearch?: {
    stream?: string;
    subject?: string;
    year?: string;
    examId?: string;
    sujet?: string;
  };
  initialCatalog?: CatalogResponse;
  initialExam?: ExamResponse;
}) {
  const router = useRouter();
  const { user } = useAuthSession();
  const serverSelection = useMemo(
    () => buildInitialLibrarySelection(initialSearch),
    [initialSearch],
  );
  const catalog = initialCatalog ?? null;
  const drillQuota = user?.studyEntitlements.quotas.drillStarts ?? null;
  const simulationQuota = user?.studyEntitlements.quotas.simulationStarts ?? null;

  const [selectedStreamCode, setSelectedStreamCode] = useState(
    serverSelection.selectedStreamCode,
  );
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(
    serverSelection.selectedSubjectCode,
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    serverSelection.selectedYear,
  );
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    serverSelection.selectedExamId,
  );
  const [selectedSujetNumber, setSelectedSujetNumber] = useState<number | null>(
    serverSelection.selectedSujetNumber,
  );
  const [startingSimulation, setStartingSimulation] = useState(false);
  const [startingExerciseId, setStartingExerciseId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStreamCode(serverSelection.selectedStreamCode);
    setSelectedSubjectCode(serverSelection.selectedSubjectCode);
    setSelectedYear(serverSelection.selectedYear);
    setSelectedExamId(serverSelection.selectedExamId);
    setSelectedSujetNumber(serverSelection.selectedSujetNumber);
  }, [serverSelection]);

  const stream = useMemo(
    () => findLibraryStream(catalog, selectedStreamCode),
    [catalog, selectedStreamCode],
  );
  const subject = useMemo(
    () => findLibrarySubject(stream, selectedSubjectCode),
    [selectedSubjectCode, stream],
  );
  const yearEntry = useMemo(
    () => findLibraryYearEntry(subject, selectedYear),
    [selectedYear, subject],
  );

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (selectedStreamCode) {
      return;
    }

    setSelectedSubjectCode('');
    setSelectedYear(null);
    setSelectedExamId(null);
    setSelectedSujetNumber(null);
  }, [catalog, selectedStreamCode]);

  useEffect(() => {
    if (!stream) {
      setSelectedSubjectCode('');
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedSubjectCode((current) =>
      reconcileLibrarySubjectCode(stream, current),
    );
  }, [stream]);

  useEffect(() => {
    if (!subject) {
      setSelectedYear(null);
      setSelectedExamId(null);
      setSelectedSujetNumber(null);
      return;
    }

    setSelectedYear((current) => reconcileLibraryYear(subject, current));
  }, [subject]);

  useEffect(() => {
    const nextSelection = reconcileLibrarySujetSelection(
      yearEntry,
      selectedExamId,
      selectedSujetNumber,
    );

    setSelectedExamId(nextSelection.selectedExamId);
    setSelectedSujetNumber(nextSelection.selectedSujetNumber);
  }, [selectedExamId, selectedSujetNumber, yearEntry]);

  const selectedSujet = useMemo(() => {
    return findSelectedLibrarySujet(
      yearEntry,
      selectedExamId,
      selectedSujetNumber,
    );
  }, [selectedExamId, selectedSujetNumber, yearEntry]);
  const serverPreviewKey =
    serverSelection.selectedExamId && serverSelection.selectedSujetNumber
      ? `${serverSelection.selectedExamId}:${serverSelection.selectedSujetNumber}`
      : null;
  const selectedPreviewKey = selectedSujet
    ? `${selectedSujet.examId}:${selectedSujet.sujetNumber}`
    : null;
  const selectedExam =
    selectedSujet &&
    initialExam?.id === selectedSujet.examId &&
    initialExam.selectedSujetNumber === selectedSujet.sujetNumber
      ? initialExam
      : null;
  const loadingExam = Boolean(
    selectedPreviewKey && selectedPreviewKey !== serverPreviewKey,
  );
  const examError =
    selectedPreviewKey &&
    selectedPreviewKey === serverPreviewKey &&
    !selectedExam
      ? 'تعذر تحميل معاينة الموضوع المختار.'
      : null;

  useEffect(() => {
    const nextQuery = buildLibraryQuery({
      selectedStreamCode,
      selectedSubjectCode,
      selectedYear,
      selectedExamId,
      selectedSujetNumber,
    });
    const currentQuery =
      typeof window === 'undefined'
        ? ''
        : window.location.search.replace(/^\?/, '');

    if (nextQuery === currentQuery) {
      return;
    }

    router.replace(
      nextQuery ? `${STUDENT_LIBRARY_ROUTE}?${nextQuery}` : STUDENT_LIBRARY_ROUTE,
      {
        scroll: false,
      },
    );
  }, [
    router,
    selectedExamId,
    selectedStreamCode,
    selectedSubjectCode,
    selectedSujetNumber,
    selectedYear,
  ]);

  const { selectedMeta, libraryContextTitle, sujetsCount } =
    buildLibraryContext({
      stream,
      subject,
      selectedYear,
      yearEntry,
      selectedSujet,
    });

  async function startSimulationFromSelectedSujet() {
    if (
      !selectedExam ||
      !selectedSujet ||
      startingSimulation ||
      simulationQuota?.exhausted
    ) {
      return;
    }

    setLaunchError(null);
    setStartingSimulation(true);

    try {
      const session = await createOfficialPaperSimulationSession({
        examId: selectedExam.id,
        sujetNumber: selectedSujet.sujetNumber as 1 | 2,
        subjectCode: selectedExam.subject.code,
        streamCode: selectedExam.stream.code,
        year: selectedExam.year,
        sessionType: selectedExam.sessionType,
        title: `محاكاة ${selectedExam.subject.name} · ${
          selectedExam.selectedSujetLabel ?? selectedSujet.label
        }`,
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (error) {
      setLaunchError(
        error instanceof Error ? error.message : 'تعذر بدء المحاكاة لهذا الموضوع.',
      );
    } finally {
      setStartingSimulation(false);
    }
  }

  async function startExerciseDrill(input: {
    exerciseNodeId: string;
    orderIndex: number;
  }) {
    if (!selectedExam || startingExerciseId || drillQuota?.exhausted) {
      return;
    }

    setLaunchError(null);
    setStartingExerciseId(input.exerciseNodeId);

    try {
      const session = await createExerciseDrillSession({
        exerciseNodeIds: [input.exerciseNodeId],
        subjectCode: selectedExam.subject.code,
        streamCode: selectedExam.stream.code,
        year: selectedExam.year,
        sessionType: selectedExam.sessionType,
        title: `دريل التمرين ${input.orderIndex} · ${selectedExam.subject.name}`,
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (error) {
      setLaunchError(
        error instanceof Error ? error.message : 'تعذر إنشاء دريل لهذا التمرين.',
      );
    } finally {
      setStartingExerciseId(null);
    }
  }

  if (!catalog) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-library">
          <EmptyState
            title="تعذر تحميل مساحة التصفح"
            description="أعد المحاولة."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5"
                onClick={() => router.refresh()}
              >
                إعادة المحاولة
              </Button>
            }
          />
        </section>
      </StudyShell>
    );
  }

  if (catalog.streams.length === 0) {
    return (
      <StudyShell>
        <StudentNavbar />
        <section className="student-main-frame student-main-frame-library">
          <StudyHeader
            title="المكتبة"
          />
          <EmptyState
            title="لا توجد بيانات منشورة"
            description="انشر بيانات أولاً."
          />
        </section>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <section className="student-main-frame student-main-frame-library">
        <StudyHeader
          title="المكتبة"
          meta={selectedMeta}
        />

        <div className="library-workspace">
          <div className="library-workspace-body">
            <StudySidebar
              className="library-filter-sidebar"
              title="التصفية"
            >
              <div className="library-filter-group">
                <div className="library-filter-head">
                  <h3>الشعبة</h3>
                  {selectedStreamCode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="rounded-full px-2"
                      onClick={() => setSelectedStreamCode('')}
                    >
                      مسح
                    </Button>
                  ) : null}
                </div>
                <div className="chip-grid">
                  {catalog.streams.map((item) => (
                    <FilterChip
                      key={item.code}
                      type="button"
                      active={item.code === selectedStreamCode}
                      onClick={() => setSelectedStreamCode(item.code)}
                    >
                      {item.name}
                    </FilterChip>
                  ))}
                </div>
              </div>

              <div className="library-filter-group">
                <div className="library-filter-head">
                  <h3>المادة</h3>
                  {selectedSubjectCode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="rounded-full px-2"
                      onClick={() => setSelectedSubjectCode('')}
                    >
                      مسح
                    </Button>
                  ) : null}
                </div>
                {!stream ? (
                  <p className="muted-text">اختر الشعبة.</p>
                ) : (
                  <div className="chip-grid">
                    {stream.subjects.map((item) => (
                      <FilterChip
                        key={item.code}
                        type="button"
                        active={item.code === selectedSubjectCode}
                        onClick={() => setSelectedSubjectCode(item.code)}
                      >
                        {item.name}
                      </FilterChip>
                    ))}
                  </div>
                )}
              </div>

              <div className="library-filter-group">
                <div className="library-filter-head">
                  <h3>السنة</h3>
                  {selectedYear ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="rounded-full px-2"
                      onClick={() => setSelectedYear(null)}
                    >
                      مسح
                    </Button>
                  ) : null}
                </div>
                {!subject ? (
                  <p className="muted-text">اختر المادة.</p>
                ) : (
                  <div className="library-year-list">
                    {subject.years.map((item) => (
                      <SelectionCard
                        key={item.year}
                        type="button"
                        active={item.year === selectedYear}
                        className="min-h-12 grid-cols-[auto_auto] items-center rounded-2xl px-3 py-2"
                        onClick={() => setSelectedYear(item.year)}
                      >
                        <strong>{item.year}</strong>
                        <span>{item.sujets.length} موضوع</span>
                      </SelectionCard>
                    ))}
                  </div>
                )}
              </div>
            </StudySidebar>

              <div className="library-main-column">
                <motion.section
                  className="library-context-strip"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div>
                    <h2>{libraryContextTitle}</h2>
                  </div>
                  <div className="library-context-pills">
                    {stream ? <span>{stream.name}</span> : null}
                    {subject ? <span>{subject.name}</span> : null}
                    {selectedYear ? <span>{selectedYear}</span> : null}
                    {selectedSujet ? <span>{selectedSujet.label}</span> : null}
                  </div>
                </motion.section>

                <motion.section
                  className="library-panel"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.34, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="library-panel-head">
                    <div>
                      <h2>النتائج</h2>
                      {subject && selectedYear ? <p>{sujetsCount} موضوع</p> : null}
                    </div>
                  </div>

                  {!stream || !subject || !selectedYear ? (
                    <EmptyState title="حدّد الشعبة والمادة والسنة" />
                  ) : yearEntry && yearEntry.sujets.length ? (
                    <div className="library-sujet-grid">
                      {yearEntry.sujets.map((item) => {
                        const isActive =
                          item.examId === selectedExamId &&
                          item.sujetNumber === selectedSujetNumber;

                        return (
                          <SelectionCard
                            key={`${item.examId}:${item.sujetNumber}`}
                            type="button"
                            active={isActive}
                            className="min-h-24 content-start rounded-2xl"
                            onClick={() => {
                              setSelectedExamId(item.examId);
                              setSelectedSujetNumber(item.sujetNumber);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong>{item.label}</strong>
                              <span>{item.exerciseCount} تمارين</span>
                            </div>
                            <p>{formatSessionType(item.sessionType)}</p>
                          </SelectionCard>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="لا توجد مواضيع مطابقة"
                      description="غيّر النطاق."
                    />
                  )}
                </motion.section>

                <motion.section
                  className="library-panel library-preview-panel"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.36, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="library-panel-head">
                    <div>
                      <h2>التصفح الرقمي</h2>
                      {selectedSujet ? (
                        <p>اختر التمرين للدخول مباشرة إلى الموضوع.</p>
                      ) : null}
                    </div>
                  </div>

                  {loadingExam ? (
                    <div className="library-preview-layout">
                      <div className="study-skeleton block" />
                      <div className="study-skeleton block tall" />
                    </div>
                  ) : examError ? (
                    <EmptyState
                      title="تعذر تحميل معاينة الموضوع"
                      description={examError}
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-full px-5"
                          onClick={() => router.refresh()}
                        >
                          حاول مجدداً
                        </Button>
                      }
                    />
                  ) : selectedExam ? (
                    <div className="library-preview-layout">
                      <article className="library-preview-summary">
                        <div className="study-meta-row">
                          <span className="study-meta-pill">
                            <strong>النوع</strong>
                            <span>{formatSessionType(selectedExam.sessionType)}</span>
                          </span>
                          <span className="study-meta-pill">
                            <strong>المدة</strong>
                            <span>{selectedExam.durationMinutes} دقيقة</span>
                          </span>
                        </div>

                        <div className="library-preview-copy">
                          <h3>
                            {selectedExam.selectedSujetLabel ?? selectedSujet?.label}
                          </h3>
                          <p>
                            {selectedExam.subject.name} · {selectedExam.stream.name} ·{' '}
                            {selectedExam.year}
                          </p>
                          <p className="muted-text">
                            داخل العرض ستجد تنقلاً بين التمارين وبين الموضوعين
                            مباشرة، بدون وضع دراسة منفصل.
                          </p>
                        </div>

                        <div className="library-preview-actions">
                          <Button
                            type="button"
                            className="h-11 rounded-full px-5"
                            onClick={() => {
                              void startSimulationFromSelectedSujet();
                            }}
                            disabled={
                              startingSimulation ||
                              Boolean(simulationQuota?.exhausted)
                            }
                          >
                            {startingSimulation
                              ? 'جارٍ إنشاء المحاكاة...'
                              : simulationQuota?.exhausted
                                ? 'نفدت حصة المحاكاة'
                                : 'ابدأ محاكاة هذا الموضوع'}
                          </Button>
                        </div>
                      </article>

                      <div className="library-exercise-list">
                        {selectedExam.exercises.map((exercise) => (
                          <article
                            key={exercise.id}
                            className="library-exercise-card"
                          >
                            <div>
                              <strong>التمرين {exercise.orderIndex}</strong>
                              <span>{exercise.questionCount} أسئلة</span>
                            </div>

                            <div className="library-exercise-actions">
                              <Button
                                asChild
                                variant="outline"
                                className="h-10 rounded-full px-5"
                              >
                                <Link
                                  href={buildStudentLibraryExamRouteWithSearch({
                                    streamCode: selectedExam.stream.code,
                                    subjectCode: selectedExam.subject.code,
                                    year: selectedExam.year,
                                    examId: selectedExam.id,
                                    sujetNumber:
                                      selectedExam.selectedSujetNumber ??
                                      selectedSujet?.sujetNumber ??
                                      1,
                                    exercise: exercise.orderIndex,
                                  })}
                                >
                                  افتح التمرين
                                </Link>
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-full px-5"
                                onClick={() => {
                                  void startExerciseDrill({
                                    exerciseNodeId: exercise.id,
                                    orderIndex: exercise.orderIndex,
                                  });
                                }}
                                disabled={
                                  startingExerciseId === exercise.id ||
                                  Boolean(drillQuota?.exhausted)
                                }
                              >
                                {startingExerciseId === exercise.id
                                  ? 'جارٍ إنشاء الدريل...'
                                  : drillQuota?.exhausted
                                    ? 'نفدت حصة الدريل'
                                    : 'ابدأ دريل'}
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>

                      {launchError ? <p className="error-text">{launchError}</p> : null}
                    </div>
                  ) : (
                    <EmptyState title="اختر موضوعاً" />
                  )}
                </motion.section>
              </div>
            </div>
          </div>
      </section>
    </StudyShell>
  );
}
