import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekParts, parseDateKey } from "@/lib/week";

export const runtime = "nodejs";

const schema = z.object({
  cafeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courierId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "BAKERY") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { cafeId, date } = parsed.data;
  const courierId = parsed.data.courierId ?? null;
  const dateValue = parseDateKey(date);

  if (courierId) {
    const c = await prisma.user.findUnique({ where: { id: courierId } });
    if (!c || c.role !== "COURIER" || !c.active) {
      return NextResponse.json({ error: "invalid_courier" }, { status: 400 });
    }
  }

  // Delivery contents come from the café's CONFIRMED order for that date.
  const { isoYear, isoWeek } = isoWeekParts(dateValue);
  const ow = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    include: { lines: { where: { date: dateValue } } },
  });
  if (!ow || ow.status !== "CONFIRMED") {
    return NextResponse.json({ error: "not_confirmed" }, { status: 400 });
  }
  const lines = ow.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) {
    return NextResponse.json({ error: "nothing_to_deliver" }, { status: 400 });
  }

  const existing = await prisma.delivery.findUnique({ where: { cafeId_date: { cafeId, date: dateValue } } });
  if (existing && existing.status !== "PLANNED") {
    return NextResponse.json({ error: "already_dispatched" }, { status: 409 });
  }

  const delivery = await prisma.delivery.upsert({
    where: { cafeId_date: { cafeId, date: dateValue } },
    update: { courierId },
    create: { cafeId, date: dateValue, courierId, status: "PLANNED" },
  });

  // Sync items from the confirmed order (only PLANNED reaches here).
  await prisma.deliveryItem.deleteMany({ where: { deliveryId: delivery.id } });
  await prisma.deliveryItem.createMany({
    data: lines.map((l) => ({ deliveryId: delivery.id, productId: l.productId, qty: l.qty })),
  });

  return NextResponse.json({ ok: true, delivery: { id: delivery.id, status: delivery.status, courierId } });
}
