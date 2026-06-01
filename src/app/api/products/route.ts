import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isCategory, isUnit } from "@/lib/catalog";
import { canEditCatalog, canEditPrices, NO_PERMS } from "@/lib/permissions";

export const runtime = "nodejs";

async function loadPerms() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return s
    ? { canBakeryEditProducts: s.canBakeryEditProducts, canBakeryEditPrices: s.canBakeryEditPrices }
    : NO_PERMS;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ products });
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().refine(isCategory, "invalid category"),
  unit: z.string().refine(isUnit, "invalid unit"),
  priceP: z.number().int().min(0).optional(),
  allowsNote: z.boolean().optional(),
  changeLeadHours: z.number().int().min(0).max(168).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const perms = await loadPerms();
  if (!canEditCatalog(session.role, perms)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const priceP = canEditPrices(session.role, perms) ? parsed.data.priceP ?? 0 : 0;
  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
      priceP,
      allowsNote: parsed.data.allowsNote ?? false,
      changeLeadHours: parsed.data.changeLeadHours ?? 18,
    },
  });
  return NextResponse.json({ product }, { status: 201 });
}
