import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { BakeryInvoices } from "@/components/BakeryInvoices";
import { currentIsoWeek, addWeeks, dateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function BakeryInvoicesPage() {
  const session = await requireRole("BAKERY");
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { cafe: { select: { name: true } } } });
  const cur = currentIsoWeek();
  const last = addWeeks(cur.isoYear, cur.isoWeek, -1); // last completed week

  const invoices = rows.map((i) => ({
    id: i.id,
    cafeName: i.cafe.name,
    period: i.period,
    periodStart: dateKey(i.periodStart),
    periodEnd: dateKey(i.periodEnd),
    status: i.status,
    totalP: i.totalP,
    sentAt: i.sentAt ? i.sentAt.toISOString() : null,
  }));

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.BAKERY} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/bakery" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Invoices</h1>
        <p className="mb-6 text-sm text-stone-500">
          Weekly billing across all cafés. Available once a week has ended and its incidents are resolved.
          Delivered items are priced from the order; confirmed incidents are listed but excluded; empty cafés are skipped.
        </p>
        <BakeryInvoices initialYear={last.isoYear} initialWeek={last.isoWeek} initialInvoices={invoices} />
      </main>
    </div>
  );
}
