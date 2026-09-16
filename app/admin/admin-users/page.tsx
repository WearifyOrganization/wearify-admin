"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@wearify/shared/api";
import { Id } from "@wearify/shared/dataModel";
import { Card, Badge, Btn, PageLoading } from "@/components/ui/wearify-ui";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  staff: "Staff",
};

export default function AdminUsersPage() {
  const admins = useQuery(api.adminUsers.list);
  const me = useQuery(api.adminUsers.getMe);
  const createStaffAdmin = useAction(api.adminUsers.createStaffAdmin);
  const setRole = useMutation(api.adminUsers.setRole);
  const setStatus = useMutation(api.adminUsers.setStatus);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "staff" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");

  if (!admins || me === undefined) return <PageLoading />;

  async function handleAdd() {
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setFormError("Enter a valid email address");
      return;
    }
    if (!name) {
      setFormError("Name is required");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Temporary password must be at least 8 characters");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await createStaffAdmin({ email, name, password: form.password, role: form.role });
      setForm({ email: "", name: "", password: "", role: "staff" });
      setShowAdd(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetStatus(id: Id<"adminUsers">, status: "active" | "disabled") {
    setRowError("");
    try {
      await setStatus({ adminUserId: id, status });
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function handleSetRole(id: Id<"adminUsers">, role: string) {
    setRowError("");
    try {
      await setRole({ adminUserId: id, role });
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-wf-text mb-1">Admin Users</h1>
          <p className="text-sm text-wf-subtext">
            Super admins have full access; staff are scoped to Stores, Tailors, Support & Network.
          </p>
        </div>
        <Btn
          primary
          onClick={() => {
            setShowAdd(true);
            setFormError("");
          }}
        >
          + Add Admin
        </Btn>
      </div>

      {rowError && (
        <div className="mb-3 px-3 py-2 rounded bg-wf-red/10 border border-wf-red/20 text-wf-red text-xs font-semibold">
          {rowError}
        </div>
      )}

      {showAdd && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-wf-text">Add Admin User</span>
            <button
              onClick={() => setShowAdd(false)}
              aria-label="Close"
              className="text-wf-muted hover:text-wf-text cursor-pointer bg-transparent border-none"
            >
              ✕
            </button>
          </div>
          {formError && (
            <div className="mb-3 px-3 py-2 rounded bg-wf-red/10 border border-wf-red/20 text-wf-red text-xs font-semibold">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-wf-subtext mb-1">Email *</label>
              <input
                className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="staff@wearify.com"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-wf-subtext mb-1">Name *</label>
              <input
                className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Priya Sharma"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-wf-subtext mb-1">Temporary Password *</label>
              <input
                type="text"
                className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 characters"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-wf-subtext mb-1">Role *</label>
              <select
                className="w-full px-3 py-2 rounded border border-wf-border bg-wf-card text-sm text-wf-text focus:outline-none focus:border-wf-primary"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="staff">Staff (scoped)</option>
                <option value="super_admin">Super Admin (full access)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-wf-border">
            <Btn primary onClick={handleAdd} disabled={saving}>
              {saving ? "Creating..." : "Create Admin"}
            </Btn>
            <Btn onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-wf-border text-xs font-bold text-wf-muted uppercase tracking-wider">
                <th className="text-left py-2 pr-4">Email</th>
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Role</th>
                <th className="text-left py-2 pr-4">Status</th>
                <th className="text-right py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isSelf = me?.email === a.email;
                return (
                  <tr key={a._id} className="border-b border-wf-border">
                    <td className="py-3 pr-4 text-sm font-semibold text-wf-text">
                      {a.email}
                      {isSelf && <span className="ml-2 text-xs text-wf-muted">(you)</span>}
                    </td>
                    <td className="py-3 pr-4 text-sm text-wf-subtext">{a.name ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge status={a.role === "super_admin" ? "shadow" : "planned"}>
                        {ROLE_LABEL[a.role] ?? a.role}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={a.status === "active" ? "active" : "churned"}>{a.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 justify-end">
                        <select
                          className="px-2 py-1 rounded border border-wf-border bg-wf-card text-xs text-wf-text focus:outline-none focus:border-wf-primary cursor-pointer"
                          value={a.role}
                          onChange={(e) => handleSetRole(a._id, e.target.value)}
                        >
                          <option value="staff">Staff</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        {a.status === "active" ? (
                          <Btn small danger onClick={() => handleSetStatus(a._id, "disabled")}>
                            Disable
                          </Btn>
                        ) : (
                          <Btn small onClick={() => handleSetStatus(a._id, "active")}>
                            Enable
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
