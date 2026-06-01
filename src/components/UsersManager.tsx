"use client";

import { useState } from "react";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/roles";

export type UserDTO = {
  id: string;
  name: string;
  login: string;
  role: string;
  cafeId: string | null;
  active: boolean;
  cafe?: { id: string; name: string } | null;
};

type CafeOpt = { id: string; name: string };
type NewDraft = { name: string; login: string; password: string; role: string; cafeId: string };
type EditDraft = { name: string; role: string; cafeId: string; password: string };

const inputCls =
  "w-full rounded border border-stone-300 px-2 py-1 text-sm outline-none focus:border-bobo disabled:bg-stone-100 disabled:text-stone-400";

export function UsersManager({
  initialUsers,
  cafes,
  currentUserId,
}: {
  initialUsers: UserDTO[];
  cafes: CafeOpt[];
  currentUserId: string;
}) {
  function blankNew(): NewDraft {
    return { name: "", login: "", password: "", role: "COURIER", cafeId: cafes[0]?.id ?? "" };
  }

  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<NewDraft>(blankNew());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    const r = await fetch("/api/users");
    if (r.ok) setUsers((await r.json()).users);
  }

  async function addUser() {
    setError(null);
    if (!newDraft.name.trim() || !newDraft.login.trim() || newDraft.password.length < 4) {
      setError("Name, login and a 4+ character password are required");
      return;
    }
    if (newDraft.role === "CAFE" && !newDraft.cafeId) {
      setError("Select a café for a café user");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newDraft.name.trim(),
        login: newDraft.login.trim(),
        password: newDraft.password,
        role: newDraft.role,
        cafeId: newDraft.role === "CAFE" ? newDraft.cafeId : null,
      }),
    });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setError(e.error === "login_taken" ? "Login already taken" : "Could not create user");
      return;
    }
    setAdding(false);
    setNewDraft(blankNew());
    await refetch();
  }

  function startEdit(u: UserDTO) {
    setEditingId(u.id);
    setError(null);
    setDraft({ name: u.name, role: u.role, cafeId: u.cafeId ?? (cafes[0]?.id ?? ""), password: "" });
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    if (draft.role === "CAFE" && !draft.cafeId) {
      setError("Select a café");
      return;
    }
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: draft.name.trim(),
      role: draft.role,
      cafeId: draft.role === "CAFE" ? draft.cafeId : null,
    };
    if (draft.password) body.password = draft.password;
    const r = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!r.ok) {
      setError("Save failed");
      return;
    }
    setEditingId(null);
    setDraft(null);
    await refetch();
  }

  async function toggleActive(u: UserDTO) {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setError(e.error === "cannot_deactivate_self" ? "You cannot deactivate your own account" : "Failed");
      return;
    }
    await refetch();
  }

  return (
    <div>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4">
        {!adding ? (
          <button
            onClick={() => {
              setAdding(true);
              setNewDraft(blankNew());
              setError(null);
            }}
            className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark"
          >
            + Add user
          </button>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="mb-3 font-semibold">New user</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Name</span>
                <input className={inputCls} value={newDraft.name} onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })} autoFocus />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Login</span>
                <input className={inputCls} value={newDraft.login} onChange={(e) => setNewDraft({ ...newDraft, login: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Password</span>
                <input className={inputCls} value={newDraft.password} onChange={(e) => setNewDraft({ ...newDraft, password: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Role</span>
                <select className={inputCls} value={newDraft.role} onChange={(e) => setNewDraft({ ...newDraft, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </label>
              {newDraft.role === "CAFE" && (
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Café</span>
                  <select className={inputCls} value={newDraft.cafeId} onChange={(e) => setNewDraft({ ...newDraft, cafeId: e.target.value })}>
                    {cafes.length === 0 && <option value="">No cafés yet</option>}
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addUser} disabled={busy} className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-60">
                Save user
              </button>
              <button onClick={() => { setAdding(false); setError(null); }} className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Login</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Café</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editing = editingId === u.id && draft;
              return (
                <tr key={u.id} className="border-b border-stone-100 last:border-0">
                  {editing ? (
                    <>
                      <td className="px-3 py-2">
                        <input className={inputCls} value={draft!.name} onChange={(e) => setDraft({ ...draft!, name: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-stone-500">{u.login}</td>
                      <td className="px-3 py-2">
                        <select className={inputCls} value={draft!.role} onChange={(e) => setDraft({ ...draft!, role: e.target.value })}>
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        {draft!.role === "CAFE" ? (
                          <select className={inputCls} value={draft!.cafeId} onChange={(e) => setDraft({ ...draft!, cafeId: e.target.value })}>
                            {cafes.length === 0 && <option value="">No cafés</option>}
                            {cafes.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2" colSpan={1}>
                        <input
                          className={inputCls}
                          placeholder="new password (blank = keep)"
                          value={draft!.password}
                          onChange={(e) => setDraft({ ...draft!, password: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(u.id)} disabled={busy} className="rounded bg-bobo px-3 py-1 text-xs font-medium text-white hover:bg-bobo-dark disabled:opacity-60">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft(null); }} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-stone-800">{u.name}</td>
                      <td className="px-3 py-2 font-mono text-stone-600">{u.login}</td>
                      <td className="px-3 py-2 text-stone-600">{ROLE_LABEL[u.role as Role] ?? u.role}</td>
                      <td className="px-3 py-2 text-stone-600">{u.cafe?.name ?? "—"}</td>
                      <td className="px-3 py-2">{u.active ? <span className="text-green-700">Active</span> : <span className="text-stone-400">Disabled</span>}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(u)} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">Edit</button>
                          <button
                            onClick={() => toggleActive(u)}
                            disabled={busy || (u.id === currentUserId && u.active)}
                            title={u.id === currentUserId && u.active ? "You cannot disable your own account" : ""}
                            className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100 disabled:opacity-40"
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
