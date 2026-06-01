import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["CONFIRMED", "REJECTED"]) });

// POST /api/incidents/:id/resolve — bakery confirms or rejects
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

  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (incident.status !== "REPORTED") {
    return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: { status: parsed.data.status, resolvedById: session.userId, resolvedAt: new Date() },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
