import type { ReactNode } from "react";

type CafeToolbarProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export default function CafeToolbar({
  title,
  description,
  children,
}: CafeToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {title ? <p className="text-sm font-semibold text-slate-900">{title}</p> : null}
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
