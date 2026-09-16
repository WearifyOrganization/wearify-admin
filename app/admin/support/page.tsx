"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Row, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";

export default function SupportPage() {
  const tickets = useQuery(api.support.listTickets);
  const kbArticles = useQuery(api.support.listKbArticles);
  const [tab, setTab] = useState("Tickets");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  if (!tickets || !kbArticles) return <PageLoading />;

  const openCount = tickets.filter((t) => t.status === "open").length;
  const progressCount = tickets.filter((t) => t.status === "progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const p1Count = tickets.filter((t) => t.priority === "P1").length;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        Support & AI Diagnosis
      </h1>
      <p className="text-xs text-wf-subtext mb-3">
        {tickets.length} tickets — {kbArticles.length} KB articles
      </p>

      <Tabs
        items={["Tickets", "Knowledge Base", "NPS"]}
        active={tab}
        onChange={setTab}
      />

      {/* ============================================================ */}
      {/* TICKETS TAB                                                   */}
      {/* ============================================================ */}
      {tab === "Tickets" && (
        <>
          <div className="flex gap-2 mb-3">
            <KPI
              label="Open"
              value={openCount}
              subtitle="Needs attention"
              color="var(--color-wf-red)"
            />
            <KPI
              label="In Progress"
              value={progressCount}
              subtitle="Being worked on"
              color="var(--color-wf-blue)"
            />
            <KPI
              label="Resolved"
              value={resolvedCount}
              subtitle="Closed"
              color="var(--color-wf-green)"
            />
            <KPI
              label="P1 Tickets"
              value={p1Count}
              subtitle="Critical"
              color="var(--color-wf-red)"
              ai
            />
          </div>

          <Card title="All Tickets">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[60px]">Ticket</span>
              <span className="w-[90px]">Store</span>
              <span className="flex-1">Subject</span>
              <span className="w-[40px] text-center">Priority</span>
              <span className="w-[55px] text-center">Status</span>
              <span className="w-[55px] text-right">SLA</span>
              <span className="w-[30px] text-right">AI</span>
            </div>
            {tickets.map((t) => (
              <div key={t._id}>
                <Row
                  onClick={() =>
                    setExpandedTicket(
                      t.ticketId === expandedTicket ? null : t.ticketId
                    )
                  }
                  className={
                    t.ticketId === expandedTicket ? "bg-wf-primary/5" : ""
                  }
                >
                  <span className="w-[60px] font-mono text-xs text-wf-muted">
                    {t.ticketId}
                  </span>
                  <span className="w-[90px] text-xs font-semibold truncate">
                    {t.storeName}
                  </span>
                  <span className="flex-1 text-xs truncate">
                    {t.subject}
                  </span>
                  <span className="w-[40px] text-center">
                    <Badge status={t.priority}>{t.priority}</Badge>
                  </span>
                  <span className="w-[55px] text-center">
                    <Badge status={t.status === "progress" ? "progress" : t.status}>
                      {t.status === "progress" ? "In Progress" : t.status}
                    </Badge>
                  </span>
                  <span className="w-[55px] text-right text-xs font-mono text-wf-subtext">
                    {t.sla || "—"}
                  </span>
                  <span className="w-[30px] text-right text-xs">
                    {t.aiDiagnosis ? (
                      <span className="text-wf-primary font-bold">AI</span>
                    ) : (
                      <span className="text-wf-muted">—</span>
                    )}
                  </span>
                </Row>
                {t.ticketId === expandedTicket && t.aiDiagnosis && (
                  <div className="mx-1 mb-2 p-2.5 rounded bg-wf-primary/5 border border-wf-primary/20">
                    <div className="text-xs font-bold text-wf-primary uppercase tracking-wider mb-1">
                      AI Diagnosis
                    </div>
                    <div className="text-xs text-wf-text leading-relaxed">
                      {t.aiDiagnosis}
                    </div>
                  </div>
                )}
                {t.ticketId === expandedTicket && !t.aiDiagnosis && (
                  <div className="mx-1 mb-2 p-2.5 rounded bg-wf-border/30 border border-wf-border">
                    <div className="text-xs text-wf-muted">
                      No AI diagnosis available for this ticket.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/* KNOWLEDGE BASE TAB                                            */}
      {/* ============================================================ */}
      {tab === "Knowledge Base" && (
        <Card title="Knowledge Base Articles">
          <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
            <span className="w-[50px]">ID</span>
            <span className="flex-1">Title</span>
            <span className="w-[50px] text-right">Views</span>
            <span className="w-[60px] text-right">Helpful</span>
            <span className="w-[70px] text-center">Category</span>
          </div>
          {kbArticles.map((a) => (
            <Row key={a._id}>
              <span className="w-[50px] font-mono text-xs text-wf-muted">
                {a.articleId}
              </span>
              <span className="flex-1 text-xs font-semibold">
                {a.title}
              </span>
              <span className="w-[50px] text-right text-xs font-mono text-wf-subtext">
                {a.views.toLocaleString()}
              </span>
              <span
                className="w-[60px] text-right text-xs font-mono"
                style={{
                  color:
                    a.helpful >= 80
                      ? "var(--color-wf-green)"
                      : a.helpful >= 50
                        ? "var(--color-wf-amber)"
                        : "var(--color-wf-red)",
                }}
              >
                {a.helpful}%
              </span>
              <span className="w-[70px] text-center">
                <Badge status={a.category.toLowerCase()}>{a.category}</Badge>
              </span>
            </Row>
          ))}
        </Card>
      )}

      {/* ============================================================ */}
      {/* NPS TAB                                                       */}
      {/* ============================================================ */}
      {tab === "NPS" && (
        <>
          <div className="flex gap-2 mb-3">
            <KPI
              label="NPS Score"
              value={74}
              subtitle="+6 vs last quarter"
              color="var(--color-wf-green)"
              sample
            />
            <KPI
              label="Promoters"
              value="62%"
              subtitle="Score 9-10"
              color="var(--color-wf-green)"
            />
            <KPI
              label="Passives"
              value="26%"
              subtitle="Score 7-8"
              color="var(--color-wf-amber)"
            />
            <KPI
              label="Detractors"
              value="12%"
              subtitle="Score 0-6"
              color="var(--color-wf-red)"
            />
          </div>

          <Card title="NPS Breakdown">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-wf-subtext">Promoters (9-10)</span>
                  <span className="font-mono font-semibold text-wf-green">62%</span>
                </div>
                <div className="h-[6px] rounded bg-wf-border">
                  <div
                    className="h-full rounded"
                    style={{ width: "62%", backgroundColor: "var(--color-wf-green)" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-wf-subtext">Passives (7-8)</span>
                  <span className="font-mono font-semibold text-wf-amber">26%</span>
                </div>
                <div className="h-[6px] rounded bg-wf-border">
                  <div
                    className="h-full rounded"
                    style={{ width: "26%", backgroundColor: "var(--color-wf-amber)" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-wf-subtext">Detractors (0-6)</span>
                  <span className="font-mono font-semibold text-wf-red">12%</span>
                </div>
                <div className="h-[6px] rounded bg-wf-border">
                  <div
                    className="h-full rounded"
                    style={{ width: "12%", backgroundColor: "var(--color-wf-red)" }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="NPS Trend (Quarterly)">
            <div className="flex items-end gap-3 h-24">
              {[
                { q: "Q1 '25", score: 58 },
                { q: "Q2 '25", score: 63 },
                { q: "Q3 '25", score: 68 },
                { q: "Q4 '25", score: 74 },
              ].map((item) => (
                <div key={item.q} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-mono font-bold text-wf-text">
                    {item.score}
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(item.score / 100) * 80}px`,
                      backgroundColor:
                        item.score >= 70
                          ? "var(--color-wf-green)"
                          : item.score >= 50
                            ? "var(--color-wf-amber)"
                            : "var(--color-wf-red)",
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-xs text-wf-muted">{item.q}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 rounded bg-wf-green/5 border border-wf-green/20">
              <div className="text-xs text-wf-green font-semibold">
                Trending Up
              </div>
              <div className="text-xs text-wf-subtext">
                NPS has improved by 16 points over 4 quarters. Key drivers: faster AI
                diagnosis resolution, improved onboarding flow, and 24/7 WhatsApp support.
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
