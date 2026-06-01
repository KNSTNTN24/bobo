import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireRole("ADMIN");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.ADMIN} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/admin" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Delegation & settings</h1>
        <p className="mb-6 text-sm text-stone-500">
          Grant the bakery rights to edit the catalog and/or prices.
        </p>
        <SettingsForm
          initial={{
            canBakeryEditProducts: settings?.canBakeryEditProducts ?? false,
            canBakeryEditPrices: settings?.canBakeryEditPrices ?? false,
          }}
          currency={settings?.currency ?? "GBP"}
        />
      </main>
    </div>
  );
}
