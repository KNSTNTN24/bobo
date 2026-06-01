import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CafeTopbar } from "@/components/cafe/CafeShell";
import { WIcon } from "@/components/cafe/WIcon";
import { CafeSignOut } from "@/components/cafe/CafeSignOut";

export const dynamic = "force-dynamic";

export default async function CafeSettingsPage() {
  const session = await requireRole("CAFE");
  const [cafe, settings] = await Promise.all([
    session.cafeId ? prisma.cafe.findUnique({ where: { id: session.cafeId }, select: { name: true, address: true, contacts: true } }) : null,
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  const lead = settings?.weeklyConfirmLeadHours ?? 36;
  const loc = (cafe?.name ?? "").replace(/^BOBO\s*/i, "").trim();
  const av = (loc || "BO").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "BO";

  const rows: [string, string, string][] = [
    ["pin", "Location & address", cafe?.address ?? "—"],
    ["user", "Contacts", cafe?.contacts ?? "—"],
    ["clock", "Order deadline", `${lead}h before the week starts`],
    ["bell", "Notifications", "Email + push"],
    ["card", "Billing", "Weekly · no VAT"],
  ];

  return (
    <>
      <CafeTopbar eyebrow={`${cafe?.name ?? "Café"} · Café`} title="Settings" />
      <div className="content">
        <div className="cols-2">
          <div className="set-list">
            {rows.map(([ic, label, val]) => (
              <div key={label} className="set-row">
                <span className="set-ic"><WIcon name={ic} size={18} sw={1.8} stroke="#14503c" /></span>
                <span className="set-label">{label}</span>
                <span className="set-val">{val}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div className="sb-av" style={{ width: 54, height: 54, borderRadius: 16, fontSize: 19 }}>{av}</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{cafe?.name ?? "Café"}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{session.name} · Café</div>
              </div>
            </div>
            <CafeSignOut />
          </div>
        </div>
      </div>
    </>
  );
}
