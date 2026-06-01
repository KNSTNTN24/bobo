import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCafe } from "@/lib/permissions";
import { type1Open } from "@/lib/orders";

export const runtime = "nodejs";

// Type 1 state transitions on a weekly draft.
//   SUBMIT  (café)   PROPOSED -> CHANGES_REQUESTED   (push café edits for approval)
//   CONFIRM (café)   PROPOSED -> CONFIRMED            (accept the bakery proposal as-is)
//   ACCEPT  (bakery) CHANGES_REQUESTED -> CONFIRMED   (keep café edits)
//   REJECT  (bakery) CHANGES_REQUESTED -> PROPOSED    (revert to the bakery proposal)
const schema = z.object({
  cafeId: z.string().min(1),
  isoYear: z.number().int(),
  isoWeek: z.number().int().min(1).max(53),
  action: z.enum(["SUBMIT", "CONFIRM", "ACCEPT", "REJECT"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { cafeId, isoYear, isoWeek, action } = parsed.data;

  if (!canAccessCafe(session.role, session.cafeId, cafeId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const isBakery = session.role === "ADMIN" || session.role === "BAKERY";
  if ((action === "ACCEPT" || action === "REJECT") && !isBakery) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (action === "SUBMIT" && session.role !== "CAFE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const lead = settings?.weeklyConfirmLeadHours ?? 36;
  if (!type1Open(isoYear, isoWeek, lead, Date.now())) {
    return NextResponse.json({ error: "type1_closed" }, { status: 409 });
  }

  const ow = await prisma.orderWeek.findUnique({
    where: { cafeId_isoYear_isoWeek: { cafeId, isoYear, isoWeek } },
    include: { lines: true },
  });
  if (!ow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date();

  if (action === "SUBMIT") {
    if (ow.status !== "PROPOSED") return NextResponse.json({ error: "bad_state" }, { status: 409 });
    await prisma.orderWeek.update({ where: { id: ow.id }, data: { status: "CHANGES_REQUESTED" } });
    return NextResponse.json({ ok: true, status: "CHANGES_REQUESTED" });
  }

  if (action === "CONFIRM") {
    if (ow.status !== "PROPOSED") return NextResponse.json({ error: "bad_state" }, { status: 409 });
    await prisma.$transaction([
      ...ow.lines.map((l) => prisma.orderLine.update({ where: { id: l.id }, data: { qty: l.proposedQty } })),
      prisma.orderWeek.update({ where: { id: ow.id }, data: { status: "CONFIRMED", confirmedAt: now } }),
    ]);
    return NextResponse.json({ ok: true, status: "CONFIRMED" });
  }

  if (action === "ACCEPT") {
    if (ow.status !== "CHANGES_REQUESTED") return NextResponse.json({ error: "bad_state" }, { status: 409 });
    await prisma.$transaction([
      ...ow.lines.map((l) => prisma.orderLine.update({ where: { id: l.id }, data: { proposedQty: l.qty } })),
      prisma.orderWeek.update({ where: { id: ow.id }, data: { status: "CONFIRMED", confirmedAt: now } }),
    ]);
    return NextResponse.json({ ok: true, status: "CONFIRMED" });
  }

  // REJECT
  if (ow.status !== "CHANGES_REQUESTED") return NextResponse.json({ error: "bad_state" }, { status: 409 });
  await prisma.$transaction([
    ...ow.lines.map((l) => prisma.orderLine.update({ where: { id: l.id }, data: { qty: l.proposedQty } })),
    prisma.orderWeek.update({ where: { id: ow.id }, data: { status: "PROPOSED" } }),
  ]);
  return NextResponse.json({ ok: true, status: "PROPOSED" });
}
