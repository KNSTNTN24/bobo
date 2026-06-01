"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, unitLabel } from "@/lib/catalog";
import { addWeeks, currentIsoWeek, weekRangeLabel } from "@/lib/week";
import { cellCutoffMs } from "@/lib/orders";

type CafeOpt = { id: string; name: string };
type DateCol = { key: string; ms: number; dow: string; dm: string };
type Product = { id: string; name: string; category: string; unit: string; allowsNote: boolean; changeLeadHours: number; priceP: number };
type Line = { date: string; productId: string; qty: number; proposedQty: number; note: string | null };
type ChangeReq = { id: string; date: string; productId: string; fromQty: number; toQty: number; status: string; note: string | null };
type OrdersData = {
  role: string;
  cafe: { id: string; name: string };
  isoYear: number;
  isoWeek: number;
  phase: "FUTURE" | "CURRENT" | "PAST";
  type1Open: boolean;
  deadlineMs: number;
  status: string;
  serverNow: number;
  dates: DateCol[];
  products: Product[];
  lines: Line[];
  changeRequests: ChangeReq[];
};
type CafeTab = { cafeId: string; cafeName: string; status: string; pendingChanges: number };

const key = (p: string, d: string) => `${p}|${d}`;

export function OrdersScreen({
  mode,
  cafes,
  initialCafeId,
  initialYear,
  initialWeek,
}: {
  mode: "BAKERY" | "CAFE";
  cafes: CafeOpt[];
  initialCafeId: string;
  initialYear: number;
  initialWeek: number;
}) {
  const [cafeId, setCafeId] = useState(initialCafeId);
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [data, setData] = useState<OrdersData | null>(null);
  const [tabs, setTabs] = useState<CafeTab[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [onlyOrdered, setOnlyOrdered] = useState(true);

  const buildDraft = (d: OrdersData) => {
    const m: Record<string, string> = {};
    for (const l of d.lines) m[key(l.productId, l.date)] = l.qty > 0 ? String(l.qty) : "";
    return m;
  };

  const load = useCallback(async () => {
    if (!cafeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMsg(null);
    setEditMode(false);
    const reqs: Promise<Response>[] = [fetch(`/api/orders?cafeId=${cafeId}&year=${year}&week=${week}`)];
    if (mode === "BAKERY") reqs.push(fetch(`/api/orders/overview?year=${year}&week=${week}`));
    const [oRes, ovRes] = await Promise.all(reqs);
    setLoading(false);
    if (!oRes.ok) {
      setData(null);
      setMsg("Could not load");
      return;
    }
    const d = (await oRes.json()) as OrdersData;
    setData(d);
    setDraft(buildDraft(d));
    if (ovRes && ovRes.ok) setTabs((await ovRes.json()).cafes);
  }, [cafeId, year, week, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const lineMap = useMemo(() => {
    const m = new Map<string, Line>();
    for (const l of data?.lines ?? []) m.set(key(l.productId, l.date), l);
    return m;
  }, [data]);

  const crMap = useMemo(() => {
    const m = new Map<string, ChangeReq>();
    for (const c of data?.changeRequests ?? []) if (c.status === "PENDING") m.set(key(c.productId, c.date), c);
    return m;
  }, [data]);

  const isBakery = mode === "BAKERY";
  const canEditType1 = !!data && data.phase === "FUTURE" && data.type1Open && data.status === "PROPOSED";
  const cutoffOpen = (p: Product, d: DateCol) => !!data && data.serverNow < cellCutoffMs(d.ms, p.changeLeadHours);
  const anyOpenCutoff = useMemo(
    () => !!data && data.products.some((p) => data.dates.some((d) => cutoffOpen(p, d))),
    [data],
  );
  const canRequestType2 = !!data && !isBakery && data.status === "CONFIRMED" && data.phase !== "PAST" && anyOpenCutoff;

  const productHasQty = useCallback(
    (p: Product) => (data?.dates ?? []).some((d) => (lineMap.get(key(p.id, d.key))?.qty ?? 0) > 0),
    [data, lineMap],
  );

  const groups = useMemo(() => {
    if (!data) return [];
    const known = new Set<string>(CATEGORIES as readonly string[]);
    const all: { cat: string; items: Product[] }[] = CATEGORIES.map((cat) => ({ cat, items: data.products.filter((p) => p.category === cat) }));
    const others = data.products.filter((p) => !known.has(p.category));
    if (others.length) all.push({ cat: "Other", items: others });
    const showAll = editMode || !onlyOrdered;
    return all
      .map((g) => ({ cat: g.cat, items: showAll ? g.items : g.items.filter(productHasQty) }))
      .filter((g) => g.items.length > 0);
  }, [data, editMode, onlyOrdered, productHasQty]);

  const dirtyKeys = useMemo(() => {
    if (!data) return [];
    const out: string[] = [];
    for (const p of data.products) {
      for (const d of data.dates) {
        const k = key(p.id, d.key);
        const cur = parseInt(draft[k] || "0", 10) || 0;
        const orig = lineMap.get(k)?.qty ?? 0;
        if (cur !== orig) out.push(k);
      }
    }
    return out;
  }, [draft, data, lineMap]);

  const hasCafeChanges = useMemo(() => (data?.lines ?? []).some((l) => l.qty !== l.proposedQty), [data]);

  function enterEdit() {
    if (data) setDraft(buildDraft(data));
    setMsg(null);
    setEditMode(true);
  }
  function cancelEdit() {
    if (data) setDraft(buildDraft(data));
    setEditMode(false);
    setMsg(null);
  }

  async function saveDraft() {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    let fail = 0;
    for (const k of dirtyKeys) {
      const [productId, date] = k.split("|");
      const qty = parseInt(draft[k] || "0", 10) || 0;
      const r = await fetch("/api/orders/cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cafeId, isoYear: year, isoWeek: week, date, productId, qty }),
      });
      if (!r.ok) fail++;
    }
    setBusy(false);
    setMsg(`Saved ${dirtyKeys.length - fail} change(s)${fail ? `, ${fail} failed` : ""}.`);
    await load();
  }

  async function doAction(action: "SUBMIT" | "CONFIRM" | "ACCEPT" | "REJECT") {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeId, isoYear: year, isoWeek: week, action }),
    });
    setBusy(false);
    if (!r.ok) {
      setMsg(`Action failed (${(await r.json().catch(() => ({}))).error ?? r.status})`);
      return;
    }
    await load();
  }

  async function sendChangeRequests() {
    if (!data) return;
    const changed: { productId: string; date: string; toQty: number }[] = [];
    for (const p of data.products) {
      for (const d of data.dates) {
        if (!cutoffOpen(p, d)) continue;
        const k = key(p.id, d.key);
        const cur = lineMap.get(k)?.qty ?? 0;
        const val = parseInt(draft[k] || "0", 10) || 0;
        if (val !== cur) changed.push({ productId: p.id, date: d.key, toQty: val });
      }
    }
    if (changed.length === 0) {
      setMsg("No changes to request.");
      return;
    }
    setBusy(true);
    setMsg(null);
    let ok = 0;
    let fail = 0;
    for (const c of changed) {
      const r = await fetch("/api/orders/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cafeId, date: c.date, productId: c.productId, toQty: c.toQty }),
      });
      if (r.ok) ok++;
      else fail++;
    }
    setBusy(false);
    setEditMode(false);
    setMsg(`Sent ${ok} change request(s)${fail ? `, ${fail} failed` : ""}.`);
    await load();
  }

  async function resolveCR(id: string, action: "ACCEPT" | "REJECT") {
    setBusy(true);
    const r = await fetch(`/api/orders/change-request/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (r.ok) await load();
  }

  function go(delta: number) {
    const n = addWeeks(year, week, delta);
    setYear(n.isoYear);
    setWeek(n.isoWeek);
  }

  const statusBadge = (s: string) =>
    s === "CONFIRMED" ? "bg-green-100 text-green-800" : s === "CHANGES_REQUESTED" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800";
  const statusLabel = (s: string) => (s === "CONFIRMED" ? "Confirmed" : s === "CHANGES_REQUESTED" ? "Changes requested" : "Draft");

  const reviewByBakery = !!data && data.status === "CHANGES_REQUESTED" && isBakery;

  return (
    <div>
      {isBakery && tabs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-stone-200">
          {tabs.map((t) => {
            const active = t.cafeId === cafeId;
            const attention = t.status === "CHANGES_REQUESTED" || t.pendingChanges > 0;
            return (
              <button
                key={t.cafeId}
                onClick={() => setCafeId(t.cafeId)}
                className={`-mb-px flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2 text-sm ${active ? "border-bobo font-semibold text-bobo" : "border-transparent text-stone-600 hover:text-stone-900"}`}
              >
                {t.cafeName}
                {attention && <span className="inline-block h-2 w-2 rounded-full bg-amber-500" title="Needs attention" />}
                {t.pendingChanges > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{t.pendingChanges}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100">←</button>
          <span className="min-w-[15rem] text-center text-sm font-medium text-stone-700">{weekRangeLabel(year, week)}</span>
          <button onClick={() => go(1)} className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100">→</button>
          <button onClick={() => { const c = currentIsoWeek(); setYear(c.isoYear); setWeek(c.isoWeek); }} className="ml-1 rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100">This week</button>
        </div>
        {data && (
          <>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadge(data.status)}`}>{statusLabel(data.status)}</span>
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-500">{data.phase.toLowerCase()} week</span>
          </>
        )}
      </div>

      {msg && <p className="mb-3 rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">{msg}</p>}

      {loading || !data ? (
        <p className="text-stone-500">{loading ? "Loading…" : "No data."}</p>
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {!editMode && (
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" className="h-4 w-4 accent-bobo" checked={onlyOrdered} onChange={(e) => setOnlyOrdered(e.target.checked)} />
                Only ordered items
              </label>
            )}
            {!editMode && canEditType1 && (
              <button onClick={enterEdit} className="rounded-md border border-bobo px-3 py-1.5 text-sm font-medium text-bobo hover:bg-bobo/5">Edit</button>
            )}
            {!editMode && canRequestType2 && (
              <button onClick={enterEdit} className="rounded-md border border-bobo px-3 py-1.5 text-sm font-medium text-bobo hover:bg-bobo/5">Request changes</button>
            )}
            {editMode && <span className="text-xs text-stone-500">Editing — all products shown{canRequestType2 ? "; days past cutoff are locked" : ""}.</span>}
          </div>

          {reviewByBakery && <p className="mb-2 text-xs text-blue-700">Café requested changes — proposed → requested. Accept or Reject below.</p>}

          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2 text-left">Product</th>
                  {data.dates.map((d) => (
                    <th key={d.key} className="px-2 py-2 text-center font-medium">
                      <div>{d.dow}</div>
                      <div className="font-normal text-stone-400">{d.dm}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <FragmentGroup key={g.cat} cat={g.cat} colSpan={data.dates.length + 1}>
                    {g.items.map((p) => (
                      <tr key={p.id} className="border-t border-stone-100">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                          <div className="font-medium text-stone-800">{p.name}</div>
                          <div className="text-xs text-stone-400">{unitLabel(p.unit)} · cutoff {p.changeLeadHours}h</div>
                        </td>
                        {data.dates.map((d) => {
                          const k = key(p.id, d.key);
                          const line = lineMap.get(k);
                          const cr = crMap.get(k);
                          const open = cutoffOpen(p, d);
                          const editableCell = editMode && (canEditType1 || (canRequestType2 && open));
                          return (
                            <td key={d.key} className={`px-1.5 py-1 text-center align-top ${editMode && canRequestType2 && !open ? "bg-stone-50" : ""}`}>
                              {editableCell ? (
                                <input
                                  type="number"
                                  min="0"
                                  disabled={busy}
                                  value={draft[k] ?? ""}
                                  placeholder="0"
                                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                                  className="w-14 rounded border border-stone-300 px-1 py-1 text-center outline-none focus:border-bobo disabled:bg-stone-100"
                                />
                              ) : reviewByBakery ? (
                                <span className={line && line.qty !== line.proposedQty ? "font-medium text-blue-700" : "text-stone-700"}>
                                  {line && line.qty !== line.proposedQty ? `${line.proposedQty}→${line.qty}` : line?.qty || "·"}
                                </span>
                              ) : (
                                <span>
                                  <span className="text-stone-700">{line?.qty || "·"}</span>
                                  {cr && <span className="ml-0.5 text-[10px] text-amber-600">→{cr.toQty}?</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </FragmentGroup>
                ))}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={data.dates.length + 1} className="px-3 py-4 text-center text-stone-400">
                      {onlyOrdered ? "No items ordered this week — untick “Only ordered items” to see all." : "No products."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Action bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {editMode && canEditType1 && (
              <>
                <button onClick={saveDraft} disabled={busy || dirtyKeys.length === 0} className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-50">
                  {dirtyKeys.length ? `Save ${dirtyKeys.length} change(s)` : "Save"}
                </button>
                {!isBakery && dirtyKeys.length === 0 && (
                  hasCafeChanges ? (
                    <button onClick={() => doAction("SUBMIT")} disabled={busy} className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">Submit changes for approval</button>
                  ) : (
                    <button onClick={() => doAction("CONFIRM")} disabled={busy} className="rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">Confirm order</button>
                  )
                )}
                <button onClick={cancelEdit} className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">Done</button>
                {dirtyKeys.length > 0 && <span className="text-xs text-amber-600">Unsaved — Save first</span>}
              </>
            )}
            {editMode && canRequestType2 && !canEditType1 && (
              <>
                <button onClick={sendChangeRequests} disabled={busy} className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-50">Send change requests</button>
                <button onClick={cancelEdit} className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100">Cancel</button>
              </>
            )}
            {reviewByBakery && !editMode && (
              <>
                <button onClick={() => doAction("ACCEPT")} disabled={busy} className="rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">Accept changes</button>
                <button onClick={() => doAction("REJECT")} disabled={busy} className="rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100 disabled:opacity-50">Reject</button>
              </>
            )}
          </div>

          {data.changeRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Change requests</h3>
              <div className="space-y-2">
                {data.changeRequests.map((c) => {
                  const pName = data.products.find((p) => p.id === c.productId)?.name ?? c.productId;
                  return (
                    <div key={c.id} className="flex items-center justify-between rounded border border-stone-200 bg-white px-3 py-2 text-sm">
                      <span>
                        <span className="text-stone-400">{c.date}</span> · {pName}: <span className="font-medium">{c.fromQty} → {c.toQty}</span>
                        <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${c.status === "PENDING" ? "bg-amber-100 text-amber-800" : c.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}>{c.status.toLowerCase()}</span>
                      </span>
                      {isBakery && c.status === "PENDING" && (
                        <span className="flex gap-2">
                          <button onClick={() => resolveCR(c.id, "ACCEPT")} disabled={busy} className="rounded border border-green-600 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50">Accept</button>
                          <button onClick={() => resolveCR(c.id, "REJECT")} disabled={busy} className="rounded border border-stone-300 px-2 py-0.5 text-xs hover:bg-stone-100">Reject</button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FragmentGroup({ cat, colSpan, children }: { cat: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-500">{cat}</td>
      </tr>
      {children}
    </>
  );
}
