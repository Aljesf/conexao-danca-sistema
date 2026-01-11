"use client";

import * as React from "react";

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function FinancePageShell({
  title,
  subtitle,
  actions,
  children,
}: Props): React.JSX.Element {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
              {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
