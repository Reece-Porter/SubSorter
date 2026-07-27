import type { ExtractionResult } from "./types";
import { extractFromTextLines } from "./text";

/**
 * Extract text from a PDF entirely in the browser (no upload). Uses pdfjs-dist,
 * lazy-imported so the ~1MB library only loads when a PDF is actually chosen.
 * Groups text items into lines by their vertical position so statement rows stay intact.
 */
export async function extractFromPdf(file: File): Promise<ExtractionResult & { scannedLikely: boolean }> {
  const pdfjs = await import("pdfjs-dist");
  // Worker is served locally from /public — nothing leaves the device.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const allLines: string[] = [];
  let totalChars = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Group items by rounded Y so words on the same visual row join into one line.
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      if (!("str" in item) || !item.str.trim()) continue;
      totalChars += item.str.length;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const bucket = [...rows.keys()].find((k) => Math.abs(k - y) <= 3);
      const key = bucket ?? y;
      const arr = rows.get(key) ?? [];
      arr.push({ x, str: item.str });
      rows.set(key, arr);
    }
    const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]); // top to bottom
    for (const [, items] of ordered) {
      const line = items.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) allLines.push(line);
    }
  }

  const text = allLines.join("\n");
  const { transactions, rawLines } = extractFromTextLines(text, file.name, "pdf");

  // Almost no extractable text usually means a scanned (image-only) PDF.
  const scannedLikely = totalChars < 40;
  const notes: string[] = [];
  if (scannedLikely) {
    notes.push(
      "This PDF has little or no selectable text — it looks scanned. Try the image/OCR path, or export a text-based statement."
    );
  } else if (transactions.length === 0) {
    notes.push("Extracted text but couldn't identify transaction lines. Check the preview below.");
  }

  return { source: "pdf", fileName: file.name, transactions, rawLines, notes, scannedLikely };
}

/**
 * Render each PDF page to a canvas (for OCR-ing a scanned/image-only PDF).
 * Rendered at 2x scale for better OCR legibility.
 */
export async function renderPdfToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const canvases: HTMLCanvasElement[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
  }
  return canvases;
}
