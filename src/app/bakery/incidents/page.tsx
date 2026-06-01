import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { IncidentsReview } from "@/components/IncidentsReview";
import { dateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function BakeryIncidentsPage() {
  const session = await requireRole("BAKERY");
  const rows = await prisma.incident.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      delivery: { include: { cafe: { select: { name: true } } } },
      product: { select: { name: true, unit: true } },
      reportedBy: { select: { name: true } },
    },
  });

  const incidents = rows.map((i) => ({
    id: i.id,
    deliveryDate: dateKey(i.delivery.date),
    cafeName: i.delivery.cafe.name,
    productName: i.product.name,
    unit: i.product.unit,
    qty: i.qty,
    type: i.type,
    reporterRole: i.reporterRole,
    reporterName: i.reportedBy.name,
    note: i.note,
    photoUrl: i.photoUrl,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.BAKERY} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/bakery" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Incidents</h1>
        <p className="mb-6 text-sm text-stone-500">
          Confirm or reject damage / loss reported by couriers and cafés. Confirmed incidents are
          excluded from the invoice (and listed) in M5.
        </p>
        <IncidentsReview initialIncidents={incidents} />
      </main>
    </div>
  );
}
