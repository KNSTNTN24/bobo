import type { ReactNode } from "react";
import { Schibsted_Grotesk } from "next/font/google";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type1Open } from "@/lib/orders";
import { CafeShell } from "@/components/cafe/CafeShell";
import "@/styles/cafe-web.css";

const sg = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sg",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default async function CafeLayout({ children }: { children: ReactNode }) {
  const session = await requireRole("CAFE");

  let requestsBadge = 0;
  let ordersDraft = false;
  let cafe: { name: string; address: string | null } | null = null;

  if (session.cafeId) {
    const [c, proposed, settings, changeCount] = await Promise.all([
      prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true, address: true } }),
      prisma.orderWeek.findMany({ where: { cafeId: session.cafeId, status: "PROPOSED" }, select: { isoYear: true, isoWeek: true } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
      prisma.orderChangeRequest.count({ where: { cafeId: session.cafeId, status: "PENDING" } }),
    ]);
    cafe = c;
    const lead = settings?.weeklyConfirmLeadHours ?? 36;
    const now = Date.now();
    const openProposed = proposed.filter((w) => type1Open(w.isoYear, w.isoWeek, lead, now)).length;
    ordersDraft = openProposed > 0;
    requestsBadge = openProposed + changeCount;
  }

  const name = cafe?.name ?? session.name;
  const loc = (cafe?.name ?? "").replace(/^BOBO\s*/i, "").trim();
  const av = (loc || cafe?.name || "BO").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "BO";
  const brandSub = (loc || "Café") + " · Café";
  const sub = `${cafe?.address ?? "Location"} · Café`;

  return (
    <div className={sg.variable}>
      <CafeShell brandSub={brandSub} user={{ av, name, sub }} requestsBadge={requestsBadge} ordersDraft={ordersDraft}>
        {children}
      </CafeShell>
    </div>
  );
}
