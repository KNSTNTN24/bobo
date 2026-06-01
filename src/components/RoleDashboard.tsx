import { Topbar } from "./Topbar";

export type Feature = {
  title: string;
  desc: string;
  milestone: string;
};

export function RoleDashboard({
  name,
  roleLabel,
  intro,
  features,
  topActions,
}: {
  name: string;
  roleLabel: string;
  intro: string;
  features: Feature[];
  topActions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Topbar name={name} roleLabel={roleLabel} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        {topActions && <div className="mb-6">{topActions}</div>}
        <p className="mb-6 max-w-2xl text-stone-600">{intro}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-stone-800">{f.title}</h3>
                <span className="shrink-0 rounded bg-bobo/10 px-2 py-0.5 text-xs font-medium text-bobo">
                  {f.milestone}
                </span>
              </div>
              <p className="text-sm text-stone-600">{f.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-stone-400">
          M0 skeleton — feature screens land in the milestones shown on each
          card.
        </p>
      </main>
    </div>
  );
}
