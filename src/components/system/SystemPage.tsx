import type { ReactNode } from "react";

export function SystemPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">{children}</div>
    </div>
  );
}
