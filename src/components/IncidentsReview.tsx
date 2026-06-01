"use client";

import { useState } from "react";

export type IncidentDTO = {
  id: string;
  deliveryDate: string;
  cafeName: string;
  productName: string;
  unit: string;
  qty: number;
  type: string;
  reporterRole: string;
  reporterName: string;
  note: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  REPORTED: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", cls: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", cls: "bg-stone-200 text-stone-600" },
};

function Card({
  i,
  onResolve,
  busy,
}: {
  i: IncidentDTO;
  onResolve: (id: string, status: "CONFIRMED" | "REJECTED") => void;
  busy: boolean;
}) {
  const st = STATUS[i.status];
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-stone-800">
          {i.cafeName} <span className="font-normal text-stone-400">· {i.deliveryDate}</span>
        </h3>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${st?.cls ?? ""}`}>{st?.label ?? i.status}</span>
      </div>
      <p className="text-sm text-stone-700">
        <span className="font-medium">{i.type === "LOSS" ? "Loss" : "Damage"}</span>: {i.qty} × {i.productName}{" "}
        <span className="text-stone-400">({i.unit})</span>
      </p>
      <p className="text-xs text-stone-500">
        Reported by {i.reporterRole === "CAFE" ? "café" : "courier"} ({i.reporterName})
        {i.note ? ` — “${i.note}”` : ""}
      </p>
      {i.photoUrl && (
        <a href={i.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-bobo hover:underline">
          View photo
        </a>
      )}
      {i.status === "REPORTED" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onResolve(i.id, "CONFIRMED")}
            disabled={busy}
            className="rounded-md border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => onResolve(i.id, "REJECTED")}
            disabled={busy}
            className="rounded-md border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export function IncidentsReview({ initialIncidents }: { initialIncidents: IncidentDTO[] }) {
  const [incidents, setIncidents] = useState<IncidentDTO[]>(initialIncidents);
  const [busy, setBusy] = useState(false);

  async function refetch() {
    const r = await fetch("/api/incidents");
    if (r.ok) setIncidents((await r.json()).incidents);
  }

  async function resolve(id: string, status: "CONFIRMED" | "REJECTED") {
    setBusy(true);
    const r = await fetch(`/api/incidents/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (r.ok) await refetch();
  }

  const pending = incidents.filter((i) => i.status === "REPORTED");
  const resolved = incidents.filter((i) => i.status !== "REPORTED");

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Pending <span className="text-stone-400">· {pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing to review.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((i) => (
              <Card key={i.id} i={i} onResolve={resolve} busy={busy} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">History</h2>
          <div className="space-y-3">
            {resolved.map((i) => (
              <Card key={i.id} i={i} onResolve={resolve} busy={busy} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
