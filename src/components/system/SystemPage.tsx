import type { ReactNode } from "react";

type SystemPageProps = {
  children: ReactNode;
  maxWidthClassName?: string;
  pageClassName?: string;
  contentClassName?: string;
};

export function SystemPage({
  children,
  maxWidthClassName = "max-w-6xl",
  pageClassName = "",
  contentClassName = "",
}: SystemPageProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 md:px-6 xl:px-8 ${pageClassName}`}>
      <div className={`mx-auto flex ${maxWidthClassName} flex-col gap-8 ${contentClassName}`}>{children}</div>
    </div>
  );
}
