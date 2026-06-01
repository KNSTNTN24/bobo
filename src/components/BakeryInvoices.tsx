"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { addWeeks, currentIsoWeek, isoWeekDates, weekRangeLabel } from "@/lib/week";

type ListItem = {
  id: string;
  cafeName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalP: number;
  sentAt: string | null;
};
type Line = {
  type: string;
  productName: string;
  unit: string;
  qty: number;
  unitPriceP: number;
  amountP: number;
  countsToTotal: boolean;
};
type Detail = ListItem & { lines: Line[] };
type Summary = {
  generated: { cafeName: string; totalP: number }[];
  skippedEmpty: string[];
  skippedExisting: string[];
};

export function BakeryInvoices({
  initialYear,
  initialWeek,
  initialInvoices,
}: {
  initialYear: number;
  initialWeek: number;
  initialInvoices: ListItem[];
}) {
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [invoices, setInvoices] = useState<ListItem[]>(initialInvoices);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const weekEnded = isoWeekDates(year, week)[6].getTime() + 24 * 3600 * 1000 <= Date.now();

  async function refreshList() {
    const r = await fetch("/api/invoices");
    if (r.ok) setInvoices((await r.json()).invoices);
  }

  function go(delta: number) {
    const n = addWeeks(year, week, delta);
    setYear(n.isoYear);
    setWeek(n.isoWeek);
    setSummary(null);
    setMsg(null);
  }

  async function generateBatch() {
    setBusy(true);
    setMsg(null);
    setSummary(null);
    const r = await fetch("/api/invoices/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, week }),
    });
    setBusy(false);
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      if (e.error === "week_not_ended") setMsg("This week has not ended yet — invoices are billed after the week closes.");
      else if (e.error === "pending_incidents") setMsg(`Resolve ${e.count} unconfirmed incident(s) for this week before billing.`);
      else setMsg(`Failed: ${e.error ?? r.status}`);
      return;
    }
    setSummary(await r.json());
    await refreshList();
  }

  async function sendAllThisWeek() {
    setBusy(true);
    const r = await fetch("/api/invoices/send-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, week }),
    });
    setBusy(false);
    if (r.ok) {
      const d = await r.json();
      setMsg(`Sent ${d.count} invoice(s).`);
      await refreshList();
    }
  }

  async function view(id: string) {
    const r = await fetch(`/api/invoices/${id}`);
    if (r.ok) setDetail((await r.json()).invoice);
  }
  async function send(id: string) {
    setBusy(true);
    const r = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
    setBusy(false);
    if (r.ok) {
      await refreshList();
      await view(id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Weekly billing</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => go(-1)} className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100">←</button>
            <span className="min-w-[15rem] text-center text-sm font-medium text-stone-700">{weekRangeLabel(year, week)}</span>
            <button onClick={() => go(1)} className="rounded border border-stone-300 px-2 py-1 text-sm hover:bg-stone-100">→</button>
          </div>
          <button
            onClick={generateBatch}
            disabled={busy || !weekEnded}
            title={weekEnded ? "" : "The week has not ended yet"}
            className="rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-50"
          >
            Generate invoices for all cafés
          </button>
          <button onClick={sendAllThisWeek} disabled={busy} className="rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">
            Send all drafts (this week)
          </button>
        </div>
        {!weekEnded && <p className="mt-2 text-xs text-amber-600">This week has not ended — billing opens once the week closes.</p>}
        {msg && <p className="mt-3 text-sm text-stone-700">{msg}</p>}
      </div>

      {summary && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
          <h3 className="mb-2 font-semibold">Batch result</h3>
          {summary.generated.length > 0 ? (
            <ul className="mb-2">
              {summary.generated.map((g) => (
                <li key={g.cafeName} className="flex justify-between">
                  <span className="text-green-700">✓ {g.cafeName}</span>
                  <span className="font-medium">{formatMoney(g.totalP)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500">No invoices generated.</p>
          )}
          {summary.skippedEmpty.length > 0 && (
            <p className="text-xs text-stone-400">Skipped (nothing delivered): {summary.skippedEmpty.join(", ")}</p>
          )}
          {summary.skippedExisting.length > 0 && (
            <p className="text-xs text-stone-400">Skipped (already invoiced): {summary.skippedExisting.join(", ")}</p>
          )}
        </div>
      )}

      {detail && <InvoiceDetail detail={detail} onSend={() => send(detail.id)} busy={busy} />}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">All invoices</h3>
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2">Café</th>
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-stone-800">{i.cafeName}</td>
                  <td className="px-3 py-2 text-stone-600">{i.periodStart} → {i.periodEnd}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${i.status === "SENT" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {i.status === "SENT" ? "Sent" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(i.totalP)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => view(i.id)} className="rounded border border-stone-300 px-3 py-1 text-xs hover:bg-stone-100">View</button>
                      {i.status !== "SENT" && (
                        <button onClick={() => send(i.id)} disabled={busy} className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">Send</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-3 text-center text-stone-400">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDetail({ detail, onSend, busy }: { detail: Detail; onSend?: () => void; busy?: boolean }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-stone-800">{detail.cafeName}</h3>
          <p className="text-xs text-stone-500">{detail.periodStart} → {detail.periodEnd}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${detail.status === "SENT" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
          {detail.status === "SENT" ? "Sent" : "Draft"}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-stone-400">
          <tr>
            <th className="py-1">Item</th>
            <th className="py-1 text-right">Qty</th>
            <th className="py-1 text-right">Unit</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((l, idx) => (
            <tr key={idx} className={`border-t border-stone-100 ${l.countsToTotal ? "" : "text-stone-400"}`}>
              <td className="py-1">
                {l.productName}
                {!l.countsToTotal && <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase">incident — excluded</span>}
              </td>
              <td className="py-1 text-right">{l.qty}</td>
              <td className="py-1 text-right">{formatMoney(l.unitPriceP)}</td>
              <td className="py-1 text-right">{l.countsToTotal ? formatMoney(l.amountP) : `(${formatMoney(l.amountP)})`}</td>
            </tr>
          ))}
          {detail.lines.length === 0 && (
            <tr><td colSpan={4} className="py-3 text-center text-stone-400">No delivered items in this period — invoices bill deliveries the courier has marked <span className="font-medium">Delivered</span> (with a photo).</td></tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-stone-300 font-semibold">
            <td className="py-2" colSpan={3}>Total</td>
            <td className="py-2 text-right">{formatMoney(detail.totalP)}</td>
          </tr>
        </tfoot>
      </table>
      {onSend && detail.status !== "SENT" && (
        <button onClick={onSend} disabled={busy} className="mt-3 rounded-md bg-bobo px-4 py-2 text-sm font-medium text-white hover:bg-bobo-dark disabled:opacity-50">
          Send to café
        </button>
      )}
    </div>
  );
}
