"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { getToken } from "@/lib/phoneAuth";
import {
  KPI,
  Card,
  Badge,
  Row,
  Metric,
  Toggle,
  Tabs,
  Btn,
  PageLoading,
} from "@/components/ui/wearify-ui";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Id } from "@wearify/shared/dataModel";
import { SareeCardModal, cardCheck } from "@/components/SareeCardPanel";

// ---------------------------------------------------------------------------
// Role label helper
// ---------------------------------------------------------------------------
const roleLabels: Record<string, string> = {
  R03: "Owner",
  R04: "Manager",
  R05: "Salesperson",
};

// ---------------------------------------------------------------------------
// Onboarding steps
// ---------------------------------------------------------------------------
const onboardingSteps = [
  "Profile",
  "KYC",
  "Legal",
  "Plan",
  "Hardware",
  "Staff",
  "WhatsApp",
  "Activate",
];

// ---------------------------------------------------------------------------
// Agreement list
// ---------------------------------------------------------------------------
const agreements = [
  { key: "msaAccepted", label: "Master Service Agreement (MSA)" },
  { key: "dpaAccepted", label: "Data Processing Agreement (DPA)" },
  { key: "aupAccepted", label: "Acceptable Use Policy (AUP)" },
  { key: "hwAccepted", label: "Hardware Agreement" },
  { key: "slaAccepted", label: "Service Level Agreement (SLA)" },
] as const;

// ---------------------------------------------------------------------------
// Catalog service toggles (UI-only)
// ---------------------------------------------------------------------------
const catalogServices = [
  "Virtual Try-On",
  "AI Visual Search",
  "Skin Tone Analysis",
  "WhatsApp Share",
  "CRM",
  "Campaign Manager",
  "Demand Forecast",
  "Staff Analytics",
  "Voice Search",
  "Appointment Booking",
  "Aging Alerts",
];

// ---------------------------------------------------------------------------
// Health dimensions with weights
// ---------------------------------------------------------------------------
// (Health Metrics now render the store's real per-dimension fields directly —
// see the Health Metrics card — instead of a fabricated breakdown.)

// ===========================================================================
// PAGE COMPONENT
// ===========================================================================
export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // --- data queries ---
  const store = useQuery(api.stores.getStoreDetail, { storeId: id, token: getToken() ?? undefined });
  const devices = useQuery(api.devices.getByStoreId, { storeId: id });
  const staff = useQuery(api.stores.listStaffByStore, { storeId: id });
  const sarees = useQuery(api.sarees.listByStore, { storeId: id });
  const cardStatus = useQuery(
    api.sareeCards.statusForSarees,
    sarees ? { sareeIds: sarees.map((s) => s._id) } : "skip",
  );
  const [cardPanel, setCardPanel] = useState<{ id: Id<"sarees">; name: string } | null>(null);
  const sessions = useQuery(api.sessionOps.listSessionsByStore, {
    storeId: id,
    token: getToken() ?? undefined,
  });

  // --- mutations ---
  const updateStore = useMutation(api.stores.update);
  const createStaff = useMutation(api.stores.createStaff);
  const removeStaff = useMutation(api.stores.removeStaff);

  // --- local state ---
  const [tab, setTab] = useState("Overview");
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: "",
    phone: "",
    pin: "",
    role: "R05",
  });
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState<Id<"staff"> | null>(null);

  // Edit tab state
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editEssential, setEditEssential] = useState(false);
  const [editSubPlan, setEditSubPlan] = useState("");
  const [editMrr, setEditMrr] = useState("");
  const [editNextBilling, setEditNextBilling] = useState("");
  const [editInit, setEditInit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Catalog service toggles (local UI state)
  const [serviceToggles, setServiceToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(catalogServices.map((s) => [s, true]))
  );

  // Seed edit fields once the store loads (one-time initialization).
  useEffect(() => {
    if (!store || editInit) return;
    setEditName(store.name);
    setEditCity(store.city);
    setEditStatus(store.status);
    setEditPlan(store.plan);
    setEditDiscount(store.discountCode || "");
    setEditHours(store.hours || "");
    setEditEssential(store.essentialMode || false);
    setEditSubPlan(store.subscriptionPlan || "Starter");
    setEditMrr(String(store.mrr ?? 0));
    setEditNextBilling(store.nextBillingDate || "");
    setEditInit(true);
  }, [store, editInit]);

  // --- loading ---
  if (!store) return <PageLoading />;

  // ---------------------------------------------------------------------------
  // Staff form helpers
  // ---------------------------------------------------------------------------
  function validateStaffForm() {
    const errors: Record<string, string> = {};
    if (!staffForm.name.trim()) errors.name = "Name is required";
    if (!/^\d{10}$/.test(staffForm.phone))
      errors.phone = "Phone must be 10 digits";
    if (!/^\d{4}$/.test(staffForm.pin))
      errors.pin = "PIN must be 4 digits";
    setStaffErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAddStaff() {
    if (!validateStaffForm()) return;
    try {
      await createStaff({
        name: staffForm.name.trim(),
        phone: staffForm.phone,
        pin: staffForm.pin,
        role: staffForm.role,
        storeId: id,
      });
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Failed to add staff";
      setStaffErrors({
        pin: raw.includes("PIN_TAKEN")
          ? "This PIN is already in use at this store"
          : raw,
      });
      return;
    }
    setStaffForm({ name: "", phone: "", pin: "", role: "R05" });
    setStaffErrors({});
    setShowAddStaff(false);
  }

  async function handleRemoveStaff(staffId: Id<"staff">) {
    try {
      await removeStaff({ id: staffId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove staff");
      return;
    } finally {
      setConfirmRemove(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit save
  // ---------------------------------------------------------------------------
  async function handleSave() {
    setSaving(true);
    const mrrNum = Number(editMrr);
    try {
      await updateStore({
        id: store!._id,
        name: editName,
        city: editCity,
        status: editStatus,
        plan: editPlan,
        discountCode: editDiscount || undefined,
        hours: editHours || undefined,
        essentialMode: editEssential,
        subscriptionPlan: editSubPlan,
        mrr: Number.isFinite(mrrNum) ? mrrNum : undefined,
        nextBillingDate: editNextBilling || undefined,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend() {
    setSaving(true);
    try {
      await updateStore({ id: store!._id, status: "suspended" });
      setEditStatus("suspended");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to suspend store");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  const sareeList = sarees || [];
  const activeSarees = sareeList.filter((s) => s.status === "active").length;
  const lowStockSarees = sareeList.filter(
    (s) => s.status === "low_stock"
  ).length;
  const pendingSarees = sareeList.filter(
    (s) => s.approvalStatus === "pending"
  ).length;


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/admin/stores"
          className="text-sm text-wf-muted hover:text-wf-primary no-underline transition-colors"
        >
          ← Stores
        </Link>
        <span className="text-sm text-wf-muted">/</span>
        <span className="text-sm text-wf-text font-semibold">{store.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-wf-text mb-1">
            {store.name}
          </h1>
          <p className="text-sm text-wf-subtext">
            {store.storeId} — {store.city} — {store.plan} Plan
          </p>
        </div>
        <Badge status={store.status}>{store.status}</Badge>
      </div>

      {/* KPI Row */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <KPI
          label="MRR"
          value={`₹${store.mrr > 0 ? (store.mrr / 1000).toFixed(0) + "K" : "—"}`}
        />
        <KPI label="Health Score" value={`${store.healthScore}/100`} />
        <KPI label="Conversion" value={`${store.conversionRate}%`} />
        <KPI label="Sessions" value={store.sessions} />
        <KPI
          label="Churn Risk"
          value={`${store.churnRisk}%`}
          color={
            store.churnRisk > 30
              ? "var(--color-wf-red)"
              : "var(--color-wf-green)"
          }
        />
        <KPI label="Features" value={`${store.featureScore}/100`} />
      </div>

      {/* Tabs */}
      <Tabs
        items={["Overview", "Staff", "Catalog", "Sessions", "Edit"]}
        active={tab}
        onChange={setTab}
      />

      {/* ================================================================= */}
      {/* OVERVIEW TAB                                                      */}
      {/* ================================================================= */}
      {tab === "Overview" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {/* Store Profile */}
            <Card title="Store Profile">
              {(
                [
                  ["Owner", store.ownerName || "—"],
                  ["Phone", store.ownerPhone || "—"],
                  ["Email", store.ownerEmail || "—"],
                  ["GSTIN", store.gstin || "—"],
                  ["PAN", store.pan || "—"],
                  ["City", store.city],
                  ["State", store.state || "—"],
                  ["Address", store.address || "—"],
                  ["PIN", store.pin || "—"],
                  ["Area", store.area || "—"],
                  ["Hours", store.hours || "—"],
                  ["Agreement", store.agreementStatus],
                  ["Billing Cycle", store.billingCycle || "Monthly"],
                  ["Payment Method", store.paymentMethod || "—"],
                  ["Discount Code", store.discountCode || "—"],
                  [
                    "WhatsApp",
                    store.whatsappNumber
                      ? `${store.whatsappNumber}${store.whatsappVerified ? " ✓ verified" : ""}`
                      : "—",
                  ],
                ] as [string, string][]
              ).map(([l, v]) => (
                <div
                  key={l}
                  className="flex justify-between py-1.5 text-sm border-b border-wf-border last:border-0"
                >
                  <span className="text-wf-subtext">{l}</span>
                  <span className="font-semibold text-wf-text text-right max-w-[60%] truncate">
                    {v}
                  </span>
                </div>
              ))}
            </Card>

            {/* Health Metrics — real per-store fields, not a jittered composite */}
            <Card title="Health Metrics">
              <Metric label="Composite Health" value={`${store.healthScore}/100`} color="var(--color-wf-primary)" />
              <Metric label="Feature Adoption" value={`${store.featureScore}/100`} color="var(--color-wf-blue)" />
              <Metric label="Conversion Rate" value={`${store.conversionRate}%`} color="var(--color-wf-green)" />
              <Metric label="Catalog Utilization" value={`${store.catalogUtilization}%`} color="var(--color-wf-amber)" />
              <Metric label="Churn Risk" value={`${store.churnRisk}%`} color="var(--color-wf-amber)" />
            </Card>
          </div>

          {/* Agreements */}
          <Card title="Agreements" className="mt-3">
            <div className="grid grid-cols-1 gap-1">
              {agreements.map((ag) => {
                const accepted =
                  (store as Record<string, unknown>)[ag.key] === true;
                return (
                  <div
                    key={ag.key}
                    className="flex items-center justify-between py-2 text-sm border-b border-wf-border last:border-0"
                  >
                    <span className="text-wf-text">{ag.label}</span>
                    {accepted ? (
                      <span className="text-wf-green font-semibold text-xs flex items-center gap-1">
                        <span className="inline-block w-4 h-4 rounded-full bg-wf-green/10 text-wf-green text-center leading-4">
                          ✓
                        </span>
                        Accepted
                      </span>
                    ) : (
                      <span className="text-wf-amber font-semibold text-xs flex items-center gap-1">
                        <span className="inline-block w-4 h-4 rounded-full bg-wf-amber/10 text-wf-amber text-center leading-4">
                          ○
                        </span>
                        Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Devices */}
          <Card title={`Devices at ${store.name}`} className="mt-3">
            {devices && devices.length > 0 ? (
              <div>
                {/* Table header */}
                <div className="flex items-center gap-3 py-2 text-xs font-semibold text-wf-subtext border-b border-wf-border">
                  <span className="w-24">Device ID</span>
                  <span className="flex-1">Type</span>
                  <span className="w-20">Status</span>
                  <span className="w-28">Lifecycle</span>
                  <span className="w-24 text-right">Last Seen</span>
                </div>
                {devices.map((d) => (
                  <Row key={d._id}>
                    <span className="w-24 font-mono text-xs text-wf-muted">
                      {d.deviceId}
                    </span>
                    <span className="flex-1 text-sm font-semibold">
                      {d.type}
                    </span>
                    <span className="w-20">
                      <Badge status={d.status}>{d.status}</Badge>
                    </span>
                    <span className="w-28 text-xs text-wf-subtext">
                      {d.lifecycle}
                    </span>
                    <span className="w-24 text-xs text-wf-subtext text-right">
                      {d.lastSeen} ago
                    </span>
                  </Row>
                ))}
              </div>
            ) : (
              <p className="text-sm text-wf-muted py-2">No devices assigned</p>
            )}
          </Card>

          {/* Onboarding Progress */}
          <Card title="Onboarding Progress" className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              {onboardingSteps.map((step, i) => {
                const done = i < store.onboardingStep;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          done
                            ? "bg-wf-green/10 border-wf-green text-wf-green"
                            : "bg-wf-border/30 border-wf-border text-wf-muted"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={`text-xs mt-1 ${done ? "text-wf-green font-semibold" : "text-wf-muted"}`}
                      >
                        {step}
                      </span>
                    </div>
                    {i < onboardingSteps.length - 1 && (
                      <div
                        className={`w-6 h-0.5 ${done ? "bg-wf-green" : "bg-wf-border"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-sm text-wf-subtext mt-3">
              Step {store.onboardingStep}/{onboardingSteps.length} —{" "}
              {store.onboardingStep === onboardingSteps.length
                ? "Completed"
                : "In Progress"}
            </div>
          </Card>
        </>
      )}

      {/* ================================================================= */}
      {/* STAFF TAB                                                         */}
      {/* ================================================================= */}
      {tab === "Staff" && (
        <Card
          title="Staff"
          action={
            <Btn small primary onClick={() => setShowAddStaff((p) => !p)}>
              {showAddStaff ? "Cancel" : "+ Add Staff"}
            </Btn>
          }
        >
          {/* Add staff inline form */}
          {showAddStaff && (
            <div className="mb-4 p-4 rounded-lg border border-wf-border bg-wf-bg">
              <div className="text-base font-bold text-wf-text mb-3">
                New Staff Member
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="text-xs text-wf-subtext mb-1 block">
                    Name
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    value={staffForm.name}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, name: e.target.value })
                    }
                    placeholder="Full name"
                  />
                  {staffErrors.name && (
                    <span className="text-xs text-wf-red mt-0.5 block">
                      {staffErrors.name}
                    </span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs text-wf-subtext mb-1 block">
                    Phone
                  </label>
                  <div className="flex items-center">
                    <span className="text-sm text-wf-muted mr-1">+91</span>
                    <input
                      className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                      value={staffForm.phone}
                      onChange={(e) =>
                        setStaffForm({
                          ...staffForm,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        })
                      }
                      placeholder="10-digit number"
                      maxLength={10}
                    />
                  </div>
                  {staffErrors.phone && (
                    <span className="text-xs text-wf-red mt-0.5 block">
                      {staffErrors.phone}
                    </span>
                  )}
                </div>

                {/* PIN */}
                <div>
                  <label className="text-xs text-wf-subtext mb-1 block">
                    PIN (4 digits)
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    type="password"
                    value={staffForm.pin}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        pin: e.target.value.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                    placeholder="4 digit PIN"
                    maxLength={4}
                  />
                  {staffErrors.pin && (
                    <span className="text-xs text-wf-red mt-0.5 block">
                      {staffErrors.pin}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="text-xs text-wf-subtext mb-1 block">
                    Role
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                    value={staffForm.role}
                    onChange={(e) =>
                      setStaffForm({ ...staffForm, role: e.target.value })
                    }
                  >
                    <option value="R04">R04 — Manager</option>
                    <option value="R05">R05 — Salesperson</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Btn primary small onClick={handleAddStaff}>
                  Add Staff
                </Btn>
              </div>
            </div>
          )}

          {/* Staff table */}
          {staff && staff.length > 0 ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 py-2 text-xs font-semibold text-wf-subtext border-b border-wf-border">
                <span className="w-36">Name</span>
                <span className="w-28">Phone</span>
                <span className="w-16">PIN</span>
                <span className="w-32">Role</span>
                <span className="w-16 text-right">Sessions</span>
                <span className="w-20 text-right">Conv%</span>
                <span className="w-20 text-right">Revenue</span>
                <span className="w-20 text-right">Action</span>
              </div>
              {staff.map((s) => (
                <Row key={s._id}>
                  <span className="w-36 font-semibold text-sm truncate">
                    {s.name}
                  </span>
                  <span className="w-28 text-sm text-wf-subtext">
                    {s.phone}
                  </span>
                  <span className="w-16 font-mono text-sm text-wf-muted">
                    ••••
                  </span>
                  <span className="w-32">
                    <Badge status={s.role === "R03" ? "active" : "trial"}>
                      {s.role} {roleLabels[s.role] || ""}
                    </Badge>
                  </span>
                  <span className="w-16 text-sm text-right font-mono">
                    {s.sessionCount ?? 0}
                  </span>
                  <span className="w-20 text-sm text-right font-mono">
                    {s.conversion ?? 0}%
                  </span>
                  <span className="w-20 text-sm text-right font-mono">
                    {s.revenue
                      ? `₹${(s.revenue / 1000).toFixed(1)}K`
                      : "₹0"}
                  </span>
                  <span className="w-20 text-right">
                    {confirmRemove === s._id ? (
                      <span className="flex items-center gap-1 justify-end">
                        <Btn
                          small
                          danger
                          onClick={() => handleRemoveStaff(s._id)}
                        >
                          Yes
                        </Btn>
                        <Btn small onClick={() => setConfirmRemove(null)}>
                          No
                        </Btn>
                      </span>
                    ) : (
                      <Btn
                        small
                        danger
                        onClick={() => setConfirmRemove(s._id)}
                      >
                        Remove
                      </Btn>
                    )}
                  </span>
                </Row>
              ))}
            </div>
          ) : (
            <p className="text-sm text-wf-muted py-4">
              No staff members found for this store.
            </p>
          )}
        </Card>
      )}

      {/* ================================================================= */}
      {/* CATALOG TAB                                                       */}
      {/* ================================================================= */}
      {tab === "Catalog" && (
        <>
          {/* Stats row */}
          <div className="flex gap-3 mb-4">
            <KPI label="Total Sarees" value={sareeList.length} />
            <KPI label="Active" value={activeSarees} />
            <KPI
              label="Low Stock"
              value={lowStockSarees}
              color={
                lowStockSarees > 0
                  ? "var(--color-wf-amber)"
                  : "var(--color-wf-green)"
              }
            />
            <KPI
              label="Pending Approval"
              value={pendingSarees}
              color={
                pendingSarees > 0
                  ? "var(--color-wf-amber)"
                  : "var(--color-wf-green)"
              }
            />
          </div>

          <Card title="Saree Catalog">
            {sareeList.length > 0 ? (
              <div>
                {/* Header */}
                <div className="flex items-center gap-2 py-2 text-xs font-semibold text-wf-subtext border-b border-wf-border">
                  <span className="w-40">Name</span>
                  <span className="w-24">Type</span>
                  <span className="w-20">Fabric</span>
                  <span className="w-20 text-right">Price</span>
                  <span className="w-14 text-right">Stock</span>
                  <span className="w-20">Status</span>
                  <span className="w-20">Tag</span>
                  <span className="w-14 text-right">Views</span>
                  <span className="w-16 text-right">Try-ons</span>
                  <span className="w-20">Approval</span>
                  <span className="w-28">Try-on card</span>
                </div>
                {sareeList.map((s) => (
                  <Row key={s._id}>
                    <span className="w-40 font-semibold text-sm truncate">
                      {s.name}
                    </span>
                    <span className="w-24 text-xs text-wf-subtext truncate">
                      {s.type}
                    </span>
                    <span className="w-20 text-xs text-wf-subtext">
                      {s.fabric}
                    </span>
                    <span className="w-20 text-sm text-right font-mono">
                      ₹{s.price.toLocaleString()}
                    </span>
                    <span
                      className={`w-14 text-sm text-right font-mono ${s.stock <= 5 ? "text-wf-red" : ""}`}
                    >
                      {s.stock}
                    </span>
                    <span className="w-20">
                      <Badge status={s.status === "active" ? "active" : s.status === "low_stock" ? "pending" : "offline"}>
                        {s.status.replace("_", " ")}
                      </Badge>
                    </span>
                    <span className="w-20">
                      {s.tag ? (
                        <Badge status={s.tag === "Premium" ? "active" : s.tag === "Trending" ? "progress" : "trial"}>
                          {s.tag}
                        </Badge>
                      ) : (
                        <span className="text-xs text-wf-muted">—</span>
                      )}
                    </span>
                    <span className="w-14 text-xs text-right font-mono">
                      {s.views ?? 0}
                    </span>
                    <span className="w-16 text-xs text-right font-mono">
                      {s.tryOns ?? 0}
                    </span>
                    <span className="w-20">
                      <Badge
                        status={
                          s.approvalStatus === "approved"
                            ? "active"
                            : s.approvalStatus === "rejected"
                              ? "offline"
                              : "pending"
                        }
                      >
                        {s.approvalStatus || "pending"}
                      </Badge>
                    </span>
                    <span className="w-28">
                      {(() => {
                        const c = cardCheck(cardStatus ? cardStatus[s._id] : undefined);
                        return (
                          <button
                            type="button"
                            className="text-left"
                            title={c.label}
                            onClick={() => setCardPanel({ id: s._id, name: s.name })}
                          >
                            <Badge status={c.pass ? "active" : c.pending ? "progress" : "pending"}>
                              {c.pass ? "OK" : c.pending ? "…" : c.label.replace(/^Try-on card:? ?/, "") || "review"}
                            </Badge>
                          </button>
                        );
                      })()}
                    </span>
                  </Row>
                ))}
              </div>
            ) : (
              <p className="text-sm text-wf-muted py-4">
                No sarees in catalog for this store.
              </p>
            )}
          </Card>
        </>
      )}

      {/* ================================================================= */}
      {/* SESSIONS TAB                                                      */}
      {/* ================================================================= */}
      {tab === "Sessions" && (
        <Card title="Recent Sessions">
          {sessions && sessions.length > 0 ? (
            <div>
              {/* Header */}
              <div className="flex items-center gap-2 py-2 text-xs font-semibold text-wf-subtext border-b border-wf-border">
                <span className="w-28">Session ID</span>
                <span className="w-28">Customer</span>
                <span className="w-24">Staff</span>
                <span className="w-20">Status</span>
                <span className="w-36">Start Time</span>
                <span className="w-20">Duration</span>
                <span className="w-20 text-right">Sarees</span>
                <span className="w-14 text-right">Rating</span>
              </div>
              {sessions.map((s) => {
                const startDate = new Date(s.startTime);
                const timeStr = `${startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} ${startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
                return (
                  <Row key={s._id}>
                    <span className="w-28 font-mono text-xs text-wf-muted truncate">
                      {s.sessionId}
                    </span>
                    <span className="w-28 text-sm text-wf-subtext truncate">
                      {s.customerPhone || "Walk-in"}
                    </span>
                    <span className="w-24 text-sm truncate">
                      {s.staffName || "—"}
                    </span>
                    <span className="w-20">
                      <Badge
                        status={
                          s.status === "active" ? "active" : "ok"
                        }
                      >
                        {s.status}
                      </Badge>
                    </span>
                    <span className="w-36 text-xs text-wf-subtext">
                      {timeStr}
                    </span>
                    <span className="w-20 text-xs font-mono">
                      {s.duration || "—"}
                    </span>
                    <span className="w-20 text-sm text-right font-mono">
                      {s.sareesTriedOn ?? 0}
                    </span>
                    <span className="w-14 text-sm text-right">
                      {s.rating ? (
                        <span className="text-wf-amber font-semibold">
                          {s.rating}/5
                        </span>
                      ) : (
                        <span className="text-wf-muted">—</span>
                      )}
                    </span>
                  </Row>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-wf-muted mb-1">No sessions found</p>
              <p className="text-xs text-wf-muted">
                Sessions will appear here once customers start using the mirror.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* ================================================================= */}
      {/* EDIT TAB                                                          */}
      {/* ================================================================= */}
      {tab === "Edit" && (
        <>
          <Card title="Edit Store Details">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Store Name
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              {/* City */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  City
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="churned">Churned</option>
                </select>
              </div>

              {/* Plan */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Plan
                </label>
                <select
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                >
                  <option value="Smart">Smart</option>
                  <option value="Digital">Digital</option>
                  <option value="Trial">Trial</option>
                </select>
              </div>

              {/* Discount Code */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Discount Code
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                  placeholder="e.g. EARLYBIRD20"
                />
              </div>

              {/* Operating Hours */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Operating Hours
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  placeholder="e.g. 10:00 AM - 9:00 PM"
                />
              </div>

              {/* Subscription Plan */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Subscription Plan
                </label>
                <select
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editSubPlan}
                  onChange={(e) => setEditSubPlan(e.target.value)}
                >
                  <option value="Starter">Starter</option>
                  <option value="Professional">Professional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              {/* MRR */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  MRR (Rs/month)
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editMrr}
                  onChange={(e) => setEditMrr(e.target.value)}
                  placeholder="e.g. 15000"
                />
              </div>

              {/* Next Billing Date */}
              <div>
                <label className="text-xs text-wf-subtext mb-1 block">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                  value={editNextBilling}
                  onChange={(e) => setEditNextBilling(e.target.value)}
                />
              </div>

              {/* Essential Mode */}
              <div className="flex items-center gap-3 pt-5">
                <Toggle
                  on={editEssential}
                  onToggle={() => setEditEssential((p) => !p)}
                />
                <span className="text-sm text-wf-text">Essential Mode</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-wf-border">
              <Btn primary onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Btn>
              <Btn
                danger
                onClick={handleSuspend}
                disabled={saving || editStatus === "suspended"}
              >
                Suspend Store
              </Btn>
            </div>
          </Card>

          {/* Catalog Services (UI toggles) */}
          <Card title="Catalog Services" className="mt-3">
            <p className="text-xs text-wf-subtext mb-3">
              Toggle features available to this store. Changes here are
              UI-only for now.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {catalogServices.map((service) => (
                <div
                  key={service}
                  className="flex items-center justify-between py-2 px-3 rounded border border-wf-border"
                >
                  <span className="text-sm text-wf-text">{service}</span>
                  <Toggle
                    on={serviceToggles[service] ?? false}
                    onToggle={() =>
                      setServiceToggles((prev) => ({
                        ...prev,
                        [service]: !prev[service],
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {cardPanel && (
        <SareeCardModal sareeId={cardPanel.id} name={cardPanel.name} onClose={() => setCardPanel(null)} />
      )}
    </div>
  );
}
