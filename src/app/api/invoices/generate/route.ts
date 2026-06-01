import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseDateKey, dateKey } from "@/lib/week";
import { computeInvoice } from "@/lib/invoice";

export const runtime = "nodejs";

const genSchema = z.object({
  cafeId: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "BAKERY") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = genSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const start = parseDateKey(parsed.data.periodStart);
  const end = parseDateKey(parsed.data.periodEnd);
  if (end.getTime() < start.getTime()) {
    return NextResponse.json({ error: "bad_period" }, { status: 400 });
  }

  const cafe = await prisma.cafe.findUnique({ where: { id: parsed.data.cafeId } });
  if (!cafe) return NextResponse.json({ error: "cafe_not_found" }, { status: 404 });

  const sent = await prisma.invoice.findFirst({
    where: { cafeId: cafe.id, periodStart: start, periodEnd: end, status: "SENT" },
  });
  if (sent) return NextResponse.json({ error: "already_sent" }, { status: 409 });

  // Replace any prior draft for the same café + period.
  await prisma.invoice.deleteMany({ where: { cafeId: cafe.id, periodStart: start, periodEnd: end, status: "DRAFT" } });

  const { lines, totalP } = await computeInvoice(cafe.id, start, end);

  const invoice = await prisma.invoice.create({
    data: {
      cafeId: cafe.id,
      period: cafe.invoicePeriod,
      periodStart: start,
      periodEnd: end,
      status: "DRAFT",
      totalP,
      lines: {
        create: lines.map((l) => ({
          type: l.type,
          productId: l.productId,
          qty: l.qty,
          unitPriceP: l.unitPriceP,
          amountP: l.amountP,
          countsToTotal: l.countsToTotal,
        })),
      },
    },
    include: { cafe: { select: { name: true } }, lines: { include: { product: { select: { name: true, unit: true } } } } },
  });

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      cafeName: invoice.cafe.name,
      period: invoice.period,
      periodStart: dateKey(invoice.periodStart),
      periodEnd: dateKey(invoice.periodEnd),
      status: invoice.status,
      totalP: invoice.totalP,
      sentAt: invoice.sentAt,
      createdAt: invoice.createdAt,
      lines: invoice.lines.map((l) => ({
        type: l.type,
        productName: l.product.name,
        unit: l.product.unit,
        qty: l.qty,
        unitPriceP: l.unitPriceP,
        amountP: l.amountP,
        countsToTotal: l.countsToTotal,
      })),
    },
  });
}
