"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { Badge, KPI, Card, Row, Tabs, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";
import { useState } from "react";

const ROLE_DEFINITIONS = [
  { id: "R01", name: "Super Admin", description: "Full platform access" },
  { id: "R02", name: "Store Manager", description: "Store-level admin" },
  { id: "R03", name: "Sales Staff", description: "Tablet + mirror" },
  { id: "R04", name: "Catalog Manager", description: "Inventory only" },
  { id: "R05", name: "Viewer", description: "Read-only dashboards" },
  { id: "R06", name: "API Service", description: "Machine-to-machine" },
  { id: "R07", name: "Auditor", description: "Audit trail only" },
];

const API_KEYS = [
  { service: "svc-whatsapp", provider: "Gupshup", rotated: "Mar 10", expires: "Jun 10", status: "active" },
  { service: "svc-payments", provider: "Razorpay", rotated: "Feb 15", expires: "May 15", status: "active" },
  { service: "svc-llm", provider: "Anthropic", rotated: "Mar 1", expires: "Jun 1", status: "active" },
  { service: "svc-iot", provider: "AWS IoT", rotated: "Jan 20", expires: "Apr 20", status: "expiring" },
];

const CERTIN_ITEMS = [
  { label: "Incident Reporting SLA", value: "Within 6 hours", status: "ok" },
  { label: "Annual Security Audit", value: "Completed Feb 2026", status: "verified" },
  { label: "Data Localization", value: "All PII stored in IN-region", status: "verified" },
  { label: "Next Audit Due", value: "Feb 2027", status: "planned" },
];

export default function SecurityPage() {
  const staff = useQuery(api.security.listStaff);
  const roleEvents = useQuery(api.security.listRoleEvents);
  const otpDevMode = useQuery(api.phoneAuth.getOtpDevMode);
  const setOtpDevMode = useMutation(api.phoneAuth.setOtpDevMode);
  const [tab, setTab] = useState("RBAC");
  const [savingOtp, setSavingOtp] = useState(false);

  if (!staff || !roleEvents) return <PageLoading />;

  const activeSessions = staff.filter((s) => s.status === "active").length;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Security & Access</h1>
      <p className="text-xs text-wf-subtext mb-3">
        RBAC, API key rotation, role audit trail, CERT-In compliance
      </p>

      <Tabs
        items={["RBAC", "Authentication", "API Keys", "Role Events", "CERT-In"]}
        active={tab}
        onChange={setTab}
      />

      {/* ====== RBAC Tab ====== */}
      {tab === "RBAC" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-2 mb-3">
            <KPI label="Total Staff" value={staff.length} />
            <KPI label="Roles Defined" value={7} subtitle="R01–R07" />
            <KPI label="Active Sessions" value={activeSessions} subtitle="Currently active" />
          </div>

          {/* Role Definitions */}
          <Card title="Role Definitions (7)">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[50px]">Code</span>
              <span className="w-[120px]">Role</span>
              <span className="flex-1">Description</span>
            </div>
            {ROLE_DEFINITIONS.map((role) => (
              <Row key={role.id}>
                <span className="w-[50px] font-mono text-xs text-wf-primary font-semibold">
                  {role.id}
                </span>
                <span className="w-[120px] text-xs font-semibold">
                  {role.name}
                </span>
                <span className="flex-1 text-xs text-wf-subtext">
                  {role.description}
                </span>
              </Row>
            ))}
          </Card>

          {/* Staff List */}
          <Card title="Staff Directory">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="flex-1">Name</span>
              <span className="w-[100px]">Role</span>
              <span className="w-[80px]">Store ID</span>
              <span className="w-[60px] text-right">Status</span>
            </div>
            {staff.map((s) => (
              <Row key={s._id}>
                <span className="flex-1 text-xs font-semibold">{s.name}</span>
                <span className="w-[100px] text-xs font-mono text-wf-subtext">
                  {s.role}
                </span>
                <span className="w-[80px] text-xs font-mono text-wf-muted">
                  {s.storeId || "—"}
                </span>
                <span className="w-[60px] text-right">
                  <Badge status={s.status || "active"}>
                    {s.status || "active"}
                  </Badge>
                </span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {/* ====== Authentication Tab ====== */}
      {tab === "Authentication" && (
        <div>
          <Card title="OTP / Phone Login">
            <p className="text-xs text-wf-subtext mb-3">
              Controls how phone-login one-time codes are issued across the customer PWA,
              sales tablet, and store/tailor logins. Stored in platformConfig
              (<span className="font-mono">otp.devMode</span>) — switches instantly, no redeploy.
            </p>
            <div className="flex items-center justify-between py-2 border-b border-wf-border">
              <div className="flex-1 pr-3">
                <div className="text-sm font-bold text-wf-text">Dev mode — accept test code 123456</div>
                <div className="text-xs text-wf-subtext mt-0.5">
                  {otpDevMode === undefined
                    ? "Loading…"
                    : otpDevMode.devMode
                    ? "ON — every login accepts 123456 and no SMS is sent. Turn OFF for launch (requires MSG91 keys set in the Convex environment)."
                    : "OFF — a real MSG91 SMS code is required; 123456 is rejected."}
                </div>
              </div>
              <button
                disabled={otpDevMode === undefined || savingOtp}
                onClick={async () => {
                  if (otpDevMode === undefined) return;
                  setSavingOtp(true);
                  try { await setOtpDevMode({ devMode: !otpDevMode.devMode }); }
                  finally { setSavingOtp(false); }
                }}
                aria-label="Toggle OTP dev mode"
                className={`shrink-0 w-[52px] h-[28px] rounded-full transition-colors relative ${
                  otpDevMode?.devMode ? "bg-wf-primary" : "bg-wf-border"
                } ${otpDevMode === undefined || savingOtp ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow transition-all ${
                    otpDevMode?.devMode ? "left-[27px]" : "left-[3px]"
                  }`}
                />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge status={otpDevMode?.devMode ? "pending" : "verified"}>
                {otpDevMode === undefined ? "…" : otpDevMode.devMode ? "DEV MODE" : "PRODUCTION"}
              </Badge>
              <span className="text-xs text-wf-muted">
                {savingOtp ? "Saving…" : "Affects all phone-OTP logins immediately."}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* ====== API Keys Tab ====== */}
      {tab === "API Keys" && (
        <Card title="API Key Inventory" action={<SampleBadge />}>
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[120px]">Service</span>
            <span className="w-[100px]">Provider</span>
            <span className="w-[80px]">Last Rotated</span>
            <span className="w-[80px]">Expires</span>
            <span className="w-[70px] text-right">Status</span>
          </div>
          {API_KEYS.map((k) => (
            <Row key={k.service}>
              <span className="w-[120px] font-mono text-xs font-semibold">
                {k.service}
              </span>
              <span className="w-[100px] text-xs text-wf-subtext">
                {k.provider}
              </span>
              <span className="w-[80px] text-xs font-mono text-wf-muted">
                {k.rotated}
              </span>
              <span className="w-[80px] text-xs font-mono text-wf-muted">
                {k.expires}
              </span>
              <span className="w-[70px] text-right">
                <Badge status={k.status === "expiring" ? "pending" : k.status}>
                  {k.status}
                </Badge>
              </span>
            </Row>
          ))}
        </Card>
      )}

      {/* ====== Role Events Tab ====== */}
      {tab === "Role Events" && (
        <Card title={`Role Change Events (${roleEvents.length})`}>
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[70px]">Event ID</span>
            <span className="flex-1">User</span>
            <span className="w-[80px]">From</span>
            <span className="w-[80px]">To</span>
            <span className="w-[100px]">Approved By</span>
            <span className="w-[70px]">Date</span>
            <span className="w-[60px] text-right">Status</span>
          </div>
          {roleEvents.length === 0 ? (
            <div className="text-center py-6 text-wf-muted text-sm">
              No role change events recorded yet
            </div>
          ) : (
            roleEvents.map((e) => (
              <Row key={e._id}>
                <span className="w-[70px] font-mono text-xs text-wf-muted">
                  {e.eventId}
                </span>
                <span className="flex-1 text-xs font-semibold">{e.userName}</span>
                <span className="w-[80px] text-xs font-mono text-wf-subtext">
                  {e.fromRole}
                </span>
                <span className="w-[80px] text-xs font-mono text-wf-primary">
                  {e.toRole}
                </span>
                <span className="w-[100px] text-xs text-wf-subtext">
                  {e.approvedBy}
                </span>
                <span className="w-[70px] text-xs font-mono text-wf-muted">
                  {e.date}
                </span>
                <span className="w-[60px] text-right">
                  <Badge status={e.approved ? "verified" : "pending"}>
                    {e.approved ? "approved" : "pending"}
                  </Badge>
                </span>
              </Row>
            ))
          )}
        </Card>
      )}

      {/* ====== CERT-In Tab ====== */}
      {tab === "CERT-In" && (
        <div>
          <Card title="CERT-In Compliance" action={<SampleBadge />}>
            <p className="text-xs text-wf-subtext mb-3">
              Indian Computer Emergency Response Team (CERT-In) directive compliance status.
              All covered entities must report cyber incidents within 6 hours.
            </p>
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="flex-1">Requirement</span>
              <span className="w-[180px]">Detail</span>
              <span className="w-[70px] text-right">Status</span>
            </div>
            {CERTIN_ITEMS.map((item) => (
              <Row key={item.label}>
                <span className="flex-1 text-xs font-semibold">{item.label}</span>
                <span className="w-[180px] text-xs text-wf-subtext">{item.value}</span>
                <span className="w-[70px] text-right">
                  <Badge status={item.status}>{item.status}</Badge>
                </span>
              </Row>
            ))}
          </Card>

          <Card title="Data Localization" action={<SampleBadge />}>
            <div className="space-y-2">
              {[
                { label: "Primary DB", value: "Mumbai (ap-south-1)", compliant: true },
                { label: "Backups", value: "Mumbai + Hyderabad", compliant: true },
                { label: "CDN Edge", value: "IN-only edge nodes for PII", compliant: true },
                { label: "Log Retention", value: "180 days (CERT-In mandate)", compliant: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-1 border-b border-wf-border last:border-0">
                  <span className="text-xs font-semibold text-wf-text">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-wf-subtext">{row.value}</span>
                    <Badge status={row.compliant ? "verified" : "open"}>
                      {row.compliant ? "compliant" : "non-compliant"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
