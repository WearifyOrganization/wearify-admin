// Client-side downscale + WebP re-encode before upload. A 3-5MB phone photo
// (often 4000px+) becomes a ~2048px WebP of a few hundred KB, which shrinks
// Convex storage and every downstream render (grid, detail, kiosk, mirror).
//
// Falls back to the original File if anything fails or the result isn't smaller,
// so a broken encode can never block an upload or bloat storage.
//
// ponytail: single-size source cap; next/image resizes per surface on read.
// Bump MAX_DIM if the kiosk ever needs > 2048px full-screen source detail.
//
// METRICS: three counters/distributions, one per outcome, because the two
// fallbacks are silent by construction — an unsupported tablet and a throwing
// encoder both just return the original file, and without a metric the only
// symptom is a slow storage bill. `outcome` is a closed set, so the whole
// funnel is one query. Deliberately NOT a log per call: this runs once per
// photo on every device, and a counter answers "how often" for a fraction of
// the cost of a log line that nobody reads individually.

import * as Sentry from "@sentry/nextjs";

const MAX_DIM = 2048;
const QUALITY = 0.85;

/**
 * The flat-lay is cut into the try-on card: its border strips are a few
 * percent of its width blown up to a 1484-px panel, so it keeps more pixels
 * than a catalogue photo needs. Close-ups are already close.
 */
export const FLAT_LAY_MAX_DIM = 3072;

type Outcome = "compressed" | "not_smaller" | "unsupported" | "failed";

function record(outcome: Outcome): void {
  Sentry.metrics.count("image.compress.total", 1, { attributes: { outcome } });
}

export async function compressImage(file: File, opts: { maxDim?: number } = {}): Promise<File> {
  const maxDim = opts.maxDim ?? MAX_DIM;
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  // No OffscreenCanvas / bitmap support → don't risk it, upload as-is.
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    record("unsupported");
    return file;
  }

  const startedAt = performance.now();
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); record("failed"); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITY });
    // Already-small / hard-to-compress images: keep the original, never bloat.
    if (blob.size >= file.size) { record("not_smaller"); return file; }

    record("compressed");
    // Duration is what makes the kiosk's oldest tablet visible; the ratio is
    // what says whether the encode is still earning its keep.
    Sentry.metrics.distribution("image.compress.duration", performance.now() - startedAt, {
      unit: "millisecond",
    });
    Sentry.metrics.distribution("image.compress.ratio", blob.size / file.size, {
      unit: "ratio",
    });

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: file.lastModified });
  } catch {
    record("failed");
    return file;
  }
}
