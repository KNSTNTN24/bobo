import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CafeTopbar } from "@/components/cafe/CafeShell";
import { CafeRequests } from "@/components/cafe/CafeRequests";

export const dynamic = "force-dynamic";

export default async function CafeRequestsPage() {
  const session = await requireRole("CAFE");
  const cafe = session.cafeId ? await prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true } }) : null;
  return (
    <>
      <CafeTopbar eyebrow={`${cafe?.name ?? "Café"} · Café`} title="Requests" />
      <div className="content">
        <CafeRequests />
      </div>
    </>
  );
}
