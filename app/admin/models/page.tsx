"use client";

import { useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import { Badge, KPI, Card, PageLoading } from "@/components/ui/wearify-ui";
import { useClockLabel } from "@/lib/useClock";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AiPipelinePanel } from "./_components/AiPipelinePanel";

const TTP = {
  contentStyle: {
    background: "#F5F0E8",
    border: "1px solid #E8E0D4",
    borderRadius: 4,
    fontSize: 10,
    color: "#1A1A1A",
  },
};

function driftColor(drift: number): string {
  if (drift < 0.5) return "var(--color-wf-green)";
  if (drift <= 1.5) return "var(--color-wf-amber)";
  return "var(--color-wf-red)";
}

function driftBadgeStatus(drift: number): string {
  if (drift < 0.5) return "active";
  if (drift <= 1.5) return "pending";
  return "open";
}

export default function ModelsPage() {
  const models = useQuery(api.models.list);
  const clockLabel = useClockLabel();

  if (!models) return <PageLoading />;

  const totalModels = models.length;
  const avgAccuracy =
    totalModels > 0
      ? (models.reduce((s, m) => s + m.accuracy, 0) / totalModels).toFixed(1)
      : "0";
  const avgDrift =
    totalModels > 0
      ? (models.reduce((s, m) => s + m.drift, 0) / totalModels).toFixed(2)
      : "0";
  const highDriftCount = models.filter((m) => m.drift > 1).length;

  return (
    <div>
      <h1 className="text-base font-extrabold text-wf-text mb-1">
        AI Model Registry & MLOps
      </h1>
      <p className="text-xs text-wf-subtext mb-3">
        {totalModels} models registered — {clockLabel}
      </p>

      {/* KPI Row */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <KPI label="Total Models" value={totalModels} />
        <KPI label="Avg Accuracy" value={`${avgAccuracy}%`} subtitle="across all models" />
        <KPI
          label="Avg Drift"
          value={`${avgDrift}%`}
          subtitle={Number(avgDrift) < 0.5 ? "healthy" : "monitor"}
          color={driftColor(Number(avgDrift))}
        />
        <KPI
          label="Drift > 1%"
          value={highDriftCount}
          subtitle={highDriftCount > 0 ? "needs attention" : "all clear"}
          color={
            highDriftCount > 0
              ? "var(--color-wf-red)"
              : "var(--color-wf-green)"
          }
        />
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        {models.map((model) => (
          <Card key={model.modelId} title={model.name}>
            <div className="flex items-center gap-2 mb-2">
              <Badge status="active">{model.type}</Badge>
              <span className="text-xs text-wf-muted font-mono">
                v{model.version}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2 text-xs">
              <div className="flex justify-between">
                <span className="text-wf-subtext">Latency</span>
                <span className="font-semibold font-mono">{model.latency}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-wf-subtext">Accuracy</span>
                <span className="font-semibold font-mono">{model.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-wf-subtext">Drift</span>
                <span
                  className="font-semibold font-mono"
                  style={{ color: driftColor(model.drift) }}
                >
                  {model.drift}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-wf-subtext">Stores Using</span>
                <span className="font-semibold font-mono">{model.storesUsing}</span>
              </div>
            </div>

            {/* Drift Badge */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs text-wf-subtext">Drift Status:</span>
              <Badge status={driftBadgeStatus(model.drift)}>
                {model.drift < 0.5
                  ? "Low"
                  : model.drift <= 1.5
                    ? "Medium"
                    : "High"}
              </Badge>
            </div>

            {/* Accuracy Trend Chart */}
            <div className="text-xs text-wf-subtext mb-0.5">
              Accuracy Trend (6 weeks)
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={model.dataPoints}>
                <XAxis
                  dataKey="w"
                  tick={{ fontSize: 7, fill: "#9A8D82" }}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 7, fill: "#9A8D82" }}
                  width={30}
                />
                <Tooltip {...TTP} />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#71221D"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#71221D" }}
                  name="Accuracy"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      <AiPipelinePanel />
    </div>
  );
}
