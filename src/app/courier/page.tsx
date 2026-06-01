import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/roles";
import { RoleDashboard, type Feature } from "@/components/RoleDashboard";

const FEATURES: Feature[] = [
  { title: "Today's route", desc: "See the cafés to deliver to today and their contents.", milestone: "M3" },
  { title: "Confirm pickup", desc: "Acknowledge receipt of all parcels at the bakery.", milestone: "M3" },
  { title: "Photo delivery", desc: "Confirm each café's delivery with a photo.", milestone: "M3" },
  { title: "Report incident", desc: "Report damage or loss of a product en route.", milestone: "M4" },
];

export default async function CourierPage() {
  const session = await requireRole("COURIER");
  return (
    <RoleDashboard
      name={session.name}
      roleLabel={ROLE_LABEL.COURIER}
      intro="Courier workspace — pick up at the bakery and confirm deliveries with photo proof."
      features={FEATURES}
      topActions={
        <Link
          href="/courier/route"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:border-bobo"
        >
          Today&apos;s route
          <span className="rounded bg-bobo/10 px-2 py-0.5 text-xs text-bobo">pickup &amp; deliver</span>
        </Link>
      }
    />
  );
}
