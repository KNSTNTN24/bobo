import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isInvoicePeriod } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const cafes = await prisma.cafe.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ cafes });
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  contacts: z.string().trim().optional(),
  invoicePeriod: z.string().refine(isInvoicePeriod).optional(),
  invoiceAnchor: z.number().int().min(1).max(31).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });

  const cafe = await prisma.cafe.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      contacts: parsed.data.contacts || null,
      invoicePeriod: parsed.data.invoicePeriod ?? "WEEKLY",
      invoiceAnchor: parsed.data.invoiceAnchor ?? 1,
    },
  });
  return NextResponse.json({ cafe }, { status: 201 });
}
