import type { ReactNode } from "react";

type SystemSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function SystemSectionCard({ title, description, children, footer }: SystemSectionCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>

      {children}

      {footer ? (
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">{footer}</div>
      ) : null}
    </div>
  );
}
