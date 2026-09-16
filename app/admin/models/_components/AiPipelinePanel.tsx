"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@wearify/shared/api";
import type { Id } from "@wearify/shared/dataModel";
import { Badge, Card, KPI } from "@/components/ui/wearify-ui";

const CRITERIA = ["safety", "identity", "anatomy", "fidelity"] as const;
type Criterion = (typeof CRITERIA)[number];

function RejectThumbnail({ rejectId }: { rejectId: Id<"tryOnRejects"> }) {
  const url = useQuery(api.settings.getRejectImageUrl, { rejectId });
  if (!url) {
    return (
      <div className="flex h-14 w-12 items-center justify-center rounded bg-wf-border/30 text-[10px] text-wf-muted">
        {url === undefined ? "Loading" : "Gone"}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Rejected try-on" className="h-14 w-12 rounded object-cover" />;
}

function verdictNotes(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return CRITERIA.flatMap((criterion) => {
      const result = parsed[criterion];
      if (!result || typeof result !== "object") return [];
      const note = (result as Record<string, unknown>).note;
      return typeof note === "string" && note.trim() ? [note] : [];
    });
  } catch {
    return [];
  }
}

export function AiPipelinePanel() {
  const models = useQuery(api.settings.getAiModels);
  const engine = useQuery(api.settings.getRenderEngine);
  const rejects = useQuery(api.settings.listTryOnRejects, { limit: 50 });
  const setAiModels = useMutation(api.settings.setAiModels);
  const setRenderEngine = useMutation(api.settings.setRenderEngine);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [engineBusy, setEngineBusy] = useState(false);
  const [engineNotice, setEngineNotice] = useState("");

  async function save(change: {
    judgeModel?: string;
    judgeEnabled?: boolean;
    criteria?: Criterion[];
  }) {
    setBusy(true);
    setNotice("");
    try {
      await setAiModels(change);
      setNotice("Saved");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save model settings");
    } finally {
      setBusy(false);
    }
  }

  async function saveEngine(engineId: string) {
    setEngineBusy(true);
    setEngineNotice("");
    try {
      await setRenderEngine({ engineId });
      setEngineNotice("Saved");
    } catch (error) {
      setEngineNotice(error instanceof Error ? error.message : "Could not save render engine");
    } finally {
      setEngineBusy(false);
    }
  }

  if (!models || !rejects || !engine) {
    return (
      <Card title="Try-On AI Pipeline" className="mt-4">
        <p className="text-xs text-wf-subtext">Loading pipeline settings…</p>
      </Card>
    );
  }

  const selectedEngine = engine.engines.find((e) => e.id === engine.engineId);

  const enabled = new Set(models.enabledCriteria);
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <section className="mt-4 w-full" aria-label="Try-On AI Pipeline">
      <Card
        title="Try-On AI Pipeline"
        action={<span className="text-xs text-wf-subtext">OpenRouter + VL gate</span>}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-wf-text" htmlFor="render-engine">
              Render engine
            </label>
            <select
              id="render-engine"
              value={engine.engineId ?? "__custom__"}
              disabled={engineBusy}
              onChange={(event) => void saveEngine(event.target.value)}
              className="w-full rounded border border-wf-border bg-white px-3 py-2 text-xs text-wf-text outline-none focus:border-wf-primary disabled:opacity-60"
            >
              {engine.engineId === null && (
                <option value="__custom__" disabled>Custom — unrecognised provider/model</option>
              )}
              {engine.engines.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-wf-subtext">
              {selectedEngine
                ? selectedEngine.description
                : "The stored provider and render model do not match any known engine — pick one to fix it."}
            </p>
            {engine.effective.source !== "database" && (
              <Badge status="pending" className="mt-1">
                {engine.effective.source === "environment" ? "From TRYON_PROVIDER env" : "Default"}
              </Badge>
            )}
            {engineNotice && (
              <p className={`mt-1 text-xs ${engineNotice === "Saved" ? "text-wf-green" : "text-wf-red"}`} role="status">
                {engineBusy ? "Saving…" : engineNotice}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-wf-text" htmlFor="judge-model">
              Evaluator model
            </label>
            <select
              id="judge-model"
              value={models.judgeModel}
              disabled={busy}
              onChange={(event) => void save({ judgeModel: event.target.value })}
              className="w-full rounded border border-wf-border bg-white px-3 py-2 text-xs text-wf-text outline-none focus:border-wf-primary disabled:opacity-60"
            >
              {models.supportedJudge.map((model) => <option key={model}>{model}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-wf-border pt-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-wf-text">
            <input
              type="checkbox"
              checked={models.judgeEnabled}
              disabled={busy}
              onChange={(event) => void save({ judgeEnabled: event.target.checked })}
              className="h-4 w-4 accent-wf-primary"
            />
            Evaluator enabled
          </label>
          {CRITERIA.map((criterion) => (
            <label key={criterion} className="flex items-center gap-2 text-xs capitalize text-wf-subtext">
              <input
                type="checkbox"
                checked={criterion === "safety" || enabled.has(criterion)}
                disabled={busy || criterion === "safety"}
                onChange={(event) => {
                  const criteria = CRITERIA.filter((candidate) =>
                    candidate === "safety" || (candidate === criterion
                      ? event.target.checked
                      : enabled.has(candidate)),
                  );
                  void save({ criteria: [...criteria] });
                }}
                className="h-4 w-4 accent-wf-primary"
              />
              {criterion}
            </label>
          ))}
          <span className={`ml-auto text-xs ${notice === "Saved" ? "text-wf-green" : "text-wf-red"}`} role="status">
            {busy ? "Saving…" : notice}
          </span>
        </div>

      </Card>

      <div className="mb-3 flex w-full flex-wrap gap-2">
        <KPI label="Reject rate" value={percent(rejects.rejectRate)} subtitle={`last ${rejects.sampledAttempts} sampled attempts`} />
        {CRITERIA.map((criterion) => (
          <KPI
            key={criterion}
            label={`${criterion} rejects`}
            value={percent(rejects.byCriterionRate[criterion] ?? 0)}
            subtitle={`${rejects.byCriterion[criterion] ?? 0} renders`}
            color={criterion === "safety" ? "var(--color-wf-red)" : "var(--color-wf-amber)"}
          />
        ))}
      </div>

      <Card title="Rejected Render Review">
        {rejects.rows.length === 0 ? (
          <p className="py-5 text-center text-xs text-wf-muted">No rejected renders in the retained window.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-wf-border text-wf-subtext">
                  <th className="py-2 pr-3 font-semibold">Preview</th>
                  <th className="py-2 pr-3 font-semibold">Created</th>
                  <th className="py-2 pr-3 font-semibold">Failed checks</th>
                  <th className="py-2 pr-3 font-semibold">Attempt</th>
                  <th className="py-2 pr-3 font-semibold">Models</th>
                  <th className="py-2 font-semibold">Judge notes</th>
                </tr>
              </thead>
              <tbody>
                {rejects.rows.map((row) => {
                  const notes = verdictNotes(row.verdict);
                  return (
                    <tr key={row._id} className="border-b border-wf-border align-top last:border-0">
                      <td className="py-2 pr-3"><RejectThumbnail rejectId={row._id} /></td>
                      <td className="whitespace-nowrap py-2 pr-3 text-wf-subtext">
                        {new Date(row.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {row.failedCriteria.map((criterion) => (
                            <Badge key={criterion} status={criterion === "safety" ? "open" : "pending"}>
                              {criterion}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono font-semibold">{row.attempt}</td>
                      <td className="max-w-56 py-2 pr-3 font-mono text-[10px] text-wf-subtext">
                        <div className="break-all">{row.vtonModel}</div>
                        <div className="mt-1 break-all">{row.judgeModel}</div>
                      </td>
                      <td className="max-w-80 py-2 text-wf-subtext">
                        {notes.length > 0 ? notes.join(" · ") : "No note available"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
