"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Row, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";
import { useClockLabel } from "@/lib/useClock";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const RVST = [
  { name: "SaaS Subscription", current: "65K/mo", target: "1.4Cr/yr", pct: 65, color: "#2D8544" },
  { name: "Blouse Referrals", current: "2.4K/mo", target: "22.5L/mo", pct: 15, color: "#D4A843" },
  { name: "Marketplace", current: "800/mo", target: "8L/mo", pct: 8, color: "#2C5F7C" },
  { name: "Manufacturer Intel", current: "0", target: "30L/yr", pct: 0, color: "#71221D" },
  { name: "Promoted Placement", current: "0", target: "5L/mo", pct: 0, color: "#FF6B6B" },
  { name: "White-Label", current: "0", target: "1.2Cr/yr", pct: 0, color: "#4ECDC4" },
  { name: "Training", current: "0", target: "Brand", pct: 0, color: "#FFE66D" },
];

const TTP = {
  contentStyle: {
    background: "#F5F0E8",
    border: "1px solid #E8E0D4",
    borderRadius: 4,
    fontSize: 10,
    color: "#1A1A1A",
  },
};

export default function RevenuePage() {
  const stats = useQuery(api.stores.getStats);
  const rev = useQuery(api.dashboard.revenueByMonth);
  const clockLabel = useClockLabel();

  if (!stats) return <PageLoading />;

  const activePaying = stats.active;
  // Revenue is a super-admin-only page; totalMrr is always present here.
  const totalMrr = stats.totalMrr ?? 0;
  const avgRevPerStore =
    activePaying > 0
      ? `₹${Math.round(totalMrr / activePaying).toLocaleString("en-IN")}`
      : "₹0";

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Revenue Intelligence</h1>
      <p className="text-xs text-wf-subtext mb-3">
        7 revenue streams — {activePaying} paying stores — {clockLabel}
      </p>

      {/* KPI Row */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <KPI
          label="Total MRR"
          value={`₹${(totalMrr / 1000).toFixed(0)}K`}
          subtitle="current total"
        />
        <KPI
          label="Active Paying Stores"
          value={activePaying}
          subtitle={`of ${stats.total} total`}
        />
        <KPI
          label="Avg Revenue/Store"
          value={avgRevPerStore}
          subtitle="per month"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <KPI
            label="Blouse Referral Rev"
            value="₹2.4K"
            subtitle="15% of target"
            color="var(--color-wf-amber)"
            className="!flex-none w-full"
          />
          <SampleBadge className="self-start" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-[1fr_1.2fr] gap-2 mb-2">
        {/* Revenue Streams Card */}
        <Card title="Revenue Streams" action={<SampleBadge />}>
          <div className="space-y-0.5">
            {RVST.map((stream) => (
              <Row key={stream.name} className="flex-col !items-stretch gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-wf-text">{stream.name}</span>
                  <div className="flex gap-3 items-center">
                    <span className="text-xs font-mono font-semibold" style={{ color: stream.color }}>
                      ₹{stream.current}
                    </span>
                    <span className="text-xs text-wf-muted">
                      Target: ₹{stream.target}
                    </span>
                  </div>
                </div>
                <div className="h-[4px] rounded bg-wf-border">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${Math.max(stream.pct, 0)}%`,
                      backgroundColor: stream.color,
                    }}
                  />
                </div>
              </Row>
            ))}
          </div>
        </Card>

        {/* Revenue Chart */}
        <Card title="Monthly Revenue (Paid Invoices)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={rev ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
              <XAxis dataKey="m" tick={{ fontSize: 8, fill: "#9A8D82" }} />
              <YAxis
                tick={{ fontSize: 8, fill: "#9A8D82" }}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip {...TTP} formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#71221D"
                fill="#2D854410"
                strokeWidth={2}
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
