import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCafe } from "@/lib/permissions";
import { isoWeekParts, parseDateKey } from "@/lib/week";
import { type1Open } from "@/lib/orders";

export const runtime = "nodejs";

const schema = z.object({
  cafeId: z.string().min(1),
  isoYear: z.number().int(),
  isoWeek: z.number().int().min(1).max(53),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productId: z.string().min(1),
  qty: z.number().int().min(0).max(100000),
  note: z.string().max(500).nullable().optional(),
});

// Type 1 draft editing: bakery proposes, café adjusts — only while the
// week is in its negotiation window (future week, before the deadline) and PROPOSED.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { cafeId, isoYear, isoWeek, date, productId, qty } = parsed.data;
  const note = parsed.data.note?.trim() || null;

  if (!canAccessCafe(session.role, session.cafeId, cafeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parts = isoWeekParts(parseDateKey(date));
  if (parts.isoYear !== isoYear || parts.isoWeek !== isoWeek) {
    return NextResponse.json({ error: "date_out_of_week" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const lead = settings?.weeklyConfirmLeadHours ?? 36;
  if (!type1Open(isoYear, isoWeek, lead, Date.now())) {
    return NextResponse.json({ error: "type1_closed" }, { status: 409 });
  }

  const existingWeek = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    select: { id: true, status: true },
  });
  if (existingWeek && existingWeek.status !== "PROPOSED") {
    return NextResponse.json({ error: "not_editable", status: existingWeek.status }, { status: 409 });
  }

  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true } });
  if (!cafe) return NextResponse.json({ error: "cafe_not_found" }, { status: 404 });

  const ow = await prisma.orderWeek.upsert({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    update: {},
    create: { cafeId, isoYear, isoWeek, status: "PROPOSED" },
  });

  const dateValue = parseDateKey(date);
  const isBakery = session.role === "ADMIN" || session.role === "BAKERY";
  const existing = await prisma.orderLine.findUnique({
    where: { orderWeekId_date_productId: { orderWeekId: ow.id, date: dateValue, productId } },
  });
  // Bakery edits set the proposal baseline; café edits keep the baseline for revert.
  const proposedQty = isBakery ? qty : existing?.proposedQty ?? 0;

  if (qty <= 0 && !note && proposedQty <= 0) {
    await prisma.orderLine.deleteMany({ where: { orderWeekId: ow.id, date: dateValue, productId } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const line = await prisma.orderLine.upsert({
    where: { orderWeekId_date_productId: { orderWeekId: ow.id, date: dateValue, productId } },
    update: { qty, note, proposedQty, priceSnapshotP: product.priceP },
    create: { orderWeekId: ow.id, date: dateValue, productId, qty, proposedQty, note, priceSnapshotP: product.priceP },
  });

  return NextResponse.json({ ok: true, line: { date, productId, qty: line.qty, proposedQty: line.proposedQty, note: line.note } });
}
