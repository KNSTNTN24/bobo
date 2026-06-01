import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { InvoiceDetail } from "@/components/BakeryInvoices";
import { dateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function CafeInvoicesPage() {
  const session = await requireRole("CAFE");
  const invoices = session.cafeId
    ? await prisma.invoice.findMany({
        where: { cafeId: session.cafeId, status: "SENT" },
        orderBy: { createdAt: "desc" },
        include: {
          cafe: { select: { name: true } },
          lines: { include: { product: { select: { name: true, unit: true } } } },
        },
      })
    : [];

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.CAFE} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/cafe" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Invoices</h1>
        <p className="mb-6 text-sm text-stone-500">Invoices sent by the bakery.</p>

        {invoices.length === 0 ? (
          <p className="text-stone-500">No invoices yet.</p>
        ) : (
          <div className="space-y-4">
            {invoices.map((inv) => (
              <InvoiceDetail
                key={inv.id}
                detail={{
                  id: inv.id,
                  cafeName: inv.cafe.name,
                  period: inv.period,
                  periodStart: dateKey(inv.periodStart),
                  periodEnd: dateKey(inv.periodEnd),
                  status: inv.status,
                  totalP: inv.totalP,
                  sentAt: inv.sentAt ? inv.sentAt.toISOString() : null,
                  lines: inv.lines.map((l) => ({
                    type: l.type,
                    productName: l.product.name,
                    unit: l.product.unit,
                    qty: l.qty,
                    unitPriceP: l.unitPriceP,
                    amountP: l.amountP,
                    countsToTotal: l.countsToTotal,
                  })),
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
