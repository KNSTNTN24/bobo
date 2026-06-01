import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { CafesManager } from "@/components/CafesManager";

export const dynamic = "force-dynamic";

export default async function AdminCafesPage() {
  const session = await requireRole("ADMIN");
  const cafes = await prisma.cafe.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.ADMIN} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/admin" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Cafés & invoicing</h1>
        <p className="mb-6 text-sm text-stone-500">{cafes.length} cafés · set each café&apos;s invoice periodicity</p>
        <CafesManager
          initialCafes={cafes.map((c) => ({
            id: c.id,
            name: c.name,
            address: c.address,
            contacts: c.contacts,
            active: c.active,
          }))}
        />
      </main>
    </div>
  );
}
