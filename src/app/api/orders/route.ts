import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCafe } from "@/lib/permissions";
import { isoWeekDates, dateKey, fmtDow, fmtDayMonth } from "@/lib/week";
import { weekPhase, type1Open, weekDeadlineMs } from "@/lib/orders";

export const runtime = "nodejs";

// GET /api/orders?cafeId=&year=&week=
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const cafeId = url.searchParams.get("cafeId") ?? "";
  const isoYear = parseInt(url.searchParams.get("year") ?? "", 10);
  const isoWeek = parseInt(url.searchParams.get("week") ?? "", 10);
  if (!cafeId || !Number.isInteger(isoYear) || !Number.isInteger(isoWeek) || isoWeek < 1 || isoWeek > 53) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!canAccessCafe(session.role, session.cafeId, cafeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true, name: true } });
  if (!cafe) return NextResponse.json({ error: "cafe_not_found" }, { status: 404 });

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const lead = settings?.weeklyConfirmLeadHours ?? 36;
  const now = Date.now();

  let ow = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    include: { lines: true },
  });

  // Lazy auto-confirm: past the deadline and still unconfirmed → confirm the bakery's proposal.
  if (ow && ow.status !== "CONFIRMED" && now >= weekDeadlineMs(isoYear, isoWeek, lead)) {
    await prisma.$transaction([
      ...ow.lines.map((l) => prisma.orderLine.update({ where: { id: l.id }, data: { qty: l.proposedQty } })),
      prisma.orderWeek.update({ where: { id: ow.id }, data: { status: "CONFIRMED", confirmedAt: new Date() } }),
    ]);
    ow = await prisma.orderWeek.findUnique({ where: { id: ow.id }, include: { lines: true } });
  }

  const dateObjs = isoWeekDates(isoYear, isoWeek);
  const [products, changeRequests] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, unit: true, allowsNote: true, changeLeadHours: true, priceP: true },
    }),
    prisma.orderChangeRequest.findMany({ where: { cafeId, date: { in: dateObjs } }, orderBy: { createdAt: "desc" } }),
  ]);

  const dates = dateObjs.map((d) => ({ key: dateKey(d), ms: d.getTime(), dow: fmtDow(d), dm: fmtDayMonth(d) }));
  const lines = (ow?.lines ?? []).map((l) => ({
    date: dateKey(l.date),
    productId: l.productId,
    qty: l.qty,
    proposedQty: l.proposedQty,
    note: l.note,
  }));

  return NextResponse.json({
    role: session.role,
    cafe,
    isoYear,
    isoWeek,
    phase: weekPhase(isoYear, isoWeek, now),
    type1Open: type1Open(isoYear, isoWeek, lead, now),
    deadlineMs: weekDeadlineMs(isoYear, isoWeek, lead),
    status: ow?.status ?? "PROPOSED",
    confirmedAt: ow?.confirmedAt ?? null,
    serverNow: now,
    dates,
    products,
    lines,
    changeRequests: changeRequests.map((c) => ({
      id: c.id,
      date: dateKey(c.date),
      productId: c.productId,
      fromQty: c.fromQty,
      toQty: c.toQty,
      status: c.status,
      note: c.note,
    })),
  });
}
