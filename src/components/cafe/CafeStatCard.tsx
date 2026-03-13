import type { ReactNode } from "react";

type CafeStatCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
};

export default function CafeStatCard({
  label,
  value,
  description,
  icon,
}: CafeStatCardProps) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/70 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            {label}
          </p>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
      {description ? <p className="mt-3 text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
