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

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().refine(isCategory).optional(),
  unit: z.string().refine(isUnit).optional(),
  priceP: z.number().int().min(0).optional(),
  allowsNote: z.boolean().optional(),
  changeLeadHours: z.number().int().min(0).max(168).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const d = parsed.data;

  const wantsPrice = d.priceP !== undefined;
  const wantsOther =
    d.name !== undefined ||
    d.category !== undefined ||
    d.unit !== undefined ||
    d.allowsNote !== undefined ||
    d.changeLeadHours !== undefined ||
    d.active !== undefined;

  if (!wantsPrice && !wantsOther) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  const perms = await loadPerms();
  if (wantsOther && !canEditCatalog(session.role, perms)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (wantsPrice && !canEditPrices(session.role, perms)) {
    return NextResponse.json({ error: "forbidden_price" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.category !== undefined) data.category = d.category;
  if (d.unit !== undefined) data.unit = d.unit;
  if (d.allowsNote !== undefined) data.allowsNote = d.allowsNote;
  if (d.changeLeadHours !== undefined) data.changeLeadHours = d.changeLeadHours;
  if (d.active !== undefined) data.active = d.active;
  if (d.priceP !== undefined) data.priceP = d.priceP;

  try {
    const product = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await params;

  const perms = await loadPerms();
  if (!canEditCatalog(session.role, perms)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Soft-archive to preserve history.
  try {
    const product = await prisma.product.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
