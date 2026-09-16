"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { Card, Tabs, Toggle, Row, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";

export default function SettingsPage() {
  const flags = useQuery(api.settings.listFlags);
  const config = useQuery(api.settings.listConfig);
  const toggleFlag = useMutation(api.settings.toggleFlag);
  const upsertConfig = useMutation(api.settings.upsertConfigByKey);
  const engine = useQuery(api.settings.getRenderEngine);
  const [tab, setTab] = useState("Platform");

  if (!flags || !config) return <PageLoading />;

  const tryOnEnabled = config.find((c) => c.key === "tryon.enabled")?.value === "true";
  const tryOnDryRun = config.find((c) => c.key === "tryon.dryRun")?.value === "true";
  const tryOnMockBehavior = config.find((c) => c.key === "tryon.mockBehavior")?.value || "SUCCESS";
  const tryOnRateLimitPerMinute = config.find((c) => c.key === "tryon.rateLimitPerMinute")?.value || "10";
  // Default true when unset (matches convex/settings.getKioskTryonConfig).
  const trialRoomFullRender = config.find((c) => c.key === "tryon.trialRoomShowFullRender")?.value !== "false";
  // Defaults mirror CUSTOMER_AD_DEFAULTS in convex/settings.ts.
  const looksAdDuration = config.find((c) => c.key === "customerApp.looksAdDurationSec")?.value ?? "15";
  const looksAdSkipAfter = config.find((c) => c.key === "customerApp.looksAdSkipAfterSec")?.value ?? "6";

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        Settings & Configuration
      </h1>
      <p className="text-xs text-wf-subtext mb-3">
        Platform configuration, feature flags, notifications
      </p>

      <Tabs
        items={["Platform", "Feature Flags", "WhatsApp", "Notifications", "Festival Calendar", "Changelog", "On-Call", "Languages"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "Platform" && (
        <div className="flex flex-col gap-4">
          <Card title="Try-On API & Mock Settings">
            <div className="flex flex-col gap-3">
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Enable Try-On Feature</div>
                  <div className="text-xs text-wf-subtext mt-0.5">Master kill-switch for the AI feature.</div>
                </div>
                <Toggle
                  on={tryOnEnabled}
                  onToggle={() => upsertConfig({ key: "tryon.enabled", value: tryOnEnabled ? "false" : "true" })}
                />
              </Row>
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Dry Run Mode</div>
                  <div className="text-xs text-wf-subtext mt-0.5">If ON, bypasses RunPod and uses local simulator. No credits are charged.</div>
                </div>
                <Toggle
                  on={tryOnDryRun}
                  onToggle={() => upsertConfig({ key: "tryon.dryRun", value: tryOnDryRun ? "false" : "true" })}
                />
              </Row>
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Trial Room: Full Render</div>
                  <div className="text-xs text-wf-subtext mt-0.5">If ON, the kiosk trial room shows the full with-background render. If OFF, it shows the transparent cutout.</div>
                </div>
                <Toggle
                  on={trialRoomFullRender}
                  onToggle={() => upsertConfig({ key: "tryon.trialRoomShowFullRender", value: trialRoomFullRender ? "false" : "true" })}
                />
              </Row>
              {tryOnDryRun && (
                <Row>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-wf-text">Mock API Behavior</div>
                    <div className="text-xs text-wf-subtext mt-0.5">Simulate different API responses for local testing.</div>
                  </div>
                  <select
                    className="bg-white border border-wf-border rounded text-xs p-1 outline-none text-wf-text"
                    value={tryOnMockBehavior}
                    onChange={(e) => upsertConfig({ key: "tryon.mockBehavior", value: e.target.value })}
                  >
                    <option value="SUCCESS">Instant Success</option>
                    <option value="DELAY-15000">15-sec Delay</option>
                    <option value="TIMEOUT">Indefinite Timeout</option>
                    <option value="ERROR">Instant Error</option>
                  </select>
                </Row>
              )}
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Rate Limit Per Minute</div>
                  <div className="text-xs text-wf-subtext mt-0.5">Max try-ons a customer can generate per minute.</div>
                </div>
                <input
                  type="number"
                  min="1"
                  className="bg-white border border-wf-border rounded text-xs p-1 outline-none text-wf-text w-16 text-right"
                  value={tryOnRateLimitPerMinute}
                  onChange={(e) => upsertConfig({ key: "tryon.rateLimitPerMinute", value: e.target.value })}
                />
              </Row>
            </div>
          </Card>

          <Card title="Customer App — Looks Interstitial">
            <div className="flex flex-col gap-3">
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Ad Duration (seconds)</div>
                  <div className="text-xs text-wf-subtext mt-0.5">How long the &ldquo;Preparing your saree&hellip;&rdquo; ad plays before My Looks opens. 0&ndash;120.</div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="bg-white border border-wf-border rounded text-xs p-1 outline-none text-wf-text w-16 text-right"
                  value={looksAdDuration}
                  onChange={(e) => upsertConfig({ key: "customerApp.looksAdDurationSec", value: e.target.value })}
                />
              </Row>
              <Row>
                <div className="flex-1">
                  <div className="text-sm font-bold text-wf-text">Skip Unlocks After (seconds)</div>
                  <div className="text-xs text-wf-subtext mt-0.5">The Skip button counts down, then becomes tappable. Clamped to the ad duration.</div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="bg-white border border-wf-border rounded text-xs p-1 outline-none text-wf-text w-16 text-right"
                  value={looksAdSkipAfter}
                  onChange={(e) => upsertConfig({ key: "customerApp.looksAdSkipAfterSec", value: e.target.value })}
                />
              </Row>
            </div>
          </Card>

          <Card title="Try-On Render Engine">
            <Row>
              <div className="flex-1">
                <div className="text-sm font-bold text-wf-text">
                  {engine
                    ? engine.engines.find((e) => e.id === engine.engineId)?.label ?? "Custom (unrecognised pair)"
                    : "Loading…"}
                </div>
                <div className="text-xs text-wf-subtext mt-0.5">
                  Which provider and model new try-on jobs render through. Managed on the
                  Models page, alongside the evaluator that grades its output.
                </div>
              </div>
              <Link
                href="/admin/models"
                className="text-xs font-bold rounded px-3 py-1 border bg-white text-wf-text border-wf-border"
              >
                Manage on Models →
              </Link>
            </Row>
          </Card>

          <Card title="Raw Platform Configuration">
            {config.map((c) => (
              <div key={c._id} className="flex justify-between py-1.5 text-xs border-b border-wf-border last:border-0">
                <span className="text-wf-subtext font-medium">{c.key}</span>
                <span className="font-semibold text-wf-text font-mono">{c.value}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "Feature Flags" && (
        <Card title="Feature Flags">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider mb-1">
            <span className="flex-1">Flag</span>
            <span className="w-[250px]">Description</span>
            <span className="w-[50px] text-right">Status</span>
          </div>
          {flags.map((f) => (
            <Row key={f._id}>
              <span className="flex-1 font-mono text-xs font-semibold">
                {f.key}
              </span>
              <span className="w-[250px] text-xs text-wf-subtext">
                {f.description}
              </span>
              <span className="w-[50px] flex justify-end">
                <Toggle on={f.enabled} onToggle={() => toggleFlag({ id: f._id })} />
              </span>
            </Row>
          ))}
        </Card>
      )}

      {tab !== "Platform" && tab !== "Feature Flags" && (
        <Card>
          <div className="text-center py-8 text-wf-muted text-sm">
            <span className="text-lg mb-2 block">🚧</span>
            {tab} — Coming in Phase 1c
          </div>
        </Card>
      )}
    </div>
  );
}
