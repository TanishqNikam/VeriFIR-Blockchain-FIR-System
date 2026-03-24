/**
 * lib/file-validation.ts
 *
 * Server-side file validation for evidence uploads.
 * Checks MIME type (declared + magic bytes), file size, file count,
 * and total request size — not just what the browser claims.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;       // 10 MB per file
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;      // 50 MB per request
export const MAX_FILE_COUNT = 10;                           // files per request

/** Allowed MIME types and their human-readable labels */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/gif": "GIF image",
  "image/webp": "WebP image",
  "application/pdf": "PDF document",
  "video/mp4": "MP4 video",
  "video/quicktime": "QuickTime video",
};

// ─── Magic byte signatures ────────────────────────────────────────────────────

type MagicEntry = {
  mime: string;
  /** Byte offset to start reading from */
  offset: number;
  /** Expected bytes as hex string */
  hex: string;
};

const MAGIC_SIGNATURES: MagicEntry[] = [
  { mime: "image/jpeg",       offset: 0, hex: "ffd8ff" },
  { mime: "image/png",        offset: 0, hex: "89504e470d0a1a0a" },
  { mime: "image/gif",        offset: 0, hex: "474946383761" },   // GIF87a
  { mime: "image/gif",        offset: 0, hex: "474946383961" },   // GIF89a
  { mime: "image/webp",       offset: 8, hex: "57454250" },       // WEBP at bytes 8-11
  { mime: "application/pdf",  offset: 0, hex: "25504446" },       // %PDF
  { mime: "video/mp4",        offset: 4, hex: "66747970" },       // ftyp box
  { mime: "video/quicktime",  offset: 4, hex: "66747970" },       // ftyp box (MOV shares)
];

function detectMimeFromBytes(buffer: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buffer.slice(sig.offset, sig.offset + sig.hex.length / 2);
    if (slice.toString("hex").startsWith(sig.hex)) {
      return sig.mime;
    }
  }
  return null;
}

// ─── Validation result ────────────────────────────────────────────────────────

export type FileValidationError = {
  file: string;
  reason: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: FileValidationError[] };

// ─── Main validator ───────────────────────────────────────────────────────────

/**
 * Validate a list of File objects from FormData.
 * Returns { ok: true } or { ok: false, errors }.
 *
 * This reads the first few bytes of each file to check magic bytes,
 * so it must be called before the buffers are consumed elsewhere.
 */
export async function validateFiles(files: File[]): Promise<ValidationResult> {
  const errors: FileValidationError[] = [];

  // ── Count check ─────────────────────────────────────────────────────────────
  const nonEmpty = files.filter((f) => f.size > 0);
  if (nonEmpty.length > MAX_FILE_COUNT) {
    errors.push({
      file: "(request)",
      reason: `Too many files. Maximum is ${MAX_FILE_COUNT} per submission.`,
    });
    // Return early — no point checking individual files
    return { ok: false, errors };
  }

  // ── Total size check ────────────────────────────────────────────────────────
  const totalSize = nonEmpty.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    errors.push({
      file: "(request)",
      reason: `Total upload size ${formatBytes(totalSize)} exceeds the ${formatBytes(MAX_TOTAL_SIZE_BYTES)} limit.`,
    });
    return { ok: false, errors };
  }

  // ── Per-file checks ─────────────────────────────────────────────────────────
  for (const file of nonEmpty) {
    // 1. Individual size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({
        file: file.name,
        reason: `File size ${formatBytes(file.size)} exceeds the ${formatBytes(MAX_FILE_SIZE_BYTES)} per-file limit.`,
      });
      continue;
    }

    // 2. Declared MIME type must be in allowlist
    const declaredMime = (file.type || "").toLowerCase();
    if (!ALLOWED_TYPES[declaredMime]) {
      errors.push({
        file: file.name,
        reason: `File type "${declaredMime || "unknown"}" is not allowed. Accepted: ${Object.keys(ALLOWED_TYPES).join(", ")}.`,
      });
      continue;
    }

    // 3. Magic byte check — read first 16 bytes only
    const headerSlice = file.slice(0, 16);
    const headerBytes = Buffer.from(await headerSlice.arrayBuffer());
    const detectedMime = detectMimeFromBytes(headerBytes);

    if (!detectedMime) {
      errors.push({
        file: file.name,
        reason: `File content does not match any recognised format. The file may be corrupted or disguised.`,
      });
      continue;
    }

    // MP4 and QuickTime share the same magic bytes — treat as interchangeable
    const isMp4Family =
      (declaredMime === "video/mp4" || declaredMime === "video/quicktime") &&
      (detectedMime === "video/mp4" || detectedMime === "video/quicktime");

    if (detectedMime !== declaredMime && !isMp4Family) {
      errors.push({
        file: file.name,
        reason: `File content does not match the declared type "${declaredMime}". Detected: "${detectedMime}".`,
      });
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
