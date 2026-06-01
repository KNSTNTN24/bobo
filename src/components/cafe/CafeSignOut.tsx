"use client";

import { useRouter } from "next/navigation";

export function CafeSignOut() {
  const router = useRouter();
  async function out() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button className="btn ghost" style={{ width: "100%", marginTop: 20, color: "var(--rose)" }} onClick={out}>
      Sign out
    </button>
  );
}
