import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentIsoWeek } from "@/lib/week";
import { CafeOrderScreen } from "@/components/cafe/CafeOrderScreen";

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
    ? await prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true } })
    : null;

  if (!session.cafeId || !cafe) {
    return <div className="content"><p style={{ color: "var(--muted)" }}>Your account is not linked to a café.</p></div>;
  }

  return (
    <CafeOrderScreen
      cafeId={session.cafeId}
      cafeName={cafe.name}
      initialYear={Number.isInteger(year) ? year : cur.isoYear}
      initialWeek={Number.isInteger(week) ? week : cur.isoWeek}
    />
  );
}
