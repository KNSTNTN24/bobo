"use client";

import { useState } from "react";

type Flags = { canBakeryEditProducts: boolean; canBakeryEditPrices: boolean };

export function SettingsForm({
  initial,
  currency,
}: {
  initial: Flags;
  currency: string;
}) {
  const [flags, setFlags] = useState<Flags>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function update(patch: Partial<Flags>) {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(false);
    if (res.ok) {
      const d = (await res.json()) as { settings: Flags };
      setFlags({
        canBakeryEditProducts: d.settings.canBakeryEditProducts,
        canBakeryEditPrices: d.settings.canBakeryEditPrices,
      });
      setSaved(true);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Toggle
        label="Bakery can edit the product catalog"
        hint="Add, rename, recategorise and archive products."
        checked={flags.canBakeryEditProducts}
        disabled={busy}
        onChange={(v) => update({ canBakeryEditProducts: v })}
      />
      <Toggle
        label="Bakery can edit prices"
        hint="Set per-product prices."
        checked={flags.canBakeryEditPrices}
        disabled={busy}
        onChange={(v) => update({ canBakeryEditPrices: v })}
      />

      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        Currency: <span className="font-medium text-stone-800">{currency}</span>{" "}
        <span className="text-stone-400">(single currency, no VAT in the prototype)</span>
      </div>

      {saved && <p className="text-sm text-green-700">Saved.</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-stone-200 bg-white px-4 py-3">
      <span>
        <span className="block font-medium text-stone-800">{label}</span>
        <span className="block text-sm text-stone-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-bobo"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
