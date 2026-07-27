"use client";

import React, { useRef, useState } from "react";
import { cx } from "@/components/ui";

export function Dropzone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cx(
        "rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        dragging ? "border-accent-500 bg-accent-50/60" : "border-hairline bg-card",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,application/pdf,.pdf,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-50 text-accent-ink">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M8 8l4-4 4 4" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      </div>
      <p className="mt-4 text-sm font-medium text-ink-800">Drop a statement here, or</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 rounded-xl bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
      >
        Choose a file
      </button>
      <p className="mt-4 text-xs text-ink-500">CSV or text-based PDF work best. Images &amp; scans use on-device OCR.</p>
    </div>
  );
}
