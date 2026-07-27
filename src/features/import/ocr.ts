import type { ExtractionResult } from "./types";
import { extractFromTextLines } from "./text";
import { asset } from "@/lib/basePath";

export type OcrProgress = (status: string, progress: number) => void;

/**
 * Tesseract engine + language data are self-hosted under /public/tesseract, so OCR
 * runs fully offline with no third-party CDN — nothing about the statement (or even
 * the fact that OCR ran) leaves the device. asset() adds the base path on GitHub Pages.
 */
const TESSERACT_OPTIONS = {
  workerPath: asset("/tesseract/worker.min.js"),
  corePath: asset("/tesseract"),
  langPath: asset("/tesseract/lang"),
} as const;

async function makeWorker(onProgress?: OcrProgress) {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, {
    ...TESSERACT_OPTIONS,
    logger: (m: { status: string; progress: number }) => onProgress?.(m.status, m.progress),
  });
}

/**
 * Run OCR on an image (or a rendered scanned page) fully in the browser using
 * tesseract.js, lazy-imported so its heavy WASM engine only loads on demand.
 */
export async function extractFromImage(file: File, onProgress?: OcrProgress): Promise<ExtractionResult> {
  const worker = await makeWorker(onProgress);

  try {
    const url = URL.createObjectURL(file);
    const { data } = await worker.recognize(url);
    URL.revokeObjectURL(url);

    return finishOcr(data.text, file.name);
  } finally {
    await worker.terminate();
  }
}

/** OCR a scanned PDF that was rendered to canvases, concatenating page text. */
export async function extractFromCanvases(
  canvases: HTMLCanvasElement[],
  fileName: string,
  onProgress?: OcrProgress
): Promise<ExtractionResult> {
  const worker = await makeWorker(onProgress);
  try {
    let text = "";
    for (let i = 0; i < canvases.length; i++) {
      onProgress?.(`recognizing page ${i + 1}/${canvases.length}`, i / canvases.length);
      const { data } = await worker.recognize(canvases[i]);
      text += data.text + "\n";
    }
    return finishOcr(text, fileName);
  } finally {
    await worker.terminate();
  }
}

function finishOcr(rawText: string, fileName: string): ExtractionResult {
  const { transactions, rawLines } = extractFromTextLines(rawText, fileName, "image");
  const notes: string[] = [
    "Text was read from an image with OCR — accuracy varies with photo quality. Please check the preview carefully before importing.",
  ];
  if (transactions.length === 0) {
    notes.push("Couldn't identify transaction lines from the image. A clearer photo, a PDF, or a CSV will work better.");
  }
  return { source: "image", fileName, transactions, rawLines, notes };
}
