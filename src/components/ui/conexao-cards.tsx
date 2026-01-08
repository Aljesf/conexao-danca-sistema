import type { ReactNode } from "react";

export type SectionCardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export type StatCardTone = "slate" | "violet" | "amber" | "rose";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: StatCardTone;
};

export const pillBase =
  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition md:text-xs";
export const pillNeutral = `${pillBase} border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50`;
export const pillAccent = `${pillBase} border-violet-100 bg-white/70 text-violet-700 hover:bg-violet-50`;

export function SectionCard({
  title,
  subtitle,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {subtitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {subtitle}
            </p>
          ) : null}
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, description, tone = "slate" }: StatCardProps) {
  const toneClass = {
    slate: "text-slate-900",
    violet: "text-violet-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
    </div>
  );
}
