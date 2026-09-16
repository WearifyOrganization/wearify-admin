"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Btn, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";
import { Id } from "@wearify/shared/dataModel";

type Tab = "queue" | "verified" | "all";
type DocType = "aadhaar" | "pan" | "address";

// KYC scans are fetched by (tailorId, docType) through an admin-gated query —
// the storage id never reaches the browser and files.getUrl refuses these blobs.
function KycDocImage({ tailorId, docType, label }: { tailorId: string; docType: DocType; label: string }) {
  const url = useQuery(api.tailorOps.getKycFileUrl, { tailorId, docType });
  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-wf-muted">
        {url === undefined ? "Loading…" : "Unavailable"}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`${label} preview`} className="w-full h-full" style={{ objectFit: "cover" }} />;
}

// One row of the admin review queue — expands to show the three submitted
// documents side-by-side, each with Approve / Reject inline.
function TailorReviewCard({ tailor }: { tailor: Doc }) {
  const updateVerification = useMutation(api.tailorOps.updateVerification);
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<DocType | "all" | null>(null);

  const docs: Array<{ type: DocType; label: string; present: boolean; verified: boolean }> = [
    { type: "aadhaar", label: "Aadhaar", present: !!tailor.hasAadhaarFile, verified: !!tailor.aadhaarVerified },
    { type: "pan", label: "PAN", present: !!tailor.hasPanFile, verified: !!tailor.panVerified },
    { type: "address", label: "Address proof", present: !!tailor.hasAddressProofFile, verified: !!tailor.addressVerified },
  ];

  async function approveOne(type: DocType) {
    setBusy(type);
    try {
      await updateVerification({
        tailorId: tailor.tailorId,
        ...(type === "aadhaar" && { aadhaarVerified: true }),
        ...(type === "pan" && { panVerified: true }),
        ...(type === "address" && { addressVerified: true }),
        kycRejectionReason: null, // approving any doc clears the rejection note
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve document");
    } finally { setBusy(null); }
  }

  async function rejectAll() {
    if (!rejectReason.trim()) return;
    setBusy("all");
    try {
      await updateVerification({
        tailorId: tailor.tailorId,
        aadhaarVerified: false,
        panVerified: false,
        addressVerified: false,
        kycRejectionReason: rejectReason.trim(),
      });
      setRejectReason("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject KYC");
    } finally { setBusy(null); }
  }

  const verifiedCount = docs.filter((d) => d.verified).length;
  const pendingCount = docs.filter((d) => d.present && !d.verified).length;

  return (
    <Card className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="text-sm font-semibold text-wf-text truncate">{tailor.name}</div>
            <Badge status={tailor.status === "verified" ? "verified" : "pending"}>{tailor.status}</Badge>
          </div>
          <div className="text-xs text-wf-subtext">
            {tailor.tailorId} &middot; {tailor.city}{tailor.area ? ` · ${tailor.area}` : ""} &middot; {tailor.phone}
          </div>
          <div className="text-sm text-wf-muted mt-1">
            {verifiedCount}/3 verified &middot; {pendingCount} pending review
          </div>
        </div>
        <Btn small onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Hide" : "Review"}
        </Btn>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Doc tiles */}
          <div className="grid grid-cols-3 gap-3">
            {docs.map((d) => (
              <div key={d.type} className="rounded-lg border border-wf-border overflow-hidden bg-white">
                <div className="relative w-full aspect-[4/3] bg-wf-border/20">
                  {d.present ? (
                    <KycDocImage tailorId={tailor.tailorId} docType={d.type} label={d.label} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-wf-muted">
                      Not submitted
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-wf-text">{d.label}</div>
                    <Badge status={d.verified ? "verified" : d.present ? "pending" : "offline"}>
                      {d.verified ? "Verified" : d.present ? "Review" : "—"}
                    </Badge>
                  </div>
                  {d.present && !d.verified && (
                    <Btn
                      small
                      primary
                      className="w-full mt-2"
                      onClick={() => approveOne(d.type)}
                      disabled={busy === d.type}
                    >
                      {busy === d.type ? "…" : "Approve"}
                    </Btn>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reject-all (with reason) — sends all docs back to the tailor.
              Disabled when there's nothing to reject yet; rejecting a tailor
              who hasn't submitted a single doc is an incoherent signal
              (should be a separate "deactivate" flow if that's ever needed). */}
          {pendingCount > 0 ? (
            <div className="rounded-lg border border-wf-red/30 bg-wf-red/5 p-3">
              <div className="text-xs font-semibold text-wf-red mb-2">Reject submission</div>
              <div className="text-sm text-wf-subtext mb-2">
                The tailor sees your reason on their verification page and can resubmit.
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason (e.g. Aadhaar image unclear — please retake)"
                  className="flex-1 px-3 py-2 text-xs border border-wf-border rounded-lg bg-white text-wf-text outline-none"
                />
                <Btn
                  small
                  onClick={rejectAll}
                  disabled={!rejectReason.trim() || busy === "all"}
                >
                  {busy === "all" ? "…" : "Reject"}
                </Btn>
              </div>
            </div>
          ) : (
            <div className="text-sm text-wf-muted italic">
              No documents submitted yet — nothing to review.
            </div>
          )}

          {tailor.kycRejectionReason && (
            <div className="text-sm text-wf-muted">
              Last admin note: &ldquo;{tailor.kycRejectionReason}&rdquo;
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// Narrow type local to this file — matches what `api.tailorOps.getByTailorId`
// and `listKycQueue` / `listAll` return. Only the fields we use.
type Doc = {
  _id: Id<"tailors">;
  tailorId: string;
  name: string;
  phone: string;
  city: string;
  area?: string;
  status: string;
  hasAadhaarFile?: boolean;
  hasPanFile?: boolean;
  hasAddressProofFile?: boolean;
  aadhaarVerified?: boolean;
  panVerified?: boolean;
  addressVerified?: boolean;
  kycRejectionReason?: string;
};

export default function AdminTailorsPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const queue = useQuery(api.tailorOps.listKycQueue, {}) as Doc[] | undefined;
  const all = useQuery(api.tailorOps.listAll, {}) as Doc[] | undefined;

  if (queue === undefined || all === undefined) return <PageLoading />;

  const verified = all.filter((t) => t.aadhaarVerified && t.panVerified && t.addressVerified);
  const rows = tab === "queue" ? queue : tab === "verified" ? verified : all;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-wf-text">Tailors</h1>
        <p className="text-xs text-wf-subtext mt-1">
          KYC review queue, verified tailors, and the full roster. Reviewing a document unblocks the tailor&apos;s visibility to customers.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPI label="Pending KYC" value={queue.length.toString()} />
        <KPI label="Verified" value={verified.length.toString()} />
        <KPI label="Total tailors" value={all.length.toString()} />
      </div>

      {/* Tabs */}
      <Tabs
        items={[
          `Review (${queue.length})`,
          `Verified (${verified.length})`,
          `All (${all.length})`,
        ]}
        active={
          tab === "queue"
            ? `Review (${queue.length})`
            : tab === "verified"
              ? `Verified (${verified.length})`
              : `All (${all.length})`
        }
        onChange={(label) => {
          if (label.startsWith("Review")) setTab("queue");
          else if (label.startsWith("Verified")) setTab("verified");
          else setTab("all");
        }}
      />

      {/* List */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-sm text-wf-muted">
          {tab === "queue"
            ? "No tailors pending review. Nice, you're caught up."
            : tab === "verified"
              ? "No tailors fully verified yet."
              : "No tailors registered yet."}
        </div>
      ) : (
        <div>
          {rows.map((t) => (
            <TailorReviewCard key={t._id} tailor={t} />
          ))}
        </div>
      )}
    </div>
  );
}
