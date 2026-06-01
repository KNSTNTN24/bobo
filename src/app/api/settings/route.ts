import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const DEFAULTS = {
  id: 1,
  canBakeryEditProducts: false,
  canBakeryEditPrices: false,
  currency: "GBP",
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ settings: settings ?? DEFAULTS });
}

const patchSchema = z.object({
  canBakeryEditProducts: z.boolean().optional(),
  canBakeryEditPrices: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: {
      id: 1,
      currency: "GBP",
      canBakeryEditProducts: parsed.data.canBakeryEditProducts ?? false,
      canBakeryEditPrices: parsed.data.canBakeryEditPrices ?? false,
    },
  });
  return NextResponse.json({ settings });
}
