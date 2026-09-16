"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { useState } from "react";
import { useClockLabel } from "@/lib/useClock";
import {
  KPI,
  Card,
  Badge,
  Row,
  Btn,
  Tabs,
  PageLoading,
} from "@/components/ui/wearify-ui";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CommandCenterPage() {
  const sessions = useQuery(api.network.listSessions);
  const incidents = useQuery(api.resilience.listIncidents);
  const onCall = useQuery(api.resilience.listOnCall);
  const addAuditEntry = useMutation(api.settings.addAuditEntry);

  const [tab, setTab] = useState("Live View");
  const [emergencyConfirm, setEmergencyConfirm] = useState<string | null>(null);
  const clockLabel = useClockLabel();

  if (!sessions || !incidents || !onCall) return <PageLoading />;

  const activeSessions = sessions.filter((s) => s.status === "active");
  const openIncidents = incidents.filter((i) => i.status === "open");
  const onCallActive = onCall.filter((c) => c.status === "active");
  const primaryOnCall = onCallActive.length > 0 ? onCallActive[0] : null;

  const severityCounts = {
    P1: openIncidents.filter((i) => i.severity === "P1").length,
    P2: openIncidents.filter((i) => i.severity === "P2").length,
    P3: openIncidents.filter((i) => i.severity === "P3").length,
  };

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        Command Center
      </h1>
      <p className="text-xs text-wf-subtext mb-3">
        Emergency actions, incident response, escalation matrix —{" "}
        {clockLabel}
      </p>

      {/* KPI Row */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <KPI
          label="Active Sessions"
          value={activeSessions.length}
          subtitle={`${sessions.length} total`}
        />
        <KPI
          label="Open Incidents"
          value={openIncidents.length}
          subtitle={
            severityCounts.P1 > 0
              ? `${severityCounts.P1} P1 critical`
              : "No P1s"
          }
          color={
            severityCounts.P1 > 0
              ? "var(--color-wf-red)"
              : "var(--color-wf-green)"
          }
        />
        <KPI
          label="On-Call"
          value={primaryOnCall ? primaryOnCall.name.split(" ")[0] : "None"}
          subtitle={primaryOnCall ? primaryOnCall.title : "Unassigned"}
        />
        <KPI
          label="Escalation"
          value={`${onCallActive.length}/${onCall.length}`}
          subtitle="staff available"
        />
      </div>

      <Tabs
        items={["Live View", "Incidents", "Escalation"]}
        active={tab}
        onChange={setTab}
      />

      {/* Emergency Actions — always visible */}
      <Card
        title="Emergency Actions"
        className="border-wf-red/40"
        action={
          <Badge status="P1">
            {emergencyConfirm ? "CONFIRM ACTION" : "ARMED"}
          </Badge>
        }
      >
        {emergencyConfirm && (
          <div className="mb-3 p-2 rounded bg-wf-red/5 border border-wf-red/20">
            <p className="text-xs text-wf-red font-semibold mb-2">
              Are you sure you want to execute &quot;{emergencyConfirm}&quot;?
              This action will affect all production systems.
            </p>
            <div className="flex gap-2">
              <Btn
                danger
                small
                onClick={async () => {
                  const action = emergencyConfirm;
                  setEmergencyConfirm(null);
                  if (!action) return;
                  try {
                    await addAuditEntry({
                      action,
                      category: "emergency",
                      details: "Triggered from Command Center",
                    });
                  } catch { /* ignore */ }
                }}
              >
                Confirm Execute
              </Btn>
              <Btn small onClick={() => setEmergencyConfirm(null)}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Btn
            danger
            onClick={() => setEmergencyConfirm("Emergency Stop All Mirrors")}
          >
            Emergency Stop All Mirrors
          </Btn>
          <Btn
            danger
            onClick={() =>
              setEmergencyConfirm("Kill Switch — Disable Customer-Facing")
            }
          >
            Kill Switch
          </Btn>
          <Btn
            onClick={() => setEmergencyConfirm("Enable Maintenance Mode")}
          >
            Maintenance Mode
          </Btn>
        </div>
        <p className="text-xs text-wf-muted mt-2">
          Emergency actions are recorded to the audit trail and require secondary
          confirmation. Live system enforcement is not yet wired.
        </p>
      </Card>

      {/* Tab: Live View */}
      {tab === "Live View" && (
        <Card
          title="Live Mirror Sessions"
          action={
            <span className="text-xs text-wf-subtext font-mono">
              {activeSessions.length} active
            </span>
          }
        >
          {sessions.length === 0 ? (
            <p className="text-xs text-wf-muted py-4 text-center">
              No sessions currently active.
            </p>
          ) : (
            <>
              {/* Header */}
              <div className="flex py-1 border-b border-wf-border gap-2 text-xs font-bold text-wf-subtext uppercase tracking-wider">
                <span className="w-[60px]">Session</span>
                <span className="flex-1">Store</span>
                <span className="w-[70px]">Staff</span>
                <span className="w-[50px]">Mirror</span>
                <span className="w-[50px] text-right">Duration</span>
                <span className="w-[40px] text-right">Sarees</span>
                <span className="w-[60px] text-right">Status</span>
              </div>
              {sessions.map((s) => (
                <Row key={s.sessionId}>
                  <span className="w-[60px] font-mono text-xs text-wf-primary truncate">
                    {s.sessionId.slice(-6)}
                  </span>
                  <span className="flex-1 text-xs truncate">
                    {s.storeName}
                  </span>
                  <span className="w-[70px] text-xs text-wf-subtext truncate">
                    {s.staffName}
                  </span>
                  <span className="w-[50px] text-xs font-mono text-wf-muted">
                    {s.mirrorId}
                  </span>
                  <span className="w-[50px] text-xs font-mono text-right">
                    {s.duration}
                  </span>
                  <span className="w-[40px] text-xs font-mono text-right font-semibold">
                    {s.sareesTriedOn}
                  </span>
                  <span className="w-[60px] text-right">
                    <Badge status={s.status}>{s.status}</Badge>
                  </span>
                </Row>
              ))}
            </>
          )}
        </Card>
      )}

      {/* Tab: Incidents */}
      {tab === "Incidents" && (
        <div>
          {/* Severity summary */}
          <div className="flex gap-2 mb-3">
            <KPI
              label="P1 Critical"
              value={severityCounts.P1}
              color="var(--color-wf-red)"
            />
            <KPI
              label="P2 High"
              value={severityCounts.P2}
              color="var(--color-wf-amber)"
            />
            <KPI
              label="P3 Medium"
              value={severityCounts.P3}
              color="var(--color-wf-blue)"
            />
            <KPI
              label="Total Logged"
              value={incidents.length}
              subtitle="all time"
            />
          </div>

          <Card
            title="Incident Log"
            action={
              <span className="text-xs text-wf-subtext">
                {openIncidents.length} open
              </span>
            }
          >
            {incidents.length === 0 ? (
              <p className="text-xs text-wf-muted py-4 text-center">
                No incidents recorded.
              </p>
            ) : (
              <>
                {/* Header */}
                <div className="flex py-1 border-b border-wf-border gap-2 text-xs font-bold text-wf-subtext uppercase tracking-wider">
                  <span className="w-[40px]">Sev</span>
                  <span className="flex-1">Title</span>
                  <span className="w-[80px]">Started</span>
                  <span className="w-[55px] text-right">Duration</span>
                  <span className="w-[40px] text-right">Stores</span>
                  <span className="w-[80px]">Root Cause</span>
                  <span className="w-[60px] text-right">Status</span>
                </div>
                {incidents.map((inc) => (
                  <Row key={inc.incidentId}>
                    <span className="w-[40px]">
                      <Badge status={inc.severity}>{inc.severity}</Badge>
                    </span>
                    <span className="flex-1 text-xs font-semibold truncate">
                      {inc.title}
                    </span>
                    <span className="w-[80px] text-xs text-wf-subtext">
                      {inc.startTime}
                    </span>
                    <span className="w-[55px] text-xs font-mono text-right">
                      {inc.duration ?? "ongoing"}
                    </span>
                    <span className="w-[40px] text-xs font-mono text-right">
                      {inc.storesAffected}
                    </span>
                    <span className="w-[80px] text-xs text-wf-subtext truncate">
                      {inc.rootCause || "Investigating"}
                    </span>
                    <span className="w-[60px] text-right">
                      <Badge status={inc.status}>{inc.status}</Badge>
                    </span>
                  </Row>
                ))}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Tab: Escalation */}
      {tab === "Escalation" && (
        <div>
          <Card
            title="Escalation Matrix — On-Call Rotation"
            action={
              <span className="text-xs text-wf-subtext">
                {onCallActive.length} active
              </span>
            }
          >
            {onCall.length === 0 ? (
              <p className="text-xs text-wf-muted py-4 text-center">
                No on-call rotation configured.
              </p>
            ) : (
              <>
                {/* Header */}
                <div className="flex py-1 border-b border-wf-border gap-2 text-xs font-bold text-wf-subtext uppercase tracking-wider">
                  <span className="w-[80px]">Role</span>
                  <span className="flex-1">Name</span>
                  <span className="w-[100px]">Title</span>
                  <span className="w-[60px]">Week</span>
                  <span className="w-[90px]">Phone</span>
                  <span className="w-[60px] text-right">Status</span>
                </div>
                {onCall.map((person) => (
                  <Row key={`${person.role}-${person.name}`}>
                    <span className="w-[80px] text-xs font-semibold text-wf-primary">
                      {person.role}
                    </span>
                    <span className="flex-1 text-xs">{person.name}</span>
                    <span className="w-[100px] text-xs text-wf-subtext truncate">
                      {person.title}
                    </span>
                    <span className="w-[60px] text-xs text-wf-muted">
                      {person.week}
                    </span>
                    <span className="w-[90px] text-xs font-mono text-wf-subtext">
                      {person.phone}
                    </span>
                    <span className="w-[60px] text-right">
                      <Badge status={person.status}>{person.status}</Badge>
                    </span>
                  </Row>
                ))}
              </>
            )}
          </Card>

          {/* Escalation Protocol */}
          <Card title="Escalation Protocol">
            {[
              ["0-5 min", "Auto-alert on-call engineer via SMS + WhatsApp", "P1/P2/P3"],
              ["5-15 min", "Escalate to engineering lead if unacknowledged", "P1/P2"],
              ["15-30 min", "Escalate to CTO, notify affected store managers", "P1"],
              ["30-60 min", "Executive bridge call, customer communication", "P1"],
              ["60+ min", "Post-incident review scheduled automatically", "All"],
            ].map(([time, action, severity]) => (
              <Row key={time}>
                <span className="w-[65px] text-xs font-mono font-semibold text-wf-primary">
                  {time}
                </span>
                <span className="flex-1 text-xs">{action}</span>
                <span className="text-xs text-wf-muted">{severity}</span>
              </Row>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
