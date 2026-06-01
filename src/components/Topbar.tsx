"use client";

import { useRouter } from "next/navigation";

export function Topbar({
  name,
  roleLabel,
}: {
  name: string;
  roleLabel: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-bobo">BOBO</span>
          <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
            {roleLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-stone-600">{name}</span>
          <button
            onClick={logout}
            className="rounded-md border border-stone-300 px-3 py-1 text-stone-700 hover:bg-stone-100"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
