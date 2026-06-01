"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { productId: string; name: string; unit: string; qty: number };

const FIELD =
  "mt-1 block w-full rounded border border-stone-300 px-2 py-1 text-sm outline-none focus:border-bobo";

export function ReportIncidentButton({
  deliveryId,
  items,
  onDone,
}: {
  deliveryId: string;
  items: Item[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(items[0]?.productId ?? "");
  const [qty, setQty] = useState("1");
  const [type, setType] = useState("DAMAGE");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function submit() {
    setErr(null);
    if (!productId) {
      setErr("Select a product");
      return;
    }
    const q = parseInt(qty, 10);
    if (!Number.isInteger(q) || q <= 0) {
      setErr("Quantity must be at least 1");
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append("deliveryId", deliveryId);
    fd.append("productId", productId);
    fd.append("qty", String(q));
    fd.append("type", type);
    if (note.trim()) fd.append("note", note.trim());
    if (file) fd.append("photo", file);
    const r = await fetch("/api/incidents", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      setErr(`Failed: ${e.error ?? r.status}`);
      return;
    }
    setOpen(false);
    setNote("");
    setFile(null);
    setQty("1");
    if (onDone) onDone();
    else router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setErr(null); }} className="mt-2 text-sm text-amber-700 hover:underline">
        ⚠ Report incident
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-stone-500">
          Product
          <select className={FIELD} value={productId} onChange={(e) => setProductId(e.target.value)}>
            {items.map((it) => (
              <option key={it.productId} value={it.productId}>{it.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-stone-500">
          Type
          <select className={FIELD} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="DAMAGE">Damage</option>
            <option value="LOSS">Loss</option>
          </select>
        </label>
        <label className="text-xs text-stone-500">
          Quantity
          <input type="number" min="1" className={FIELD} value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="text-xs text-stone-500">
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="mt-1 block w-full text-xs"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="text-xs text-stone-500 sm:col-span-2">
          Note
          <input className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
        </label>
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded bg-bobo px-3 py-1 text-xs font-medium text-white hover:bg-bobo-dark disabled:opacity-50">
          Submit report
        </button>
        <button onClick={() => setOpen(false)} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </div>
  );
}
