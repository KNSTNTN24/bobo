import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { type1Open } from "@/lib/orders";
import { RoleDashboard, type Feature } from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

const FEATURES: Feature[] = [
  { title: "Weekly order", desc: "Review the bakery's proposal and adjust quantities until each product cutoff.", milestone: "M2" },
  { title: "Delivery tickets", desc: "See confirmed deliveries with the courier's photo proof.", milestone: "M3" },
  { title: "Report incident", desc: "Flag damaged or missing products on a delivery.", milestone: "M4" },
  { title: "Invoices", desc: "View invoices with confirmed incidents itemised and excluded from the total.", milestone: "M5" },
];

export default async function CafePage() {
  const session = await requireRole("CAFE");

  let pending = 0;
  if (session.cafeId) {
    const [proposed, settings, changeCount] = await Promise.all([
      prisma.orderWeek.findMany({ where: { cafeId: session.cafeId, status: "PROPOSED" }, select: { isoYear: true, isoWeek: true } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
      prisma.orderChangeRequest.count({ where: { cafeId: session.cafeId, status: "PENDING" } }),
    ]);
    const lead = settings?.weeklyConfirmLeadHours ?? 36;
    const now = Date.now();
    pending = proposed.filter((w) => type1Open(w.isoYear, w.isoWeek, lead, now)).length + changeCount;
  }

  const linkCls =
    "inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo";

  return (
    <RoleDashboard
      name={session.name}
      roleLabel={ROLE_LABEL.CAFE}
      intro="Café workspace — fine-tune your order, track deliveries and review invoices."
      features={FEATURES}
      topActions={
        <div className="flex flex-wrap gap-2">
          <Link href="/cafe/orders" className={linkCls}>
            Weekly order
            <span className="rounded bg-bobo/10 px-2 py-0.5 text-xs text-bobo">edit &amp; confirm</span>
          </Link>
          <Link href="/cafe/requests" className={linkCls}>
            Requests
            {pending > 0 && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{pending}</span>}
          </Link>
          <Link href="/cafe/deliveries" className={linkCls}>Delivery tickets</Link>
          <Link href="/cafe/invoices" className={linkCls}>Invoices</Link>
        </div>
      }
    />
  );
}
