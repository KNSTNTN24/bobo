"use client";

import { useState } from "react";
import { CATEGORIES, UNITS, unitLabel } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

export type ProductDTO = {
  id: string;
  name: string;
  category: string;
  unit: string;
  priceP: number;
  allowsNote: boolean;
  changeLeadHours: number;
  active: boolean;
};

type Draft = {
  name: string;
  category: string;
  unit: string;
  pricePounds: string;
  allowsNote: boolean;
  changeLeadHours: string;
};

const poundsToPence = (s: string): number =>
  Math.max(0, Math.round((parseFloat(s) || 0) * 100));
const penceToPounds = (p: number): string => (p / 100).toFixed(2);

function blankDraft(): Draft {
  return {
    name: "",
    category: CATEGORIES[0],
    unit: "item",
    pricePounds: "",
    allowsNote: false,
    changeLeadHours: "18",
  };
}

export function CatalogManager({
  initialProducts,
  canEditCatalog,
  canEditPrices,
  currency,
}: {
  initialProducts: ProductDTO[];
  canEditCatalog: boolean;
  canEditPrices: boolean;
  currency: string;
}) {
  const [products, setProducts] = useState<ProductDTO[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(blankDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canEditCatalog && !canEditPrices;

  async function refetch() {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = (await res.json()) as { products: ProductDTO[] };
      setProducts(data.products);
    }
  }

  function startEdit(p: ProductDTO) {
    setEditingId(p.id);
    setError(null);
    setDraft({
      name: p.name,
      category: p.category,
      unit: p.unit,
      pricePounds: penceToPounds(p.priceP),
      allowsNote: p.allowsNote,
      changeLeadHours: String(p.changeLeadHours),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {};
    if (canEditCatalog) {
      body.name = draft.name.trim();
      body.category = draft.category;
      body.unit = draft.unit;
      body.allowsNote = draft.allowsNote;
      body.changeLeadHours = parseInt(draft.changeLeadHours, 10) || 0;
    }
    if (canEditPrices) body.priceP = poundsToPence(draft.pricePounds);

    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Save failed");
      return;
    }
    cancelEdit();
    await refetch();
  }

  async function toggleActive(p: ProductDTO) {
    setBusy(true);
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    setBusy(false);
    if (res.ok) await refetch();
  }

  async function addProduct() {
    if (!newDraft.name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: newDraft.name.trim(),
      category: newDraft.category,
      unit: newDraft.unit,
      allowsNote: newDraft.allowsNote,
      changeLeadHours: parseInt(newDraft.changeLeadHours, 10) || 18,
    };
    if (canEditPrices) body.priceP = poundsToPence(newDraft.pricePounds);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not add product");
      return;
    }
    setAdding(false);
    setNewDraft(blankDraft());
    await refetch();
  }

  const known = new Set<string>(CATEGORIES as readonly string[]);
  const groups: { cat: string; items: ProductDTO[] }[] = CATEGORIES.map((cat) => ({
    cat,
    items: products.filter((p) => p.category === cat),
  }));
  const others = products.filter((p) => !known.has(p.category));
  if (others.length) groups.push({ cat: "Other", items: others });

  const inputCls =
    "w-full rounded border border-stone-300 px-2 py-1 text-sm outline-none focus:border-bobo disabled:bg-stone-100 disabled:text-stone-400";

  return (
    <div>
      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {canEditCatalog && (
        <div className="mb-4">
          {!adding ? (
            <button
              onClick={() => {
                setAdding(true);
                setNewDraft(blankDraft());
                setError(null);
              }}
              className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark"
            >
              + Add product
            </button>
          ) : (
            <div className="rounded-lg border border-stone-200 bg-white p-4">
              <h3 className="mb-3 font-semibold">New product</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Name</span>
                  <input
                    className={inputCls}
                    value={newDraft.name}
                    onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                    autoFocus
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Category</span>
                  <select
                    className={inputCls}
                    value={newDraft.category}
                    onChange={(e) => setNewDraft({ ...newDraft, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Unit</span>
                  <select
                    className={inputCls}
                    value={newDraft.unit}
                    onChange={(e) => setNewDraft({ ...newDraft, unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{unitLabel(u)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">
                    Price ({currency}){!canEditPrices && " — needs price rights"}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!canEditPrices}
                    className={inputCls}
                    value={newDraft.pricePounds}
                    placeholder="0.00"
                    onChange={(e) => setNewDraft({ ...newDraft, pricePounds: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-stone-500">Change cutoff (h before delivery)</span>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={newDraft.changeLeadHours}
                    onChange={(e) => setNewDraft({ ...newDraft, changeLeadHours: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 self-end text-sm">
                  <input
                    type="checkbox"
                    checked={newDraft.allowsNote}
                    onChange={(e) => setNewDraft({ ...newDraft, allowsNote: e.target.checked })}
                  />
                  <span className="text-stone-600">Allow note on order</span>
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={addProduct}
                  disabled={busy}
                  className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-60"
                >
                  Save product
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.cat}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
              {g.cat} <span className="text-stone-400">· {g.items.length}</span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Cutoff</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">Status</th>
                    {!readOnly && <th className="px-3 py-2 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((p) => {
                    const editing = editingId === p.id && draft;
                    return (
                      <tr key={p.id} className="border-b border-stone-100 last:border-0">
                        {editing ? (
                          <>
                            <td className="px-3 py-2">
                              <input
                                className={inputCls}
                                disabled={!canEditCatalog}
                                value={draft!.name}
                                onChange={(e) => setDraft({ ...draft!, name: e.target.value })}
                              />
                              <select
                                className={`${inputCls} mt-1`}
                                disabled={!canEditCatalog}
                                value={draft!.category}
                                onChange={(e) => setDraft({ ...draft!, category: e.target.value })}
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className={inputCls}
                                disabled={!canEditCatalog}
                                value={draft!.unit}
                                onChange={(e) => setDraft({ ...draft!, unit: e.target.value })}
                              >
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>{unitLabel(u)}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                className={inputCls}
                                disabled={!canEditCatalog}
                                value={draft!.changeLeadHours}
                                onChange={(e) => setDraft({ ...draft!, changeLeadHours: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className={inputCls}
                                disabled={!canEditPrices}
                                value={draft!.pricePounds}
                                onChange={(e) => setDraft({ ...draft!, pricePounds: e.target.value })}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                disabled={!canEditCatalog}
                                checked={draft!.allowsNote}
                                onChange={(e) => setDraft({ ...draft!, allowsNote: e.target.checked })}
                              />
                            </td>
                            <td className="px-3 py-2 text-stone-400">—</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => saveEdit(p.id)}
                                  disabled={busy}
                                  className="rounded bg-bobo px-3 py-1 text-xs font-medium text-white hover:bg-bobo-dark disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-medium text-stone-800">{p.name}</td>
                            <td className="px-3 py-2 text-stone-600">{unitLabel(p.unit)}</td>
                            <td className="px-3 py-2 text-stone-600">{p.changeLeadHours}h</td>
                            <td className="px-3 py-2">
                              {p.priceP > 0 ? (
                                formatMoney(p.priceP, currency)
                              ) : (
                                <span className="text-amber-600">— set price</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-stone-600">{p.allowsNote ? "Yes" : "—"}</td>
                            <td className="px-3 py-2">
                              {p.active ? (
                                <span className="text-green-700">Active</span>
                              ) : (
                                <span className="text-stone-400">Archived</span>
                              )}
                            </td>
                            {!readOnly && (
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100"
                                  >
                                    Edit
                                  </button>
                                  {canEditCatalog && (
                                    <button
                                      onClick={() => toggleActive(p)}
                                      disabled={busy}
                                      className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100 disabled:opacity-60"
                                    >
                                      {p.active ? "Archive" : "Restore"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {g.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-3 text-center text-stone-400">
                        No products
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
