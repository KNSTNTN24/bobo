import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekParts } from "@/lib/week";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["ACCEPT", "REJECT"]) });

// Bakery resolves a Type 2 change request. ACCEPT applies the new qty to the
// order (and to a PLANNED delivery if one exists); REJECT leaves things unchanged.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "BAKERY") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const cr = await prisma.orderChangeRequest.findUnique({ where: { id } });
  if (!cr) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (cr.status !== "PENDING") return NextResponse.json({ error: "already_resolved" }, { status: 409 });

  if (parsed.data.action === "REJECT") {
    await prisma.orderChangeRequest.update({
      where: { id },
      data: { status: "REJECTED", resolvedById: session.userId, resolvedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // ACCEPT — apply to the order line and any PLANNED delivery.
  const product = await prisma.product.findUnique({ where: { id: cr.productId } });
  const { isoYear, isoWeek } = isoWeekParts(cr.date);
  const ow = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId: cr.cafeId, isoYear, isoWeek } },
  });

  if (ow && product) {
    if (cr.toQty <= 0) {
      await prisma.orderLine.deleteMany({ where: { orderWeekId: ow.id, date: cr.date, productId: cr.productId } });
    } else {
      await prisma.orderLine.upsert({
        where: { orderWeekId_date_productId: { orderWeekId: ow.id, date: cr.date, productId: cr.productId } },
        update: { qty: cr.toQty, proposedQty: cr.toQty },
        create: { orderWeekId: ow.id, date: cr.date, productId: cr.productId, qty: cr.toQty, proposedQty: cr.toQty, priceSnapshotP: product.priceP },
      });
    }

    const delivery = await prisma.delivery.findUnique({ where: { cafeId_date: { cafeId: cr.cafeId, date: cr.date } } });
    if (delivery && delivery.status === "PLANNED") {
      const di = await prisma.deliveryItem.findFirst({ where: { deliveryId: delivery.id, productId: cr.productId } });
      if (cr.toQty <= 0) {
        if (di) await prisma.deliveryItem.delete({ where: { id: di.id } });
      } else if (di) {
        await prisma.deliveryItem.update({ where: { id: di.id }, data: { qty: cr.toQty } });
      } else {
        await prisma.deliveryItem.create({ data: { deliveryId: delivery.id, productId: cr.productId, qty: cr.toQty } });
      }
    }
  }

  await prisma.orderChangeRequest.update({
    where: { id },
    data: { status: "ACCEPTED", resolvedById: session.userId, resolvedAt: new Date() },
  });
  return NextResponse.json({ ok: true, status: "ACCEPTED" });
}
