"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { KPI, Card, Tabs, Badge, Row, SampleBadge } from "@/components/ui/wearify-ui";

const RETENTION = [
  { category: "Camera frames (raw)", retention: "0 — never stored", deletion: "Real-time discard", law: "DPDP S4" },
  { category: "Try-on images (processed)", retention: "90 days", deletion: "Auto-delete", law: "DPDP S8(7)" },
  { category: "Session analytics", retention: "2 years", deletion: "Anonymise → archive", law: "IT Act 43A" },
  { category: "Customer PII", retention: "Until consent withdrawn", deletion: "Erasure within 72h", law: "DPDP S12-13" },
  { category: "Transaction records", retention: "8 years", deletion: "Archive to cold storage", law: "GST Act" },
  { category: "Audit logs", retention: "5 years", deletion: "Immutable, no deletion", law: "IT Act" },
];

const PRIVACY_CARDS = [
  {
    title: "Zero Storage Policy",
    description: "Raw camera frames are NEVER stored. All CV processing happens real-time on-device (NVIDIA Jetson Orin NX). Frames are discarded immediately after pose estimation.",
    badge: "Enforced",
  },
  {
    title: "Processed Try-On Images",
    description: "Generated virtual try-on images are stored for 90 days to allow customers to revisit sessions, then auto-deleted. Customers can request early deletion.",
    badge: "90-day TTL",
  },
  {
    title: "No Facial Recognition",
    description: "The system uses body pose estimation only. No face data, biometrics, or facial features are captured, processed, or stored at any point in the pipeline.",
    badge: "By Design",
  },
  {
    title: "DPDP Consent Gate",
    description: "Customers must explicitly opt-in via on-screen consent before any camera session begins. Consent is logged with timestamp, store ID, and session ID for audit.",
    badge: "Mandatory",
  },
];

const RESIDENCY_INFO = [
  { label: "Primary Region", value: "ap-south-1 (Mumbai)", status: "active" },
  { label: "DR Region", value: "ap-south-2 (Hyderabad)", status: "active" },
  { label: "Data Sovereignty", value: "Data never leaves India", status: "verified" },
  { label: "Edge Processing", value: "On-device (Jetson) — no cloud upload of raw frames", status: "verified" },
  { label: "Vendor Compliance", value: "All vendors with DPA signed", status: "signed" },
];

export default function DataGovernancePage() {
  const [tab, setTab] = useState("Camera & CV Privacy");
  const consent = useQuery(api.dashboard.consentStats);

  const consentRate =
    consent === undefined ? "…" : consent.total === 0 ? "—" : `${Math.round((consent.photos / consent.total) * 100)}%`;
  const consentSubtitle =
    consent === undefined
      ? "loading"
      : consent.total === 0
        ? "no customers yet"
        : `${consent.withdrawnAny} of ${consent.total}${consent.capped ? "+" : ""} withdrew something`;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">Data Governance & CV Privacy</h1>
      <p className="text-xs text-wf-subtext mb-3">
        Privacy controls, data retention policies, and residency compliance for camera/CV workloads
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        <KPI label="Raw Frames Stored" value="0" subtitle="Zero storage policy" />
        <KPI label="Try-On Retention" value="90d" subtitle="Auto-delete" />
        <KPI label="Facial Data" value="None" subtitle="Pose-only CV" />
        <KPI label="Photo Consent" value={consentRate} subtitle={consentSubtitle} />
        <KPI label="Data in India" value="100%" subtitle="ap-south-1/2" />
      </div>
      <p className="text-xs text-wf-subtext mb-3">
        Photo Consent is live from customer records. The remaining tiles are policy
        statements and infrastructure facts, not measurements.
      </p>

      <Tabs
        items={["Camera & CV Privacy", "Retention Policies", "Data Residency"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "Camera & CV Privacy" && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {PRIVACY_CARDS.map((card) => (
              <Card key={card.title}>
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="var(--color-wf-green)" fillOpacity="0.15" />
                      <path d="M5 8l2 2 4-4" stroke="var(--color-wf-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-wf-text">{card.title}</span>
                      <Badge status="verified">{card.badge}</Badge>
                      <SampleBadge />
                    </div>
                    <p className="text-xs text-wf-subtext leading-relaxed">{card.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card title="CV Pipeline Data Flow" action={<SampleBadge />}>
            <div className="space-y-1">
              {[
                ["1. Camera Capture", "Jetson Orin NX on-device", "Frame stays in GPU memory only"],
                ["2. Pose Estimation", "On-device (TensorRT)", "Body keypoints extracted, frame discarded"],
                ["3. Virtual Try-On", "On-device inference", "Garment overlay generated from pose + catalog"],
                ["4. Display", "Local HDMI to mirror", "Result shown, then sent to session store if consented"],
                ["5. Session Store", "Encrypted at rest (AES-256)", "Auto-purged after 90 days"],
              ].map(([step, where, detail]) => (
                <Row key={step}>
                  <span className="w-[130px] text-xs font-semibold text-wf-primary">{step}</span>
                  <span className="w-[140px] text-xs text-wf-text">{where}</span>
                  <span className="flex-1 text-xs text-wf-subtext">{detail}</span>
                </Row>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Retention Policies" && (
        <div>
          <Card title="Data Retention Schedule" action={<SampleBadge />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-wf-border">
                    <th className="text-xs font-semibold text-wf-subtext uppercase tracking-wider py-2 pr-4">Category</th>
                    <th className="text-xs font-semibold text-wf-subtext uppercase tracking-wider py-2 pr-4">Retention Period</th>
                    <th className="text-xs font-semibold text-wf-subtext uppercase tracking-wider py-2 pr-4">Deletion Method</th>
                    <th className="text-xs font-semibold text-wf-subtext uppercase tracking-wider py-2">Legal Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {RETENTION.map((row) => (
                    <tr key={row.category} className="border-b border-wf-border last:border-0">
                      <td className="text-xs font-semibold text-wf-text py-2 pr-4">{row.category}</td>
                      <td className="text-xs text-wf-text py-2 pr-4 font-mono">{row.retention}</td>
                      <td className="text-xs text-wf-subtext py-2 pr-4">{row.deletion}</td>
                      <td className="py-2">
                        <Badge status="ok">{row.law}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Automated Enforcement" action={<SampleBadge />}>
            <div className="space-y-1">
              {[
                ["Try-on image purge", "Daily at 02:00 IST", "Deletes images older than 90 days", "active"],
                ["PII erasure queue", "Continuous", "Processes withdrawal requests within 72h", "active"],
                ["Analytics anonymisation", "Monthly", "Strips PII from records older than 2 years", "active"],
                ["Transaction archival", "Quarterly", "Moves records >8 years to cold storage", "active"],
                ["Audit log integrity", "Continuous", "Immutable append-only with hash chain", "active"],
              ].map(([job, schedule, desc, status]) => (
                <Row key={job}>
                  <span className="w-[130px] text-xs font-semibold text-wf-text">{job}</span>
                  <span className="w-[110px] text-xs font-mono text-wf-subtext">{schedule}</span>
                  <span className="flex-1 text-xs text-wf-subtext">{desc}</span>
                  <Badge status={status}>{status}</Badge>
                </Row>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Data Residency" && (
        <div>
          <Card title="Data Residency & Sovereignty" action={<SampleBadge />}>
            <div className="space-y-1">
              {RESIDENCY_INFO.map((item) => (
                <Row key={item.label}>
                  <span className="w-[140px] text-xs font-semibold text-wf-text">{item.label}</span>
                  <span className="flex-1 text-xs text-wf-subtext">{item.value}</span>
                  <Badge status={item.status}>{item.status}</Badge>
                </Row>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card title="Infrastructure Topology" action={<SampleBadge />}>
              <div className="space-y-1">
                {[
                  ["Convex Backend", "Convex Cloud", "Managed, US-hosted (backend only)"],
                  ["Edge Compute", "Jetson Orin NX", "On-premise at each store"],
                  ["CDN", "CloudFront", "ap-south-1 edge locations"],
                  ["DNS", "Route 53", "Mumbai resolver"],
                  ["Monitoring", "CloudWatch", "ap-south-1"],
                ].map(([service, provider, note]) => (
                  <Row key={service}>
                    <span className="w-[90px] text-xs font-semibold text-wf-text">{service}</span>
                    <span className="w-[90px] text-xs font-mono text-wf-primary">{provider}</span>
                    <span className="flex-1 text-xs text-wf-subtext">{note}</span>
                  </Row>
                ))}
              </div>
            </Card>

            <Card title="Vendor DPA Status" action={<SampleBadge />}>
              <div className="space-y-1">
                {[
                  ["AWS India", "DPA signed", "signed", "Renewed Mar 2026"],
                  ["Convex", "DPA signed", "signed", "Renewed Jan 2026"],
                  ["Razorpay", "DPA signed", "signed", "Renewed Feb 2026"],
                  ["Gupshup", "DPA signed", "signed", "Renewed Dec 2025"],
                  ["Google Cloud (Vision)", "DPA signed", "signed", "Renewed Nov 2025"],
                ].map(([vendor, status, badge, note]) => (
                  <Row key={vendor}>
                    <span className="w-[100px] text-xs font-semibold text-wf-text">{vendor}</span>
                    <Badge status={badge}>{status}</Badge>
                    <span className="flex-1 text-xs text-wf-subtext text-right">{note}</span>
                  </Row>
                ))}
              </div>
            </Card>
          </div>

          <Card title="Cross-Border Transfer Policy" action={<SampleBadge />}>
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="var(--color-wf-green)" fillOpacity="0.15" />
                  <path d="M5 8l2 2 4-4" stroke="var(--color-wf-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-wf-text font-semibold mb-1">No customer PII or camera data leaves Indian jurisdiction</p>
                <p className="text-xs text-wf-subtext leading-relaxed">
                  All raw camera frames are processed on-device (Jetson Orin NX) and never uploaded to any cloud service.
                  Processed try-on images and customer data are stored exclusively in ap-south-1 (Mumbai) with
                  disaster recovery in ap-south-2 (Hyderabad). Convex backend stores only non-PII operational
                  data (store configs, analytics aggregates, agent logs). All vendor agreements include
                  India data residency clauses per DPDP Act Section 16.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
