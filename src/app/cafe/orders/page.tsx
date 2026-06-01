import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { OrdersScreen } from "@/components/OrdersScreen";
import { currentIsoWeek } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function CafeOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; week?: string }>;
}) {
  const session = await requireRole("CAFE");
  const sp = await searchParams;
  const cur = currentIsoWeek();
  const year = Number.parseInt(sp.year ?? "", 10);
  const week = Number.parseInt(sp.week ?? "", 10);
  const cafe = session.cafeId
    ? await prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { id: true, name: true } })
    : null;

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.CAFE} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/cafe" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Weekly order</h1>
        <p className="mb-6 text-sm text-stone-500">
          Confirm the bakery proposal or submit changes before the deadline; on confirmed weeks, request per-day changes before each product cutoff.
        </p>
        {cafe ? (
          <OrdersScreen
            mode="CAFE"
            cafes={[cafe]}
            initialCafeId={cafe.id}
            initialYear={Number.isInteger(year) ? year : cur.isoYear}
            initialWeek={Number.isInteger(week) ? week : cur.isoWeek}
          />
        ) : (
          <p className="text-stone-500">Your account is not linked to a café. Ask the admin to set it.</p>
        )}
      </main>
    </div>
  );
}
