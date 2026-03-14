import type { ReactNode } from "react";
import CafePanel from "@/components/cafe/CafePanel";

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
    <CafePanel className="px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {title ? <p className="text-sm font-semibold text-slate-950">{title}</p> : null}
          {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </CafePanel>
  );
}
