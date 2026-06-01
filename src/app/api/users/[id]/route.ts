import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { isRole } from "@/lib/roles";

export const runtime = "nodejs";

const SELECT = {
  id: true,
  name: true,
  login: true,
  role: true,
  cafeId: true,
  active: true,
  cafe: { select: { id: true, name: true } },
} as const;

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.string().refine(isRole).optional(),
  cafeId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(4).optional(),
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

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.role !== undefined) data.role = d.role;

  const newRole = d.role ?? existing.role;
  if (d.role !== undefined || d.cafeId !== undefined) {
    if (newRole === "CAFE") {
      const cafeId = d.cafeId !== undefined ? d.cafeId : existing.cafeId;
      if (!cafeId) return NextResponse.json({ error: "cafe_required" }, { status: 400 });
      const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
      if (!cafe) return NextResponse.json({ error: "cafe_not_found" }, { status: 400 });
      data.cafeId = cafeId;
    } else {
      data.cafeId = null;
    }
  }

  if (d.active !== undefined) {
    if (id === session.userId && d.active === false) {
      return NextResponse.json({ error: "cannot_deactivate_self" }, { status: 400 });
    }
    data.active = d.active;
  }

  if (d.password !== undefined) data.passwordHash = await hashPassword(d.password);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({ where: { id }, data, select: SELECT });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "update_failed" }, { status: 400 });
  }
}
