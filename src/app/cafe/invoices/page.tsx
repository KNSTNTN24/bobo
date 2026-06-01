import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CafeTopbar } from "@/components/cafe/CafeShell";
import { formatMoney } from "@/lib/money";
import { dateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function CafeInvoicesPage() {
  const session = await requireRole("CAFE");
  const [cafe, invoices] = await Promise.all([
    session.cafeId ? prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true } }) : null,
    session.cafeId
      ? prisma.invoice.findMany({ where: { cafeId: session.cafeId, status: "SENT" }, orderBy: { periodStart: "desc" }, select: { id: true, periodStart: true, periodEnd: true, totalP: true } })
      : [],
  ]);
  const totalBilled = invoices.reduce((a, i) => a + i.totalP, 0);

  return (
    <>
      <CafeTopbar eyebrow={`${cafe?.name ?? "Café"} · Café`} title="Invoices" />
      <div className="content">
        <div className="cols-2">
          <div className="bigstat">
            <div className="bigstat-lab">Total billed</div>
            <div className="bigstat-val">{formatMoney(totalBilled)}</div>
            <div className="bigstat-sub">{invoices.length} invoice{invoices.length === 1 ? "" : "s"} received</div>
          </div>
          <div className="kpi" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div className="kpi-lab">Invoices</div>
            <div className="kpi-val" style={{ fontSize: 30 }}>{invoices.length}</div>
            <div className="kpi-foot"><span>Weekly billing · no VAT</span></div>
          </div>
        </div>
        <div className="panel-hd" style={{ marginTop: 30 }}><span className="panel-title">Invoice history</span></div>
        <div className="tbl">
          <div className="tbl-row head" style={{ gridTemplateColumns: "1.6fr 1fr 120px" }}>
            <span>Period</span><span>Status</span><span className="cell-r">Amount</span>
          </div>
          {invoices.length === 0 ? (
            <div className="tbl-row body" style={{ gridTemplateColumns: "1fr" }}><span className="cell-sub" style={{ marginTop: 0 }}>No invoices received yet.</span></div>
          ) : (
            invoices.map((i) => (
              <div key={i.id} className="tbl-row body" style={{ gridTemplateColumns: "1.6fr 1fr 120px" }}>
                <div className="cell-main">{dateKey(i.periodStart)} → {dateKey(i.periodEnd)}</div>
                <div><span className="pill pill-green">Sent</span></div>
                <div className="cell-r cell-num">{formatMoney(i.totalP)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
