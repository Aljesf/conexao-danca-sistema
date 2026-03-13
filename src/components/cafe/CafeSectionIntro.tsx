import type { ReactNode } from "react";

type CafeSectionIntroProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function CafeSectionIntro({
  title,
  description,
  actions,
}: CafeSectionIntroProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description ? <p className="max-w-3xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
