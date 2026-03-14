import type { ReactNode } from "react";
import CafeCard from "@/components/cafe/CafeCard";

type CafeMetricCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  className?: string;
};

export default function CafeMetricCard({
  label,
  value,
  description,
  icon,
  className,
}: CafeMetricCardProps) {
  return (
    <CafeCard variant="stats" className={["gap-3 p-5", className ?? ""].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8c6640]">
            {label}
          </p>
          <div className="text-[1.75rem] font-semibold leading-none tracking-tight text-slate-950">
            {value}
          </div>
        </div>
        {icon ? <div className="text-slate-400">{icon}</div> : null}
      </div>
      {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
    </CafeCard>
  );
}
