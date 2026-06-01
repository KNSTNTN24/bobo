import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekDates } from "@/lib/week";

export const runtime = "nodejs";

// GET /api/orders/overview?year=&week=  — per-café week status for the bakery tabs.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const isoYear = parseInt(url.searchParams.get("year") ?? "", 10);
  const isoWeek = parseInt(url.searchParams.get("week") ?? "", 10);
  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const weekDates = isoWeekDates(isoYear, isoWeek);

  const cafes =
    session.role === "ADMIN" || session.role === "BAKERY"
      ? await prisma.cafe.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : session.cafeId
        ? await prisma.cafe.findMany({ where: { id: session.cafeId }, select: { id: true, name: true } })
        : [];

  const cafeIds = cafes.map((c) => c.id);
  const [weeks, pendingGroups] = await Promise.all([
    prisma.orderWeek.findMany({ where: { isoYear, isoWeek, cafeId: { in: cafeIds } }, select: { cafeId: true, status: true } }),
    prisma.orderChangeRequest.groupBy({ by: ["cafeId"], where: { status: "PENDING", cafeId: { in: cafeIds }, date: { in: weekDates } }, _count: { _all: true } }),
  ]);

  const statusByCafe = new Map(weeks.map((w) => [w.cafeId, w.status]));
  const pendingByCafe = new Map(pendingGroups.map((g) => [g.cafeId, g._count._all]));

  return NextResponse.json({
    cafes: cafes.map((c) => ({
      cafeId: c.id,
      cafeName: c.name,
      status: statusByCafe.get(c.id) ?? "NONE",
      pendingChanges: pendingByCafe.get(c.id) ?? 0,
    })),
  });
}
