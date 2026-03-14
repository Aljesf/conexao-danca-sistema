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
    <div className="flex flex-col gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
