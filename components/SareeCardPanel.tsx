"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import type { Id } from "@wearify/shared/dataModel";
import { getToken } from "@/lib/phoneAuth";
import { useUploadFile } from "@/lib/useUpload";
import { GUARDS } from "@/lib/uploadGuards";
import { compressImage, FLAT_LAY_MAX_DIM } from "@/lib/imageCompress";
import { cleanError } from "@/components/ui/toast";
import { PHOTO_SLOTS, type PhotoSlotKey, type SareePhotos } from "@wearify/shared/sareePhotos";
import { CARD_FLAG_LABELS, type CardFlagCode } from "@wearify/shared/cardFlags";

/* The try-on reference card for one saree: the card itself, why it is (or is
   not) trustworthy, the six photo slots that feed it, and the four guides an
   operator drags when detection got the flat-lay wrong. Used by the store's
   saree page (session token) and the admin approval views (Better Auth). */

type Boundaries = { left: number; right: number; palluY: number; palluAtBottom: boolean; hemSide?: "left" | "right" };
/** The cloth's rectangle inside the flat-lay photo, fractions of the photo. The guides are fractions of THIS. */
type Cloth = { x: number; y: number; w: number; h: number };
type Guide = "left" | "right" | "pallu";

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  queued:   { label: "Queued",       bg: "#F9F3E4", fg: "#7A5B12" },
  building: { label: "Building…",    bg: "#F9F3E4", fg: "#7A5B12" },
  ready:    { label: "Ready",        bg: "#ECF3ED", fg: "#27741E" },
  review:   { label: "Needs review", bg: "#F6CBB7", fg: "#68262A" },
  failed:   { label: "Failed",       bg: "#F7E6EA", fg: "#C0392B" },
  none:     { label: "No card yet",  bg: "#EFEFEF", fg: "#555" },
};

export default function SareeCardPanel({ sareeId, auth }: { sareeId: Id<"sarees">; auth: "store" | "admin" }) {
  const token = auth === "store" ? getToken() ?? undefined : undefined;
  const view = useQuery(api.sareeCards.getForSaree, { token, sareeId });
  const setOverride = useMutation(api.sareeCards.setOverride);
  const clearOverride = useMutation(api.sareeCards.clearOverride);
  const confirmFlatLay = useMutation(api.sareeCards.confirmFlatLay);
  const rebuild = useMutation(api.sareeCards.rebuild);
  const updateSaree = useMutation(api.sarees.update);
  const { upload } = useUploadFile();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [guides, setGuides] = useState<Boundaries | null>(null);
  const [dirty, setDirty] = useState(false);
  const [slotTarget, setSlotTarget] = useState<PhotoSlotKey | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Seed the guides from the server until the operator starts dragging.
  useEffect(() => {
    if (view && !dirty) setGuides(view.defaultBoundaries);
  }, [view, dirty]);

  async function run(key: string, fn: () => Promise<unknown>, fallback: string) {
    setBusy(key); setError("");
    try { await fn(); }
    catch (e) { setError(cleanError(e, fallback)); }
    finally { setBusy(null); }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slot = slotTarget;
    e.target.value = "";
    if (!file || !slot || !view) return;
    await run(`slot:${slot}`, async () => {
      const compressed = await compressImage(file, slot === "flatLay" ? { maxDim: FLAT_LAY_MAX_DIM } : {});
      const id = await upload(compressed, GUARDS.sareePhoto, { token });
      const photos: SareePhotos = { ...view.photos, [slot]: id };
      await updateSaree({ token, id: sareeId, photos });
    }, "Couldn't upload that photo");
  }

  async function removeSlot(slot: PhotoSlotKey) {
    if (!view) return;
    await run(`slot:${slot}`, async () => {
      const photos: SareePhotos = { ...view.photos };
      delete photos[slot];
      await updateSaree({ token, id: sareeId, photos });
    }, "Couldn't remove that photo");
  }

  if (view === undefined) return <div className="scp-skeleton" />;
  if (view === null) return null;

  const card = view.card;
  const status = !card ? "none" : card.status === "ready" && card.needsReview ? "review" : card.status;
  const chip = STATUS_LABEL[status] ?? STATUS_LABEL.none;
  const flags = (card?.flags ?? []) as CardFlagCode[];
  const visibleFlags = flags.filter((f) => f !== "flatlay_unconfirmed" || !card?.flatLayConfirmed);
  const flatLayUrl = view.photoUrls.flatLay ?? null;

  return (
    <div className="scp">
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />

      <div className="scp-head">
        <div>
          <h3 className="scp-title">Try-on reference card</h3>
          <p className="scp-sub">
            One 1536×1536 image the try-on model reads with the flat-lay. Rebuilt whenever a photo or a guide changes.
          </p>
        </div>
        <div className="scp-head-right">
          <span className="scp-chip" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>
          <button
            type="button"
            className="scp-btn"
            disabled={!view.photos.flatLay || busy !== null}
            onClick={() => run("rebuild", () => rebuild({ token, sareeId }), "Couldn't queue a rebuild")}
          >
            {busy === "rebuild" ? "Queuing…" : "Rebuild"}
          </button>
        </div>
      </div>

      {error && <div className="scp-error" role="alert">{error}</div>}
      {card?.status === "failed" && card.error && <div className="scp-error">Build failed: {card.error}</div>}

      <div className="scp-cols">
        {/* ── Card preview ── */}
        <div className="scp-preview">
          {view.cardUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.cardUrl} alt="Reference card" className="scp-card-img" />
          ) : (
            <div className="scp-empty">
              {!view.photos.flatLay
                ? "Add a flat-lay photo to build the card."
                : status === "queued" || status === "building"
                  ? "Building the card…"
                  : "No card yet."}
            </div>
          )}
          {card?.builtAt && (
            <p className="scp-meta">
              Built {new Date(card.builtAt).toLocaleString("en-IN")} · guides {card.boundarySource ?? "—"}
              {card.boundaries && (
                <> · borders {pct(card.boundaries.left)} / {pct(card.boundaries.right)} · pallu {pct(card.boundaries.palluY)} from top{card.boundaries.palluAtBottom ? "" : " (at top)"} · hem on the {hemSideOf(card.boundaries)}</>
              )}
            </p>
          )}
          {view.markedFlatLayUrl && (
            <div className="scp-marked">
              <p className="scp-marked-title">Flat-lay as the model reads it</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={view.markedFlatLayUrl} alt="Marked flat-lay" className="scp-card-img" />
              <p className="scp-meta">Cloth only, pallu at the bottom, each region outlined and named from the guides above. Sent with the card.</p>
            </div>
          )}
        </div>

        {/* ── Review + guides ── */}
        <div className="scp-side">
          {visibleFlags.length > 0 ? (
            <ul className="scp-flags">
              {visibleFlags.map((f) => (
                <li key={f} className="scp-flag">{CARD_FLAG_LABELS[f] ?? f}</li>
              ))}
            </ul>
          ) : card?.status === "ready" ? (
            <p className="scp-ok">No issues found. A wrong card is worse than no card, so still glance at the preview.</p>
          ) : null}
          {card?.detectionReasons && card.detectionReasons.length > 0 && (
            <p className="scp-meta">Detector said: {card.detectionReasons.join("; ")}</p>
          )}

          {card && (
            <label className="scp-check">
              <input
                type="checkbox"
                checked={!!card.flatLayConfirmed}
                disabled={busy !== null}
                onChange={(e) => run("confirm", () => confirmFlatLay({ token, sareeId, confirmed: e.target.checked }), "Couldn't save")}
              />
              I have checked the flat-lay is the whole cloth laid flat, not folded or draped
            </label>
          )}

          {flatLayUrl && guides && (
            <GuideEditor
              src={flatLayUrl}
              cloth={view.cloth}
              guides={guides}
              onChange={(g) => { setGuides(g); setDirty(true); }}
            />
          )}
          {flatLayUrl && guides && (
            <div className="scp-guide-actions">
              <button
                type="button"
                className="scp-btn scp-btn--solid"
                disabled={busy !== null || !dirty}
                onClick={() =>
                  run("save", async () => {
                    await setOverride({ token, sareeId, boundaries: guides });
                    setDirty(false);
                  }, "Couldn't save the guides")
                }
              >
                {busy === "save" ? "Saving…" : "Save guides & rebuild"}
              </button>
              {card?.override && (
                <button
                  type="button"
                  className="scp-btn"
                  disabled={busy !== null}
                  onClick={() =>
                    run("reset", async () => {
                      await clearOverride({ token, sareeId });
                      setDirty(false);
                    }, "Couldn't reset the guides")
                  }
                >
                  Reset to detected
                </button>
              )}
              <span className="scp-meta">
                Drag the lines to the inner edge of each border and the start of the pallu. A dashed box marks the cloth when the photo has a margin around it.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Photo slots ── */}
      <div className="scp-slots">
        {PHOTO_SLOTS.map((slot) => {
          const url = view.photoUrls[slot.key as keyof typeof view.photoUrls];
          const has = !!view.photos[slot.key];
          const working = busy === `slot:${slot.key}`;
          return (
            <div key={slot.key} className={`scp-slot${has ? " is-filled" : ""}`}>
              <button
                type="button"
                className="scp-slot-btn"
                disabled={busy !== null}
                title={slot.hint}
                onClick={() => { setSlotTarget(slot.key); fileInput.current?.click(); }}
              >
                {has && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={slot.label} className="scp-slot-img" />
                ) : (
                  <span className="scp-slot-add">{working ? "Uploading…" : "+ Add"}</span>
                )}
              </button>
              <div className="scp-slot-foot">
                <span className="scp-slot-label">
                  {slot.label}
                  <i>{slot.required ? "Required" : slot.usedInCard ? "Optional" : "Catalogue only"}</i>
                </span>
                {has && !slot.required && (
                  <button type="button" className="scp-slot-x" disabled={busy !== null} onClick={() => removeSlot(slot.key)} aria-label={`Remove ${slot.label}`}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .scp { color: #000; font-family: inherit; }
        .scp-skeleton { height: 240px; border-radius: 12px; background: #F3F3F3; }
        .scp-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .scp-title { font-size: 16px; font-weight: 600; line-height: 20px; }
        .scp-sub { margin-top: 4px; font-size: 12px; color: #727272; max-width: 560px; }
        .scp-head-right { display: flex; align-items: center; gap: 10px; }
        .scp-chip { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .scp-btn {
          height: 34px; padding: 0 14px; border-radius: 8px; cursor: pointer;
          background: #fff; border: 1px solid var(--w-maroon-l, #68262A); color: var(--w-maroon-l, #68262A);
          font-family: inherit; font-size: 12px; font-weight: 600;
        }
        .scp-btn--solid { background: var(--w-maroon-l, #68262A); color: #fff; }
        .scp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .scp-error { margin-top: 12px; padding: 10px 14px; border-radius: 8px; background: rgba(192, 57, 43, 0.08); color: #C0392B; font-size: 13px; font-weight: 600; }
        .scp-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-top: 16px; }
        .scp-preview { min-width: 0; }
        .scp-card-img { width: 100%; height: auto; border: 1px solid #E3E3E3; border-radius: 10px; background: #fff; display: block; }
        .scp-empty { aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; border: 1px dashed #D9D9D9; border-radius: 10px; color: #727272; font-size: 13px; text-align: center; padding: 20px; }
        .scp-meta { margin-top: 8px; font-size: 11px; color: #727272; line-height: 15px; }
        .scp-marked { margin-top: 16px; }
        .scp-marked-title { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .scp-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .scp-flags { list-style: none; display: flex; flex-direction: column; gap: 6px; }
        .scp-flag { padding: 8px 12px; border-radius: 8px; background: #F9F3E4; color: #7A5B12; font-size: 12px; font-weight: 500; line-height: 16px; }
        .scp-ok { padding: 8px 12px; border-radius: 8px; background: #ECF3ED; color: #27741E; font-size: 12px; font-weight: 500; }
        .scp-check { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; line-height: 16px; color: #000; cursor: pointer; }
        .scp-check input { margin-top: 2px; }
        .scp-guide-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .scp-slots { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-top: 20px; }
        .scp-slot { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .scp-slot-btn {
          width: 100%; aspect-ratio: 4 / 3; padding: 0; overflow: hidden;
          border: 2px dashed var(--w-maroon-l, #68262A); border-radius: 8px; background: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .scp-slot.is-filled .scp-slot-btn { border-style: solid; }
        .scp-slot-btn:disabled { cursor: not-allowed; opacity: 0.7; }
        .scp-slot-img { width: 100%; height: 100%; object-fit: cover; }
        .scp-slot-add { font-size: 12px; font-weight: 600; color: var(--w-maroon-l, #68262A); }
        .scp-slot-foot { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
        .scp-slot-label { display: flex; flex-direction: column; font-size: 11px; font-weight: 600; line-height: 14px; }
        .scp-slot-label i { font-style: normal; font-weight: 500; color: #727272; }
        .scp-slot-x { border: none; background: none; padding: 0; font-family: inherit; font-size: 11px; color: #C0392B; cursor: pointer; }
        @media (max-width: 1100px) { .scp-slots { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 900px) { .scp-cols { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </div>
  );
}

function pct(f: number): string {
  return `${Math.round(f * 100)}%`;
}

/** The selvedge that lands at the ankles: the merchant's choice, else the wider one. */
function hemSideOf(b: Boundaries): "left" | "right" {
  return b.hemSide ?? (b.left >= b.right ? "left" : "right");
}

/** The panel in an overlay, for the admin tables (Tailwind surfaces). */
export function SareeCardModal({ sareeId, name, onClose }: { sareeId: Id<"sarees">; name: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-6"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white text-black rounded-xl w-full max-w-5xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold">{name}</h3>
          <button type="button" className="text-sm px-3 py-1 rounded border border-gray-300" onClick={onClose}>Close</button>
        </div>
        <SareeCardPanel sareeId={sareeId} auth="admin" />
      </div>
    </div>
  );
}

/** Try-on card status as one approval check chip. */
export function cardCheck(s: { status: string; flags: string[]; needsReview: boolean } | null | undefined) {
  if (s === undefined) return { label: "Try-on card", pass: false, pending: true };
  if (!s) return { label: "Try-on card: none", pass: false, pending: false };
  if (s.status === "failed") return { label: "Try-on card failed", pass: false, pending: false };
  if (s.status !== "ready") return { label: "Try-on card building", pass: false, pending: true };
  return s.needsReview
    ? { label: `Try-on card: ${s.flags.length} to review`, pass: false, pending: false }
    : { label: "Try-on card OK", pass: true, pending: false };
}

/* Four guides over the flat-lay: two vertical lines for the border edges, one
   horizontal line for the pallu edge, and a toggle for which end the pallu is
   at. Coordinates are fractions of the CLOTH rectangle, matching what the
   builder stores, so nothing is converted on either side; the cloth box is
   positioned over the photo by the builder's own trim. */
function GuideEditor({ src, cloth, guides, onChange }: { src: string; cloth: Cloth; guides: Boundaries; onChange: (g: Boundaries) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Guide | null>(null);
  const trimmed = cloth.x > 0 || cloth.y > 0 || cloth.w < 1 || cloth.h < 1;

  function fractionAt(e: React.PointerEvent): { x: number; y: number } {
    const r = box.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function move(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = fractionAt(e);
    const clamp = (v: number) => Math.min(0.95, Math.max(0.01, v));
    // Borders may be dragged to zero (a borderless print); the pallu edge stays inside.
    const clampBorder = (v: number) => Math.min(0.45, Math.max(0, v));
    if (drag === "left") onChange({ ...guides, left: clampBorder(Math.min(x, 1 - guides.right - 0.1)) });
    if (drag === "right") onChange({ ...guides, right: clampBorder(Math.min(1 - x, 1 - guides.left - 0.1)) });
    if (drag === "pallu") onChange({ ...guides, palluY: clamp(y) });
  }

  const leftPct = guides.left * 100;
  const rightPct = (1 - guides.right) * 100;
  const palluPct = guides.palluY * 100;
  const hem = hemSideOf(guides);
  const sideLabel = (side: "left" | "right") => (hem === side ? "HEM BORDER" : "SHOULDER BORDER");
  // The body sits between the borders and away from the pallu.
  const bodyStyle = guides.palluAtBottom
    ? { left: `${leftPct}%`, right: `${100 - rightPct}%`, top: 0, bottom: `${100 - palluPct}%` }
    : { left: `${leftPct}%`, right: `${100 - rightPct}%`, top: `${palluPct}%`, bottom: 0 };

  return (
    <div className="ge">
      <div className="ge-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Flat lay" className="ge-img" draggable={false} />
        <div
          ref={box}
          className={`ge-box${trimmed ? " is-trimmed" : ""}`}
          style={{ left: `${cloth.x * 100}%`, top: `${cloth.y * 100}%`, width: `${cloth.w * 100}%`, height: `${cloth.h * 100}%` }}
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
        {/* Each region lightly shaded and named, so what the guides mean is
            visible before anything is saved: the border that lands at the
            ankles, the one that crosses the chest, the body and the pallu. */}
        {guides.left > 0 && (
          <div className={`ge-shade ge-shade--${hem === "left" ? "hem" : "shoulder"}`} style={{ left: 0, top: 0, bottom: 0, width: `${leftPct}%` }}>
            <span className="ge-region ge-region--v">{sideLabel("left")}</span>
          </div>
        )}
        {guides.right > 0 && (
          <div className={`ge-shade ge-shade--${hem === "right" ? "hem" : "shoulder"}`} style={{ right: 0, top: 0, bottom: 0, width: `${100 - rightPct}%` }}>
            <span className="ge-region ge-region--v">{sideLabel("right")}</span>
          </div>
        )}
        <div className="ge-shade ge-shade--body" style={bodyStyle}>
          <span className="ge-region">BODY</span>
        </div>
        <div
          className="ge-shade ge-shade--pallu"
          style={guides.palluAtBottom ? { left: 0, right: 0, top: `${palluPct}%`, bottom: 0 } : { left: 0, right: 0, top: 0, height: `${palluPct}%` }}
        >
          <span className="ge-region">PALLU</span>
        </div>
        <div className="ge-line ge-line--v" style={{ left: `${leftPct}%` }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag("left"); }}>
          <span className="ge-tag">Border</span>
        </div>
        <div className="ge-line ge-line--v" style={{ left: `${rightPct}%` }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag("right"); }}>
          <span className="ge-tag">Border</span>
        </div>
        <div className="ge-line ge-line--h" style={{ top: `${palluPct}%` }} onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag("pallu"); }}>
          <span className="ge-tag">Pallu edge</span>
        </div>
        </div>
      </div>
      <div className="ge-foot">
        <span className="ge-foot-label">Pallu is at the</span>
        <button type="button" className={`ge-toggle${guides.palluAtBottom ? " is-on" : ""}`} onClick={() => onChange({ ...guides, palluAtBottom: true })}>Bottom</button>
        <button type="button" className={`ge-toggle${!guides.palluAtBottom ? " is-on" : ""}`} onClick={() => onChange({ ...guides, palluAtBottom: false })}>Top</button>
        <span className="ge-values">
          L {pct(guides.left)} · R {pct(guides.right)} · pallu {pct(guides.palluY)}
        </span>
      </div>
      <div className="ge-foot">
        <span className="ge-foot-label">Hem border (at the ankles) is on the</span>
        <button type="button" className={`ge-toggle${!guides.hemSide ? " is-on" : ""}`} title="The wider border" onClick={() => { const rest = { ...guides }; delete rest.hemSide; onChange(rest); }}>Wider side</button>
        <button type="button" className={`ge-toggle${guides.hemSide === "left" ? " is-on" : ""}`} onClick={() => onChange({ ...guides, hemSide: "left" })}>Left</button>
        <button type="button" className={`ge-toggle${guides.hemSide === "right" ? " is-on" : ""}`} onClick={() => onChange({ ...guides, hemSide: "right" })}>Right</button>
      </div>
      <style jsx>{`
        .ge { display: flex; flex-direction: column; gap: 8px; }
        .ge-photo { position: relative; width: 100%; max-width: 420px; border-radius: 8px; overflow: hidden; background: #FAF7F4; }
        .ge-img { display: block; width: 100%; height: auto; pointer-events: none; }
        .ge-box { position: absolute; user-select: none; touch-action: none; }
        .ge-box.is-trimmed { outline: 2px dashed rgba(58, 170, 255, 0.9); outline-offset: -1px; }
        .ge-shade { position: absolute; pointer-events: none; overflow: hidden; }
        .ge-shade--hem { background: rgba(180, 83, 9, 0.24); }
        .ge-shade--shoulder { background: rgba(124, 58, 237, 0.22); }
        .ge-shade--body { background: rgba(59, 130, 246, 0.12); }
        .ge-shade--pallu { background: rgba(212, 160, 23, 0.26); }
        .ge-region {
          position: absolute; left: 6px; top: 6px; padding: 2px 6px; border-radius: 4px;
          background: rgba(255, 255, 255, 0.85); color: #141414; font-size: 10px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap;
        }
        .ge-shade--body .ge-region { left: 50%; transform: translateX(-50%); }
        .ge-shade--pallu .ge-region { left: 50%; top: 50%; transform: translate(-50%, -50%); }
        .ge-region--v { left: 50%; top: 40%; transform: translateX(-50%) rotate(-90deg); transform-origin: center; }
        .ge-line { position: absolute; cursor: grab; }
        .ge-line:active { cursor: grabbing; }
        .ge-line--v { top: 0; bottom: 0; width: 14px; margin-left: -7px; }
        .ge-line--v::before { content: ""; position: absolute; left: 6px; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5); }
        .ge-line--h { left: 0; right: 0; height: 14px; margin-top: -7px; }
        .ge-line--h::before { content: ""; position: absolute; top: 6px; left: 0; right: 0; height: 2px; background: #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5); }
        .ge-tag { position: absolute; left: 10px; top: 6px; padding: 1px 6px; border-radius: 4px; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 10px; font-weight: 600; white-space: nowrap; pointer-events: none; }
        .ge-line--v .ge-tag { top: 8px; left: 10px; }
        .ge-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #727272; }
        .ge-toggle { height: 26px; padding: 0 10px; border-radius: 6px; border: 1px solid #D9D9D9; background: #fff; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; color: #000; }
        .ge-toggle.is-on { background: var(--w-maroon-l, #68262A); border-color: var(--w-maroon-l, #68262A); color: #fff; }
        .ge-values { margin-left: auto; font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}
