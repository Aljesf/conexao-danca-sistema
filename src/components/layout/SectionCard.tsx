import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({ title, description, actions, children, className }: SectionCardProps) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm ${className ?? ""}`.trim()}>
      {title || description || actions ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="text-xs text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="text-xs text-slate-500">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
