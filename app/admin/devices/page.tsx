"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@wearify/shared/api";
import { Id } from "@wearify/shared/dataModel";
import { KPI, Card, Tabs, Badge, Metric, PageLoading } from "@/components/ui/wearify-ui";
import { useToast, cleanError } from "@/components/ui/toast";
import { useEffect, useMemo, useState } from "react";

// Shared control styling — meets the min text-sm input standard.
const CTL =
  "px-3 py-2 rounded-lg border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary";

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function formatWhen(ts?: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

type DeviceRow = {
  _id: string;
  deviceId: string;
  type: string;
  serialNumber?: string;
  iotDeviceId?: string;
  storeName: string;
  storeId: string;
  status: string;
  lifecycle: string;
  revokedAt?: number;
  lastSeen: string;
  lastSeenAt?: number;
  pairedAt?: number;
  pairedByKind?: string;
  provisionedAt?: number;
  cpuPercent: number;
  gpuTemp: number;
  memoryGb: number;
  fps: number;
  uptime: number;
  gpuLatency: number;
  certExpiry: string;
  offlineQueue: number;
  note?: string;
};

function lifecycleBadge(d: { lifecycle: string; revokedAt?: number }) {
  if (d.lifecycle === "ACTIVE") return <Badge status="active">Paired</Badge>;
  if (d.revokedAt) return <Badge status="churned">Revoked</Badge>;
  return <Badge status="trial">Provisioned</Badge>;
}

function useCountdown(expiresAt: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const msLeft = expiresAt - now;
  if (msLeft <= 0) return { expired: true, label: "expired" };
  const s = Math.ceil(msLeft / 1000);
  return { expired: false, label: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` };
}

// ----------------------------------------------------------------------
// Fleet tab — searchable / filterable device table + detail panel
// ----------------------------------------------------------------------

function FleetTab({ devices }: { devices: DeviceRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [lifeF, setLifeF] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devices.filter((d) => {
      if (typeF !== "all" && d.type !== typeF) return false;
      if (statusF !== "all" && d.status !== statusF) return false;
      if (lifeF === "ACTIVE" && d.lifecycle !== "ACTIVE") return false;
      if (lifeF === "PROVISIONED" && !(d.lifecycle === "PROVISIONED" && !d.revokedAt)) return false;
      if (lifeF === "REVOKED" && !d.revokedAt) return false;
      if (q) {
        const hay = `${d.serialNumber ?? ""} ${d.deviceId} ${d.storeName} ${d.storeId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [devices, search, typeF, statusF, lifeF]);

  const selected = selectedId ? devices.find((d) => d.deviceId === selectedId) : null;
  const isPaired = selected?.lifecycle === "ACTIVE";

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search serial, device ID, or store…"
          className={`${CTL} flex-1 min-w-[220px]`}
        />
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)} className={CTL}>
          <option value="all">All types</option>
          <option value="Mirror">Mirror</option>
          <option value="Tablet">Tablet</option>
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className={CTL}>
          <option value="all">Any status</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <select value={lifeF} onChange={(e) => setLifeF(e.target.value)} className={CTL}>
          <option value="all">Any lifecycle</option>
          <option value="PROVISIONED">Provisioned</option>
          <option value="ACTIVE">Paired</option>
          <option value="REVOKED">Revoked</option>
        </select>
      </div>

      <div className={selected ? "grid grid-cols-[1.6fr_1fr] gap-3 items-start" : ""}>
        <Card title={`Device Fleet · ${filtered.length}${filtered.length !== devices.length ? ` of ${devices.length}` : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Serial</th>
                  <th className="text-left py-2 pr-3">Store</th>
                  <th className="text-left py-2 pr-3">Lifecycle</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-right py-2 pr-1">Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-wf-muted">
                      No devices match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => (
                    <tr
                      key={d._id}
                      onClick={() => setSelectedId(d.deviceId === selectedId ? null : d.deviceId)}
                      className={`border-b border-wf-border cursor-pointer transition-colors hover:bg-wf-primary/5 ${d.deviceId === selectedId ? "bg-wf-primary/10" : ""}`}
                    >
                      <td className="py-2.5 pr-3 text-sm">{d.type}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-wf-subtext">{d.serialNumber || d.deviceId}</td>
                      <td className="py-2.5 pr-3 text-sm font-semibold truncate max-w-[180px]">{d.storeName}</td>
                      <td className="py-2.5 pr-3">{lifecycleBadge(d)}</td>
                      <td className="py-2.5 pr-3"><Badge status={d.status}>{d.status}</Badge></td>
                      <td className="py-2.5 pr-1 text-right text-xs text-wf-subtext whitespace-nowrap">{d.lastSeen}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card title={`${selected.serialNumber || selected.deviceId}`}>
            <div className="flex items-center gap-2 mb-3">
              {lifecycleBadge(selected)}
              <Badge status={selected.status}>{selected.status}</Badge>
              <span className="text-sm text-wf-subtext">{selected.type}</span>
            </div>

            <h4 className="text-xs font-bold text-wf-muted uppercase tracking-wider mb-1.5">Identity</h4>
            {[
              ["Store", `${selected.storeName} · ${selected.storeId}`],
              ["Serial", selected.serialNumber || "—"],
              ["IoT device id", selected.iotDeviceId || "—"],
              ["Device ID", selected.deviceId],
              ["Cert expiry", selected.certExpiry || "—"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3 py-1 text-sm border-b border-wf-border last:border-0">
                <span className="text-wf-subtext">{l}</span>
                <span className="font-semibold font-mono text-xs text-right truncate">{v}</span>
              </div>
            ))}

            <h4 className="text-xs font-bold text-wf-muted uppercase tracking-wider mt-4 mb-1.5">Lifecycle</h4>
            {[
              ["State", selected.lifecycle === "ACTIVE" ? "Paired (active)" : selected.revokedAt ? "Revoked" : "Provisioned"],
              ["Provisioned", formatWhen(selected.provisionedAt)],
              ["Paired", selected.pairedAt ? `${formatWhen(selected.pairedAt)} (by ${selected.pairedByKind === "admin" ? "admin" : "store"})` : "—"],
              ["Last seen", selected.lastSeenAt ? formatWhen(selected.lastSeenAt) : selected.lastSeen],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between gap-3 py-1 text-sm border-b border-wf-border last:border-0">
                <span className="text-wf-subtext">{l}</span>
                <span className="font-semibold text-right">{v}</span>
              </div>
            ))}

            <h4 className="text-xs font-bold text-wf-muted uppercase tracking-wider mt-4 mb-1.5">Telemetry</h4>
            {isPaired ? (
              <>
                <Metric label="CPU" value={`${selected.cpuPercent}%`} color="var(--color-wf-blue)" />
                <Metric label="GPU Temp" value={`${selected.gpuTemp}°C`} max={100} color={selected.gpuTemp > 75 ? "var(--color-wf-red)" : "var(--color-wf-green)"} />
                <Metric label="Memory" value={`${selected.memoryGb}GB`} max={8} color="var(--color-wf-amber)" />
                <Metric label="FPS" value={`${selected.fps}`} max={30} color="var(--color-wf-green)" />
                <Metric label="Uptime" value={`${selected.uptime}%`} color="var(--color-wf-green)" />
                {selected.offlineQueue > 0 && (
                  <div className="mt-2 p-2 rounded bg-wf-red/5 border border-wf-red/20">
                    <div className="text-xs font-bold text-wf-red">⚠ Offline queue</div>
                    <div className="text-xs text-wf-subtext">{selected.offlineQueue} events queued — will sync on reconnection.</div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-wf-muted py-2">Not reporting — device isn&rsquo;t paired yet. Telemetry appears once it pairs and comes online.</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Pairing tab — issue codes + paired device list (per store)
// ----------------------------------------------------------------------

function PairingTab() {
  const toast = useToast();
  const stores = useQuery(api.stores.list);
  const paired = useQuery(api.kioskPairing.listAllPairedDevices);

  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [issuedCode, setIssuedCode] = useState<{ code: string; storeName: string; expiresAt: number; label?: string; pairingId: Id<"kioskPairings"> } | null>(null);
  const [issuing, setIssuing] = useState(false);

  // Free (not-yet-paired) devices of the selected store — the candidates a code
  // can be issued for.
  const storeDevices = useQuery(
    api.devices.getByStoreId,
    selectedStore ? { storeId: selectedStore } : "skip",
  );
  const freeDevices = (storeDevices ?? []).filter((d) => d.lifecycle !== "ACTIVE");

  const createCode = useMutation(api.kioskPairing.createPairingCode);
  const revokeDevice = useMutation(api.kioskPairing.revokeDevice);

  const countdown = useCountdown(issuedCode?.expiresAt);

  // Watch the issued code's live status so the display flips to "paired" the
  // moment a device consumes it, instead of ticking down to a stale expiry.
  const codeStatus = useQuery(
    api.kioskPairing.getPairingCodeStatus,
    issuedCode ? { pairingId: issuedCode.pairingId } : "skip",
  );
  const codePaired = codeStatus?.status === "consumed";

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof paired>>();
    if (!paired) return map;
    for (const d of paired) {
      const list = map.get(d.storeId) ?? [];
      list.push(d);
      map.set(d.storeId, list);
    }
    return map;
  }, [paired]);

  if (!stores || !paired) return <PageLoading />;

  const activeCount = paired.filter((d) => !d.revokedAt).length;
  const revokedCount = paired.filter((d) => d.revokedAt).length;

  const handleIssue = async () => {
    if (!selectedStore) { toast("Pick a store first", "error"); return; }
    if (!selectedDevice) { toast("Pick a device to pair", "error"); return; }
    setIssuing(true);
    try {
      const res = await createCode({ storeId: selectedStore, deviceId: selectedDevice });
      if (!res.ok) { toast(res.error, "error"); return; }
      setIssuedCode({ code: res.code, storeName: res.storeName, expiresAt: res.expiresAt, label: res.deviceLabel, pairingId: res.pairingId });
      toast(`Pairing code issued for ${res.deviceLabel ?? "device"}`, "success");
    } catch (e) {
      toast(cleanError(e, "Failed to issue code"), "error");
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (deviceId: string, label?: string) => {
    if (!confirm(`Revoke "${label || deviceId}"? The device returns to provisioned and stops working until re-paired.`)) return;
    try {
      await revokeDevice({ deviceId });
      toast("Device revoked", "success");
    } catch (e) {
      toast(cleanError(e, "Failed to revoke"), "error");
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <KPI label="Paired" value={activeCount} />
        <KPI label="Revoked" value={revokedCount} />
        <KPI label="Stores" value={stores.length} />
      </div>

      <Card title="Issue Pairing Code">
        <select
          value={selectedStore}
          onChange={(e) => { setSelectedStore(e.target.value); setSelectedDevice(""); setIssuedCode(null); }}
          className={`${CTL} w-full mb-2`}
        >
          <option value="">Select store…</option>
          {stores.map((s) => (
            <option key={s._id} value={s.storeId}>{s.name} · {s.storeId} · {s.city}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={selectedDevice}
            onChange={(e) => { setSelectedDevice(e.target.value); setIssuedCode(null); }}
            disabled={!selectedStore}
            className={`${CTL} flex-1 min-w-[220px] disabled:opacity-50`}
          >
            <option value="">
              {!selectedStore
                ? "Select a store first…"
                : storeDevices === undefined
                  ? "Loading devices…"
                  : freeDevices.length === 0
                    ? "No free devices — provision or revoke one"
                    : "Select a device to pair…"}
            </option>
            {freeDevices.map((d) => (
              <option key={d._id} value={d.deviceId}>
                {d.type} · {d.serialNumber || d.deviceId}{d.revokedAt ? " (re-pairable)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleIssue}
            disabled={issuing || !selectedStore || !selectedDevice}
            className="px-4 py-2 rounded-lg bg-wf-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {issuing ? "Issuing…" : "Issue code"}
          </button>
        </div>
        <p className="text-xs text-wf-muted mt-2">The code pairs only the selected device&rsquo;s serial. Expires in 2 minutes, one-time use.</p>

        {issuedCode && codePaired && (
          <div className="mt-3 p-4 rounded-lg border border-wf-green/40 bg-wf-green/5">
            <div className="flex items-center gap-2 text-wf-green font-bold">
              <span className="text-lg leading-none">✓</span> Pairing successful
            </div>
            <div className="mt-1 text-sm text-wf-subtext">
              {issuedCode.label ?? "Device"} · {issuedCode.storeName} is now paired
              {codeStatus?.status === "consumed" && codeStatus.serialNumber ? ` (${codeStatus.serialNumber})` : ""}.
            </div>
          </div>
        )}
        {issuedCode && !codePaired && !countdown?.expired && (
          <div className="mt-3 p-4 rounded-lg border border-wf-primary/25 bg-wf-primary/5">
            <div className="text-xs uppercase tracking-wider text-wf-muted font-bold mb-1">{issuedCode.label ?? "Device"} · {issuedCode.storeName}</div>
            <div className="font-mono text-3xl font-semibold tracking-[0.3em] text-wf-text">{issuedCode.code}</div>
            <div className="mt-2 text-sm text-wf-subtext">
              Expires in <span className="font-mono font-semibold text-wf-primary">{countdown?.label}</span>. On the device, enter its serial + this code.
            </div>
          </div>
        )}
        {issuedCode && !codePaired && countdown?.expired && (
          <div className="mt-3 p-3 rounded-lg border border-wf-amber/30 bg-wf-amber/5 text-sm text-wf-subtext">
            Code expired. Issue a fresh one if still needed.
          </div>
        )}
      </Card>

      <Card title={`Paired Devices · ${activeCount} active${revokedCount > 0 ? `, ${revokedCount} revoked` : ""}`}>
        {paired.length === 0 ? (
          <div className="text-center py-8 text-sm text-wf-muted">
            No devices paired yet. Provision hardware in the Provisioning tab, issue a code here, then enter the device&rsquo;s serial + code at /kiosk/setup (mirror) or /tablet/setup (tablet).
          </div>
        ) : (
          [...grouped.entries()].map(([storeId, list]) => (
            <div key={storeId} className="mb-4 last:mb-0">
              <div className="text-xs uppercase tracking-wider text-wf-muted font-bold mb-1.5">{list[0].storeName} · {storeId}</div>
              {list.map((d) => (
                <div
                  key={d._id}
                  className="flex items-center gap-3 py-2.5 border-b border-wf-border last:border-0"
                  style={{ opacity: d.revokedAt ? 0.55 : 1 }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                      {d.type} · <span className="font-mono text-xs">{d.serialNumber || d.deviceId}</span>
                      {d.revokedAt && <span className="ml-2 text-wf-red font-normal text-xs">revoked</span>}
                    </div>
                    <div className="text-xs text-wf-subtext">
                      paired by {d.pairedByKind === "admin" ? "admin" : "store"} {formatWhen(d.pairedAt)} · last seen {formatWhen(d.lastSeenAt)}
                    </div>
                  </div>
                  {!d.revokedAt && (
                    <button
                      onClick={() => handleRevoke(d.deviceId, d.deviceLabel)}
                      className="px-3 py-1.5 rounded-lg bg-wf-red/10 border border-wf-red/25 text-wf-red text-xs font-semibold cursor-pointer hover:bg-wf-red/15"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// Provisioning tab — manage a store's hardware (the device allowlist)
// ----------------------------------------------------------------------

function ProvisioningTab() {
  const toast = useToast();
  const stores = useQuery(api.stores.list);
  const [selectedStore, setSelectedStore] = useState("");
  const devices = useQuery(
    api.devices.getByStoreId,
    selectedStore ? { storeId: selectedStore } : "skip"
  );
  const provisionDevice = useMutation(api.devices.provisionDevice);
  const deprovisionDevice = useMutation(api.devices.deprovisionDevice);
  const revokeDevice = useMutation(api.kioskPairing.revokeDevice);

  const [type, setType] = useState("Mirror");
  const [serial, setSerial] = useState("");
  const [iotId, setIotId] = useState("");
  const [saving, setSaving] = useState(false);

  if (!stores) return <PageLoading />;

  const handleAdd = async () => {
    if (!selectedStore) { toast("Pick a store first", "error"); return; }
    if (!serial.trim()) { toast("Serial number is required", "error"); return; }
    setSaving(true);
    try {
      await provisionDevice({
        storeId: selectedStore,
        type,
        serial: serial.trim(),
        iotId: type === "Mirror" ? iotId.trim() || undefined : undefined,
      });
      toast(`Provisioned ${type} ${serial.trim().toUpperCase()}`, "success");
      setSerial("");
      setIotId("");
    } catch (e) {
      toast(cleanError(e, "Failed to provision"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (deviceId: string, ser?: string) => {
    if (!confirm(`Remove provisioned device ${ser || deviceId}? This frees the serial.`)) return;
    try {
      await deprovisionDevice({ deviceId });
      toast("Device removed", "success");
    } catch (e) {
      toast(cleanError(e, "Failed to remove"), "error");
    }
  };

  const handleRevoke = async (deviceId: string, ser?: string) => {
    if (!confirm(`Revoke ${ser || deviceId}? It returns to provisioned and can be re-paired.`)) return;
    try {
      await revokeDevice({ deviceId });
      toast("Device revoked", "success");
    } catch (e) {
      toast(cleanError(e, "Failed to revoke"), "error");
    }
  };

  return (
    <div>
      <Card title="Provision Hardware">
        <select
          value={selectedStore}
          onChange={(e) => { setSelectedStore(e.target.value); }}
          className={`${CTL} w-full mb-2`}
        >
          <option value="">Select store…</option>
          {stores.map((s) => (
            <option key={s._id} value={s.storeId}>{s.name} · {s.storeId} · {s.city}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={type} onChange={(e) => setType(e.target.value)} className={CTL}>
            <option value="Mirror">Mirror</option>
            <option value="Tablet">Tablet</option>
          </select>
          <input
            value={serial}
            onChange={(e) => { setSerial(e.target.value.toUpperCase()); }}
            placeholder="Serial number"
            className={`${CTL} flex-1 min-w-[160px] font-mono`}
          />
          {type === "Mirror" && (
            <input
              value={iotId}
              onChange={(e) => setIotId(e.target.value)}
              placeholder="IoT id (optional)"
              className={`${CTL} flex-1 min-w-[160px] font-mono`}
            />
          )}
          <button
            onClick={handleAdd}
            disabled={saving || !selectedStore}
            className="px-4 py-2 rounded-lg bg-wf-primary text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "Adding…" : "Provision"}
          </button>
        </div>
      </Card>

      <Card title="Provisioned Devices">
        {!selectedStore ? (
          <div className="text-center py-8 text-sm text-wf-muted">Pick a store to view and manage its provisioned hardware.</div>
        ) : devices === undefined ? (
          <div className="text-center py-8 text-sm text-wf-muted">Loading…</div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8 text-sm text-wf-muted">No hardware provisioned for this store yet. Add a mirror or tablet above.</div>
        ) : (
          devices.map((d) => (
            <div key={d._id} className="flex items-center gap-3 py-2.5 border-b border-wf-border last:border-0">
              <span className="w-[60px] text-sm font-semibold">{d.type}</span>
              <span className="flex-1 min-w-0">
                <span className="text-sm font-mono font-semibold">{d.serialNumber || "—"}</span>
                {d.iotDeviceId && <span className="text-xs font-mono text-wf-subtext"> · {d.iotDeviceId}</span>}
                <span className="block text-xs text-wf-subtext truncate">{d.deviceLabel || d.deviceId}</span>
              </span>
              {lifecycleBadge(d)}
              {d.lifecycle === "ACTIVE" ? (
                <button
                  onClick={() => handleRevoke(d.deviceId, d.serialNumber)}
                  className="px-3 py-1.5 rounded-lg bg-wf-amber/10 border border-wf-amber/25 text-wf-amber text-xs font-semibold cursor-pointer hover:bg-wf-amber/15"
                >
                  Revoke
                </button>
              ) : (
                <button
                  onClick={() => handleRemove(d.deviceId, d.serialNumber)}
                  className="px-3 py-1.5 rounded-lg bg-wf-red/10 border border-wf-red/25 text-wf-red text-xs font-semibold cursor-pointer hover:bg-wf-red/15"
                >
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------

export default function DevicesPage() {
  const devices = useQuery(api.devices.list);
  const stats = useQuery(api.devices.getStats);
  const [tab, setTab] = useState("Fleet");

  if (!devices || !stats) return <PageLoading />;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-wf-text mb-1">Device Fleet Management</h1>
      <p className="text-xs text-wf-subtext mb-4">{stats.total} devices — {stats.online} online · {stats.provisioned} provisioned · {stats.active} paired</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <KPI label="Total Fleet" value={stats.total} />
        <KPI label="Online" value={stats.online} subtitle={`${stats.offline} offline`} />
        <KPI label="Mirrors" value={stats.mirrors} />
        <KPI label="Tablets" value={stats.tablets} />
        <KPI label="Provisioned" value={stats.provisioned} subtitle="awaiting pair" />
        <KPI label="Active" value={stats.active} subtitle="paired" />
      </div>

      <Tabs items={["Fleet", "Pairing", "Provisioning"]} active={tab} onChange={setTab} />

      {tab === "Fleet" && <FleetTab devices={devices as DeviceRow[]} />}
      {tab === "Pairing" && <PairingTab />}
      {tab === "Provisioning" && <ProvisioningTab />}
    </div>
  );
}
