import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekParts, parseDateKey, isoWeekDates, dateKey, fmtDow, fmtDayMonth } from "@/lib/week";

export const runtime = "nodejs";

// GET /api/deliveries?date=YYYY-MM-DD
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const dateValue = parseDateKey(date);

  if (session.role === "ADMIN" || session.role === "BAKERY") {
    const { isoYear, isoWeek } = isoWeekParts(dateValue);
    const [weeks, deliveries, couriers, weekLines] = await Promise.all([
      prisma.orderWeek.findMany({
        where: { isoYear, isoWeek, status: "CONFIRMED" },
        include: {
          cafe: { select: { id: true, name: true } },
          lines: { where: { date: dateValue }, include: { product: { select: { id: true, name: true, unit: true } } } },
        },
      }),
      prisma.delivery.findMany({
        where: { date: dateValue },
        include: { courier: { select: { id: true, name: true } } },
      }),
      prisma.user.findMany({ where: { role: "COURIER", active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      prisma.orderLine.findMany({
        where: { qty: { gt: 0 }, orderWeek: { isoYear, isoWeek, status: "CONFIRMED" } },
        select: { date: true, orderWeek: { select: { cafeId: true } } },
      }),
    ]);

    const byCafe = new Map(deliveries.map((d) => [d.cafeId, d]));
    const planned = weeks
      .map((w) => ({ w, lines: w.lines.filter((l) => l.qty > 0) }))
      .filter((x) => x.lines.length > 0)
      .map(({ w, lines }) => {
        const d = byCafe.get(w.cafeId);
        return {
          cafeId: w.cafeId,
          cafeName: w.cafe.name,
          items: lines.map((l) => ({ productId: l.productId, name: l.product.name, unit: l.product.unit, qty: l.qty, note: l.note })),
          delivery: d
            ? {
                id: d.id,
                status: d.status,
                courierId: d.courierId,
                courierName: d.courier?.name ?? null,
                pickupConfirmedAt: d.pickupConfirmedAt,
                deliveredAt: d.deliveredAt,
                photoUrl: d.photoUrl,
              }
            : null,
        };
      })
      .sort((a, b) => a.cafeName.localeCompare(b.cafeName));

    const dayCafes = new Map<string, Set<string>>();
    for (const l of weekLines) {
      const k = dateKey(l.date);
      let s = dayCafes.get(k);
      if (!s) {
        s = new Set();
        dayCafes.set(k, s);
      }
      s.add(l.orderWeek.cafeId);
    }
    const weekDays = isoWeekDates(isoYear, isoWeek).map((d) => {
      const k = dateKey(d);
      return { key: k, dow: fmtDow(d), dm: fmtDayMonth(d), cafes: dayCafes.get(k)?.size ?? 0 };
    });

    return NextResponse.json({ role: session.role, date, planned, couriers, weekDays });
  }

  // COURIER: their assigned deliveries for the date. CAFE: their own.
  const where =
    session.role === "COURIER"
      ? { date: dateValue, courierId: session.userId }
      : { date: dateValue, cafeId: session.cafeId ?? "__none__" };

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      cafe: { select: { id: true, name: true } },
      courier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
      incidents: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { cafe: { name: "asc" } },
  });

  return NextResponse.json({
    role: session.role,
    date,
    deliveries: deliveries.map((d) => ({
      id: d.id,
      cafeId: d.cafeId,
      cafeName: d.cafe.name,
      courierName: d.courier?.name ?? null,
      status: d.status,
      pickupConfirmedAt: d.pickupConfirmedAt,
      deliveredAt: d.deliveredAt,
      photoUrl: d.photoUrl,
      items: d.items.map((i) => ({ productId: i.product.id, name: i.product.name, unit: i.product.unit, qty: i.qty })),
      incidents: d.incidents.map((x) => ({
        id: x.id,
        productName: x.product.name,
        qty: x.qty,
        type: x.type,
        status: x.status,
        reporterRole: x.reporterRole,
        photoUrl: x.photoUrl,
        note: x.note,
      })),
    })),
  });
}
