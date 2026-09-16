"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Row, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";
import { useState } from "react";
import { useClockLabel } from "@/lib/useClock";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TTP = {
  contentStyle: {
    background: "#F5F0E8",
    border: "1px solid #E8E0D4",
    borderRadius: 4,
    fontSize: 12,
    color: "#1A1A1A",
  },
};

const SYSTEM_HEALTH_24H = [
  { t: "00", v: 99.9 },
  { t: "04", v: 99.8 },
  { t: "08", v: 99.7 },
  { t: "12", v: 98.5 },
  { t: "16", v: 99.9 },
  { t: "20", v: 99.8 },
  { t: "Now", v: 99.9 },
];

const AWS_COST = [
  { s: "ECS", v: 18 },
  { s: "RDS", v: 12 },
  { s: "S3", v: 6 },
  { s: "IoT", v: 4 },
  { s: "Lambda", v: 3 },
  { s: "API GW", v: 2 },
  { s: "Other", v: 7 },
];

export default function DashboardPage() {
  const stats = useQuery(api.dashboard.getDashboardStats);
  const rev = useQuery(api.dashboard.revenueByMonth);
  const radar = useQuery(api.dashboard.healthRadar);
  const dau = useQuery(api.dashboard.dailyActiveStores);
  const [tab, setTab] = useState("Overview");

  // Client-only ticking clock. Empty until mounted so the server-rendered
  // markup matches the first client render (avoids a hydration mismatch).
  const now = useClockLabel();

  if (!stats) return <PageLoading />;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-wf-text mb-1">
        AI-Powered Platform Intelligence
      </h1>
      <p className="text-sm text-wf-subtext mb-4">
        Live — {stats.activeStoreCount} stores — {now}
      </p>

      <Tabs
        items={["Overview", "System Health", "Cost Monitor", "API Gateway", "Analytics"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <KPI label="Stores" value={stats.storeCount} subtitle={`${stats.activeStoreCount} active`} />
            <KPI
              label="MRR"
              value={`₹${(stats.totalMrr / 1000).toFixed(0)}K`}
              subtitle={dau ? `${dau.paying} paying` : "—"}
            />
            <KPI label="Uptime" value={`${stats.avgUptime}%`} subtitle="SLO 99.9%" />
            <KPI label="Tickets" value={stats.openTickets} subtitle={`${stats.p1Tickets} P1`} color="var(--color-wf-red)" />
            <KPI label="Agents" value={`${stats.runningAgents}/${stats.totalAgents}`} subtitle={`₹${stats.agentCost}/d`} color="var(--color-wf-amber)" />
            <KPI label="Churn Risk" value={stats.churnRiskStores} subtitle="at risk" color="var(--color-wf-amber)" ai />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-3 mb-3">
            <Card title="Monthly Revenue (Paid Invoices)">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={rev ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                  <XAxis dataKey="m" tick={{ fontSize: 11, fill: "#9A8D82" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9A8D82" }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                  <Tooltip {...TTP} formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Area type="monotone" dataKey="total" stroke="#71221D" fill="#2D854410" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Health Radar">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radar ?? []}>
                  <PolarGrid stroke="#E8E0D4" />
                  <PolarAngleAxis dataKey="d" tick={{ fontSize: 10, fill: "#6B5B4F" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Radar dataKey="v" stroke="#71221D" fill="#71221D10" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-3">
            <Card title="Error Budget (SLO 99.9%)" action={<SampleBadge />}>
              <div className="text-3xl font-extrabold text-wf-primary font-mono">72%</div>
              <div className="text-xs text-wf-subtext">31min of 43min used — GREEN</div>
              <div className="h-1.5 rounded bg-wf-border mt-3">
                <div className="h-full rounded bg-wf-green" style={{ width: "28%" }} />
              </div>
            </Card>
            <Card title="Unit Economics" action={<SampleBadge />}>
              {[
                ["ARPU", "₹12,143"],
                ["Payback", "7 months"],
                ["LTV", "₹2.43L"],
                ["LTV/CAC", "8.1x"],
                ["Margin", "72%"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1 text-sm">
                  <span className="text-wf-subtext">{l}</span>
                  <span className="font-semibold font-mono">{v}</span>
                </div>
              ))}
            </Card>
            <Card title="AI Predictions" action={<SampleBadge />}>
              {[
                ["Churn Risk", "2 stores", "var(--color-wf-amber)"],
                ["Revenue", "₹2.15L", "var(--color-wf-green)"],
                ["Trial Conv", "60%", "var(--color-wf-green)"],
                ["Agent ROI", "3.2x", "var(--color-wf-green)"],
                ["NPS", "74", "var(--color-wf-green)"],
              ].map(([l, v, c]) => (
                <div key={l} className="flex justify-between py-1 text-sm">
                  <span className="text-wf-subtext">{l}</span>
                  <span className="font-semibold" style={{ color: c }}>{v}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {tab === "System Health" && (
        <div>
          <div className="flex gap-3 mb-4">
            <KPI label="API p95" value="280ms" subtitle="Target <1s" />
            <KPI label="API p99" value="820ms" subtitle="Target <3s" />
            <KPI label="Error Rate" value="0.02%" />
            <KPI label="Active Conn" value="48" />
            <KPI label="VTON" value="420ms" subtitle="Target <500ms" />
          </div>
          <Card title="System Health (24h)" action={<SampleBadge />}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={SYSTEM_HEALTH_24H}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#9A8D82" }} />
                <YAxis domain={[98, 100]} tick={{ fontSize: 11, fill: "#9A8D82" }} />
                <Tooltip {...TTP} />
                <Line type="monotone" dataKey="v" stroke="#71221D" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Service Status" action={<SampleBadge />}>
            {[
              ["API Gateway", "Healthy", "280ms p95"],
              ["RDS PostgreSQL", "Healthy", "12ms avg"],
              ["ElastiCache Redis", "Healthy", "0.8ms avg"],
              ["IoT Core MQTT", "Healthy", "42ms avg"],
              ["S3/CloudFront", "Healthy", "15ms avg"],
              ["Gupshup WhatsApp", "Degraded", "4.2s p95"],
              ["Razorpay", "Healthy", "320ms avg"],
            ].map(([s, st, l]) => (
              <Row key={s}>
                <span className="flex-1 text-sm">{s}</span>
                <Badge status={st === "Healthy" ? "active" : "review"}>{st}</Badge>
                <span className="text-xs font-mono text-wf-muted">{l}</span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {tab === "Cost Monitor" && (
        <div>
          <div className="flex gap-3 mb-4">
            <KPI label="Total AWS" value="₹52K/mo" />
            <KPI label="Per Store" value="₹1,840" subtitle="Target <₹3K" />
            <KPI label="LLM Cost" value="₹12K/mo" />
            <KPI label="Total Vendor" value="₹82K/mo" />
          </div>
          <Card title="AWS Cost by Service" action={<SampleBadge />}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={AWS_COST}>
                <XAxis dataKey="s" tick={{ fontSize: 11, fill: "#9A8D82" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9A8D82" }} tickFormatter={(v: number) => `${v}K`} />
                <Tooltip {...TTP} />
                <Bar dataKey="v" fill="#71221D" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab === "API Gateway" && (
        <div>
          <div className="flex gap-3 mb-4">
            <KPI label="Requests/min" value="342" />
            <KPI label="p95 Latency" value="280ms" subtitle="<1s target" />
            <KPI label="p99 Latency" value="820ms" subtitle="<3s target" />
            <KPI label="Error Rate" value="0.02%" />
            <KPI label="Throttled" value="0" />
          </div>
          <Card title="Endpoint Performance (Top 8)" action={<SampleBadge />}>
            {[
              ["GET /api/v1/catalog/search", "142/min", "180ms", "0%"],
              ["POST /api/v1/session/start", "38/min", "95ms", "0%"],
              ["GET /api/v1/analytics/revenue", "25/min", "420ms", "0%"],
              ["POST /api/v1/tryon/process", "22/min", "450ms", "0.1%"],
              ["GET /api/v1/analytics/health-score", "18/min", "85ms", "0%"],
              ["POST /api/v1/campaign/send", "8/min", "1.2s", "0.3%"],
              ["GET /api/v1/inventory/aging", "12/min", "310ms", "0%"],
              ["POST /api/v1/customer/consent", "6/min", "120ms", "0%"],
            ].map(([ep, rq, lt, er]) => (
              <Row key={ep}>
                <span className="flex-1 font-mono text-xs">{ep}</span>
                <span className="text-xs text-wf-subtext">{rq}</span>
                <span className={`text-xs font-mono ${parseInt(lt) > 500 ? "text-wf-amber" : "text-wf-green"}`}>{lt}</span>
                <span className={`text-xs ${er === "0%" ? "text-wf-green" : "text-wf-amber"}`}>{er}</span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {tab === "Analytics" && (
        <div>
          <div className="flex gap-3 mb-4">
            <KPI
              label="Daily Active"
              value={dau ? `${dau.activeToday}/${dau.paying}` : "…"}
              subtitle={
                dau && dau.paying > 0
                  ? `${Math.round((dau.activeToday / dau.paying) * 100)}% of paying`
                  : "today, IST"
              }
            />
            <KPI
              label="Sessions/Store"
              value={dau && dau.activeToday > 0 ? (dau.sessionsToday / dau.activeToday).toFixed(1) : "0"}
              subtitle="today, active stores"
            />
            <KPI label="Try-to-Buy" value="38%" subtitle="Target >30%" sample />
            <KPI label="Feature Adopt" value="63/100" sample />
          </div>
          <Card title="Feature Adoption" action={<SampleBadge />}>
            {[
              ["AI Search", "92%", "var(--color-wf-green)"],
              ["Virtual Try-On", "88%", "var(--color-wf-green)"],
              ["WhatsApp Share", "75%", "var(--color-wf-amber)"],
              ["CRM", "68%", "var(--color-wf-amber)"],
              ["Campaign Mgr", "52%", "var(--color-wf-amber)"],
              ["Demand Forecast", "35%", "var(--color-wf-red)"],
              ["Staff Analytics", "45%", "var(--color-wf-amber)"],
              ["Aging Alerts", "82%", "var(--color-wf-green)"],
            ].map(([f, a, c]) => (
              <Row key={f}>
                <span className="flex-1 text-sm">{f}</span>
                <span className="text-sm font-semibold" style={{ color: c }}>{a}</span>
                <div className="w-[80px]">
                  <div className="h-1 rounded bg-wf-border">
                    <div className="h-full rounded" style={{ background: c, width: a }} />
                  </div>
                </div>
              </Row>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
