import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/week";
import { type1Open } from "@/lib/orders";

export const runtime = "nodejs";

// GET /api/orders/pending — items awaiting the viewer's action.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (session.role === "ADMIN" || session.role === "BAKERY") {
    const [weeks, changes] = await Promise.all([
      prisma.orderWeek.findMany({
        where: { status: "CHANGES_REQUESTED" },
        include: { cafe: { select: { name: true } }, _count: { select: { lines: true } } },
        orderBy: [{ isoYear: "asc" }, { isoWeek: "asc" }],
      }),
      prisma.orderChangeRequest.findMany({
        where: { status: "PENDING" },
        include: { cafe: { select: { name: true } }, product: { select: { name: true, unit: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json({
      role: session.role,
      weekly: weeks.map((w) => ({ cafeId: w.cafeId, cafeName: w.cafe.name, isoYear: w.isoYear, isoWeek: w.isoWeek, lines: w._count.lines })),
      changes: changes.map((c) => ({
        id: c.id,
        cafeId: c.cafeId,
        cafeName: c.cafe.name,
        date: dateKey(c.date),
        productName: c.product.name,
        unit: c.product.unit,
        fromQty: c.fromQty,
        toQty: c.toQty,
        note: c.note,
      })),
    });
  }

  // CAFE: weeks awaiting their confirmation + their own change requests.
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const lead = settings?.weeklyConfirmLeadHours ?? 36;
  const now = Date.now();

  const [proposed, changes] = await Promise.all([
    prisma.orderWeek.findMany({
      where: { cafeId: session.cafeId ?? "__none__", status: "PROPOSED" },
      include: { cafe: { select: { name: true } }, _count: { select: { lines: true } } },
    }),
    prisma.orderChangeRequest.findMany({
      where: { cafeId: session.cafeId ?? "__none__" },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    role: session.role,
    weekly: proposed
      .filter((w) => type1Open(w.isoYear, w.isoWeek, lead, now))
      .map((w) => ({ cafeId: w.cafeId, cafeName: w.cafe.name, isoYear: w.isoYear, isoWeek: w.isoWeek, lines: w._count.lines })),
    changes: changes.map((c) => ({
      id: c.id,
      date: dateKey(c.date),
      productName: c.product.name,
      unit: c.product.unit,
      fromQty: c.fromQty,
      toQty: c.toQty,
      status: c.status,
      note: c.note,
    })),
  });
}
