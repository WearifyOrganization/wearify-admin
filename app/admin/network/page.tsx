"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Row, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";

export default function NetworkPage() {
  const tailors = useQuery(api.network.listTailors);
  const trendingData = useQuery(api.network.topSareeCategories);
  const regionalData = useQuery(api.network.cityPerformance);
  const [tab, setTab] = useState("Tailor Network");

  if (!tailors) return <PageLoading />;

  const totalTailors = tailors.length;
  const verifiedCount = tailors.filter((t) => t.status === "verified").length;
  const totalReferrals = tailors.reduce((sum, t) => sum + (t.referrals || 0), 0);
  const totalRevenue = tailors.reduce((sum, t) => sum + (t.revenue || 0), 0);

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        Network Intelligence
      </h1>

      <Tabs
        items={["Tailor Network", "Trending", "Regional"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "Tailor Network" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-2 mb-3">
            <KPI label="Total Tailors" value={totalTailors} />
            <KPI
              label="Verified"
              value={verifiedCount}
              subtitle={`${totalTailors > 0 ? Math.round((verifiedCount / totalTailors) * 100) : 0}%`}
            />
            <KPI label="Total Referrals" value={totalReferrals} />
            <KPI
              label="Revenue from Referrals"
              value={`₹${totalRevenue.toLocaleString("en-IN")}`}
            />
          </div>

          {/* Tailor List */}
          <Card title="Tailors">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[60px]">ID</span>
              <span className="flex-1">Name</span>
              <span className="w-[80px]">City</span>
              <span className="w-[70px]">Status</span>
              <span className="w-[60px] text-right">Referrals</span>
              <span className="w-[80px] text-right">Revenue</span>
              <span className="w-[60px] text-right">Rating</span>
              <span className="w-[90px] text-right">Specialization</span>
            </div>
            {tailors.map((tailor) => (
              <Row key={tailor._id}>
                <span className="w-[60px] font-mono text-xs text-wf-muted">
                  {tailor.tailorId}
                </span>
                <span className="flex-1 font-semibold text-xs">
                  {tailor.name}
                </span>
                <span className="w-[80px] text-xs text-wf-subtext">
                  {tailor.city}
                </span>
                <span className="w-[70px]">
                  <Badge status={tailor.status}>{tailor.status}</Badge>
                </span>
                <span className="w-[60px] text-right text-xs font-mono">
                  {tailor.referrals}
                </span>
                <span className="w-[80px] text-right text-xs font-mono">
                  ₹{(tailor.revenue || 0).toLocaleString("en-IN")}
                </span>
                <span className="w-[60px] text-right text-xs font-mono">
                  {tailor.rating} ★
                </span>
                <span className="w-[90px] text-right text-xs text-wf-subtext">
                  {tailor.specialties?.join(", ") || "—"}
                </span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {tab === "Trending" && (
        <div>
          <Card title="Top Saree Categories by Try-On Count">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[30px]">#</span>
              <span className="flex-1">Category</span>
              <span className="w-[100px] text-right">Try-Ons</span>
            </div>
            {trendingData === undefined ? (
              <div className="py-4 text-xs text-wf-muted">Loading…</div>
            ) : trendingData.length === 0 ? (
              <div className="py-4 text-xs text-wf-muted">No try-on data yet.</div>
            ) : (
              trendingData.map((item, idx) => (
                <Row key={item.category}>
                  <span className="w-[30px] text-xs font-mono text-wf-muted">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-semibold text-xs">
                    {item.category}
                  </span>
                  <span className="w-[100px] text-right text-xs font-mono">
                    {item.tryOns.toLocaleString("en-IN")} try-ons
                  </span>
                </Row>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "Regional" && (
        <div>
          <Card title="City Performance">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="flex-1">City</span>
              <span className="w-[80px] text-right">Stores</span>
              <span className="w-[100px] text-right">Avg Sessions</span>
              <span className="w-[100px] text-right">Avg Conv %</span>
            </div>
            {regionalData === undefined ? (
              <div className="py-4 text-xs text-wf-muted">Loading…</div>
            ) : regionalData.length === 0 ? (
              <div className="py-4 text-xs text-wf-muted">No active stores yet.</div>
            ) : (
              regionalData.map((item) => (
                <Row key={item.city}>
                  <span className="flex-1 font-semibold text-xs">
                    {item.city}
                  </span>
                  <span className="w-[80px] text-right text-xs font-mono">
                    {item.stores}
                  </span>
                  <span className="w-[100px] text-right text-xs font-mono">
                    {item.avgSessions}
                  </span>
                  <span className="w-[100px] text-right text-xs font-mono">
                    {item.avgConversion}%
                  </span>
                </Row>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
