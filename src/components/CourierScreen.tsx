"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportIncidentButton } from "@/components/ReportIncidentButton";

type Item = { productId: string; name: string; unit: string; qty: number };
type Incident = {
  id: string;
  productName: string;
  qty: number;
  type: string;
  status: string;
  reporterRole: string;
  photoUrl: string | null;
  note: string | null;
};
type Delivery = {
  id: string;
  cafeName: string;
  status: string;
  pickupConfirmedAt: string | null;
  deliveredAt: string | null;
  photoUrl: string | null;
  items: Item[];
  incidents: Incident[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: "To pick up", cls: "bg-amber-100 text-amber-800" },
  PICKED_UP: { label: "Out for delivery", cls: "bg-blue-100 text-blue-800" },
  DELIVERED: { label: "Delivered", cls: "bg-green-100 text-green-800" },
};

export function CourierScreen({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const r = await fetch(`/api/deliveries?date=${date}`);
    setLoading(false);
    if (!r.ok) {
      setDeliveries([]);
      setMsg("Could not load");
      return;
    }
    setDeliveries((await r.json()).deliveries ?? []);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickup() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/deliveries/pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setBusy(false);
    if (!r.ok) {
      setMsg("Pickup failed");
      return;
    }
    const d = await r.json();
    setMsg(`Picked up ${d.count} parcel(s).`);
    await load();
  }

  async function deliver(id: string, file: File) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("deliveryId", id);
    fd.append("photo", file);
    const r = await fetch("/api/deliveries/deliver", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setMsg(`Delivery failed: ${e.error ?? r.status}`);
      return;
    }
    await load();
  }

  const hasPlanned = deliveries.some((d) => d.status === "PLANNED");

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-stone-600">Route date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-bobo"
        />
        <button
          onClick={pickup}
          disabled={busy || !hasPlanned}
          className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-50"
        >
          Confirm pickup at bakery
        </button>
      </div>

      {msg && <p className="mb-3 rounded bg-stone-100 px-3 py-2 text-sm text-stone-700">{msg}</p>}

      {loading ? (
        <p className="text-stone-500">Loading…</p>
      ) : deliveries.length === 0 ? (
        <p className="text-stone-500">No deliveries assigned for this date.</p>
      ) : (
        <div className="space-y-4">
          {deliveries.map((d) => {
            const st = STATUS[d.status];
            return (
              <div key={d.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-stone-800">{d.cafeName}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${st?.cls ?? ""}`}>{st?.label ?? d.status}</span>
                </div>
                <ul className="mb-3 text-sm text-stone-600">
                  {d.items.map((it, i) => (
                    <li key={i}>{it.qty} × {it.name} <span className="text-stone-400">({it.unit})</span></li>
                  ))}
                </ul>
                {d.status === "PICKED_UP" && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-bobo px-3 py-2 text-sm font-medium text-bobo hover:bg-bobo/5">
                    📷 Take / upload delivery photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void deliver(d.id, f);
                      }}
                    />
                  </label>
                )}
                {d.status === "PLANNED" && (
                  <p className="text-sm text-stone-400">Confirm pickup at the bakery first.</p>
                )}
                {d.status === "DELIVERED" && d.photoUrl && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.photoUrl} alt="Delivery proof" className="max-h-48 rounded border border-stone-200" />
                  </div>
                )}
                {d.incidents.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {d.incidents.map((x) => (
                      <li key={x.id} className="text-stone-500">
                        ⚠ {x.type === "LOSS" ? "Loss" : "Damage"} {x.qty} × {x.productName} —{" "}
                        <span className={x.status === "CONFIRMED" ? "text-green-700" : x.status === "REJECTED" ? "text-stone-400" : "text-amber-700"}>
                          {x.status.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <ReportIncidentButton deliveryId={d.id} items={d.items} onDone={load} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
