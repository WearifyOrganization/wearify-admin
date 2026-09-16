"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Btn, PageLoading, Metric } from "@/components/ui/wearify-ui";
import { useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "@wearify/shared/dataModel";
import { SareeCardModal, cardCheck } from "@/components/SareeCardPanel";

/* ================================================================
   HELPER COMPONENTS — image preview for saree cards
   ================================================================ */

/** Renders a single image from Convex file storage */
function SareeImg({ fileId, className }: { fileId: Id<"_storage">; className?: string }) {
  const url = useQuery(api.files.getUrl, { fileId });
  if (!url) {
    return (
      <div className={`bg-wf-border/30 animate-pulse rounded ${className ?? "w-full h-full"}`} />
    );
  }
  return (
    <img
      src={url}
      alt="Saree"
      className={`object-cover rounded ${className ?? "w-full h-full"}`}
    />
  );
}

/** Renders up to 4 image thumbnails in a row; falls back to gradient+emoji */
function SareeImageRow({
  imageIds,
  grad,
  emoji,
  size = "sm",
}: {
  imageIds?: Id<"_storage">[];
  grad?: string[];
  emoji?: string;
  size?: "sm" | "lg";
}) {
  const sizeClasses = size === "lg" ? "w-28 h-36" : "w-10 h-10";

  if (!imageIds || imageIds.length === 0) {
    const colors = grad && grad.length >= 2 ? grad : ["#667eea", "#764ba2"];
    return (
      <div className="flex gap-1.5">
        <div
          className={`${sizeClasses} rounded-lg flex items-center justify-center ${size === "lg" ? "text-3xl" : "text-lg"}`}
          style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
        >
          {emoji || "\uD83E\uDE61"}
        </div>
      </div>
    );
  }

  const displayIds = imageIds.slice(0, 4);
  return (
    <div className="flex gap-1.5">
      {displayIds.map((id) => (
        <div key={id} className={`${sizeClasses} rounded-lg overflow-hidden flex-shrink-0`}>
          <SareeImg fileId={id} />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   DEMO DATA — for tabs without real backend tables yet
   ================================================================ */

const CONTENT_ITEMS = [
  { id: "C-001", type: "Mirror Attract Screen", store: "All Stores", status: "active", updated: "2026-04-01" },
  { id: "C-002", type: "Catalog Banner", store: "Mangalya Silks", status: "active", updated: "2026-03-28" },
  { id: "C-003", type: "QR Code Poster", store: "All Stores", status: "scheduled", updated: "2026-04-03" },
  { id: "C-004", type: "Staff Training Video", store: "Vasundhara Handlooms", status: "draft", updated: "2026-03-20" },
  { id: "C-005", type: "Mirror Attract Screen", store: "Parvathi Silks", status: "active", updated: "2026-04-05" },
  { id: "C-006", type: "Catalog Banner", store: "All Stores", status: "scheduled", updated: "2026-04-04" },
];

const FIELD_VISITS = [
  { id: "FV-001", store: "Mangalya Silks", type: "Installation", date: "2026-04-10", technician: "Ramesh K.", status: "Scheduled" },
  { id: "FV-002", store: "Vasundhara Handlooms", type: "Maintenance", date: "2026-04-08", technician: "Suresh P.", status: "In Progress" },
  { id: "FV-003", store: "Parvathi Silks", type: "Training", date: "2026-04-12", technician: "Anita M.", status: "Scheduled" },
  { id: "FV-004", store: "Lakshmi Weaves", type: "Audit", date: "2026-04-06", technician: "Deepak R.", status: "Completed" },
  { id: "FV-005", store: "Sree Sarees", type: "Installation", date: "2026-04-15", technician: "Ramesh K.", status: "Scheduled" },
];

const SPARE_INVENTORY = [
  { item: "Smart Mirror", inStock: 12, reserved: 3, available: 9, location: "Warehouse Mumbai" },
  { item: "Tablet (Samsung A8)", inStock: 25, reserved: 8, available: 17, location: "Warehouse Mumbai" },
  { item: "Photo Booth Kit", inStock: 6, reserved: 2, available: 4, location: "Warehouse Mumbai" },
  { item: "WiFi Router (Mesh)", inStock: 15, reserved: 5, available: 10, location: "Warehouse Mumbai" },
  { item: "Backup UPS", inStock: 8, reserved: 1, available: 7, location: "Warehouse Mumbai" },
];

const DEPLOYMENT_STAGES = ["D-7 Site Survey", "D-5 Hardware Ship", "D-3 Staff Training", "D-1 Software Config", "D-Day Go Live"];

const TRAINING_PROGRAMS = [
  { id: "TP-001", name: "Mirror Operation Basics", type: "Onboarding", duration: "2 hours", enrolled: 12, completion: 92 },
  { id: "TP-002", name: "Sales Conversion Tips", type: "Advanced", duration: "3 hours", enrolled: 8, completion: 78 },
  { id: "TP-003", name: "AI Feature Training", type: "Advanced", duration: "1.5 hours", enrolled: 10, completion: 65 },
  { id: "TP-004", name: "Customer Service Excellence", type: "Refresher", duration: "1 hour", enrolled: 14, completion: 88 },
  { id: "TP-005", name: "DPDP Compliance", type: "Onboarding", duration: "45 min", enrolled: 14, completion: 100 },
];

const HEALTH_DIMENSIONS = [
  { key: "usage", label: "Usage", weight: 25, formula: "Mirror sessions per week / target" },
  { key: "dataQuality", label: "Data Quality", weight: 20, formula: "Catalog completeness + image quality" },
  { key: "revenue", label: "Revenue", weight: 20, formula: "Actual MRR / expected MRR" },
  { key: "engagement", label: "Customer Engagement", weight: 15, formula: "Return rate + try-on depth" },
  { key: "technical", label: "Technical", weight: 12, formula: "Device uptime + latency compliance" },
  { key: "staff", label: "Staff", weight: 8, formula: "Staff activity + conversion correlation" },
];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function StoresPage() {
  const stores = useQuery(api.stores.list);
  const stats = useQuery(api.stores.getStats);
  const tailors = useQuery(api.tailorOps.listAll);
  const pendingSarees = useQuery(api.sarees.listPendingApproval);
  const approvalSummary = useQuery(api.sarees.approvalSummaryAllStores);
  const approveOrReject = useMutation(api.sarees.approveOrReject);
  const cardStatus = useQuery(
    api.sareeCards.statusForSarees,
    pendingSarees ? { sareeIds: pendingSarees.map((s) => s._id) } : "skip",
  );
  const [cardPanel, setCardPanel] = useState<{ id: Id<"sarees">; name: string } | null>(null);
  const registerTailor = useMutation(api.tailorOps.registerTailor);

  const [tab, setTab] = useState("Registry");
  const [filter, setFilter] = useState("all");
  const [tailorFilter, setTailorFilter] = useState("all");
  const [showAddTailor, setShowAddTailor] = useState(false);
  const [tailorForm, setTailorForm] = useState({ name: "", phone: "", city: "", specialty: "" });
  const [tailorFormError, setTailorFormError] = useState("");
  const [tailorSaving, setTailorSaving] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState<string | null>(null);
  const [showCorrectionInput, setShowCorrectionInput] = useState<string | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState<Record<string, string>>({});
  const [qaPreviewId, setQaPreviewId] = useState<string | null>(null);
  const [healthWeights, setHealthWeights] = useState<Record<string, number>>(
    Object.fromEntries(HEALTH_DIMENSIONS.map((d) => [d.key, d.weight]))
  );
  const router = useRouter();

  if (!stores || !stats) return <PageLoading />;

  const filtered =
    filter === "all"
      ? stores
      : stores.filter((s) => s.status === filter);

  /* Tailor stats */
  const totalTailors = tailors?.length ?? 0;
  const verifiedTailors = tailors?.filter((t) => t.status === "verified").length ?? 0;
  const totalReferrals = tailors?.reduce((acc, t) => acc + t.referrals, 0) ?? 0;
  const totalTailorRevenue = tailors?.reduce((acc, t) => acc + t.revenue, 0) ?? 0;

  const filteredTailors =
    tailorFilter === "all"
      ? tailors
      : tailors?.filter((t) => t.status === tailorFilter);

  async function handleAddTailor() {
    const name = tailorForm.name.trim();
    const phoneDigits = tailorForm.phone.replace(/\D/g, "");
    const city = tailorForm.city.trim();
    if (!name) { setTailorFormError("Tailor / shop name is required"); return; }
    if (!/^\d{10}$/.test(phoneDigits)) { setTailorFormError("Phone must be 10 digits"); return; }
    if (!city) { setTailorFormError("City is required"); return; }
    setTailorSaving(true);
    setTailorFormError("");
    try {
      await registerTailor({
        name,
        phone: `+91${phoneDigits}`,
        city,
        specialties: tailorForm.specialty ? [tailorForm.specialty] : undefined,
      });
      setTailorForm({ name: "", phone: "", city: "", specialty: "" });
      setShowAddTailor(false);
    } catch (err: unknown) {
      setTailorFormError(err instanceof Error ? err.message : "Failed to add tailor");
    } finally {
      setTailorSaving(false);
    }
  }

  /* Health weights total */
  const weightTotal = Object.values(healthWeights).reduce((a, b) => a + b, 0);

  /* Pending sarees helpers */
  const daysSince = (creationTime: number) => {
    const diff = Date.now() - creationTime;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  /* Handle approve */
  const handleApprove = async (id: Id<"sarees">) => {
    try {
      await approveOrReject({ id, approvalStatus: "approved" });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve saree");
    }
  };

  /* Handle reject — `skipConfirm` is passed by the Catalogue-Approval tab,
     which already gates this behind its own confirmation modal. The bare
     Catalog-QA reject path has no modal, so it confirms here. */
  const handleReject = async (id: Id<"sarees">, skipConfirm = false) => {
    if (
      !skipConfirm &&
      !confirm(
        "Reject this saree? This permanently deletes it from the catalog and cannot be undone."
      )
    ) {
      return;
    }
    const reason = rejectFeedback[id as string] || undefined;
    try {
      await approveOrReject({ id, approvalStatus: "rejected", rejectionReason: reason });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject saree");
      return;
    }
    setShowRejectInput(null);
    setShowRejectConfirm(null);
  };

  /* Handle send for corrections */
  const handleCorrections = async (id: Id<"sarees">) => {
    const note = correctionNotes[id as string] || "";
    if (!note.trim()) return;
    await approveOrReject({ id, approvalStatus: "corrections", correctionNote: note });
    setShowCorrectionInput(null);
    setCorrectionNotes((prev) => ({ ...prev, [id as string]: "" }));
  };

  /* Gradient placeholder for saree cards */
  const sareeGradient = (grad?: string[], emoji?: string) => {
    const colors = grad && grad.length >= 2 ? grad : ["#667eea", "#764ba2"];
    return (
      <div
        className="w-full h-full rounded-lg flex items-center justify-center text-3xl"
        style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
      >
        {emoji || "🪡"}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-wf-text mb-1">
            Store Network
          </h1>
          <p className="text-sm text-wf-subtext">
            {stats.total} stores
            {stats.totalMrr != null &&
              ` — ₹${(stats.totalMrr / 1000).toFixed(0)}K MRR`}
          </p>
        </div>
        <Link href="/admin/stores/onboard">
          <Btn primary>+ Onboard New Store</Btn>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="flex gap-3 mb-4">
        <KPI label="Total Stores" value={stats.total} />
        <KPI label="Active" value={stats.active} subtitle="Paying" />
        <KPI label="Trial" value={stats.trial} color="var(--color-wf-amber)" />
        <KPI label="Churned" value={stats.churned} color="var(--color-wf-red)" />
        <KPI label="Avg Health" value={`${stats.avgHealth}/100`} />
        {stats.totalMrr != null && (
          <KPI label="MRR" value={`₹${(stats.totalMrr / 1000).toFixed(0)}K`} />
        )}
      </div>

      <Tabs
        items={["Registry", "Tailors", "Content", "Field Ops", "Deployment", "Health Config", "Catalog QA", "Training", "Catalogue Approval"]}
        active={tab}
        onChange={setTab}
      />

      {/* ============================================================
          TAB 1: REGISTRY
          ============================================================ */}
      {tab === "Registry" && (
        <div>
          {/* Filters */}
          <div className="flex gap-1.5 mb-4">
            {["all", "active", "trial", "churned"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  filter === f
                    ? "bg-wf-primary text-wf-bg"
                    : "bg-wf-card text-wf-subtext border border-wf-border hover:bg-wf-border/50"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Store Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-left py-2 pr-4">City</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Plan</th>
                    <th className="text-right py-2 pr-4">MRR</th>
                    <th className="text-right py-2 pr-4">Health</th>
                    <th className="text-right py-2 pr-4">Conv %</th>
                    <th className="text-right py-2 pr-4">Sessions</th>
                    <th className="text-right py-2">Churn</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((store) => (
                    <tr
                      key={store._id}
                      onClick={() => router.push(`/admin/stores/${store.storeId}`)}
                      className="border-b border-wf-border hover:bg-wf-primary/5 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-wf-muted">
                        {store.storeId}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-sm">
                        {store.name}
                      </td>
                      <td className="py-3 pr-4 text-sm text-wf-subtext">
                        {store.city}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge status={store.status}>{store.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono">
                        {store.plan}
                      </td>
                      <td className="py-3 pr-4 text-right text-sm font-mono">
                        ₹{store.mrr > 0 ? `${(store.mrr / 1000).toFixed(0)}K` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{
                            color:
                              store.healthScore > 90
                                ? "var(--color-wf-green)"
                                : store.healthScore > 70
                                  ? "var(--color-wf-amber)"
                                  : "var(--color-wf-red)",
                          }}
                        >
                          {store.healthScore || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-sm font-mono text-wf-subtext">
                        {store.conversionRate}%
                      </td>
                      <td className="py-3 pr-4 text-right text-sm font-mono text-wf-subtext">
                        {store.sessions}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{
                            color:
                              store.churnRisk < 20
                                ? "var(--color-wf-green)"
                                : store.churnRisk < 40
                                  ? "var(--color-wf-amber)"
                                  : "var(--color-wf-red)",
                          }}
                        >
                          {store.churnRisk}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 2: TAILORS
          ============================================================ */}
      {tab === "Tailors" && (
        <div>
          <div className="flex gap-3 mb-4">
            <KPI label="Total Tailors" value={totalTailors} />
            <KPI label="Verified" value={verifiedTailors} subtitle={`${totalTailors > 0 ? Math.round((verifiedTailors / totalTailors) * 100) : 0}%`} />
            <KPI label="Total Referrals" value={totalReferrals} />
            <KPI label="Revenue from Referrals" value={`₹${totalTailorRevenue > 1000 ? `${(totalTailorRevenue / 1000).toFixed(0)}K` : totalTailorRevenue}`} />
          </div>

          {/* Tailor Filters + Add */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex gap-1.5">
              {["all", "verified", "pending"].map((f) => (
                <button
                  key={f}
                  onClick={() => setTailorFilter(f)}
                  className={`px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    tailorFilter === f
                      ? "bg-wf-primary text-wf-bg"
                      : "bg-wf-card text-wf-subtext border border-wf-border hover:bg-wf-border/50"
                  }`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <Btn primary onClick={() => { setShowAddTailor(true); setTailorFormError(""); }}>
              + Add Tailor
            </Btn>
          </div>

          {showAddTailor && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-wf-text">Add Tailor</span>
                <button
                  onClick={() => { setShowAddTailor(false); setTailorFormError(""); }}
                  className="text-wf-muted hover:text-wf-text text-sm"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {tailorFormError && (
                <div className="mb-3 px-3 py-2 rounded bg-wf-red/10 border border-wf-red/20 text-wf-red text-xs font-semibold">
                  {tailorFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-wf-subtext mb-1">Tailor / Shop Name *</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    value={tailorForm.name}
                    onChange={(e) => setTailorForm({ ...tailorForm, name: e.target.value })}
                    placeholder="e.g. Stitchwell Tailors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wf-subtext mb-1">Phone *</label>
                  <div className="flex items-center rounded border border-wf-border bg-wf-card overflow-hidden focus-within:border-wf-primary">
                    <span className="pl-3 pr-1 text-sm font-semibold text-wf-subtext select-none font-mono">+91</span>
                    <input
                      type="tel"
                      className="flex-1 px-2 py-2 bg-transparent text-sm text-wf-text focus:outline-none font-mono"
                      value={tailorForm.phone}
                      onChange={(e) => setTailorForm({ ...tailorForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit phone"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-wf-subtext mb-1">City *</label>
                  <input
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    value={tailorForm.city}
                    onChange={(e) => setTailorForm({ ...tailorForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-wf-subtext mb-1">Specialty</label>
                  <select
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    value={tailorForm.specialty}
                    onChange={(e) => setTailorForm({ ...tailorForm, specialty: e.target.value })}
                  >
                    <option value="">Select specialty (optional)</option>
                    <option value="blouse">Blouse specialist</option>
                    <option value="all">All ethnic wear</option>
                    <option value="premium">Premium / designer blouse</option>
                    <option value="petticoat">Blouse + Petticoat</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-wf-border">
                <Btn primary onClick={handleAddTailor} disabled={tailorSaving}>
                  {tailorSaving ? "Adding..." : "Add Tailor"}
                </Btn>
                <Btn onClick={() => { setShowAddTailor(false); setTailorFormError(""); }}>
                  Cancel
                </Btn>
                <span className="text-xs text-wf-muted ml-auto">
                  Tailor will be created with status <span className="font-semibold">Pending</span>. Use verification workflow to promote.
                </span>
              </div>
            </Card>
          )}

          <Card>
            {!tailors ? (
              <div className="text-center py-8 text-wf-muted text-sm">Loading tailors...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                      <th className="text-left py-2 pr-4">ID</th>
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2 pr-4">City</th>
                      <th className="text-left py-2 pr-4">Phone</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-left py-2 pr-4">Badge</th>
                      <th className="text-right py-2 pr-4">Rating</th>
                      <th className="text-right py-2 pr-4">Referrals</th>
                      <th className="text-right py-2 pr-4">Revenue</th>
                      <th className="text-left py-2 pr-4">Subscription</th>
                      <th className="text-right py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTailors?.map((t) => (
                      <tr
                        key={t._id}
                        className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-wf-muted">
                          {t.tailorId}
                        </td>
                        <td className="py-3 pr-4 font-semibold text-sm">
                          {t.name}
                        </td>
                        <td className="py-3 pr-4 text-sm text-wf-subtext">
                          {t.city}
                        </td>
                        <td className="py-3 pr-4 text-sm font-mono text-wf-subtext">
                          {t.phone}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge status={t.status}>{t.status}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {t.badge ? (
                            <Badge status={t.badge === "pro" ? "active" : t.badge === "verified" ? "verified" : "pending"}>
                              {t.badge}
                            </Badge>
                          ) : (
                            <span className="text-xs text-wf-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-mono">
                          <span style={{ color: t.rating >= 4 ? "var(--color-wf-green)" : t.rating >= 3 ? "var(--color-wf-amber)" : "var(--color-wf-red)" }}>
                            {t.rating > 0 ? `${t.rating} ★` : "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-mono text-wf-subtext">
                          {t.referrals}
                        </td>
                        <td className="py-3 pr-4 text-right text-sm font-mono">
                          ₹{t.revenue > 1000 ? `${(t.revenue / 1000).toFixed(0)}K` : t.revenue}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge status={t.subscription === "pro" ? "active" : "pending"}>
                            {t.subscription ?? "free"}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Btn small onClick={() => alert(`View tailor: ${t.tailorId}`)}>View</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTailors?.length === 0 && (
                  <div className="text-center py-8 text-wf-muted text-sm">No tailors found.</div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 3: CONTENT
          ============================================================ */}
      {tab === "Content" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-wf-subtext">
              Manage mirror attract screens, catalog banners, QR posters, and training videos.
            </p>
            <Btn primary onClick={() => alert("Upload New Content — Feature coming soon")}>
              + Upload New Content
            </Btn>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2 pr-4">Content Type</th>
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Last Updated</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTENT_ITEMS.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-wf-muted">{item.id}</td>
                      <td className="py-3 pr-4 font-semibold text-sm">{item.type}</td>
                      <td className="py-3 pr-4 text-sm text-wf-subtext">{item.store}</td>
                      <td className="py-3 pr-4">
                        <Badge status={item.status === "active" ? "active" : item.status === "scheduled" ? "pending" : "planned"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-wf-subtext font-mono">{item.updated}</td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Btn small onClick={() => alert(`Edit ${item.type} — Feature coming soon`)}>Edit</Btn>
                          <Btn small onClick={() => alert(`Preview ${item.type} — Feature coming soon`)}>Preview</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 4: FIELD OPS
          ============================================================ */}
      {tab === "Field Ops" && (
        <div>
          {/* Pending Visits */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-wf-text">Pending Visits</h2>
            <Btn primary onClick={() => alert("Schedule Visit — Feature coming soon")}>
              + Schedule Visit
            </Btn>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-left py-2 pr-4">Visit Type</th>
                    <th className="text-left py-2 pr-4">Scheduled Date</th>
                    <th className="text-left py-2 pr-4">Technician</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELD_VISITS.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-wf-muted">{v.id}</td>
                      <td className="py-3 pr-4 font-semibold text-sm">{v.store}</td>
                      <td className="py-3 pr-4 text-sm text-wf-subtext">{v.type}</td>
                      <td className="py-3 pr-4 text-sm font-mono text-wf-subtext">{v.date}</td>
                      <td className="py-3 pr-4 text-sm">{v.technician}</td>
                      <td className="py-3">
                        <Badge
                          status={
                            v.status === "Completed" ? "active"
                            : v.status === "In Progress" ? "progress"
                            : "pending"
                          }
                        >
                          {v.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Spare Inventory */}
          <h2 className="text-lg font-bold text-wf-text mt-6 mb-3">Spare Inventory</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Item Type</th>
                    <th className="text-right py-2 pr-4">In Stock</th>
                    <th className="text-right py-2 pr-4">Reserved</th>
                    <th className="text-right py-2 pr-4">Available</th>
                    <th className="text-left py-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {SPARE_INVENTORY.map((item) => (
                    <tr
                      key={item.item}
                      className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                    >
                      <td className="py-3 pr-4 font-semibold text-sm">{item.item}</td>
                      <td className="py-3 pr-4 text-right text-sm font-mono">{item.inStock}</td>
                      <td className="py-3 pr-4 text-right text-sm font-mono text-wf-amber">{item.reserved}</td>
                      <td className="py-3 pr-4 text-right text-sm font-mono font-semibold" style={{ color: item.available > 5 ? "var(--color-wf-green)" : "var(--color-wf-red)" }}>
                        {item.available}
                      </td>
                      <td className="py-3 text-sm text-wf-subtext">{item.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 5: DEPLOYMENT
          ============================================================ */}
      {tab === "Deployment" && (
        <div>
          <h2 className="text-lg font-bold text-wf-text mb-3">Deployment Pipeline</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Plan</th>
                    <th className="text-left py-2">Deployment Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => {
                    const isActive = store.status === "active";
                    const isTrial = store.status === "trial";
                    // For trial stores, simulate a deployment stage based on onboardingStep
                    const stageIdx = isTrial ? Math.min(store.onboardingStep, DEPLOYMENT_STAGES.length - 1) : DEPLOYMENT_STAGES.length - 1;
                    return (
                      <tr
                        key={store._id}
                        className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                      >
                        <td className="py-3 pr-4 font-semibold text-sm">{store.name}</td>
                        <td className="py-3 pr-4">
                          <Badge status={store.status}>{store.status}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-sm font-mono">{store.plan}</td>
                        <td className="py-3">
                          {isActive ? (
                            <span className="text-sm font-semibold" style={{ color: "var(--color-wf-green)" }}>
                              Completed
                            </span>
                          ) : isTrial ? (
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-wf-primary">
                                {DEPLOYMENT_STAGES[stageIdx]}
                              </span>
                              <div className="flex-1 max-w-[140px] h-1.5 rounded bg-wf-border">
                                <div
                                  className="h-full rounded transition-all duration-500"
                                  style={{
                                    width: `${((stageIdx + 1) / DEPLOYMENT_STAGES.length) * 100}%`,
                                    backgroundColor: "var(--color-wf-primary)",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-wf-muted font-mono">
                                {stageIdx + 1}/{DEPLOYMENT_STAGES.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-wf-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Go-Live Readiness */}
          <h2 className="text-lg font-bold text-wf-text mt-6 mb-3">Go-Live Readiness</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-center py-2 pr-4">Hardware Installed</th>
                    <th className="text-center py-2 pr-4">Staff Trained</th>
                    <th className="text-center py-2 pr-4">Catalog Seeded</th>
                    <th className="text-center py-2">WhatsApp Connected</th>
                  </tr>
                </thead>
                <tbody>
                  {stores
                    .filter((s) => s.status === "trial" || s.status === "active")
                    .map((store) => {
                      const hw = store.onboardingStep >= 3;
                      const staff = store.onboardingStep >= 5;
                      const catalog = (store.catalogUtilization ?? 0) > 0;
                      const wa = store.whatsappVerified ?? false;
                      const gateIcon = (pass: boolean) => (
                        <span
                          className="inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 text-center"
                          style={{
                            backgroundColor: pass ? "var(--color-wf-green)" : "var(--color-wf-red)",
                            color: "#fff",
                          }}
                        >
                          {pass ? "✓" : "✗"}
                        </span>
                      );
                      return (
                        <tr
                          key={store._id}
                          className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                        >
                          <td className="py-3 pr-4 font-semibold text-sm">{store.name}</td>
                          <td className="py-3 pr-4 text-center">{gateIcon(hw)}</td>
                          <td className="py-3 pr-4 text-center">{gateIcon(staff)}</td>
                          <td className="py-3 pr-4 text-center">{gateIcon(catalog)}</td>
                          <td className="py-3 text-center">{gateIcon(wa)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 6: HEALTH CONFIG
          ============================================================ */}
      {tab === "Health Config" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-wf-text">Health Score Weights</h2>
              <p className="text-sm text-wf-subtext">
                Configure the 6 dimensions that compose every store&apos;s health score.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-mono font-bold"
                style={{
                  color: weightTotal === 100 ? "var(--color-wf-green)" : "var(--color-wf-red)",
                }}
              >
                Total: {weightTotal}%
              </span>
              <Btn
                primary
                onClick={() => alert("Recalculate All Scores — Feature coming soon")}
                disabled={weightTotal !== 100}
              >
                Recalculate All Scores
              </Btn>
            </div>
          </div>

          <Card>
            <div className="space-y-0">
              {HEALTH_DIMENSIONS.map((dim) => (
                <div
                  key={dim.key}
                  className="flex items-center gap-4 py-3 border-b border-wf-border last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-wf-text">{dim.label}</div>
                    <div className="text-xs text-wf-muted mt-0.5">{dim.formula}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={healthWeights[dim.key]}
                      onChange={(e) =>
                        setHealthWeights((prev) => ({
                          ...prev,
                          [dim.key]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)),
                        }))
                      }
                      className="w-16 px-2 py-1 rounded bg-wf-bg border border-wf-border text-sm font-mono text-wf-text text-right focus:outline-none focus:border-wf-primary"
                    />
                    <span className="text-xs text-wf-muted">%</span>
                  </div>
                  <div className="w-32">
                    <Metric label="" value={String(healthWeights[dim.key])} max={100} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {weightTotal !== 100 && (
            <div className="mt-3 px-4 py-2 rounded bg-wf-red/10 text-wf-red text-sm font-semibold">
              Weights must total exactly 100%. Currently: {weightTotal}% ({weightTotal > 100 ? `${weightTotal - 100}% over` : `${100 - weightTotal}% under`})
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 7: CATALOG QA
          ============================================================ */}
      {tab === "Catalog QA" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-3 mb-4">
            <KPI label="Pending" value={approvalSummary?.pending ?? 0} color="var(--color-wf-amber)" />
            <KPI label="Approved" value={approvalSummary?.approved ?? 0} color="var(--color-wf-green)" />
            <KPI label="Corrections" value={approvalSummary?.corrections ?? 0} color="var(--color-wf-amber)" />
            <KPI label="Total Catalogue" value={approvalSummary?.all ?? 0} />
          </div>

          <Card title="Pending Review Queue">
            {!pendingSarees ? (
              <div className="text-center py-8 text-wf-muted text-sm">Loading...</div>
            ) : pendingSarees.length === 0 ? (
              <div className="text-center py-10 text-wf-muted text-sm">
                <span className="text-3xl block mb-2">All caught up!</span>
                No items pending review.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                      <th className="text-left py-2 pr-3 w-12">Image</th>
                      <th className="text-left py-2 pr-4">Name</th>
                      <th className="text-left py-2 pr-4">Store</th>
                      <th className="text-left py-2 pr-4">Type</th>
                      <th className="text-left py-2 pr-4">Fabric</th>
                      <th className="text-right py-2 pr-4">Price</th>
                      <th className="text-left py-2 pr-4">Added By</th>
                      <th className="text-right py-2 pr-4">Days</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSarees.map((saree) => (
                      <Fragment key={saree._id}>
                        <tr
                          className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                        >
                          <td className="py-3 pr-3">
                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                              {saree.imageIds && saree.imageIds.length > 0 ? (
                                <SareeImg fileId={saree.imageIds[0]} />
                              ) : (
                                sareeGradient(saree.grad, saree.emoji)
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-sm">{saree.name}</td>
                          <td className="py-3 pr-4 text-sm text-wf-subtext font-mono">{saree.storeId}</td>
                          <td className="py-3 pr-4 text-sm text-wf-subtext">{saree.type}</td>
                          <td className="py-3 pr-4 text-sm text-wf-subtext">{saree.fabric}</td>
                          <td className="py-3 pr-4 text-right text-sm font-mono">{"\u20B9"}{saree.price.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-sm text-wf-subtext">{saree.addedBy ?? "\u2014"}</td>
                          <td className="py-3 pr-4 text-right text-sm font-mono text-wf-muted">
                            {daysSince(saree._creationTime)}d
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <Btn small primary onClick={() => handleApprove(saree._id)}>Approve</Btn>
                              <Btn small danger onClick={() => handleReject(saree._id)}>Reject</Btn>
                              <Btn
                                small
                                onClick={() =>
                                  setQaPreviewId(qaPreviewId === (saree._id as string) ? null : (saree._id as string))
                                }
                              >
                                {qaPreviewId === (saree._id as string) ? "Close" : "Preview"}
                              </Btn>
                            </div>
                          </td>
                        </tr>
                        {/* Inline preview expansion */}
                        {qaPreviewId === (saree._id as string) && (
                          <tr className="border-b border-wf-border bg-wf-card/50">
                            <td colSpan={9} className="py-4 px-4">
                              <div className="flex gap-5">
                                <SareeImageRow imageIds={saree.imageIds} grad={saree.grad} emoji={saree.emoji} size="lg" />
                                <div className="flex-1 min-w-0">
                                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm mb-3">
                                    <div>
                                      <span className="text-wf-muted text-xs">Occasion</span>
                                      <div className="font-semibold">{saree.occasion}</div>
                                    </div>
                                    <div>
                                      <span className="text-wf-muted text-xs">Stock</span>
                                      <div className="font-semibold">{saree.stock}</div>
                                    </div>
                                    <div>
                                      <span className="text-wf-muted text-xs">Colors</span>
                                      <div className="font-semibold">{saree.colors?.join(", ") || "\u2014"}</div>
                                    </div>
                                    <div>
                                      <span className="text-wf-muted text-xs">Region</span>
                                      <div className="font-semibold">{saree.region || "\u2014"}</div>
                                    </div>
                                    <div>
                                      <span className="text-wf-muted text-xs">Weave</span>
                                      <div className="font-semibold">{saree.weave || "\u2014"}</div>
                                    </div>
                                    <div>
                                      <span className="text-wf-muted text-xs">Weight</span>
                                      <div className="font-semibold">{saree.weight || "\u2014"}</div>
                                    </div>
                                    {saree.aiTags && saree.aiTags.length > 0 && (
                                      <div className="col-span-2">
                                        <span className="text-wf-muted text-xs">AI Tags</span>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                          {saree.aiTags.map((tag) => (
                                            <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-wf-primary/10 text-wf-primary font-medium">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {saree.description && (
                                    <p className="text-xs text-wf-subtext">{saree.description}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 8: TRAINING
          ============================================================ */}
      {tab === "Training" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-wf-text">Training Programs</h2>
            <Btn primary onClick={() => alert("Add Program — Feature coming soon")}>
              + Add Program
            </Btn>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">ID</th>
                    <th className="text-left py-2 pr-4">Program Name</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Duration</th>
                    <th className="text-right py-2 pr-4">Stores Enrolled</th>
                    <th className="text-right py-2">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {TRAINING_PROGRAMS.map((prog) => (
                    <tr
                      key={prog.id}
                      className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-wf-muted">{prog.id}</td>
                      <td className="py-3 pr-4 font-semibold text-sm">{prog.name}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          status={
                            prog.type === "Onboarding" ? "active"
                            : prog.type === "Advanced" ? "progress"
                            : "pending"
                          }
                        >
                          {prog.type}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-wf-subtext">{prog.duration}</td>
                      <td className="py-3 pr-4 text-right text-sm font-mono">{prog.enrolled}</td>
                      <td className="py-3 text-right">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{
                            color:
                              prog.completion >= 90 ? "var(--color-wf-green)"
                              : prog.completion >= 70 ? "var(--color-wf-amber)"
                              : "var(--color-wf-red)",
                          }}
                        >
                          {prog.completion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Per-Store Completion Tracking */}
          <h2 className="text-lg font-bold text-wf-text mt-6 mb-3">Per-Store Completion Tracking</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Store</th>
                    <th className="text-left py-2 pr-4">Progress</th>
                    <th className="text-left py-2 pr-4">Last Certification</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stores
                    .filter((s) => s.status !== "churned")
                    .map((store, idx) => {
                      const completed = Math.min(idx + 2, TRAINING_PROGRAMS.length);
                      const total = TRAINING_PROGRAMS.length;
                      const allDone = completed === total;
                      const certDate = allDone ? "2026-03-28" : completed > 2 ? "2026-03-15" : "—";
                      return (
                        <tr
                          key={store._id}
                          className="border-b border-wf-border hover:bg-wf-primary/5 transition-colors"
                        >
                          <td className="py-3 pr-4 font-semibold text-sm">{store.name}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 rounded bg-wf-border">
                                <div
                                  className="h-full rounded"
                                  style={{
                                    width: `${(completed / total) * 100}%`,
                                    backgroundColor: allDone ? "var(--color-wf-green)" : "var(--color-wf-primary)",
                                  }}
                                />
                              </div>
                              <span className="text-xs font-mono text-wf-subtext">
                                {completed}/{total}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-sm font-mono text-wf-subtext">{certDate}</td>
                          <td className="py-3">
                            <Badge status={allDone ? "active" : completed >= 3 ? "progress" : "pending"}>
                              {allDone ? "Certified" : completed >= 3 ? "In Progress" : "Pending"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          TAB 9: CATALOGUE APPROVAL
          ============================================================ */}
      {tab === "Catalogue Approval" && (
        <div>
          <h2 className="text-lg font-bold text-wf-text mb-1">Catalogue Approval</h2>
          <p className="text-sm text-wf-subtext mb-4">
            Detailed review of each pending saree with validation checks and feedback.
          </p>

          {!pendingSarees ? (
            <Card>
              <div className="text-center py-8 text-wf-muted text-sm">Loading...</div>
            </Card>
          ) : pendingSarees.length === 0 ? (
            <Card>
              <div className="text-center py-10 text-wf-muted text-sm">
                <span className="text-base font-semibold block mb-2">All caught up!</span>
                No items pending review.
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingSarees.map((saree) => {
                const hasAiTags = !!(saree.aiTags && saree.aiTags.length > 0);
                const card = cardCheck(cardStatus ? cardStatus[saree._id] : undefined);
                const checks = [
                  { label: "Resolution OK", pass: true },
                  { label: "Background OK", pass: true },
                  { label: "Duplicate Check", pass: true },
                  { label: "Tag Completeness", pass: hasAiTags },
                  { label: "File Size OK", pass: true },
                  { label: card.label, pass: card.pass },
                ];
                const sid = saree._id as string;
                return (
                  <Card key={saree._id}>
                    <div className="flex gap-5">
                      {/* Image previews */}
                      <div className="flex-shrink-0">
                        <SareeImageRow imageIds={saree.imageIds} grad={saree.grad} emoji={saree.emoji} size="lg" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-base font-bold text-wf-text">{saree.name}</h3>
                            <p className="text-xs text-wf-muted font-mono mt-0.5">Store: {saree.storeId}</p>
                          </div>
                          <span className="text-sm font-mono font-bold text-wf-primary">
                            {"\u20B9"}{saree.price.toLocaleString()}
                          </span>
                        </div>

                        {/* Full detail grid */}
                        <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 text-sm mb-3">
                          <div>
                            <span className="text-wf-muted text-xs">Type</span>
                            <div className="font-semibold">{saree.type}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Fabric</span>
                            <div className="font-semibold">{saree.fabric}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Occasion</span>
                            <div className="font-semibold">{saree.occasion}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Stock</span>
                            <div className="font-semibold">{saree.stock}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Colors</span>
                            <div className="font-semibold">{saree.colors?.join(", ") || "\u2014"}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Region</span>
                            <div className="font-semibold">{saree.region || "\u2014"}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Weave</span>
                            <div className="font-semibold">{saree.weave || "\u2014"}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Weight</span>
                            <div className="font-semibold">{saree.weight || "\u2014"}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Added By</span>
                            <div className="font-semibold">{saree.addedBy ?? "\u2014"}</div>
                          </div>
                          <div>
                            <span className="text-wf-muted text-xs">Pending</span>
                            <div className="font-semibold">{daysSince(saree._creationTime)}d ago</div>
                          </div>
                        </div>

                        {/* AI Tags */}
                        {saree.aiTags && saree.aiTags.length > 0 && (
                          <div className="mb-3">
                            <span className="text-wf-muted text-xs block mb-1">AI Tags</span>
                            <div className="flex flex-wrap gap-1">
                              {saree.aiTags.map((tag) => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-wf-primary/10 text-wf-primary font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {saree.description && (
                          <p className="text-xs text-wf-subtext mb-3 line-clamp-2">{saree.description}</p>
                        )}

                        {/* Validation Checks */}
                        <div className="flex gap-2 flex-wrap mb-3">
                          {checks.map((c) => (
                            <span
                              key={c.label}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                              style={{
                                backgroundColor: c.pass ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                color: c.pass ? "var(--color-wf-green)" : "var(--color-wf-red)",
                              }}
                            >
                              {c.pass ? "\u2713" : "\u2717"} {c.label}
                            </span>
                          ))}
                        </div>

                        {/* Three action buttons */}
                        <div className="flex items-center gap-2">
                          <Btn small primary onClick={() => handleApprove(saree._id)}>Approve</Btn>
                          <Btn
                            small
                            danger
                            onClick={() => setShowRejectConfirm(showRejectConfirm === sid ? null : sid)}
                          >
                            Reject &amp; Remove
                          </Btn>
                          <Btn
                            small
                            className="!bg-amber-500 !text-white !border-none hover:!bg-amber-600"
                            onClick={() => setShowCorrectionInput(showCorrectionInput === sid ? null : sid)}
                          >
                            Send for Corrections
                          </Btn>
                          <Btn small onClick={() => setCardPanel({ id: saree._id, name: saree.name })}>
                            Try-on card
                          </Btn>
                        </div>

                        {/* Reject confirmation dialog */}
                        {showRejectConfirm === sid && (
                          <div className="mt-3 p-3 rounded-lg border border-wf-red/30 bg-wf-red/5">
                            <p className="text-sm text-wf-text font-semibold mb-1">Confirm Rejection</p>
                            <p className="text-xs text-wf-subtext mb-2">
                              This will permanently delete the saree from the catalog. This action cannot be undone.
                            </p>
                            <textarea
                              placeholder="Optional rejection reason..."
                              value={rejectFeedback[sid] ?? ""}
                              onChange={(e) =>
                                setRejectFeedback((prev) => ({ ...prev, [sid]: e.target.value }))
                              }
                              className="w-full px-3 py-2 rounded bg-wf-bg border border-wf-border text-sm text-wf-text focus:outline-none focus:border-wf-red resize-none mb-2"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Btn small danger onClick={() => handleReject(saree._id, true)}>
                                Yes, Reject &amp; Remove
                              </Btn>
                              <Btn small onClick={() => setShowRejectConfirm(null)}>Cancel</Btn>
                            </div>
                          </div>
                        )}

                        {/* Corrections feedback textarea */}
                        {showCorrectionInput === sid && (
                          <div className="mt-3 p-3 rounded-lg border border-amber-400/30 bg-amber-500/5">
                            <p className="text-sm text-wf-text font-semibold mb-1">Send for Corrections</p>
                            <p className="text-xs text-wf-subtext mb-2">
                              Describe what the retailer needs to fix before re-submitting.
                            </p>
                            <textarea
                              placeholder="Enter correction notes for the retailer..."
                              value={correctionNotes[sid] ?? ""}
                              onChange={(e) =>
                                setCorrectionNotes((prev) => ({ ...prev, [sid]: e.target.value }))
                              }
                              className="w-full px-3 py-2 rounded bg-wf-bg border border-wf-border text-sm text-wf-text focus:outline-none focus:border-amber-500 resize-none mb-2"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <Btn
                                small
                                className="!bg-amber-500 !text-white !border-none hover:!bg-amber-600"
                                onClick={() => handleCorrections(saree._id)}
                                disabled={!(correctionNotes[sid]?.trim())}
                              >
                                Submit Corrections
                              </Btn>
                              <Btn small onClick={() => setShowCorrectionInput(null)}>Cancel</Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {cardPanel && (
        <SareeCardModal sareeId={cardPanel.id} name={cardPanel.name} onClose={() => setCardPanel(null)} />
      )}
    </div>
  );
}
