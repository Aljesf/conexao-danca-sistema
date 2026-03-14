import type { ReactNode } from "react";

type CafePanelProps = {
  children: ReactNode;
  className?: string;
};

export default function CafePanel({ children, className }: CafePanelProps) {
  return (
    <div
      className={[
        "rounded-[20px] border border-[#efe5d6] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f0_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
