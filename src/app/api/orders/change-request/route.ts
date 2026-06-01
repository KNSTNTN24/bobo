import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCafe } from "@/lib/permissions";
import { isoWeekParts, parseDateKey } from "@/lib/week";
import { cellCutoffMs } from "@/lib/orders";

export const runtime = "nodejs";

const schema = z.object({
  cafeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productId: z.string().min(1),
  toQty: z.number().int().min(0).max(100000),
  note: z.string().max(500).nullable().optional(),
});

// Type 2: café requests a change to a single delivery line on a CONFIRMED week,
// allowed only before that product's cutoff. The bakery resolves it.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "CAFE") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { cafeId, date, productId, toQty } = parsed.data;
  const note = parsed.data.note?.trim() || null;

  if (!canAccessCafe(session.role, session.cafeId, cafeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 400 });
  }

  const dateValue = parseDateKey(date);
  const { isoYear, isoWeek } = isoWeekParts(dateValue);
  const ow = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    include: { lines: { where: { date: dateValue, productId } } },
  });
  if (!ow || ow.status !== "CONFIRMED") {
    return NextResponse.json({ error: "not_confirmed" }, { status: 400 });
  }

  if (Date.now() >= cellCutoffMs(dateValue.getTime(), product.changeLeadHours)) {
    return NextResponse.json({ error: "locked" }, { status: 409 });
  }

  const fromQty = ow.lines[0]?.qty ?? 0;
  if (toQty === fromQty) return NextResponse.json({ error: "no_change" }, { status: 400 });

  // one pending request per cell
  await prisma.orderChangeRequest.deleteMany({ where: { cafeId, date: dateValue, productId, status: "PENDING" } });
  const cr = await prisma.orderChangeRequest.create({
    data: { cafeId, date: dateValue, productId, fromQty, toQty, note, status: "PENDING", createdById: session.userId },
  });
  return NextResponse.json({ ok: true, id: cr.id }, { status: 201 });
}
