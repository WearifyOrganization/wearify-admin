"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Row, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";
import { useState } from "react";

const WEBHOOK_HEALTH = [
  { name: "Gupshup Delivery", success: "99.2%", volume: "342/day", latency: "1.2s" },
  { name: "Razorpay Payment", success: "100%", volume: "18/day", latency: "0.8s" },
  { name: "IoT Heartbeat", success: "99.8%", volume: "8640/day", latency: "0.1s" },
  { name: "Slack Alerts", success: "100%", volume: "12/day", latency: "0.5s" },
];

function riskBadgeStatus(level: string) {
  if (level === "High") return "open";
  if (level === "Medium") return "pending";
  return "active";
}

function dpaBadgeStatus(status: string) {
  if (status === "Signed") return "signed";
  return "pending";
}

function typeBadgeStatus(type: string) {
  if (type === "Cloud" || type === "Vector DB") return "progress";
  if (type === "LLM") return "shadow";
  return "planned";
}

export default function VendorsPage() {
  const vendors = useQuery(api.dashboard.listVendors);
  const [tab, setTab] = useState("Vendor Registry");

  if (!vendors) return <PageLoading />;

  const totalVendors = vendors.length;
  const dpaSigned = vendors.filter((v) => v.dpaStatus === "Signed").length;
  const totalSpend = vendors.reduce((sum, v) => sum + v.monthlySpend, 0);
  const highRisk = vendors.filter((v) => v.riskLevel === "High").length;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Vendor & Infrastructure</h1>
      <p className="text-xs text-wf-subtext mb-3">
        Registry, webhook monitoring, and dead letter queue
      </p>

      <Tabs
        items={["Vendor Registry", "Webhook Health", "DLQ Monitor"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "Vendor Registry" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <KPI label="Total Vendors" value={totalVendors} />
            <KPI label="DPA Signed" value={`${dpaSigned}/${totalVendors}`} subtitle="Compliant" />
            <KPI label="Monthly Spend" value={`₹${totalSpend.toLocaleString()}`} />
            <KPI
              label="High Risk"
              value={highRisk}
              subtitle={highRisk > 0 ? "Needs review" : "All clear"}
              color={highRisk > 0 ? "var(--color-wf-red)" : "var(--color-wf-green)"}
            />
          </div>

          {/* Vendor Table */}
          <Card title="Vendor Registry">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="flex-1">Vendor</span>
              <span className="w-[80px]">Type</span>
              <span className="w-[70px]">DPA</span>
              <span className="w-[70px]">Risk</span>
              <span className="w-[90px] text-right">Monthly Spend</span>
            </div>
            {vendors.map((vendor) => (
              <Row key={vendor._id}>
                <span className="flex-1 font-semibold text-xs">{vendor.name}</span>
                <span className="w-[80px]">
                  <Badge status={typeBadgeStatus(vendor.type)}>{vendor.type}</Badge>
                </span>
                <span className="w-[70px]">
                  <Badge status={dpaBadgeStatus(vendor.dpaStatus)}>{vendor.dpaStatus}</Badge>
                </span>
                <span className="w-[70px]">
                  <Badge status={riskBadgeStatus(vendor.riskLevel)}>{vendor.riskLevel}</Badge>
                </span>
                <span className="w-[90px] text-right text-xs font-mono">
                  ₹{vendor.monthlySpend.toLocaleString()}
                </span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {tab === "Webhook Health" && (
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <KPI label="Total Webhooks" value={WEBHOOK_HEALTH.length} />
            <KPI label="Avg Success" value="99.8%" subtitle="Above SLO" />
            <KPI label="Total Volume" value="9,012/day" />
            <KPI label="Avg Latency" value="0.65s" subtitle="Target <2s" />
          </div>

          <Card title="Webhook Endpoints" action={<SampleBadge />}>
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="flex-1">Endpoint</span>
              <span className="w-[70px]">Success</span>
              <span className="w-[70px]">Volume</span>
              <span className="w-[70px] text-right">Avg Latency</span>
            </div>
            {WEBHOOK_HEALTH.map((wh) => (
              <Row key={wh.name}>
                <span className="flex-1 font-semibold text-xs">{wh.name}</span>
                <span className="w-[70px]">
                  <Badge status={wh.success === "100%" ? "active" : "ok"}>
                    {wh.success}
                  </Badge>
                </span>
                <span className="w-[70px] text-xs font-mono text-wf-subtext">
                  {wh.volume}
                </span>
                <span className="w-[70px] text-right text-xs font-mono text-wf-subtext">
                  {wh.latency}
                </span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {tab === "DLQ Monitor" && (
        <div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <KPI label="Queue Depth" value={0} subtitle="Empty" />
            <KPI label="Failed (24h)" value={0} />
            <KPI label="Auto-Retried" value={1} subtitle="Last 7 days" />
            <KPI label="Status" value="Healthy" />
          </div>

          <Card title="Dead Letter Queue" action={<SampleBadge />}>
            <div className="flex flex-col items-center justify-center py-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: "var(--color-wf-green)", opacity: 0.15 }}
              >
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: "var(--color-wf-green)" }}
                />
              </div>
              <Badge status="active" className="text-sm px-4 py-1 mb-2">
                All Clear
              </Badge>
              <p className="text-xs text-wf-subtext text-center">
                DLQ is empty — 0 messages pending
              </p>
            </div>
          </Card>

          <Card title="Recent Activity" action={<SampleBadge />}>
            <Row>
              <span className="flex-1 text-xs">
                Last failed message: <span className="font-semibold">3 days ago</span>
              </span>
              <Badge status="resolved">Auto-retried</Badge>
            </Row>
            <div className="text-xs text-wf-subtext mt-1 px-1">
              Gupshup delivery webhook timeout — resolved after 1 automatic retry
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
