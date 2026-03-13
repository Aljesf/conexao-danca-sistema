import type { ReactNode } from "react";
import PageHeader from "@/components/layout/PageHeader";

type CafePageShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function CafePageShell({
  eyebrow,
  title,
  description,
  actions,
  summary,
  children,
  className,
}: CafePageShellProps) {
  return (
    <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 ${className ?? ""}`.trim()}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {summary ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary}</div> : null}
      {children}
    </div>
  );
}
