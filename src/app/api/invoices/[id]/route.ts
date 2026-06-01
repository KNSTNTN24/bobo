import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/week";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      cafe: { select: { name: true } },
      lines: { include: { product: { select: { name: true, unit: true } } } },
    },
  });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (session.role === "COURIER") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (session.role === "CAFE" && (inv.cafeId !== session.cafeId || inv.status !== "SENT")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    invoice: {
      id: inv.id,
      cafeName: inv.cafe.name,
      period: inv.period,
      periodStart: dateKey(inv.periodStart),
      periodEnd: dateKey(inv.periodEnd),
      status: inv.status,
      totalP: inv.totalP,
      sentAt: inv.sentAt,
      createdAt: inv.createdAt,
      lines: inv.lines.map((l) => ({
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
