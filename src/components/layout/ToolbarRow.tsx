import type { ReactNode } from "react";

type ToolbarRowProps = {
  children: ReactNode;
  className?: string;
};

export default function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
