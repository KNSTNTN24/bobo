import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { CatalogManager } from "@/components/CatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const session = await requireRole("ADMIN");
  const [products, settings] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const currency = settings?.currency ?? "GBP";

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.ADMIN} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/admin" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Product catalog</h1>
        <p className="mb-6 text-sm text-stone-500">
          {products.length} products · prices in {currency}
        </p>
        <CatalogManager
          initialProducts={products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            priceP: p.priceP,
            allowsNote: p.allowsNote,
            changeLeadHours: p.changeLeadHours,
            active: p.active,
          }))}
          canEditCatalog
          canEditPrices
          currency={currency}
        />
      </main>
    </div>
  );
}
