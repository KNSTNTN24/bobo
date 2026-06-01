import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isoWeekDates } from "@/lib/week";

export const runtime = "nodejs";

const schema = z.object({ year: z.number().int(), week: z.number().int().min(1).max(53) });

// Send (mark SENT) all DRAFT invoices for a given week.
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
  const r = await prisma.invoice.updateMany({
    where: { status: "DRAFT", periodStart: dates[0], periodEnd: dates[6] },
    data: { status: "SENT", sentAt: new Date() },
  });
  return NextResponse.json({ ok: true, count: r.count });
}
