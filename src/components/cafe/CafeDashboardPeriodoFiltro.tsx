"use client";

type CafeDashboardPeriodoFiltroProps = {
  value: "7d" | "15d" | "30d" | "hoje" | "mes";
  onChange: (value: "7d" | "15d" | "30d" | "hoje" | "mes") => void;
};

const OPTIONS: Array<{
  value: "7d" | "15d" | "30d" | "hoje" | "mes";
  label: string;
}> = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "mes", label: "Mes atual" },
];

export default function CafeDashboardPeriodoFiltro({
  value,
  onChange,
}: CafeDashboardPeriodoFiltroProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full border px-3.5 py-2 text-sm font-medium transition",
              active
                ? "border-[#c17d3a] bg-[#fff1dd] text-[#8f5b24] shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
