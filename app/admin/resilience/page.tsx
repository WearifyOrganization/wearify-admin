"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@wearify/shared/api";
import { Badge, KPI, Card, Row, Tabs, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";
import { useState } from "react";

const BACKUPS = [
  { service: "RDS PostgreSQL", method: "Snapshot+PITR", rpo: "5min", rto: "30min", last: "Today 02:00", ok: true },
  { service: "S3 Images", method: "Cross-region", rpo: "~0", rto: "5min", last: "Continuous", ok: true },
  { service: "ElastiCache", method: "RDB Snapshot", rpo: "24h", rto: "15min", last: "Today 03:00", ok: true },
  { service: "Edge SQLite", method: "Cloud re-sync", rpo: "Sync", rto: "2h", last: "Per device", ok: true },
  { service: "Terraform", method: "S3 Versioning", rpo: "Apply", rto: "2h", last: "Yesterday", ok: true },
  { service: "Secrets Mgr", method: "Versioning", rpo: "~0", rto: "5min", last: "3d ago", ok: true },
];

const DR_DRILLS = [
  { test: "RDS Restore", freq: "Quarterly", last: "Feb 15, 2026", result: "Pass (28min)", next: "May 15, 2026" },
  { test: "S3 Cross-Region", freq: "Semi-annual", last: "Jan 10, 2026", result: "Pass", next: "Jul 10, 2026" },
  { test: "Region Failover (tabletop)", freq: "Annual", last: "Dec 2025", result: "Pass", next: "Dec 2026" },
  { test: "Edge Recovery", freq: "Quarterly", last: "Feb 15, 2026", result: "Pass", next: "May 15, 2026" },
  { test: "Terraform Re-create", freq: "Annual", last: "Jan 2026", result: "Pass", next: "Jan 2027" },
  { test: "CERT-In Drill", freq: "Semi-annual", last: "Feb 15, 2026", result: "Pass (4h response)", next: "Aug 2026" },
];

const TAB_ITEMS = ["Backup Health", "DR Drills", "Incidents", "On-Call"];

export default function ResiliencePage() {
  // Gate on auth-ready so these admin-gated queries don't fire (and throw
  // UNAUTHORIZED) before the Better Auth token is attached to Convex.
  const { isAuthenticated } = useConvexAuth();
  const incidents = useQuery(api.resilience.listIncidents, isAuthenticated ? {} : "skip");
  const onCall = useQuery(api.resilience.listOnCall, isAuthenticated ? {} : "skip");
  const [tab, setTab] = useState("Backup Health");

  if (!incidents || !onCall) return <PageLoading />;

  const openIncidents = incidents.filter((i) => i.status === "open");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved");

  // Compute MTTR from resolved incidents that have a duration
  const durationsMinutes = resolvedIncidents
    .map((i) => i.duration)
    .filter(Boolean)
    .map((d) => {
      const match = d!.match(/(\d+)\s*min/);
      if (match) return parseInt(match[1], 10);
      const hMatch = d!.match(/(\d+)\s*h/);
      if (hMatch) return parseInt(hMatch[1], 10) * 60;
      return 0;
    })
    .filter((m) => m > 0);

  const mttr =
    durationsMinutes.length > 0
      ? `${Math.round(durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length)}min`
      : "N/A";

  const lastDrill = "Feb 15, 2026";

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">DR & Resilience</h1>
      <p className="text-xs text-wf-subtext mb-3">
        Backup health, disaster recovery drills, incidents, and on-call rotation
      </p>

      {/* KPI Row */}
      <div className="flex gap-2 mb-3">
        <KPI
          label="All Backups OK"
          value={BACKUPS.every((b) => b.ok) ? "YES" : "NO"}
          subtitle={`${BACKUPS.length} services`}
          color={BACKUPS.every((b) => b.ok) ? "var(--color-wf-green)" : "var(--color-wf-red)"}
        />
        <div className="flex-1 flex flex-col gap-1">
          <KPI label="Last DR Drill" value={lastDrill} subtitle="All passed" color="var(--color-wf-green)" />
          <SampleBadge />
        </div>
        <KPI
          label="Open Incidents"
          value={openIncidents.length}
          subtitle={openIncidents.length === 0 ? "All clear" : `${openIncidents.length} active`}
          color={openIncidents.length === 0 ? "var(--color-wf-green)" : "var(--color-wf-red)"}
        />
        <KPI label="MTTR" value={mttr} subtitle="Mean time to resolve" />
      </div>

      <Tabs items={TAB_ITEMS} active={tab} onChange={setTab} />

      {/* Backup Health Tab */}
      {tab === "Backup Health" && (
        <Card title="Backup Status" action={<SampleBadge />}>
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[130px]">Service</span>
            <span className="w-[110px]">Method</span>
            <span className="w-[60px]">RPO</span>
            <span className="w-[60px]">RTO</span>
            <span className="w-[100px]">Last Backup</span>
            <span className="w-[60px] text-right">Status</span>
          </div>
          {BACKUPS.map((b) => (
            <Row key={b.service}>
              <span className="w-[130px] text-xs font-semibold">{b.service}</span>
              <span className="w-[110px] text-xs text-wf-subtext">{b.method}</span>
              <span className="w-[60px] text-xs font-mono">{b.rpo}</span>
              <span className="w-[60px] text-xs font-mono">{b.rto}</span>
              <span className="w-[100px] text-xs text-wf-subtext">{b.last}</span>
              <span className="w-[60px] text-right">
                <Badge status={b.ok ? "ok" : "offline"}>{b.ok ? "OK" : "FAIL"}</Badge>
              </span>
            </Row>
          ))}
        </Card>
      )}

      {/* DR Drills Tab */}
      {tab === "DR Drills" && (
        <Card title="DR Drill Schedule & Results" action={<SampleBadge />}>
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[180px]">Test</span>
            <span className="w-[90px]">Frequency</span>
            <span className="w-[110px]">Last Run</span>
            <span className="w-[120px]">Result</span>
            <span className="w-[110px] text-right">Next Scheduled</span>
          </div>
          {DR_DRILLS.map((d) => (
            <Row key={d.test}>
              <span className="w-[180px] text-xs font-semibold">{d.test}</span>
              <span className="w-[90px] text-xs text-wf-subtext">{d.freq}</span>
              <span className="w-[110px] text-xs text-wf-subtext">{d.last}</span>
              <span className="w-[120px]">
                <Badge status="ok">{d.result}</Badge>
              </span>
              <span className="w-[110px] text-right text-xs text-wf-subtext">{d.next}</span>
            </Row>
          ))}
        </Card>
      )}

      {/* Incidents Tab */}
      {tab === "Incidents" && (
        <Card title={`Incidents (${incidents.length})`}>
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[60px]">ID</span>
            <span className="w-[40px]">Sev</span>
            <span className="flex-1">Title</span>
            <span className="w-[100px]">Start</span>
            <span className="w-[80px]">End</span>
            <span className="w-[60px]">Duration</span>
            <span className="w-[50px] text-right">Stores</span>
            <span className="w-[140px]">Root Cause</span>
            <span className="w-[60px] text-right">Status</span>
          </div>
          {incidents.map((i) => (
            <Row key={i._id}>
              <span className="w-[60px] font-mono text-xs text-wf-muted">{i.incidentId}</span>
              <span className="w-[40px]">
                <Badge status={i.severity}>{i.severity}</Badge>
              </span>
              <span className="flex-1 text-xs font-semibold">{i.title}</span>
              <span className="w-[100px] text-xs text-wf-subtext">{i.startTime}</span>
              <span className="w-[80px] text-xs text-wf-subtext">{i.endTime || "—"}</span>
              <span className="w-[60px] text-xs font-mono text-wf-subtext">{i.duration || "—"}</span>
              <span className="w-[50px] text-right text-xs font-mono">{i.storesAffected}</span>
              <span className="w-[140px] text-xs text-wf-subtext truncate">{i.rootCause || "—"}</span>
              <span className="w-[60px] text-right">
                <Badge status={i.status}>{i.status}</Badge>
              </span>
            </Row>
          ))}
          {incidents.length === 0 && (
            <div className="text-center py-6 text-wf-muted text-sm">
              No incidents recorded
            </div>
          )}
        </Card>
      )}

      {/* On-Call Tab */}
      {tab === "On-Call" && (
        <Card title="On-Call Rotation">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[120px]">Role</span>
            <span className="w-[120px]">Name</span>
            <span className="flex-1">Title</span>
            <span className="w-[120px]">Week</span>
            <span className="w-[60px]">Status</span>
            <span className="w-[110px] text-right">Phone</span>
          </div>
          {onCall.map((o) => (
            <Row key={o._id}>
              <span className="w-[120px] text-xs font-semibold">{o.role}</span>
              <span className="w-[120px] text-xs">{o.name}</span>
              <span className="flex-1 text-xs text-wf-subtext">{o.title}</span>
              <span className="w-[120px] text-xs text-wf-subtext">{o.week}</span>
              <span className="w-[60px]">
                <Badge status={o.status}>{o.status}</Badge>
              </span>
              <span className="w-[110px] text-right text-xs font-mono text-wf-subtext">{o.phone}</span>
            </Row>
          ))}
          {onCall.length === 0 && (
            <div className="text-center py-6 text-wf-muted text-sm">
              No on-call rotation configured
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
