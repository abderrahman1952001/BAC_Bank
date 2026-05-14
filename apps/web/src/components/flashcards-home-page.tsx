"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Eye,
  EyeOff,
  Layers3,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { StudentNavbar } from "@/components/student-navbar";
import { EmptyState, StudyBadge, StudyShell } from "@/components/study-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  createFlashcard,
  createFlashcardDeck,
  enrollFlashcardDeck,
  fetchDueFlashcards,
  fetchFlashcardDeckCards,
  fetchFlashcardDecks,
  reviewFlashcard,
  type DueFlashcardsResponse,
  type FlashcardDeckCardsResponse,
  type FlashcardDeckSummary,
  type FlashcardReviewRating,
} from "@/lib/flashcards-api";
import {
  describeFlashcardSource,
  flashcardReviewRatingHints,
  flashcardReviewRatingLabels,
  formatFlashcardDueLabel,
  getFlashcardContextLabel,
  summarizeDecks,
} from "@/lib/flashcards-surface";
import {
  STUDENT_COURSES_ROUTE,
  STUDENT_TRAINING_ROUTE,
} from "@/lib/student-routes";

type DueFlashcardItem = DueFlashcardsResponse["data"][number];
type DeckCardItem = FlashcardDeckCardsResponse["data"][number];

const REVIEW_RATINGS: FlashcardReviewRating[] = [
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
];

export function FlashcardsHomePage({
  initialDecks,
  initialDueCards,
}: {
  initialDecks?: FlashcardDeckSummary[];
  initialDueCards?: DueFlashcardItem[];
}) {
  const router = useRouter();
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>(
    initialDecks ?? [],
  );
  const [dueCards, setDueCards] = useState<DueFlashcardItem[]>(
    initialDueCards ?? [],
  );
  const [activeDueIndex, setActiveDueIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [reviewingRating, setReviewingRating] =
    useState<FlashcardReviewRating | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckCardsByDeck, setDeckCardsByDeck] = useState<
    Record<string, DeckCardItem[]>
  >({});
  const [loadingDeckId, setLoadingDeckId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckDescription, setDeckDescription] = useState("");
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [cardDeckId, setCardDeckId] = useState("");
  const [creatingCard, setCreatingCard] = useState(false);
  const [enrollingDeckId, setEnrollingDeckId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => summarizeDecks(decks), [decks]);
  const safeDueIndex = dueCards.length
    ? Math.min(activeDueIndex, dueCards.length - 1)
    : 0;
  const activeDueCard = dueCards[safeDueIndex] ?? null;
  const selectedDeck = selectedDeckId
    ? (decks.find((deck) => deck.id === selectedDeckId) ?? null)
    : null;
  const selectedDeckCards = selectedDeckId
    ? (deckCardsByDeck[selectedDeckId] ?? [])
    : [];
  const selectedDeckUnenrolledCount = selectedDeckCards.filter(
    (item) => !item.state,
  ).length;
  const initialDataUnavailable =
    initialDecks === undefined || initialDueCards === undefined;

  async function refreshFlashcardData() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setError(null);
    setNotice(null);

    try {
      const [deckPayload, duePayload] = await Promise.all([
        fetchFlashcardDecks(),
        fetchDueFlashcards({
          limit: 20,
        }),
      ]);
      setDecks(deckPayload.data);
      setDueCards(duePayload.data);
      setActiveDueIndex(0);
      setAnswerVisible(false);
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تحديث البطاقات.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function loadDeckCards(deckId: string) {
    setSelectedDeckId(deckId);
    setError(null);

    if (deckCardsByDeck[deckId]) {
      return;
    }

    setLoadingDeckId(deckId);

    try {
      const payload = await fetchFlashcardDeckCards(deckId, {
        limit: 100,
      });
      setDeckCardsByDeck((current) => ({
        ...current,
        [deckId]: payload.data,
      }));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تحميل بطاقات المجموعة.",
      );
    } finally {
      setLoadingDeckId(null);
    }
  }

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deckTitle.trim() || creatingDeck) {
      return;
    }

    setCreatingDeck(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createFlashcardDeck({
        title: deckTitle.trim(),
        description: deckDescription.trim() || null,
      });
      setDecks((current) => [response.deck, ...current]);
      setSelectedDeckId(response.deck.id);
      setDeckCardsByDeck((current) => ({
        ...current,
        [response.deck.id]: [],
      }));
      setCardDeckId(response.deck.id);
      setDeckTitle("");
      setDeckDescription("");
      setNotice("تم إنشاء المجموعة.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر إنشاء المجموعة.",
      );
    } finally {
      setCreatingDeck(false);
    }
  }

  async function handleCreateCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cardFront.trim() || !cardBack.trim() || creatingCard) {
      return;
    }

    setCreatingCard(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createFlashcard({
        deckId: cardDeckId || null,
        front: cardFront.trim(),
        back: cardBack.trim(),
        sourceType: "USER_CREATED",
      });
      const nextItem = {
        card: response.card,
        state: response.state,
      };
      setDueCards((current) => [nextItem, ...current]);
      setActiveDueIndex(0);
      setAnswerVisible(false);

      if (cardDeckId) {
        setDecks((current) =>
          current.map((deck) =>
            deck.id === cardDeckId
              ? {
                  ...deck,
                  cardCount: deck.cardCount + 1,
                  dueCardCount: deck.dueCardCount + 1,
                }
              : deck,
          ),
        );
        setDeckCardsByDeck((current) => ({
          ...current,
          [cardDeckId]: [...(current[cardDeckId] ?? []), nextItem],
        }));
      } else {
        const deckPayload = await fetchFlashcardDecks();
        setDecks(deckPayload.data);
      }

      setCardFront("");
      setCardBack("");
      setNotice("تم حفظ البطاقة وأضيفت لمراجعة اليوم.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ البطاقة.",
      );
    } finally {
      setCreatingCard(false);
    }
  }

  async function handleEnrollDeck(deckId: string) {
    if (enrollingDeckId) {
      return;
    }

    setEnrollingDeckId(deckId);
    setError(null);
    setNotice(null);

    try {
      const response = await enrollFlashcardDeck(deckId);
      const [deckCardsPayload, duePayload] = await Promise.all([
        fetchFlashcardDeckCards(deckId, {
          limit: 100,
        }),
        fetchDueFlashcards({
          limit: 20,
        }),
      ]);
      setDecks((current) =>
        current.map((deck) =>
          deck.id === deckId
            ? {
                ...response.deck,
              }
            : deck,
        ),
      );
      setDeckCardsByDeck((current) => ({
        ...current,
        [deckId]: deckCardsPayload.data,
      }));
      setDueCards(duePayload.data);
      setActiveDueIndex(0);
      setAnswerVisible(false);
      setNotice(
        response.enrolledCardCount > 0
          ? `أضيفت ${response.enrolledCardCount} بطاقة إلى مراجعاتك.`
          : "هذه المجموعة موجودة بالفعل في مراجعاتك.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر إضافة المجموعة إلى مراجعاتك.",
      );
    } finally {
      setEnrollingDeckId(null);
    }
  }

  async function handleReviewCard(rating: FlashcardReviewRating) {
    if (!activeDueCard || reviewingRating) {
      return;
    }

    setReviewingRating(rating);
    setError(null);
    setNotice(null);

    try {
      const response = await reviewFlashcard(activeDueCard.card.id, {
        rating,
      });
      const reviewedCardId = activeDueCard.card.id;
      const reviewedDeckIds = new Set(activeDueCard.card.deckIds);
      const nextDueCards = dueCards.filter(
        (item) => item.card.id !== reviewedCardId,
      );

      setDueCards(nextDueCards);
      setActiveDueIndex(
        Math.min(safeDueIndex, Math.max(0, nextDueCards.length - 1)),
      );
      setAnswerVisible(false);
      setDecks((current) =>
        current.map((deck) =>
          reviewedDeckIds.has(deck.id)
            ? {
                ...deck,
                dueCardCount: Math.max(0, deck.dueCardCount - 1),
              }
            : deck,
        ),
      );
      setDeckCardsByDeck((current) => {
        const next = { ...current };

        for (const deckId of reviewedDeckIds) {
          if (!next[deckId]) {
            continue;
          }

          next[deckId] = next[deckId].map((item) =>
            item.card.id === reviewedCardId
              ? {
                  card: response.card,
                  state: response.state,
                }
              : item,
          );
        }

        return next;
      });
      setNotice(
        `تمت المراجعة. الموعد القادم: ${formatFlashcardDueLabel(
          response.state.dueAt,
        )}.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تسجيل المراجعة.",
      );
    } finally {
      setReviewingRating(null);
    }
  }

  return (
    <StudyShell>
      <StudentNavbar />

      <div className="hub-page flashcards-page">
        <section className="flashcards-command-panel">
          <div className="flashcards-command-copy">
            <p className="page-kicker">البطاقات</p>
            <h1>ذاكرة يومية متصلة بالدروس والتصحيح</h1>
            <p>
              راجع المستحق الآن، ابن مجموعاتك الخاصة، واحفظ الأفكار المهمة من
              الدورات أو التصحيحات الرسمية.
            </p>
          </div>

          <div className="flashcards-command-side">
            <div className="flashcards-metric-strip" aria-label="ملخص البطاقات">
              <span>
                <strong>{dueCards.length}</strong>
                مستحقة الآن
              </span>
              <span>
                <strong>{metrics.cardCount}</strong>
                بطاقة
              </span>
              <span>
                <strong>{metrics.deckCount}</strong>
                مجموعة
              </span>
            </div>

            <div className="flashcards-command-actions">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={() => {
                  void refreshFlashcardData();
                }}
                disabled={refreshing}
              >
                <RefreshCw
                  data-icon
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "جارٍ التحديث..." : "تحديث"}
              </Button>
              <Button asChild className="h-10 rounded-full px-4">
                <Link href={STUDENT_COURSES_ROUTE}>
                  الدورات
                  <ArrowLeft data-icon />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {initialDataUnavailable ? (
          <div className="hub-sync-notice">
            <p>
              بعض بيانات البطاقات لم تُحمّل الآن. يمكنك إنشاء بطاقة أو التحديث.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={() => {
                void refreshFlashcardData();
              }}
              disabled={refreshing}
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : null}

        {error || notice ? (
          <div
            className={`flashcards-feedback${
              error ? " tone-error" : " tone-success"
            }`}
            role={error ? "alert" : "status"}
          >
            {error ?? notice}
          </div>
        ) : null}

        <section className="flashcards-workspace" aria-label="مراجعة البطاقات">
          <div className="flashcards-review-panel">
            <div className="flashcards-section-head">
              <div>
                <p className="page-kicker">Review Queue</p>
                <h2>مراجعة اليوم</h2>
              </div>
              <StudyBadge tone={dueCards.length ? "brand" : "success"}>
                {dueCards.length
                  ? `${safeDueIndex + 1}/${dueCards.length}`
                  : "صافي"}
              </StudyBadge>
            </div>

            {activeDueCard ? (
              <article className="flashcard-study-card">
                <div className="flashcard-study-card-head">
                  <div>
                    <StudyBadge tone="accent" size="sm">
                      {describeFlashcardSource(activeDueCard.card.sourceType)}
                    </StudyBadge>
                    <StudyBadge tone="neutral" size="sm">
                      {getFlashcardContextLabel(activeDueCard.card)}
                    </StudyBadge>
                  </div>
                  <span>
                    {formatFlashcardDueLabel(activeDueCard.state.dueAt)}
                  </span>
                </div>

                <div className="flashcard-face">
                  <span>{answerVisible ? "الجواب" : "السؤال"}</span>
                  <p>
                    {answerVisible
                      ? activeDueCard.card.back
                      : activeDueCard.card.front}
                  </p>
                </div>

                <div className="flashcard-review-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full px-4"
                    onClick={() => setAnswerVisible((visible) => !visible)}
                  >
                    {answerVisible ? <EyeOff data-icon /> : <Eye data-icon />}
                    {answerVisible ? "إخفاء الجواب" : "اكشف الجواب"}
                  </Button>

                  {answerVisible ? (
                    <div className="flashcard-rating-grid">
                      {REVIEW_RATINGS.map((rating) => (
                        <Button
                          key={rating}
                          type="button"
                          variant={rating === "GOOD" ? "default" : "outline"}
                          className="h-12 rounded-2xl px-3"
                          onClick={() => {
                            void handleReviewCard(rating);
                          }}
                          disabled={Boolean(reviewingRating)}
                        >
                          <span>{flashcardReviewRatingLabels[rating]}</span>
                          <small>{flashcardReviewRatingHints[rating]}</small>
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ) : (
              <EmptyState
                title="لا توجد بطاقات مستحقة الآن"
                description="احفظ بطاقة جديدة أو عد لاحقاً عندما يحين موعد المراجعة."
                action={
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-full px-4"
                  >
                    <Link href={STUDENT_TRAINING_ROUTE}>اذهب إلى التدريب</Link>
                  </Button>
                }
              />
            )}
          </div>

          <aside className="flashcards-create-panel" aria-label="إنشاء بطاقة">
            <div className="flashcards-section-head">
              <div>
                <p className="page-kicker">Capture</p>
                <h2>بطاقة سريعة</h2>
              </div>
              <Sparkles aria-hidden="true" />
            </div>

            <form className="flashcards-form" onSubmit={handleCreateCard}>
              <label>
                <span>الوجه</span>
                <Textarea
                  value={cardFront}
                  onChange={(event) => setCardFront(event.target.value)}
                  placeholder="ما السؤال أو الفكرة التي تريد تثبيتها؟"
                  rows={4}
                />
              </label>
              <label>
                <span>الظهر</span>
                <Textarea
                  value={cardBack}
                  onChange={(event) => setCardBack(event.target.value)}
                  placeholder="الجواب، القاعدة، أو التصحيح المختصر."
                  rows={4}
                />
              </label>
              <label>
                <span>المجموعة</span>
                <NativeSelect
                  value={cardDeckId}
                  onChange={(event) => setCardDeckId(event.target.value)}
                >
                  <NativeSelectOption value="">
                    صندوق البطاقات التلقائي
                  </NativeSelectOption>
                  {decks
                    .filter((deck) => !deck.isPlatformSeed)
                    .map((deck) => (
                      <NativeSelectOption key={deck.id} value={deck.id}>
                        {deck.title}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </label>
              <Button
                type="submit"
                className="h-11 rounded-full px-5"
                disabled={creatingCard || !cardFront.trim() || !cardBack.trim()}
              >
                <Plus data-icon />
                {creatingCard ? "جارٍ الحفظ..." : "حفظ البطاقة"}
              </Button>
            </form>
          </aside>
        </section>

        <section
          className="flashcards-library-panel"
          aria-label="مجموعات البطاقات"
        >
          <div className="flashcards-deck-column">
            <div className="flashcards-section-head">
              <div>
                <p className="page-kicker">Decks</p>
                <h2>المجموعات</h2>
              </div>
              <StudyBadge tone="accent">
                {metrics.platformDeckCount} منصة
              </StudyBadge>
            </div>

            {decks.length ? (
              <div className="flashcards-deck-list">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    className={`flashcards-deck-row${
                      deck.id === selectedDeckId ? " is-active" : ""
                    }`}
                    onClick={() => {
                      void loadDeckCards(deck.id);
                    }}
                  >
                    <span className="flashcards-deck-mark" aria-hidden="true">
                      {deck.isPlatformSeed ? <BookOpenCheck /> : <Layers3 />}
                    </span>
                    <span>
                      <strong>{deck.title}</strong>
                      <small>
                        {deck.cardCount} بطاقة · {deck.dueCardCount} مستحقة
                      </small>
                    </span>
                    <StudyBadge
                      tone={deck.isPlatformSeed ? "accent" : "brand"}
                      size="sm"
                    >
                      {deck.isPlatformSeed ? "منصة" : "خاص"}
                    </StudyBadge>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد مجموعات بعد"
                description="أنشئ مجموعة شخصية أو احفظ بطاقة سريعة لتبدأ."
              />
            )}

            <form
              className="flashcards-form flashcards-deck-form"
              onSubmit={handleCreateDeck}
            >
              <label>
                <span>مجموعة جديدة</span>
                <Input
                  value={deckTitle}
                  onChange={(event) => setDeckTitle(event.target.value)}
                  placeholder="مثلاً: دوال قبل الامتحان"
                />
              </label>
              <label>
                <span>وصف اختياري</span>
                <Textarea
                  value={deckDescription}
                  onChange={(event) => setDeckDescription(event.target.value)}
                  placeholder="متى أراجع هذه المجموعة؟"
                  rows={3}
                />
              </label>
              <Button
                type="submit"
                variant="outline"
                className="h-10 rounded-full px-4"
                disabled={creatingDeck || !deckTitle.trim()}
              >
                <Plus data-icon />
                {creatingDeck ? "جارٍ الإنشاء..." : "إنشاء مجموعة"}
              </Button>
            </form>
          </div>

          <div className="flashcards-deck-detail">
            <div className="flashcards-section-head">
              <div>
                <p className="page-kicker">Cards</p>
                <h2>{selectedDeck?.title ?? "اختر مجموعة"}</h2>
              </div>
              {selectedDeck ? (
                <StudyBadge
                  tone={selectedDeck.isPlatformSeed ? "accent" : "brand"}
                >
                  {selectedDeck.cardCount} بطاقة
                </StudyBadge>
              ) : null}
            </div>

            {loadingDeckId ? (
              <div className="flashcards-loading-state">
                <RefreshCw aria-hidden="true" className="animate-spin" />
                جارٍ تحميل البطاقات...
              </div>
            ) : selectedDeck ? (
              selectedDeckCards.length ? (
                <>
                  {selectedDeck.isPlatformSeed &&
                  selectedDeckUnenrolledCount > 0 ? (
                    <div className="flashcards-enroll-panel">
                      <div>
                        <strong>أضف المجموعة إلى مراجعاتك</strong>
                        <p>
                          {selectedDeckUnenrolledCount} بطاقة ستصبح مستحقة الآن
                          لتبدأ بها.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="h-10 rounded-full px-4"
                        onClick={() => {
                          void handleEnrollDeck(selectedDeck.id);
                        }}
                        disabled={enrollingDeckId === selectedDeck.id}
                      >
                        {enrollingDeckId === selectedDeck.id
                          ? "جارٍ الإضافة..."
                          : "إضافة للمراجعات"}
                      </Button>
                    </div>
                  ) : null}

                  <div className="flashcards-card-list">
                    {selectedDeckCards.map((item) => (
                      <article
                        key={item.card.id}
                        className="flashcards-card-row"
                      >
                        <div>
                          <StudyBadge tone="neutral" size="sm">
                            {describeFlashcardSource(item.card.sourceType)}
                          </StudyBadge>
                          {item.state ? (
                            <StudyBadge tone="brand" size="sm">
                              {formatFlashcardDueLabel(item.state.dueAt)}
                            </StudyBadge>
                          ) : (
                            <StudyBadge tone="accent" size="sm">
                              غير مضافة
                            </StudyBadge>
                          )}
                        </div>
                        <h3>{item.card.front}</h3>
                        <p>{item.card.back}</p>
                      </article>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  title="المجموعة فارغة"
                  description="احفظ بطاقة في هذه المجموعة من نموذج البطاقة السريعة."
                />
              )
            ) : (
              <EmptyState
                title="اختر مجموعة لعرض بطاقاتها"
                description="المراجعة اليومية تعمل حتى للبطاقات غير الموجودة داخل مجموعة."
              />
            )}
          </div>
        </section>
      </div>
    </StudyShell>
  );
}
