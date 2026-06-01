import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { RoleDashboard, type Feature } from "@/components/RoleDashboard";

export const dynamic = "force-dynamic";

const FEATURES: Feature[] = [
  { title: "Weekly order builder", desc: "Propose the weekly product list per café, per delivery day.", milestone: "M2" },
  { title: "Catalog & prices", desc: "Edit products/prices when the admin has delegated access.", milestone: "M1" },
  { title: "Courier assignment", desc: "Assign couriers to the day's deliveries.", milestone: "M3" },
  { title: "Incident review", desc: "Confirm or reject incidents reported by couriers and cafés.", milestone: "M4" },
  { title: "Invoices", desc: "Generate and send weekly/monthly invoices; confirmed incidents excluded as a line.", milestone: "M5" },
];

export default async function BakeryPage() {
  const session = await requireRole("BAKERY");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const [weeklyPending, changePending] = await Promise.all([
    prisma.orderWeek.count({ where: { status: "CHANGES_REQUESTED" } }),
    prisma.orderChangeRequest.count({ where: { status: "PENDING" } }),
  ]);
  const pending = weeklyPending + changePending;
  const canCat = settings?.canBakeryEditProducts ?? false;
  const canPrice = settings?.canBakeryEditPrices ?? false;
  const status =
    canCat && canPrice
      ? "edit products + prices"
      : canCat
        ? "edit products"
        : canPrice
          ? "edit prices"
          : "view only";

  return (
    <RoleDashboard
      name={session.name}
      roleLabel={ROLE_LABEL.BAKERY}
      intro="Bakery workspace — initiate orders, dispatch via courier, resolve incidents and bill cafés."
      features={FEATURES}
      topActions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/bakery/requests"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Requests
            {pending > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">{pending}</span>
            )}
          </Link>
          <Link
            href="/bakery/orders"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Weekly orders
          </Link>
          <Link
            href="/bakery/dispatch"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Dispatch
          </Link>
          <Link
            href="/bakery/incidents"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Incidents
          </Link>
          <Link
            href="/bakery/invoices"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Invoices
          </Link>
          <Link
            href="/bakery/catalog"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
          >
            Product catalog
            <span className="rounded bg-bobo/10 px-2 py-0.5 text-xs text-bobo">{status}</span>
          </Link>
        </div>
      }
    />
  );
}
