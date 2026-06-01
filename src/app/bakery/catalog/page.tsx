import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { CatalogManager } from "@/components/CatalogManager";

export const dynamic = "force-dynamic";

export default async function BakeryCatalogPage() {
  const session = await requireRole("BAKERY");
  const [products, settings] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const canCat = settings?.canBakeryEditProducts ?? false;
  const canPrice = settings?.canBakeryEditPrices ?? false;
  const currency = settings?.currency ?? "GBP";

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.BAKERY} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/bakery" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Product catalog</h1>
        <p className="mb-4 text-sm text-stone-500">
          {products.length} products · prices in {currency}
        </p>
        {!canCat && !canPrice ? (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            View only — the admin has not delegated catalog or price editing to the bakery.
          </p>
        ) : (
          <p className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Editing enabled:{" "}
            {canCat ? "products" : ""}
            {canCat && canPrice ? " + " : ""}
            {canPrice ? "prices" : ""}.
          </p>
        )}
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
          canEditCatalog={canCat}
          canEditPrices={canPrice}
          currency={currency}
        />
      </main>
    </div>
  );
}
