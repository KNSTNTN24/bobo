import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isInvoicePeriod } from "@/lib/billing";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  address: z.string().trim().nullable().optional(),
  contacts: z.string().trim().nullable().optional(),
  invoicePeriod: z.string().refine(isInvoicePeriod).optional(),
  invoiceAnchor: z.number().int().min(1).max(31).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.address !== undefined) data.address = d.address || null;
  if (d.contacts !== undefined) data.contacts = d.contacts || null;
  if (d.invoicePeriod !== undefined) data.invoicePeriod = d.invoicePeriod;
  if (d.invoiceAnchor !== undefined) data.invoiceAnchor = d.invoiceAnchor;
  if (d.active !== undefined) data.active = d.active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const cafe = await prisma.cafe.update({ where: { id }, data });
    return NextResponse.json({ cafe });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
