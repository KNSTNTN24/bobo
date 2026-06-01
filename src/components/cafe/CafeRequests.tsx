"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Weekly = { isoYear: number; isoWeek: number; lines: number };
type Change = { id: string; date: string; productName: string; unit: string; fromQty: number; toQty: number; status?: string; note: string | null };

export function CafeRequests() {
  const [weekly, setWeekly] = useState<Weekly[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

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
  useEffect(() => { void load(); }, [load]);

  if (loading) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="stack">
      <div>
        <div className="panel-hd"><span className="panel-title">Weekly drafts awaiting you</span></div>
        {weekly.length === 0 ? (
          <div className="wbanner ok"><div>Nothing to confirm right now.</div></div>
        ) : (
          <div className="gap12">
            {weekly.map((w) => (
              <div key={`${w.isoYear}-${w.isoWeek}`} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <div>
                  <div className="cell-main">Week {w.isoWeek}</div>
                  <div className="cell-sub">{w.lines} lines · awaiting your confirmation</div>
                </div>
                <Link href={`/cafe/orders?year=${w.isoYear}&week=${w.isoWeek}`} className="btn">Open</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="panel-hd"><span className="panel-title">Your change requests</span></div>
        {changes.length === 0 ? (
          <div className="wbanner draft"><div>No change requests.</div></div>
        ) : (
          <div className="tbl">
            <div className="tbl-row head" style={{ gridTemplateColumns: "1fr 1.6fr 1fr" }}>
              <span>Date</span><span>Item</span><span>Status</span>
            </div>
            {changes.map((c) => (
              <div key={c.id} className="tbl-row body" style={{ gridTemplateColumns: "1fr 1.6fr 1fr" }}>
                <div className="cell-sub" style={{ marginTop: 0 }}>{c.date}</div>
                <div className="cell-main">{c.productName} <span className="cell-sub">· {c.fromQty} → {c.toQty}</span></div>
                <div><span className={"pill " + (c.status === "ACCEPTED" ? "pill-green" : c.status === "REJECTED" ? "pill-grey" : "pill-amber")}>{(c.status ?? "pending").toLowerCase()}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
