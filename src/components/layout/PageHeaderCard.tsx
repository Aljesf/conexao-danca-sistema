import type { ReactNode } from "react";

type PageHeaderCardProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function PageHeaderCard({ title, subtitle, children }: PageHeaderCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      {children}
    </div>
  );
}
