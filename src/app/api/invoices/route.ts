import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/week";

export const runtime = "nodejs";

function listItem(i: {
  id: string;
  cafe: { name: string };
  period: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  totalP: number;
  sentAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: i.id,
    cafeName: i.cafe.name,
    period: i.period,
    periodStart: dateKey(i.periodStart),
    periodEnd: dateKey(i.periodEnd),
    status: i.status,
    totalP: i.totalP,
    sentAt: i.sentAt,
    createdAt: i.createdAt,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (session.role === "ADMIN" || session.role === "BAKERY") {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { cafe: { select: { name: true } } } });
    return NextResponse.json({ invoices: invoices.map(listItem) });
  }
  if (session.role === "CAFE") {
    const invoices = await prisma.invoice.findMany({
      where: { cafeId: session.cafeId ?? "__none__", status: "SENT" },
      orderBy: { createdAt: "desc" },
      include: { cafe: { select: { name: true } } },
    });
    return NextResponse.json({ invoices: invoices.map(listItem) });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
