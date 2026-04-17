"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearStudyReviewVault } from "@/lib/study-api";
import { buildStudentTrainingSessionRoute } from "@/lib/student-routes";

export function StudyClearVaultButton({
  subjectCode,
  limit = 10,
  label = "نظف الخزانة",
}: {
  subjectCode?: string | null;
  limit?: number;
  label?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setPending(true);
    setError(null);

    try {
      const session = await clearStudyReviewVault({
        subjectCode: subjectCode ?? null,
        limit,
      });

      router.push(buildStudentTrainingSessionRoute(session.id));
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "تعذر بدء جلسة تصفية الأخطاء.",
      );
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          void handleStart();
        }}
        disabled={pending}
      >
        {pending ? "جارٍ تجهيز الجلسة..." : label}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </>
  );
}
