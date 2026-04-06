"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminIngestionManualUploadSection } from "@/components/admin-ingestion-page-sections";
import {
  AdminIngestionJobResponse,
  fetchAdmin,
  parseAdminIngestionJobResponse,
} from "@/lib/admin";
import { buildManualUploadTitle } from "@/lib/admin-ingestion-page";
import { INGESTION_STREAM_OPTIONS } from "@/lib/ingestion-options";

export function AdminIntakePage() {
  const defaultYear = `${new Date().getFullYear()}`;
  const defaultPaperStreamCodes = ["SE"];
  const defaultSubjectCode = "MATHEMATICS";
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] =
    useState<AdminIngestionJobResponse | null>(null);
  const [year, setYear] = useState(defaultYear);
  const [paperStreamCodes, setPaperStreamCodes] = useState<string[]>(
    defaultPaperStreamCodes,
  );
  const [subjectCode, setSubjectCode] = useState(defaultSubjectCode);
  const [session, setSession] = useState<"NORMAL" | "MAKEUP">("NORMAL");
  const generatedTitle = useMemo(
    () =>
      buildManualUploadTitle({
        year,
        subjectCode,
        paperStreamCodes,
      }),
    [paperStreamCodes, subjectCode, year],
  );
  const [title, setTitle] = useState(generatedTitle);
  const [qualifierKey, setQualifierKey] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [examPdf, setExamPdf] = useState<File | null>(null);
  const [correctionPdf, setCorrectionPdf] = useState<File | null>(null);
  const previousGeneratedTitleRef = useRef(generatedTitle);

  useEffect(() => {
    const previousGeneratedTitle = previousGeneratedTitleRef.current;

    setTitle((current) =>
      !current.trim() || current === previousGeneratedTitle
        ? generatedTitle
        : current,
    );
    previousGeneratedTitleRef.current = generatedTitle;
  }, [generatedTitle]);

  function togglePaperStream(code: string, checked: boolean) {
    setPaperStreamCodes((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(code);
      } else {
        next.delete(code);
      }

      if (next.size === 0) {
        next.add(code);
      }

      return INGESTION_STREAM_OPTIONS.map(([value]) => value).filter((value) =>
        next.has(value),
      );
    });
  }

  async function handleManualUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadError(null);
    setCreatedJob(null);

    if (!examPdf) {
      setUploadError("Attach the exam PDF before submitting.");
      setUploading(false);
      return;
    }

    const payload = new FormData();
    payload.set("year", year);
    paperStreamCodes.forEach((code) => {
      payload.append("paper_stream_codes", code);
    });
    payload.set("subject_code", subjectCode);
    payload.set("session", session);
    payload.set("title", title.trim() || generatedTitle);
    if (qualifierKey.trim()) {
      payload.set("qualifier_key", qualifierKey.trim());
    }
    if (sourceReference.trim()) {
      payload.set("source_reference", sourceReference.trim());
    }
    payload.set("exam_pdf", examPdf);

    if (correctionPdf) {
      payload.set("correction_pdf", correctionPdf);
    }

    try {
      const created = await fetchAdmin("/ingestion/intake/manual", {
        method: "POST",
        body: payload,
      });
      const createdPayload = parseAdminIngestionJobResponse(
        await created.json(),
      );
      setCreatedJob(createdPayload);
      setTitle(generatedTitle);
      previousGeneratedTitleRef.current = generatedTitle;
      setQualifierKey("");
      setSourceReference("");
      setExamPdf(null);
      setCorrectionPdf(null);
      event.currentTarget.reset();
    } catch (submitError) {
      setUploadError(
        submitError instanceof Error
          ? submitError.message
          : "Manual intake failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="panel">
      <div className="admin-page-head">
        <div className="admin-page-intro">
          <h1>Intake</h1>
          <div className="admin-page-meta-row">
            <span className="admin-page-meta-pill">{year}</span>
            <span className="admin-page-meta-pill">
              {paperStreamCodes.join(" + ")}
            </span>
            <span className="admin-page-meta-pill">{subjectCode}</span>
            <span className="admin-page-meta-pill">
              {session === "MAKEUP" ? "Rattrapage" : "Normal"}
            </span>
          </div>
        </div>
        <div className="table-actions">
          <Link href="/admin/drafts" className="btn-secondary">
            Open Drafts
          </Link>
          <Link href="/admin/library" className="btn-secondary">
            Open Library
          </Link>
        </div>
      </div>

      <div className="ingestion-entry-grid">
        <AdminIngestionManualUploadSection
          year={year}
          paperStreamCodes={paperStreamCodes}
          subjectCode={subjectCode}
          session={session}
          title={title}
          qualifierKey={qualifierKey}
          sourceReference={sourceReference}
          uploading={uploading}
          uploadError={uploadError}
          createdJob={createdJob}
          onSubmit={handleManualUpload}
          onYearChange={setYear}
          onTogglePaperStream={togglePaperStream}
          onSubjectCodeChange={setSubjectCode}
          onSessionChange={setSession}
          onTitleChange={setTitle}
          onQualifierKeyChange={setQualifierKey}
          onSourceReferenceChange={setSourceReference}
          onExamPdfChange={setExamPdf}
          onCorrectionPdfChange={setCorrectionPdf}
        />
      </div>
    </section>
  );
}
