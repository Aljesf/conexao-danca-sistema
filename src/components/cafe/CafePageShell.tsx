import type { ReactNode } from "react";
import CafePanel from "@/components/cafe/CafePanel";
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
    <div
      className={`mx-auto flex w-full max-w-[1400px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8 ${className ?? ""}`.trim()}
    >
      <CafePanel className="px-6 py-5 sm:px-7">
        <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      </CafePanel>
      {summary ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{summary}</div> : null}
      {children}
    </div>
  );
}
