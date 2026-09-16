"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { Badge, KPI, Card, Row, Tabs, PageLoading } from "@/components/ui/wearify-ui";
import { useState } from "react";

export default function LegalPage() {
  const docs = useQuery(api.legal.listDocs);
  const [tab, setTab] = useState("Agreements");

  if (!docs) return <PageLoading />;

  const activeDocs = docs.filter((d) => d.status === "active");
  const retailerDocs = docs.filter((d) => d.type === "retailer");
  const customerDocs = docs.filter((d) => d.type === "customer");

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Legal, Contracts & IP</h1>
      <p className="text-xs text-wf-subtext mb-3">
        {docs.length} documents — {activeDocs.length} active
      </p>

      <Tabs
        items={["Agreements", "Customer Terms", "IP Portfolio"]}
        active={tab}
        onChange={setTab}
      />

      {/* ======================== Agreements Tab ======================== */}
      {tab === "Agreements" && (
        <div>
          {/* KPI Row */}
          <div className="flex gap-2 mb-3">
            <KPI label="Total Docs" value={docs.length} />
            <KPI label="Active" value={activeDocs.length} subtitle="In force" />
            <KPI label="Retailer Docs" value={retailerDocs.length} />
            <KPI label="Customer Docs" value={customerDocs.length} />
          </div>

          {/* Documents List */}
          <Card title="Legal Documents">
            <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
              <span className="w-[50px]">ID</span>
              <span className="flex-1">Name</span>
              <span className="w-[70px]">Type</span>
              <span className="w-[50px]">Version</span>
              <span className="w-[60px]">Status</span>
              <span className="w-[80px]">Effective</span>
              <span className="w-[60px] text-right">Accepted</span>
            </div>
            {docs.map((doc) => (
              <Row key={doc._id}>
                <span className="w-[50px] font-mono text-xs text-wf-muted">
                  {doc.docId}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-xs font-semibold block truncate">
                    {doc.name}
                  </span>
                  <span className="text-xs text-wf-subtext block truncate">
                    {doc.description}
                  </span>
                </span>
                <span className="w-[70px]">
                  <Badge status={doc.type === "retailer" ? "active" : "pending"}>
                    {doc.type}
                  </Badge>
                </span>
                <span className="w-[50px] text-xs font-mono text-wf-subtext">
                  {doc.version}
                </span>
                <span className="w-[60px]">
                  <Badge status={doc.status}>{doc.status}</Badge>
                </span>
                <span className="w-[80px] text-xs text-wf-subtext">
                  {doc.effective}
                </span>
                <span className="w-[60px] text-right text-xs font-mono text-wf-subtext">
                  {doc.acceptedBy > 0 ? doc.acceptedBy : "--"}
                </span>
              </Row>
            ))}
          </Card>
        </div>
      )}

      {/* ======================== Customer Terms Tab ======================== */}
      {tab === "Customer Terms" && (
        <div>
          <p className="text-xs text-wf-subtext mb-3">
            Customer-facing legal documents &mdash; {customerDocs.length} documents
          </p>

          {customerDocs.length === 0 ? (
            <Card>
              <div className="text-center py-8 text-wf-muted text-sm">
                No customer-facing documents found.
              </div>
            </Card>
          ) : (
            customerDocs.map((doc) => (
              <Card key={doc._id} title={doc.name}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge status={doc.status}>{doc.status}</Badge>
                    <span className="text-xs font-mono text-wf-subtext">
                      {doc.version}
                    </span>
                  </div>
                  <p className="text-xs text-wf-subtext">{doc.description}</p>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-wf-muted">ID: </span>
                      <span className="font-mono">{doc.docId}</span>
                    </div>
                    <div>
                      <span className="text-wf-muted">Effective: </span>
                      <span>{doc.effective}</span>
                    </div>
                    <div>
                      <span className="text-wf-muted">File: </span>
                      <span className="font-mono">{doc.fileName}</span>
                    </div>
                    <div>
                      <span className="text-wf-muted">Uploaded: </span>
                      <span>{doc.uploaded}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ======================== IP Portfolio Tab ======================== */}
      {tab === "IP Portfolio" && (
        <div>
          <p className="text-xs text-wf-subtext mb-3">
            Intellectual property assets and filings
          </p>

          <Card title="Patent">
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">
                  AI-powered virtual saree draping method
                </span>
                <span className="text-xs text-wf-subtext">
                  Covers the machine-learning pipeline for real-time saree draping on customer body models
                </span>
              </span>
              <Badge status="pending">Patent Pending</Badge>
            </Row>
          </Card>

          <Card title="Trademark">
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">Wearify</span>
                <span className="text-xs text-wf-subtext">
                  Word mark covering SaaS virtual try-on services
                </span>
              </span>
              <Badge status="pending">Filed</Badge>
            </Row>
          </Card>

          <Card title="Trade Secrets">
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">
                  Saree draping algorithm
                </span>
                <span className="text-xs text-wf-subtext">
                  Proprietary algorithm for realistic fabric simulation and draping
                </span>
              </span>
              <Badge status="verified">Protected</Badge>
            </Row>
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">
                  Fabric physics model
                </span>
                <span className="text-xs text-wf-subtext">
                  Physics-based simulation model for fabric weight, drape, and movement
                </span>
              </span>
              <Badge status="verified">Protected</Badge>
            </Row>
          </Card>

          <Card title="Copyright">
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">
                  Platform UI/UX
                </span>
                <span className="text-xs text-wf-subtext">
                  Admin dashboard, retailer portal, and customer PWA designs
                </span>
              </span>
              <Badge status="active">Registered</Badge>
            </Row>
            <Row>
              <span className="flex-1">
                <span className="text-xs font-semibold block">
                  Training datasets
                </span>
                <span className="text-xs text-wf-subtext">
                  Curated datasets for saree draping model training and evaluation
                </span>
              </span>
              <Badge status="active">Registered</Badge>
            </Row>
          </Card>
        </div>
      )}
    </div>
  );
}
