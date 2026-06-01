import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { UsersManager } from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await requireRole("ADMIN");
  const [users, cafes] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        login: true,
        role: true,
        cafeId: true,
        active: true,
        cafe: { select: { id: true, name: true } },
      },
    }),
    prisma.cafe.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.ADMIN} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/admin" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Accounts & credentials</h1>
        <p className="mb-6 text-sm text-stone-500">{users.length} users · provision logins for every participant</p>
        <UsersManager initialUsers={users} cafes={cafes} currentUserId={session.userId} />
      </main>
    </div>
  );
}
