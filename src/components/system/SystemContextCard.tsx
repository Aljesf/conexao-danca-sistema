import type { ReactNode } from "react";

type SystemContextCardProps = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export function SystemContextCard({ title, subtitle, children }: SystemContextCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-slate-600">{subtitle}</p>
      {children}
    </div>
  );
}
