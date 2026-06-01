import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CafeTopbar } from "@/components/cafe/CafeShell";
import { WIcon } from "@/components/cafe/WIcon";
import { ReportIncidentButton } from "@/components/ReportIncidentButton";
import { fmtDow, fmtDayMonth } from "@/lib/week";

export const dynamic = "force-dynamic";

const PILL: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: "Planned", cls: "pill-grey" },
  PICKED_UP: { label: "On the way", cls: "pill-amber" },
  DELIVERED: { label: "Delivered", cls: "pill-green" },
};
const INC: Record<string, string> = { REPORTED: "var(--amber-ink)", CONFIRMED: "var(--sage)", REJECTED: "var(--faint)" };

export default async function CafeDeliveriesPage() {
  const session = await requireRole("CAFE");
  const cafe = session.cafeId ? await prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true } }) : null;
  const deliveries = session.cafeId
    ? await prisma.delivery.findMany({
        where: { cafeId: session.cafeId },
        orderBy: { date: "desc" },
        take: 30,
        include: {
          courier: { select: { name: true } },
          items: { include: { product: { select: { id: true, name: true, unit: true } } } },
          incidents: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        },
      })
    : [];

  return (
    <>
      <CafeTopbar eyebrow={`${cafe?.name ?? "Café"} · Café`} title="Deliveries">
        <button className="chip"><span className="ic"><WIcon name="calendar" size={17} /></span>This week</button>
      </CafeTopbar>
      <div className="content">
        <div className="wbanner ok">
          <span className="bic"><WIcon name="box" size={15} sw={1.8} stroke="#14503c" /></span>
          <div><b>Deliveries.</b> Smoked &amp; baked goods arrive each morning before open, with a photo on drop-off.</div>
        </div>
        {deliveries.length === 0 ? (
          <p style={{ color: "var(--muted)", marginTop: 22 }}>No deliveries yet.</p>
        ) : (
          <div className="stack" style={{ marginTop: 22 }}>
            {deliveries.map((d) => {
              const pill = PILL[d.status] ?? { label: d.status, cls: "pill-grey" };
              return (
                <div key={d.id} className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <div className="cell-main">{fmtDow(d.date)} {fmtDayMonth(d.date)}</div>
                      <div className="cell-sub">{d.items.length} lines · {d.courier?.name ? `courier ${d.courier.name}` : "no courier yet"}</div>
                    </div>
                    <span className={"pill " + pill.cls}>{pill.label}</span>
                  </div>
                  <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "5px 18px" }}>
                    {d.items.map((i) => (
                      <li key={i.id} style={{ fontSize: 13, color: "var(--ink-2)" }}>{i.qty} × {i.product.name}</li>
                    ))}
                  </ul>
                  {d.incidents.length > 0 && (
                    <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                      {d.incidents.map((x) => (
                        <li key={x.id} style={{ fontSize: 12, color: INC[x.status] ?? "var(--muted)" }}>
                          ⚠ {x.type === "LOSS" ? "Loss" : "Damage"} {x.qty}× {x.product.name} — {x.status.toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  )}
                  {d.photoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.photoUrl} alt="Delivery proof" style={{ marginTop: 12, maxHeight: 160, borderRadius: 12, border: "1px solid var(--line)", display: "block" }} />
                  )}
                  <div style={{ marginTop: 10 }}>
                    <ReportIncidentButton deliveryId={d.id} items={d.items.map((i) => ({ productId: i.product.id, name: i.product.name, unit: i.product.unit, qty: i.qty }))} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
