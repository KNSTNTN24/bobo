"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO = [
  ["admin", "admin123", "Administrator"],
  ["bakery", "bakery123", "Bakery"],
  ["soho", "soho123", "Café — Soho"],
  ["shoreditch", "shoreditch123", "Café — Shoreditch"],
  ["courier", "courier123", "Courier"],
];

export function LoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Invalid login or password");
      return;
    }
    const data = (await res.json()) as { home?: string };
    router.push(data.home ?? "/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-1 text-2xl font-bold text-bobo">BOBO</h1>
        <p className="mb-6 text-sm text-stone-500">
          Bakery-to-cafés delivery platform
        </p>

        <label className="mb-1 block text-sm font-medium">Login</label>
        <input
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-bobo"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          autoFocus
        />

        <label className="mb-1 block text-sm font-medium">Password</label>
        <input
          type="password"
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-bobo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-bobo px-4 py-2 font-medium text-white hover:bg-bobo-dark disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white/60 p-4 text-xs text-stone-600">
        <p className="mb-2 font-semibold text-stone-700">Demo accounts</p>
        <ul className="space-y-1">
          {DEMO.map(([u, p, label]) => (
            <li key={u} className="flex justify-between gap-2">
              <span className="text-stone-500">{label}</span>
              <button
                type="button"
                onClick={() => {
                  setLogin(u);
                  setPassword(p);
                }}
                className="font-mono text-bobo hover:underline"
              >
                {u} / {p}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
