"use client";

type CompetenciaTab = {
  competencia: string;
  competencia_label: string;
};

type Props = {
  items: CompetenciaTab[];
  active: string | null;
  onChange: (competencia: string) => void;
};

export function CompetenciaTabs({ items, active, onChange }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Competencias</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Carteira por mes</h2>
        </div>
        <p className="text-sm text-slate-500">A aba ativa concentra a leitura operacional do momento.</p>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div role="tablist" className="inline-flex min-w-full gap-2">
          {items.map((item) => {
            const isActive = item.competencia === active;
            return (
              <button
                key={item.competencia}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(item.competencia)}
                className={`inline-flex min-w-[148px] flex-col rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <span className="text-xs uppercase tracking-wide opacity-70">Competencia</span>
                <span className="mt-1 text-sm font-semibold">{item.competencia_label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
