"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type WeeklyItem = { cafeId: string; cafeName: string; isoYear: number; isoWeek: number; lines: number };
type ChangeItem = {
  id: string;
  cafeId?: string;
  cafeName?: string;
  date: string;
  productName: string;
  unit: string;
  fromQty: number;
  toQty: number;
  status?: string;
  note: string | null;
};

export function RequestsList({ mode }: { mode: "BAKERY" | "CAFE" }) {
  const [weekly, setWeekly] = useState<WeeklyItem[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/orders/pending");
    setLoading(false);
    if (r.ok) {
      const d = await r.json();
      setWeekly(d.weekly);
      setChanges(d.changes);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(id: string, action: "ACCEPT" | "REJECT") {
    setBusy(true);
    const r = await fetch(`/api/orders/change-request/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (r.ok) await load();
  }

  const orderHref = (w: WeeklyItem) =>
    mode === "BAKERY"
      ? `/bakery/orders?cafe=${w.cafeId}&year=${w.isoYear}&week=${w.isoWeek}`
      : `/cafe/orders?year=${w.isoYear}&week=${w.isoWeek}`;

  const pendingChanges = mode === "CAFE" ? changes.filter((c) => c.status === "PENDING") : changes;

  if (loading) return <p className="text-stone-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          {mode === "BAKERY" ? "Weekly drafts — café requested changes" : "Weekly drafts — awaiting your confirmation"}
          <span className="text-stone-400"> · {weekly.length}</span>
        </h2>
        {weekly.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing here.</p>
        ) : (
          <div className="space-y-2">
            {weekly.map((w) => (
              <div key={`${w.cafeId}-${w.isoYear}-${w.isoWeek}`} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
                <span>
                  {mode === "BAKERY" && <span className="font-medium">{w.cafeName} · </span>}
                  {w.isoYear}-W{w.isoWeek} <span className="text-stone-500">({w.lines} lines)</span>
                </span>
                <Link href={orderHref(w)} className="rounded border border-bobo px-3 py-1 text-xs font-medium text-bobo hover:bg-bobo/5">
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          {mode === "BAKERY" ? "Delivery change requests" : "Your change requests"}
          <span className="text-stone-400"> · {mode === "BAKERY" ? changes.length : pendingChanges.length}</span>
        </h2>
        {(mode === "BAKERY" ? changes : changes).length === 0 ? (
          <p className="text-sm text-stone-400">Nothing here.</p>
        ) : (
          <div className="space-y-2">
            {changes.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm">
                <span>
                  {mode === "BAKERY" && c.cafeName && <span className="font-medium">{c.cafeName} · </span>}
                  <span className="text-stone-400">{c.date}</span> · {c.productName}:{" "}
                  <span className="font-medium">{c.fromQty} → {c.toQty}</span>
                  {c.status && (
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${c.status === "PENDING" ? "bg-amber-100 text-amber-800" : c.status === "ACCEPTED" ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}>
                      {c.status.toLowerCase()}
                    </span>
                  )}
                </span>
                {mode === "BAKERY" && (
                  <span className="flex gap-2">
                    <button onClick={() => resolve(c.id, "ACCEPT")} disabled={busy} className="rounded border border-green-600 px-2 py-0.5 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50">Accept</button>
                    <button onClick={() => resolve(c.id, "REJECT")} disabled={busy} className="rounded border border-stone-300 px-2 py-0.5 text-xs hover:bg-stone-100 disabled:opacity-50">Reject</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
