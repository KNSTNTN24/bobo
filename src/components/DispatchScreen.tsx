"use client";

import { useCallback, useEffect, useState } from "react";
import { unitLabel } from "@/lib/catalog";

type Item = { productId: string; name: string; unit: string; qty: number; note: string | null };
type Delivery = {
  id: string;
  status: string;
  courierId: string | null;
  courierName: string | null;
  pickupConfirmedAt: string | null;
  deliveredAt: string | null;
  photoUrl: string | null;
};
type Planned = { cafeId: string; cafeName: string; items: Item[]; delivery: Delivery | null };
type Courier = { id: string; name: string };
type WeekDay = { key: string; dow: string; dm: string; cafes: number };

const STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: "Planned", cls: "bg-amber-100 text-amber-800" },
  PICKED_UP: { label: "Picked up", cls: "bg-blue-100 text-blue-800" },
  DELIVERED: { label: "Delivered", cls: "bg-green-100 text-green-800" },
};

export function DispatchScreen({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const r = await fetch(`/api/deliveries?date=${date}`);
    setLoading(false);
    if (!r.ok) {
      setPlanned([]);
      setMsg("Could not load this date");
      return;
    }
    const d = await r.json();
    setPlanned(d.planned ?? []);
    setCouriers(d.couriers ?? []);
    setWeekDays(d.weekDays ?? []);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(cafeId: string, courierId: string) {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/deliveries/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeId, date, courierId: courierId || null }),
    });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setMsg(`Assign failed: ${e.error ?? r.status}`);
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-stone-600">Delivery date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-bobo"
        />
      </div>

      {weekDays.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {weekDays.map((wd) => {
            const active = wd.key === date;
            return (
              <button
                key={wd.key}
                onClick={() => setDate(wd.key)}
                title={wd.cafes > 0 ? `${wd.cafes} café(s) with confirmed orders` : "No confirmed orders"}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  active
                    ? "border-bobo bg-bobo text-white"
                    : wd.cafes > 0
                      ? "border-bobo/40 bg-bobo/5 text-bobo hover:bg-bobo/10"
                      : "border-stone-200 text-stone-400 hover:bg-stone-50"
                }`}
              >
                {wd.dow} {wd.dm}
                {wd.cafes > 0 && (
                  <span className={`ml-1 rounded-full px-1.5 ${active ? "bg-white/25" : "bg-bobo/15"}`}>{wd.cafes}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {msg && <p className="mb-3 rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">{msg}</p>}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : planned.length === 0 ? (
        <p className="text-stone-500">No confirmed orders for this date.</p>
      ) : (
        <div className="space-y-4">
          {planned.map((p) => {
            const st = p.delivery ? STATUS[p.delivery.status] : null;
            const locked = p.delivery ? p.delivery.status !== "PLANNED" : false;
            return (
              <div key={p.cafeId} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-stone-800">{p.cafeName}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${st ? st.cls : "bg-stone-100 text-stone-500"}`}>
                    {st ? st.label : "Not dispatched"}
                  </span>
                </div>
                <ul className="mb-3 text-sm text-stone-600">
                  {p.items.map((it) => (
                    <li key={it.productId}>
                      {it.qty} × {it.name}{" "}
                      <span className="text-stone-400">({unitLabel(it.unit)})</span>
                      {it.note && <span className="italic text-stone-500"> — {it.note}</span>}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-stone-600">Courier</label>
                  <select
                    disabled={busy || locked}
                    value={p.delivery?.courierId ?? ""}
                    onChange={(e) => assign(p.cafeId, e.target.value)}
                    className="rounded border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-bobo disabled:bg-stone-100 disabled:text-stone-500"
                  >
                    <option value="">— unassigned —</option>
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {locked && p.delivery?.courierName && (
                    <span className="text-sm text-stone-500">{p.delivery.courierName}</span>
                  )}
                  {p.delivery?.photoUrl && (
                    <a href={p.delivery.photoUrl} target="_blank" rel="noreferrer" className="text-sm text-bobo hover:underline">
                      View delivery photo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
