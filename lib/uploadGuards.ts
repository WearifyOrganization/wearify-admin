/**
 * Shared upload guard presets. Mirrored server-side in convex/fileValidation.ts
 * — keep the two in sync if you ever change a limit. Client check is the
 * first line of defence (fast feedback, saves bandwidth); server check is
 * the actual security boundary.
 */

export type UploadGuard = {
  maxBytes: number;
  /**
   * MIME prefixes (ending in "/") or exact types.
   * Example: ["image/"] accepts any image; ["image/", "application/pdf"]
   * accepts images or PDFs.
   */
  accept: string[];
  /** Used in error messages so the UI names the offending input. */
  label: string;
};

const MB = 1024 * 1024;

export const GUARDS = {
  // 20 MB: catalogue flat-lays come straight off a DSLR / phone at full
  // resolution, and the card builder wants that detail. The store forms
  // still downscale to 2048px WebP before upload (lib/imageCompress), so
  // what is stored is far smaller — this is the ceiling, not the norm.
  sareePhoto:     { maxBytes: 20 * MB, accept: ["image/"],                        label: "Saree photo" },
  portfolioPhoto: { maxBytes: 5 * MB,  accept: ["image/"],                        label: "Portfolio photo" },
  storeLogo:      { maxBytes: 2 * MB,  accept: ["image/"],                        label: "Store logo" },
  customerPhoto:  { maxBytes: 4 * MB,  accept: ["image/"],                        label: "Profile photo" },
  kycDocument:    { maxBytes: 10 * MB, accept: ["image/", "application/pdf"],     label: "KYC document" },
  bodyScan:       { maxBytes: 10 * MB, accept: ["image/"],                        label: "Body scan photo" },
  // Background-removed AI try-on render. PNG with transparency, produced
  // client-side in the kiosk by Transformers.js RMBG-1.4.
  lookCutout:     { maxBytes: 5 * MB,  accept: ["image/png"],                     label: "Cutout image" },
} as const satisfies Record<string, UploadGuard>;

/**
 * Format the accept list for a user-facing error message. e.g. ["image/"]
 * becomes "image", ["image/", "application/pdf"] becomes "image or PDF".
 */
export function formatAccept(accept: readonly string[]): string {
  return accept
    .map((t) => {
      if (t === "image/") return "image";
      if (t === "application/pdf") return "PDF";
      return t;
    })
    .join(" or ");
}

/**
 * Throws a human-readable Error if the file violates the guard. Mirrors
 * server-side validation exactly so the messages match.
 */
export function assertFileClient(file: File, guard: UploadGuard): void {
  if (file.size > guard.maxBytes) {
    const mb = (guard.maxBytes / MB).toFixed(1);
    throw new Error(`${guard.label} exceeds ${mb} MB limit`);
  }
  const ok = guard.accept.some((t) =>
    t.endsWith("/") ? file.type.startsWith(t) : file.type === t,
  );
  if (!ok) {
    throw new Error(`${guard.label} must be ${formatAccept(guard.accept)}`);
  }
}
