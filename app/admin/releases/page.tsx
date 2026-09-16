"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@wearify/shared/api";
import { Badge, Card, Row, Tabs, Toggle, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";

export default function ReleasesPage() {
  // Gate on auth-ready so these admin-gated queries don't fire (and throw
  // UNAUTHORIZED) before the Better Auth token is attached to Convex.
  const { isAuthenticated } = useConvexAuth();
  const flags = useQuery(api.settings.listFlags, isAuthenticated ? {} : "skip");
  const changelog = useQuery(api.releases.listChangelog, isAuthenticated ? {} : "skip");
  const festivals = useQuery(api.releases.listFestivals, isAuthenticated ? {} : "skip");
  const toggleFlag = useMutation(api.settings.toggleFlag);

  const [tab, setTab] = useState("Feature Flags");

  if (!flags || !changelog || !festivals) return <PageLoading />;

  const typeBadgeStatus: Record<string, string> = {
    Major: "open",
    Minor: "trial",
    Patch: "progress",
  };

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">OTA, Features & Releases</h1>
      <p className="text-xs text-wf-subtext mb-3">
        Feature flags, changelog, deploy freeze calendar, CI/CD pipeline
      </p>

      <Tabs
        items={["Feature Flags", "Changelog", "Deploy Freeze", "CI/CD"]}
        active={tab}
        onChange={setTab}
      />

      {/* ===================== Feature Flags ===================== */}
      {tab === "Feature Flags" && (
        <Card title="Feature Flags">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider mb-1">
            <span className="flex-1">Flag</span>
            <span className="w-[280px]">Description</span>
            <span className="w-[50px] text-right">Status</span>
          </div>
          {flags.map((f) => (
            <Row key={f._id}>
              <span className="flex-1 font-mono text-xs font-semibold">
                {f.key}
              </span>
              <span className="w-[280px] text-xs text-wf-subtext">
                {f.description || "—"}
              </span>
              <span className="w-[50px] flex justify-end">
                <Toggle on={f.enabled} onToggle={() => toggleFlag({ id: f._id })} />
              </span>
            </Row>
          ))}
          {flags.length === 0 && (
            <div className="text-center py-6 text-wf-muted text-xs">
              No feature flags configured
            </div>
          )}
        </Card>
      )}

      {/* ===================== Changelog ===================== */}
      {tab === "Changelog" && (
        <Card title="Release Changelog">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider mb-1">
            <span className="w-[70px]">Version</span>
            <span className="w-[80px]">Date</span>
            <span className="w-[60px]">Type</span>
            <span className="flex-1">Notes</span>
          </div>
          {changelog.map((entry) => (
            <Row key={entry._id}>
              <span className="w-[70px] font-mono text-xs font-semibold">
                {entry.version}
              </span>
              <span className="w-[80px] text-xs text-wf-subtext">
                {entry.date}
              </span>
              <span className="w-[60px]">
                <Badge status={typeBadgeStatus[entry.type] || "planned"}>
                  {entry.type}
                </Badge>
              </span>
              <span className="flex-1 text-xs text-wf-subtext">
                {entry.notes}
              </span>
            </Row>
          ))}
          {changelog.length === 0 && (
            <div className="text-center py-6 text-wf-muted text-xs">
              No changelog entries
            </div>
          )}
        </Card>
      )}

      {/* ===================== Deploy Freeze ===================== */}
      {tab === "Deploy Freeze" && (
        <Card title="Festival Calendar — Deploy Freeze">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider mb-1">
            <span className="flex-1">Festival</span>
            <span className="w-[90px]">Start</span>
            <span className="w-[90px]">End</span>
            <span className="w-[100px]">Campaign</span>
            <span className="w-[70px] text-right">Freeze</span>
          </div>
          {festivals.map((f) => (
            <Row key={f._id}>
              <span className="flex-1 text-xs font-semibold">
                {f.name}
              </span>
              <span className="w-[90px] text-xs text-wf-subtext font-mono">
                {f.start}
              </span>
              <span className="w-[90px] text-xs text-wf-subtext font-mono">
                {f.end}
              </span>
              <span className="w-[100px] text-xs text-wf-subtext">
                {f.campaign}
              </span>
              <span className="w-[70px] flex justify-end">
                <Badge status={f.freeze ? "active" : "planned"}>
                  {f.freeze ? "FROZEN" : "OPEN"}
                </Badge>
              </span>
            </Row>
          ))}
          {festivals.length === 0 && (
            <div className="text-center py-6 text-wf-muted text-xs">
              No festivals configured
            </div>
          )}
        </Card>
      )}

      {/* ===================== CI/CD ===================== */}
      {tab === "CI/CD" && (
        <Card title="CI/CD Pipeline">
          <div className="space-y-3">
            {[
              {
                stage: "Build",
                detail: "GitHub Actions",
                description: "Automated build triggered on merge to main. Runs lint, type-check, unit tests, and produces OTA artifact.",
                status: "running",
              },
              {
                stage: "Edge OTA",
                detail: "AWS IoT Jobs — 2:00-5:00 AM IST",
                description: "OTA updates pushed to edge devices during the maintenance window. Devices download, verify checksum, and apply.",
                status: "active",
              },
              {
                stage: "Canary Rollout",
                detail: "1 store \u2192 3 stores \u2192 all",
                description: "Staged rollout starting with 1 pilot store, expanding to 3 stores after 24h green metrics, then full fleet.",
                status: "supervised",
              },
              {
                stage: "Rollback",
                detail: "Automatic on error rate >1%",
                description: "If error rate exceeds 1% during canary or full rollout, automatic rollback to previous known-good version within 60s.",
                status: "ok",
              },
            ].map((step) => (
              <div
                key={step.stage}
                className="p-3 rounded-lg border border-wf-border bg-wf-bg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-wf-text">
                    {step.stage}
                  </span>
                  <Badge status={step.status}>{step.status}</Badge>
                </div>
                <div className="text-xs font-semibold text-wf-primary mb-0.5 font-mono">
                  {step.detail}
                </div>
                <div className="text-xs text-wf-subtext leading-relaxed">
                  {step.description}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
