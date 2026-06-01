"use client";

import { useState } from "react";

export type CafeDTO = {
  id: string;
  name: string;
  address: string | null;
  contacts: string | null;
  active: boolean;
};

type Draft = { name: string; address: string; contacts: string };

const inputCls =
  "w-full rounded border border-stone-300 px-2 py-1 text-sm outline-none focus:border-bobo disabled:bg-stone-100 disabled:text-stone-400";

function blank(): Draft {
  return { name: "", address: "", contacts: "" };
}

export function CafesManager({ initialCafes }: { initialCafes: CafeDTO[] }) {
  const [cafes, setCafes] = useState<CafeDTO[]>(initialCafes);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    const r = await fetch("/api/cafes");
    if (r.ok) setCafes((await r.json()).cafes);
  }

  async function addCafe() {
    setError(null);
    if (!newDraft.name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/cafes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDraft.name.trim(), address: newDraft.address.trim() || undefined, contacts: newDraft.contacts.trim() || undefined }),
    });
    setBusy(false);
    if (!r.ok) {
      setError("Could not create café");
      return;
    }
    setAdding(false);
    setNewDraft(blank());
    await refetch();
  }

  function startEdit(c: CafeDTO) {
    setEditingId(c.id);
    setError(null);
    setDraft({ name: c.name, address: c.address ?? "", contacts: c.contacts ?? "" });
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/cafes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.name.trim(), address: draft.address.trim() || null, contacts: draft.contacts.trim() || null }),
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

  async function toggleActive(c: CafeDTO) {
    setBusy(true);
    const r = await fetch(`/api/cafes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    setBusy(false);
    if (r.ok) await refetch();
  }

  return (
    <div>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <p className="mb-3 text-xs text-stone-400">All cafés are billed weekly (after each week closes).</p>

      <div className="mb-4">
        {!adding ? (
          <button onClick={() => { setAdding(true); setNewDraft(blank()); setError(null); }} className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark">
            + Add café
          </button>
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <h3 className="mb-3 font-semibold">New café</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Name</span>
                <input className={inputCls} value={newDraft.name} onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })} autoFocus />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-stone-500">Address</span>
                <input className={inputCls} value={newDraft.address} onChange={(e) => setNewDraft({ ...newDraft, address: e.target.value })} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-stone-500">Contacts</span>
                <input className={inputCls} value={newDraft.contacts} onChange={(e) => setNewDraft({ ...newDraft, contacts: e.target.value })} />
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addCafe} disabled={busy} className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-60">Save café</button>
              <button onClick={() => { setAdding(false); setError(null); }} className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Café</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cafes.map((c) => {
              const editing = editingId === c.id && draft;
              return (
                <tr key={c.id} className="border-b border-stone-100 last:border-0">
                  {editing ? (
                    <>
                      <td className="px-3 py-2">
                        <input className={inputCls} value={draft!.name} onChange={(e) => setDraft({ ...draft!, name: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={inputCls} value={draft!.address} onChange={(e) => setDraft({ ...draft!, address: e.target.value })} />
                        <input className={`${inputCls} mt-1`} placeholder="contacts" value={draft!.contacts} onChange={(e) => setDraft({ ...draft!, contacts: e.target.value })} />
                      </td>
                      <td className="px-3 py-2 text-stone-400">—</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => saveEdit(c.id)} disabled={busy} className="rounded bg-bobo px-3 py-1 text-xs font-medium text-white hover:bg-bobo-dark disabled:opacity-60">Save</button>
                          <button onClick={() => { setEditingId(null); setDraft(null); }} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-stone-800">{c.name}</td>
                      <td className="px-3 py-2 text-stone-600">{c.address ?? "—"}</td>
                      <td className="px-3 py-2">{c.active ? <span className="text-green-700">Active</span> : <span className="text-stone-400">Disabled</span>}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEdit(c)} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">Edit</button>
                          <button onClick={() => toggleActive(c)} disabled={busy} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100 disabled:opacity-60">
                            {c.active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {cafes.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-3 text-center text-stone-400">No cafés yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
