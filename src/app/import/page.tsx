"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { Dropzone } from "@/features/import/ui/Dropzone";
import { ExtractionPreview } from "@/features/import/ui/ExtractionPreview";
import { DetectedReview } from "@/features/import/ui/DetectedReview";
import { classifyFile, detectRecurring, extractFile, ocrScannedPdf } from "@/features/import";
import type { DetectedSubscription, ExtractionResult } from "@/features/import";

type Step = "upload" | "working" | "preview" | "review" | "done";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<(ExtractionResult & { scannedLikely?: boolean }) | null>(null);
  const [detected, setDetected] = useState<DetectedSubscription[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("upload");
    setResult(null);
    setDetected([]);
    setPendingFile(null);
    setProgress(null);
    setError(null);
  };

  const runExtract = async (file: File) => {
    setError(null);
    setPendingFile(file);
    const kind = classifyFile(file);
    if (kind === "unknown") {
      setError("Unsupported file type. Please choose a CSV, PDF, or image.");
      return;
    }
    setStep("working");
    setProgress(kind === "image" ? { label: "Starting OCR…", pct: 0 } : { label: "Reading file…", pct: 0 });
    try {
      const res = await extractFile(file, (status, p) =>
        setProgress({ label: `${status}…`, pct: Math.round(p * 100) })
      );
      setResult(res);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong reading that file.");
      setStep("upload");
    } finally {
      setProgress(null);
    }
  };

  const runPdfOcr = async () => {
    if (!pendingFile) return;
    setStep("working");
    setProgress({ label: "Rendering pages…", pct: 0 });
    try {
      const res = await ocrScannedPdf(pendingFile, (status, p) =>
        setProgress({ label: `${status}…`, pct: Math.round(p * 100) })
      );
      setResult(res);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed on that PDF.");
      setStep("preview");
    } finally {
      setProgress(null);
    }
  };

  const runDetect = () => {
    if (!result) return;
    setDetected(detectRecurring(result.transactions));
    setStep("review");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Import from a statement</h1>
          <p className="text-sm text-ink-500">Find subscriptions in a bank or card statement.</p>
        </div>
        <Link href="/" className="text-sm font-medium text-ink-500 hover:text-ink-900">
          Done
        </Link>
      </div>

      {/* Privacy banner */}
      <div className="flex items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 text-sm text-ink-700">
        <span aria-hidden className="mt-0.5">🔒</span>
        <p>
          Your statement is processed <strong>entirely in this browser</strong> and never uploaded. CSV or a text-based
          PDF give the most accurate results; photos and scans use on-device OCR, which can misread digits.
        </p>
      </div>

      {error && <div className="rounded-xl bg-urgent-50 px-4 py-3 text-sm text-urgent-600">{error}</div>}

      {step === "upload" && (
        <>
          <Dropzone onFile={runExtract} />
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {[
              { t: "CSV", d: "Bank/card export. Most reliable.", best: true },
              { t: "PDF", d: "Text-based statements. Very reliable." },
              { t: "Image / scan", d: "Photo or screenshot. OCR — check results." },
            ].map((x) => (
              <Card key={x.t} className="p-4">
                <p className="font-semibold text-ink-900">
                  {x.t} {x.best && <span className="text-xs font-normal text-positive-600">· recommended</span>}
                </p>
                <p className="mt-1 text-xs text-ink-500">{x.d}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === "working" && (
        <div className="rounded-2xl border border-line bg-canvas-card px-6 py-14 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-100 border-t-brand-500" />
          <p className="mt-4 text-sm font-medium text-ink-800">{progress?.label ?? "Working…"}</p>
          {progress && progress.pct > 0 && (
            <div className="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded-full bg-canvas-sunken">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          )}
          <p className="mt-3 text-xs text-ink-400">Processing on your device — nothing is uploaded.</p>
        </div>
      )}

      {step === "preview" && result && (
        <>
          {result.scannedLikely && (
            <div className="rounded-2xl border border-caution-500/30 bg-caution-50/60 px-4 py-3">
              <p className="text-sm text-ink-700">
                This PDF looks scanned (little selectable text). Want to read it with on-device OCR instead?
              </p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={runPdfOcr}>
                Read it with OCR
              </Button>
            </div>
          )}
          <ExtractionPreview result={result} onBack={reset} onContinue={runDetect} />
        </>
      )}

      {step === "review" && (
        <DetectedReview
          detected={detected}
          onBack={() => setStep("preview")}
          onDone={(count) => {
            setImportedCount(count);
            setStep("done");
          }}
        />
      )}

      {step === "done" && (
        <div className="rounded-2xl border border-positive-500/30 bg-positive-50/50 px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-positive-500 text-white">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">
            {importedCount} subscription{importedCount === 1 ? "" : "s"} imported
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">They&apos;re on your dashboard now, sorted by next billing date.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/">
              <Button variant="primary">Go to dashboard</Button>
            </Link>
            <Button variant="ghost" onClick={reset}>
              Import another
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
