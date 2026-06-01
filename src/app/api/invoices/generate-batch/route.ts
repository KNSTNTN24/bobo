import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekDates } from "@/lib/week";
import { computeInvoice } from "@/lib/invoice";

export const runtime = "nodejs";

const schema = z.object({ year: z.number().int(), week: z.number().int().min(1).max(53) });

// Weekly batch: generate draft invoices for every active café for a COMPLETED week.
// Gated: the week must have ended, and there must be no unresolved incidents in it.
// Empty cafés (no delivered items) and already-invoiced cafés are skipped.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "BAKERY") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const dates = isoWeekDates(parsed.data.year, parsed.data.week);
  const start = dates[0];
  const end = dates[6];
  const weekEndMs = end.getTime() + 24 * 3600 * 1000; // end of Sunday

  if (Date.now() < weekEndMs) {
    return NextResponse.json({ error: "week_not_ended" }, { status: 409 });
  }

  const pendingIncidents = await prisma.incident.count({
    where: { status: "REPORTED", delivery: { date: { gte: start, lte: end } } },
  });
  if (pendingIncidents > 0) {
    return NextResponse.json({ error: "pending_incidents", count: pendingIncidents }, { status: 409 });
  }

  const cafes = await prisma.cafe.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  const generated: { cafeName: string; totalP: number }[] = [];
  const skippedEmpty: string[] = [];
  const skippedExisting: string[] = [];

  for (const c of cafes) {
    const existing = await prisma.invoice.findFirst({ where: { cafeId: c.id, periodStart: start, periodEnd: end } });
    if (existing) {
      skippedExisting.push(c.name);
      continue;
    }
    const { lines, totalP } = await computeInvoice(c.id, start, end);
    if (lines.length === 0) {
      skippedEmpty.push(c.name);
      continue;
    }
    await prisma.invoice.create({
      data: {
        cafeId: c.id,
        period: "WEEKLY",
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
    });
    generated.push({ cafeName: c.name, totalP });
  }

  return NextResponse.json({ ok: true, generated, skippedEmpty, skippedExisting });
}
