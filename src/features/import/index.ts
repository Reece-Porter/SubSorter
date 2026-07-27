import type { ExtractionResult, ImportSource } from "./types";

export type { ExtractionResult, ParsedTransaction, DetectedSubscription, ImportSource } from "./types";
export { detectRecurring } from "./detect";

export function classifyFile(file: File): ImportSource | "unknown" {
  const name = file.name.toLowerCase();
  const type = file.type;
  if (type === "text/csv" || name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) return "csv";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic)$/.test(name)) return "image";
  return "unknown";
}

/**
 * Extract transactions from a file, lazy-loading the parser for its type so heavy
 * dependencies (pdfjs, tesseract) are only pulled in when actually needed.
 * `scannedLikely` is set for PDFs with no selectable text, so the UI can offer OCR.
 */
export async function extractFile(
  file: File,
  onProgress?: (status: string, progress: number) => void
): Promise<ExtractionResult & { scannedLikely?: boolean }> {
  const kind = classifyFile(file);
  switch (kind) {
    case "csv": {
      const { extractFromCsv } = await import("./csv");
      const text = await file.text();
      return extractFromCsv(text, file.name);
    }
    case "pdf": {
      const { extractFromPdf } = await import("./pdf");
      return extractFromPdf(file);
    }
    case "image": {
      const { extractFromImage } = await import("./ocr");
      return extractFromImage(file, onProgress);
    }
    default:
      return {
        source: "csv",
        fileName: file.name,
        transactions: [],
        rawLines: [],
        notes: ["Unsupported file type. Please upload a CSV, PDF, or image (PNG/JPG)."],
      };
  }
}

/** OCR a scanned PDF by rendering its pages and running them through Tesseract. */
export async function ocrScannedPdf(
  file: File,
  onProgress?: (status: string, progress: number) => void
): Promise<ExtractionResult> {
  const { renderPdfToCanvases } = await import("./pdf");
  const { extractFromCanvases } = await import("./ocr");
  onProgress?.("rendering pdf", 0);
  const canvases = await renderPdfToCanvases(file);
  return extractFromCanvases(canvases, file.name, onProgress);
}
