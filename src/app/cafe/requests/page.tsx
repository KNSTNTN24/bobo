import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { RequestsList } from "@/components/RequestsList";

export const dynamic = "force-dynamic";

export default async function CafeRequestsPage() {
  const session = await requireRole("CAFE");
  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.CAFE} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/cafe" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Requests</h1>
        <p className="mb-6 text-sm text-stone-500">Weekly drafts awaiting your confirmation, and the status of your delivery change requests.</p>
        <RequestsList mode="CAFE" />
      </main>
    </div>
  );
}
