import type { ExtractionResult } from "./types";
import { extractFromTextLines } from "./text";

export type OcrProgress = (status: string, progress: number) => void;

/**
 * Run OCR on an image (or a rendered scanned page) fully in the browser using
 * tesseract.js, lazy-imported so its heavy WASM engine only loads on demand.
 *
 * Privacy note: the image never leaves the device — only tesseract's engine code
 * and language data are fetched (from a CDN by default). No statement data is uploaded.
 */
export async function extractFromImage(file: File, onProgress?: OcrProgress): Promise<ExtractionResult> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (onProgress) onProgress(m.status, m.progress);
    },
  });

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
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => onProgress?.(m.status, m.progress),
  });
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
