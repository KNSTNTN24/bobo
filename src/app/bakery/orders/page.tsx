import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { OrdersScreen } from "@/components/OrdersScreen";
import { currentIsoWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function BakeryOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ cafe?: string; year?: string; week?: string }>;
}) {
  const session = await requireRole("BAKERY");
  const sp = await searchParams;
  const cafes = await prisma.cafe.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const cur = currentIsoWeek();
  const year = Number.parseInt(sp.year ?? "", 10);
  const week = Number.parseInt(sp.week ?? "", 10);
  const initialCafe = sp.cafe && cafes.some((c) => c.id === sp.cafe) ? sp.cafe : cafes[0]?.id ?? "";

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.BAKERY} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/bakery" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Weekly orders</h1>
        <p className="mb-6 text-sm text-stone-500">
          Propose the week per café; the café confirms or requests changes before the deadline.
        </p>
        {cafes.length === 0 ? (
          <p className="text-stone-500">No active cafés. Add one in Admin → Cafés.</p>
        ) : (
          <OrdersScreen
            mode="BAKERY"
            cafes={cafes}
            initialCafeId={initialCafe}
            initialYear={Number.isInteger(year) ? year : cur.isoYear}
            initialWeek={Number.isInteger(week) ? week : cur.isoWeek}
          />
        )}
      </main>
    </div>
  );
}
