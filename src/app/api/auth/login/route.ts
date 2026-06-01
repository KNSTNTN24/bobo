import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createToken, SESSION_COOKIE } from "@/lib/auth";
import { ROLE_HOME, isRole } from "@/lib/roles";

export const runtime = "nodejs";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { login: parsed.data.login },
  });
  if (!user || !user.active || !isRole(user.role)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createToken({
    userId: user.id,
    role: user.role,
    name: user.name,
    cafeId: user.cafeId,
  });

  const res = NextResponse.json({ home: ROLE_HOME[user.role] });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
