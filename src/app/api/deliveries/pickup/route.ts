import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseDateKey } from "@/lib/week";

export const runtime = "nodejs";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Courier confirms pickup of all their parcels at the bakery for a date.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "COURIER") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await prisma.delivery.updateMany({
    where: { courierId: session.userId, date: parseDateKey(parsed.data.date), status: "PLANNED" },
    data: { status: "PICKED_UP", pickupConfirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
