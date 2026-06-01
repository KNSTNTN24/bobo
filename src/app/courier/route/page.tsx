import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { Topbar } from "@/components/Topbar";
import { CourierScreen } from "@/components/CourierScreen";
import { dateKey } from "@/lib/week";

export const dynamic = "force-dynamic";

export default async function CourierRoutePage() {
  const session = await requireRole("COURIER");
  const today = dateKey(new Date());

  return (
    <div className="min-h-screen">
      <Topbar name={session.name} roleLabel={ROLE_LABEL.COURIER} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/courier" className="text-sm text-bobo hover:underline">← Back</Link>
        <h1 className="mb-1 mt-2 text-2xl font-bold">Today&apos;s route</h1>
        <p className="mb-6 text-sm text-stone-500">
          Confirm pickup at the bakery, then confirm each delivery with a photo.
        </p>
        <CourierScreen initialDate={today} />
      </main>
    </div>
  );
}
