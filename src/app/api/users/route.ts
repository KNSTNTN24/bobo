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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: SELECT,
  });
  return NextResponse.json({ users });
}

const createSchema = z.object({
  name: z.string().trim().min(1),
  login: z.string().trim().min(1),
  password: z.string().min(4),
  role: z.string().refine(isRole, "invalid role"),
  cafeId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, login, password, role } = parsed.data;
  let cafeId: string | null = parsed.data.cafeId ?? null;
  if (role === "CAFE") {
    if (!cafeId) return NextResponse.json({ error: "cafe_required" }, { status: 400 });
    const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
    if (!cafe) return NextResponse.json({ error: "cafe_not_found" }, { status: 400 });
  } else {
    cafeId = null;
  }

  try {
    const user = await prisma.user.create({
      data: { name, login, role, cafeId, passwordHash: await hashPassword(password) },
      select: SELECT,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "login_taken" }, { status: 409 });
  }
}
