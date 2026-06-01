import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";

const SECTIONS = [
  { href: "/admin/catalog", title: "Product catalog", desc: "Products, categories, units, prices and order notes.", ready: true },
  { href: "/admin/settings", title: "Delegation & settings", desc: "Let the bakery edit products and/or prices. Currency.", ready: true },
  { href: "/admin/users", title: "Accounts & credentials", desc: "Create logins for bakery, cafés and couriers.", ready: true },
  { href: "/admin/cafes", title: "Cafés & invoicing", desc: "Manage cafés and invoice periodicity.", ready: true },
];

export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.ADMIN} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-1 text-2xl font-bold">Admin</h1>
        <p className="mb-6 text-stone-600">
          Provision participants and own the product/price catalog.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) =>
            s.href && s.ready ? (
              <Link
                key={s.title}
                href={s.href}
                className="group rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:border-bobo hover:shadow"
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-semibold text-stone-800 group-hover:text-bobo">{s.title}</h3>
                  <span className="text-bobo">→</span>
                </div>
                <p className="text-sm text-stone-600">{s.desc}</p>
              </Link>
            ) : (
              <div
                key={s.title}
                className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-5"
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="font-semibold text-stone-500">{s.title}</h3>
                  <span className="rounded bg-stone-200 px-2 py-0.5 text-xs text-stone-500">Next</span>
                </div>
                <p className="text-sm text-stone-400">{s.desc}</p>
              </div>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
