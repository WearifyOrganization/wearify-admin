"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { useState } from "react";
import { Badge, KPI, Card, Row, Tabs, PageLoading, SampleBadge } from "@/components/ui/wearify-ui";

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function BillingPage() {
  const invoices = useQuery(api.billing.listInvoices);
  const stats = useQuery(api.billing.getStats);
  const [tab, setTab] = useState("Invoices");

  if (!invoices || !stats) return <PageLoading />;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Billing & Tax</h1>
      <p className="text-xs text-wf-subtext mb-3">
        {stats.total} invoices — {stats.paid} paid, {stats.pending} pending, {stats.overdue} overdue
      </p>

      <Tabs
        items={["Invoices", "GST Compliance", "SLA Credits"]}
        active={tab}
        onChange={setTab}
      />

      {/* ================================================================
          INVOICES TAB
          ================================================================ */}
      {tab === "Invoices" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-2 mb-3">
            <KPI label="Total Revenue" value={fmt(stats.totalRevenue)} />
            <KPI label="Total GST" value={fmt(stats.totalGst)} subtitle="18% on SaaS" />
            <KPI
              label="Paid"
              value={stats.paid}
              subtitle={`of ${stats.total}`}
            />
            <KPI
              label="Pending"
              value={stats.pending}
              color="var(--color-wf-amber)"
            />
            <KPI
              label="Overdue"
              value={stats.overdue}
              color="var(--color-wf-red)"
            />
          </div>

          {/* Invoices Table */}
          <Card title="Invoices">
            {/* Table Header */}
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[80px]">Invoice ID</span>
              <span className="flex-1">Store</span>
              <span className="w-[80px] text-right">Amount</span>
              <span className="w-[70px] text-right">GST</span>
              <span className="w-[80px] text-right">Total</span>
              <span className="w-[80px]">Date</span>
              <span className="w-[70px]">Status</span>
              <span className="w-[80px]">Due Date</span>
            </div>

            {invoices.map((inv) => (
              <Row key={inv._id}>
                <span className="w-[80px] font-mono text-xs text-wf-muted">
                  {inv.invoiceId}
                </span>
                <span className="flex-1 font-semibold text-xs">
                  {inv.storeName}
                </span>
                <span className="w-[80px] text-right text-xs font-mono">
                  ₹{inv.amount.toLocaleString("en-IN")}
                </span>
                <span className="w-[70px] text-right text-xs font-mono">
                  ₹{inv.gst.toLocaleString("en-IN")}
                </span>
                <span className="w-[80px] text-right text-xs font-mono font-semibold">
                  ₹{inv.total.toLocaleString("en-IN")}
                </span>
                <span className="w-[80px] text-xs text-wf-subtext">
                  {inv.date}
                </span>
                <span className="w-[70px]">
                  <Badge status={inv.status}>{inv.status}</Badge>
                </span>
                <span className="w-[80px] text-xs text-wf-subtext">
                  {inv.dueDate}
                </span>
              </Row>
            ))}

            {invoices.length === 0 && (
              <div className="text-center py-6 text-wf-muted text-sm">
                No invoices found.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ================================================================
          GST COMPLIANCE TAB
          ================================================================ */}
      {tab === "GST Compliance" && (
        <div>
          <div className="flex gap-2 mb-3">
            <KPI label="GST Rate" value="18%" subtitle="SaaS / IT Services" />
            <KPI label="HSN Code" value="998314" subtitle="IT & ITES" />
            <KPI label="GST Collected (MTD)" value={fmt(stats.totalGst)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Card title="GST Rate Structure" action={<SampleBadge />}>
              <div className="space-y-1">
                {[
                  ["SaaS Subscription", "18%", "998314"],
                  ["Implementation / Setup", "18%", "998314"],
                  ["Hardware (IoT Mirror)", "18%", "847160"],
                  ["Training & Support", "18%", "999293"],
                ].map(([service, rate, hsn]) => (
                  <Row key={service}>
                    <span className="flex-1 text-xs">{service}</span>
                    <span className="w-[50px] text-right text-xs font-mono font-semibold">
                      {rate}
                    </span>
                    <span className="w-[70px] text-right text-xs font-mono text-wf-muted">
                      HSN {hsn}
                    </span>
                  </Row>
                ))}
              </div>
            </Card>

            <Card title="Filing Status" action={<SampleBadge />}>
              <div className="space-y-1">
                {[
                  ["GSTR-1 (Outward)", "Mar 2026", "Filed", "filed"],
                  ["GSTR-3B (Summary)", "Mar 2026", "Filed", "filed"],
                  ["GSTR-1 (Outward)", "Apr 2026", "Due 11 Apr", "upcoming"],
                  ["GSTR-3B (Summary)", "Apr 2026", "Due 20 Apr", "upcoming"],
                  ["GSTR-9 (Annual)", "FY 2025-26", "Due 31 Dec", "upcoming"],
                ].map(([form, period, status, type]) => (
                  <Row key={`${form}-${period}`}>
                    <span className="flex-1 text-xs font-semibold">{form}</span>
                    <span className="w-[70px] text-xs text-wf-subtext">{period}</span>
                    <Badge status={type === "filed" ? "paid" : "pending"}>
                      {status}
                    </Badge>
                  </Row>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Compliance Notes" className="mt-2" action={<SampleBadge />}>
            <div className="text-xs text-wf-subtext space-y-1.5">
              <p>
                Wearify operates as a SaaS provider under SAC code <span className="font-mono font-semibold text-wf-text">998314</span> (Information
                Technology Design and Development Services). GST at <span className="font-semibold text-wf-text">18%</span> applies to all subscription
                and service invoices.
              </p>
              <p>
                Inter-state supplies attract IGST. Intra-state supplies (same state as registered office) attract CGST + SGST at 9% each.
              </p>
              <p>
                E-invoicing is mandatory for all B2B invoices. IRN generation is automated via the NIC portal integration.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* ================================================================
          SLA CREDITS TAB
          ================================================================ */}
      {tab === "SLA Credits" && (
        <div>
          <div className="flex gap-2 mb-3">
            <KPI label="SLO Target" value="99.9%" subtitle="Monthly uptime" />
            <KPI label="Current Uptime" value="99.94%" subtitle="This month" sample />
            <KPI label="Error Budget" value="43 min" subtitle="Monthly allowance" />
            <KPI label="Budget Used" value="26 min" subtitle="60% consumed" color="var(--color-wf-amber)" sample />
          </div>

          <Card title="SLA Credit Policy" action={<SampleBadge />}>
            <div className="text-xs text-wf-subtext space-y-1.5 mb-3">
              <p>
                Stores with monthly uptime below the <span className="font-semibold text-wf-text">99.9% SLO</span> are eligible for service credits.
                Credits are applied automatically to the next invoice.
              </p>
            </div>
            <div className="space-y-1">
              {[
                ["99.0% - 99.9%", "10% of monthly fee"],
                ["95.0% - 99.0%", "25% of monthly fee"],
                ["90.0% - 95.0%", "50% of monthly fee"],
                ["Below 90.0%", "100% of monthly fee"],
              ].map(([range, credit]) => (
                <Row key={range}>
                  <span className="flex-1 text-xs font-mono">{range}</span>
                  <span className="text-xs font-semibold text-wf-primary">{credit}</span>
                </Row>
              ))}
            </div>
          </Card>

          <Card title="Recent SLA Credit Events" action={<SampleBadge />}>
            {[
              ["STR-003", "Vogue Drapes", "99.72%", "2 Mar 2026", "₹1,200", "applied"],
              ["STR-005", "Silk Route", "98.50%", "14 Feb 2026", "₹3,750", "applied"],
              ["STR-008", "Thread & Needle", "99.85%", "22 Jan 2026", "₹800", "applied"],
            ].map(([id, store, uptime, date, credit, status]) => (
              <Row key={`${id}-${date}`}>
                <span className="w-[60px] font-mono text-xs text-wf-muted">{id}</span>
                <span className="flex-1 text-xs font-semibold">{store}</span>
                <span className="w-[60px] text-xs font-mono text-wf-red">{uptime}</span>
                <span className="w-[80px] text-xs text-wf-subtext">{date}</span>
                <span className="w-[60px] text-right text-xs font-mono font-semibold">{credit}</span>
                <Badge status="paid">{status}</Badge>
              </Row>
            ))}

            <div className="mt-2 pt-2 border-t border-wf-border text-xs text-wf-subtext">
              No stores currently below 99.9% SLO this month. Error budget at 60% with 26 of 43 allowed minutes consumed.
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
