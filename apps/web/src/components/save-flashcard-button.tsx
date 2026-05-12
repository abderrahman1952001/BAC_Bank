"use client";

import { useState } from "react";
import { BookmarkPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateFlashcardRequest } from "@/lib/flashcards-api";
import { createFlashcard } from "@/lib/flashcards-api";
import type { FlashcardDraft } from "@/lib/flashcards-surface";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveFlashcardButton({
  draft,
  label = "احفظ كبطاقة",
  successLabel = "حُفظت",
  className,
  compact = false,
}: {
  draft: FlashcardDraft;
  label?: string;
  successLabel?: string;
  className?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const isSaving = status === "saving";
  const isSaved = status === "saved";

  async function handleSave() {
    if (isSaving || isSaved) {
      return;
    }

    setStatus("saving");
    setError(null);

    try {
      await createFlashcard(draft as CreateFlashcardRequest);
      setStatus("saved");
    } catch (requestError) {
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ البطاقة.",
      );
    }
  }

  return (
    <div className={cn("save-flashcard-action", compact && "is-compact")}>
      <Button
        type="button"
        variant={isSaved ? "secondary" : "outline"}
        className={cn("h-10 rounded-full px-4", className)}
        onClick={() => {
          void handleSave();
        }}
        disabled={isSaving || isSaved}
      >
        {isSaving ? (
          <Loader2 data-icon className="animate-spin" />
        ) : isSaved ? (
          <Check data-icon />
        ) : (
          <BookmarkPlus data-icon />
        )}
        {isSaving ? "جارٍ الحفظ..." : isSaved ? successLabel : label}
      </Button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
