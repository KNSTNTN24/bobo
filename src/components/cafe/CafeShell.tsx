"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WIcon } from "./WIcon";

type NavItem = { href: string; label: string; icon: string; badge?: string };

export function CafeShell({
  brandSub,
  user,
  requestsBadge,
  ordersDraft,
  children,
}: {
  brandSub: string;
  user: { av: string; name: string; sub: string };
  requestsBadge: number;
  ordersDraft: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = [
    { href: "/cafe/orders", label: "Weekly order", icon: "grid", badge: ordersDraft ? "Draft" : undefined },
    { href: "/cafe/requests", label: "Requests", icon: "list", badge: requestsBadge > 0 ? String(requestsBadge) : undefined },
    { href: "/cafe/deliveries", label: "Deliveries", icon: "truck" },
    { href: "/cafe/invoices", label: "Invoices", icon: "invoice" },
    { href: "/cafe/settings", label: "Settings", icon: "cog" },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="web">
      <aside className="sb">
        <div className="sb-brand">
          <div className="sb-logo">BO</div>
          <div className="sb-brand-tx">
            <b>BOBO</b>
            <span>{brandSub}</span>
          </div>
        </div>
        <div className="sb-section">Location</div>
        <nav className="sb-nav">
          {nav.map((n) => {
            const on = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} className={"sb-item" + (on ? " on" : "")}>
                <span className="sb-ic">
                  <WIcon name={n.icon} size={20} sw={on ? 2 : 1.8} />
                </span>
                <span>{n.label}</span>
                {n.badge ? <span className="sb-badge">{n.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="sb-foot">
          <Link href="/cafe/settings" className="sb-user">
            <div className="sb-av">{user.av}</div>
            <div className="sb-user-tx">
              <b>{user.name}</b>
              <span>{user.sub}</span>
            </div>
          </Link>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}

export function CafeTopbar({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div className="tb-l">
        <div className="tb-eyebrow">{eyebrow}</div>
        <h1 className="tb-title">{title}</h1>
      </div>
      {children ? <div className="tb-r">{children}</div> : null}
    </div>
  );
}
