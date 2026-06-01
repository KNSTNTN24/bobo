"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CafeTopbar } from "./CafeShell";
import { WIcon } from "./WIcon";
import { formatMoney } from "@/lib/money";
import { addWeeks, currentIsoWeek } from "@/lib/week";
import { cellCutoffMs } from "@/lib/orders";

type DateCol = { key: string; ms: number; dow: string; dm: string };
type Product = { id: string; name: string; category: string; unit: string; allowsNote: boolean; changeLeadHours: number; priceP: number };
type Line = { date: string; productId: string; qty: number; proposedQty: number; note: string | null };
type ChangeReq = { id: string; date: string; productId: string; fromQty: number; toQty: number; status: string; note: string | null };
type OrdersData = {
  isoYear: number;
  isoWeek: number;
  phase: "FUTURE" | "CURRENT" | "PAST";
  type1Open: boolean;
  status: string;
  serverNow: number;
  dates: DateCol[];
  products: Product[];
  lines: Line[];
  changeRequests: ChangeReq[];
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Kitchen bread", label: "Bread" },
  { key: "Smoked / meat / prep", label: "Smoked" },
  { key: "Pastry / retail bakery", label: "Pastry" },
];
const CAT_ORDER = ["Kitchen bread", "Smoked / meat / prep", "Pastry / retail bakery"];
const k = (p: string, d: string) => `${p}|${d}`;
const initials = (s: string) => s.replace(/[^A-Za-z0-9]/g, " ").trim().split(/\s+/).slice(0, 1).map((w) => w[0]).join("").toUpperCase() || "•";
const thumbBg = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 30% 90%)`;
};

export function CafeOrderScreen({ cafeId, cafeName, initialYear, initialWeek }: { cafeId: string; cafeName: string; initialYear: number; initialWeek: number }) {
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [data, setData] = useState<OrdersData | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [order, setOrder] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMsg(null);
    const r = await fetch(`/api/orders?cafeId=${cafeId}&year=${year}&week=${week}`);
    if (!r.ok) { setData(null); return; }
    const d = (await r.json()) as OrdersData;
    setData(d);
    const o: Record<string, number> = {};
    const n: Record<string, string> = {};
    for (const l of d.lines) { o[k(l.productId, l.date)] = l.qty; if (l.note) n[k(l.productId, l.date)] = l.note; }
    setOrder(o);
    setNotes(n);
    setDay((cur) => (cur && d.dates.some((x) => x.key === cur) ? cur : d.dates[0]?.key ?? null));
  }, [cafeId, year, week]);

  useEffect(() => { void load(); }, [load]);

  const proposedMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of data?.lines ?? []) m.set(k(l.productId, l.date), l.proposedQty);
    return m;
  }, [data]);
  const crMap = useMemo(() => {
    const m = new Map<string, ChangeReq>();
    for (const c of data?.changeRequests ?? []) if (c.status === "PENDING") m.set(k(c.productId, c.date), c);
    return m;
  }, [data]);

  if (!data || !day) {
    return (
      <>
        <CafeTopbar eyebrow={`${cafeName} · Café`} title="Weekly order" />
        <div className="content"><p style={{ color: "var(--muted)" }}>Loading…</p></div>
      </>
    );
  }

  const editable = data.phase === "FUTURE" && data.type1Open && data.status === "PROPOSED";
  const confirmed = data.status === "CONFIRMED";
  const changesReq = data.status === "CHANGES_REQUESTED";
  const dayMeta = data.dates.find((d) => d.key === day)!;

  const productById = new Map(data.products.map((p) => [p.id, p]));
  const cutoffOpen = (prod: Product, ms: number) => data.serverNow < cellCutoffMs(ms, prod.changeLeadHours);

  const hasChanges = (() => {
    const keys = new Set<string>([...Object.keys(order), ...proposedMap.keys()]);
    for (const key of keys) if ((order[key] ?? 0) !== (proposedMap.get(key) ?? 0)) return true;
    return false;
  })();

  function dayStats(dk: string) {
    let lines = 0, total = 0, units = 0;
    for (const p of data!.products) {
      const q = order[k(p.id, dk)] ?? 0;
      if (q > 0) { lines++; units += q; total += q * p.priceP; }
    }
    return { lines, total, units };
  }

  async function commitCell(prod: Product, dk: string, qty: number, note: string | null) {
    const r = await fetch("/api/orders/cell", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeId, isoYear: year, isoWeek: week, date: dk, productId: prod.id, qty, note }),
    });
    if (!r.ok) { setMsg("Could not save — refreshing."); await load(); }
  }

  async function requestChange(prod: Product, dk: string, toQty: number) {
    setBusy(true);
    const r = await fetch("/api/orders/change-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeId, date: dk, productId: prod.id, toQty }),
    });
    setBusy(false);
    if (!r.ok) { const e = await r.json().catch(() => ({})); setMsg(`Change request failed (${e.error ?? r.status})`); }
    await load();
  }

  function step(prod: Product, dk: string, ms: number, delta: number) {
    const key = k(prod.id, dk);
    if (editable) {
      const nv = Math.max(0, (order[key] ?? 0) + delta);
      setOrder((o) => ({ ...o, [key]: nv }));
      void commitCell(prod, dk, nv, notes[key] || null);
    } else if (confirmed && cutoffOpen(prod, ms)) {
      const base = crMap.get(key)?.toQty ?? (order[key] ?? 0);
      void requestChange(prod, dk, Math.max(0, base + delta));
    }
  }

  async function doStatus(action: "SUBMIT" | "CONFIRM") {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/orders/status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeId, isoYear: year, isoWeek: week, action }),
    });
    setBusy(false);
    if (!r.ok) { const e = await r.json().catch(() => ({})); setMsg(`Action failed (${e.error ?? r.status})`); return; }
    await load();
  }

  function go(delta: number) { const n = addWeeks(year, week, delta); setYear(n.isoYear); setWeek(n.isoWeek); }

  const cats = filter === "all" ? CAT_ORDER : [filter];
  const stats = dayStats(day);

  return (
    <>
      <CafeTopbar eyebrow={`${cafeName} · Café`} title="Weekly order">
        <div className="weekbar">
          <button className="wk-nav" onClick={() => go(-1)}><WIcon name="chevL" size={19} sw={2.2} /></button>
          <div className="wk-meta"><b>Week {week}</b><span>{data.dates[0].dm} – {data.dates[6].dm}</span></div>
          <button className="wk-nav" onClick={() => go(1)}><WIcon name="chevR" size={19} sw={2.2} /></button>
          <button className="wk-nav" title="This week" onClick={() => { const c = currentIsoWeek(); setYear(c.isoYear); setWeek(c.isoWeek); }}><WIcon name="calendar" size={18} /></button>
        </div>
      </CafeTopbar>

      <div className="content wide">
        {msg && <div className="wbanner draft" style={{ marginBottom: 16 }}><div>{msg}</div></div>}
        <div className="order-grid">
          <div className="order-main">
            <div className="daystrip">
              {data.dates.map((d) => {
                const s = dayStats(d.key);
                return (
                  <button key={d.key} className={"daycell" + (day === d.key ? " on" : "")} onClick={() => setDay(d.key)}>
                    {s.lines > 0 && <span className="day-dot2" />}
                    <span className="s">{d.dow.toUpperCase()}</span>
                    <span className="n">{d.dm.split(" ")[0]}</span>
                    <span className="meta">{s.lines > 0 ? `${s.lines} lines` : "—"}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginTop: 22, flexWrap: "wrap" }}>
              {confirmed ? (
                <div className="wbanner ok" style={{ flex: 1, minWidth: 280 }}>
                  <span className="bic"><WIcon name="check" size={16} sw={2.3} stroke="#14503c" /></span>
                  <div><b>Week confirmed.</b> The bakery has your order. Adjust a day before its cutoff to request a change.</div>
                </div>
              ) : changesReq ? (
                <div className="wbanner draft" style={{ flex: 1, minWidth: 280 }}>
                  <span className="bic"><WIcon name="hourglass" size={15} sw={2} stroke="#6e5b2e" /></span>
                  <div><b>Submitted.</b> Awaiting the bakery to accept your changes.</div>
                </div>
              ) : editable ? (
                <div className="wbanner draft" style={{ flex: 1, minWidth: 280 }}>
                  <span className="bic"><WIcon name="hourglass" size={15} sw={2} stroke="#6e5b2e" /></span>
                  <div><b>Draft from the bakery.</b> Confirm or adjust before the weekly deadline.</div>
                </div>
              ) : data.phase === "CURRENT" ? (
                <div className="wbanner ok" style={{ flex: 1, minWidth: 280 }}>
                  <span className="bic"><WIcon name="clock" size={15} sw={2} stroke="#14503c" /></span>
                  <div><b>Current week.</b> The confirmation window has closed — the bakery&rsquo;s order stands.</div>
                </div>
              ) : (
                <div className="wbanner ok" style={{ flex: 1, minWidth: 280 }}>
                  <span className="bic"><WIcon name="box" size={15} sw={1.8} stroke="#14503c" /></span>
                  <div><b>Past week.</b> This order is closed.</div>
                </div>
              )}
              <div className="seg">
                {FILTERS.map((f) => (
                  <button key={f.key} className={"seg-i" + (filter === f.key ? " on" : "")} onClick={() => setFilter(f.key)}>{f.label}</button>
                ))}
              </div>
            </div>

            {cats.map((catId) => {
              const items = data.products.filter((p) => p.category === catId);
              if (!items.length) return null;
              return (
                <section key={catId} className="cat-block">
                  <div className="cat-head">
                    <span className="cat-name">{catId}</span>
                    <span className="cat-from">from {catId.startsWith("Smoked") ? "the kitchen" : "the bakery"}</span>
                  </div>
                  <div className="prod-grid">
                    {items.map((item) => {
                      const key = k(item.id, day);
                      const v = order[key] ?? 0;
                      const cr = crMap.get(key);
                      const open = cutoffOpen(item, dayMeta.ms);
                      const interactive = editable || (confirmed && open);
                      const shownVal = confirmed && cr ? cr.toQty : v;
                      return (
                        <div key={item.id} className={"prow" + (v > 0 ? " has" : "")} style={{ flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
                            <div className="thumb" style={{ width: 46, height: 46, background: thumbBg(item.name), color: "var(--green)", fontSize: 16 }}>{initials(item.name)}</div>
                            <div className="prow-tx">
                              <div className="prow-name">{item.name}</div>
                              <div className="prow-sub">{formatMoney(item.priceP)} · {item.unit === "kg" ? "per kg" : "each"}{confirmed && cr ? ` · change → ${cr.toQty} pending` : ""}</div>
                            </div>
                            <div className={"stepper" + (shownVal > 0 ? " on" : "")}>
                              <button className="stp-btn" disabled={!interactive || busy || shownVal <= 0} onClick={() => step(item, day, dayMeta.ms, -1)}><WIcon name="minus" size={18} sw={2.2} /></button>
                              <span className="stp-val">{shownVal || 0}</span>
                              <button className="stp-btn" disabled={!interactive || busy} onClick={() => step(item, day, dayMeta.ms, 1)}><WIcon name="plus" size={18} sw={2.2} /></button>
                            </div>
                          </div>
                          {item.allowsNote && editable && v > 0 && (
                            <input
                              className="prow-note"
                              placeholder="Add a note (e.g. cornichons, pink onions)…"
                              value={notes[key] ?? ""}
                              onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
                              onBlur={() => commitCell(item, day, v, notes[key] || null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="order-aside">
            <div className="cart">
              <div className="cart-hd">
                <div className="cart-day">{dayMeta.dow} order</div>
                <div className="cart-sub">{dayMeta.dow} {dayMeta.dm} · arrives before open</div>
              </div>
              {stats.lines === 0 ? (
                <div className="cart-empty">No items yet for {dayMeta.dow}.<br />Add from the catalog on the left.</div>
              ) : (
                <div className="cart-lines">
                  {data.products.filter((p) => (order[k(p.id, day)] ?? 0) > 0).map((p) => {
                    const q = order[k(p.id, day)] ?? 0;
                    return (
                      <div key={p.id} className="cline">
                        <div className="cline-tx">
                          <div className="cline-name">{p.name}</div>
                          <div className="cline-q">{q}{p.unit === "kg" ? " kg" : ""} · {formatMoney(p.priceP)}</div>
                        </div>
                        <div className="cline-amt">{formatMoney(q * p.priceP)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="cart-tot">
                <div className="cart-tot-row"><span className="cart-tot-lab">{stats.lines} lines · {stats.units} items</span><span className="cart-tot-val">{formatMoney(stats.total)}</span></div>
                <div className="cart-tot-row grand"><span className="cart-tot-lab">Day total</span><span className="cart-tot-val">{formatMoney(stats.total)}</span></div>
              </div>
              <div className="cart-cta">
                {editable ? (
                  hasChanges ? (
                    <button className="btn" disabled={busy} onClick={() => doStatus("SUBMIT")}>Submit changes</button>
                  ) : (
                    <button className="btn done" disabled={busy} onClick={() => doStatus("CONFIRM")}><WIcon name="check" size={19} sw={2.3} stroke="#fff" /> Confirm week</button>
                  )
                ) : confirmed ? (
                  <button className="btn done" disabled><WIcon name="check" size={19} sw={2.3} stroke="#fff" /> Week confirmed</button>
                ) : changesReq ? (
                  <button className="btn ghost" disabled>Awaiting bakery</button>
                ) : data.phase === "CURRENT" ? (
                  <button className="btn ghost" disabled>Confirmation closed</button>
                ) : (
                  <button className="btn ghost" disabled>Week closed</button>
                )}
                <div className="cart-deadline">{confirmed ? "Per-day changes close at each product cutoff" : data.phase === "FUTURE" ? "Confirm before the weekly deadline" : data.phase === "CURRENT" ? "The confirmation window has closed" : "This week is closed"}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
