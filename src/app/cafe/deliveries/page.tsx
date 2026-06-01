import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { ReportIncidentButton } from "@/components/ReportIncidentButton";
import { fmtDow, fmtDayMonth } from "@/lib/week";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  PLANNED: { label: "Planned", cls: "bg-amber-100 text-amber-800" },
  PICKED_UP: { label: "On the way", cls: "bg-blue-100 text-blue-800" },
  DELIVERED: { label: "Delivered", cls: "bg-green-100 text-green-800" },
};

const INC: Record<string, string> = {
  REPORTED: "text-amber-700",
  CONFIRMED: "text-green-700",
  REJECTED: "text-stone-400",
};

export default async function CafeDeliveriesPage() {
  const session = await requireRole("CAFE");
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
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.CAFE} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/cafe" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Delivery tickets</h1>
        <p className="mb-6 text-sm text-stone-500">Your deliveries, newest first. Report damage or loss on any delivery.</p>

        {deliveries.length === 0 ? (
          <p className="text-stone-500">No deliveries yet.</p>
        ) : (
          <div className="space-y-4">
            {deliveries.map((d) => {
              const st = STATUS[d.status];
              return (
                <div key={d.id} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-stone-800">
                      {fmtDow(d.date)} {fmtDayMonth(d.date)}
                    </h3>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${st?.cls ?? ""}`}>{st?.label ?? d.status}</span>
                  </div>
                  <ul className="mb-2 text-sm text-stone-600">
                    {d.items.map((i) => (
                      <li key={i.id}>
                        {i.qty} × {i.product.name} <span className="text-stone-400">({i.product.unit})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mb-2 text-xs text-stone-400">
                    {d.courier?.name ? `Courier: ${d.courier.name}` : "No courier yet"}
                    {d.deliveredAt ? " · delivered" : ""}
                  </p>
                  {d.photoUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={d.photoUrl} alt="Delivery proof" className="max-h-48 rounded border border-stone-200" />
                  )}
                  {d.incidents.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {d.incidents.map((x) => (
                        <li key={x.id} className="text-stone-500">
                          ⚠ {x.type === "LOSS" ? "Loss" : "Damage"} {x.qty} × {x.product.name} —{" "}
                          <span className={INC[x.status] ?? ""}>{x.status.toLowerCase()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ReportIncidentButton
                    deliveryId={d.id}
                    items={d.items.map((i) => ({ productId: i.product.id, name: i.product.name, unit: i.product.unit, qty: i.qty }))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
