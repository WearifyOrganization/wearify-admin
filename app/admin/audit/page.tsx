"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { Card, Row, PageLoading } from "@/components/ui/wearify-ui";

export default function AuditPage() {
  const entries = useQuery(api.settings.listAuditLog);

  if (!entries) return <PageLoading />;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        Audit Trail
      </h1>
      <p className="text-xs text-wf-subtext mb-3">
        Immutable log of all platform actions — {entries.length} entries
      </p>

      <Card title="Recent Actions">
        <div className="flex py-1.5 border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
          <span className="w-[60px]">Time</span>
          <span className="flex-1">Action</span>
          <span className="w-[150px]">User</span>
        </div>
        {entries.map((e) => (
          <Row key={e._id}>
            <span className="w-[60px] font-mono text-xs text-wf-muted">
              {e.timestamp}
            </span>
            <span className="flex-1 text-xs">{e.action}</span>
            <span className="w-[150px] text-xs text-wf-subtext font-mono">
              {e.user}
            </span>
          </Row>
        ))}
      </Card>
    </div>
  );
}
