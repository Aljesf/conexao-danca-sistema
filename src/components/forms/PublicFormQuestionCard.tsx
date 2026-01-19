"use client";

import * as React from "react";

export type PublicFormQuestionCardProps = {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
};

export function PublicFormQuestionCard(props: PublicFormQuestionCardProps) {
  const { label, required, hint, children } = props;

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-5 py-4 md:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 md:text-[15px]">
              {label}{" "}
              {required ? (
                <span className="text-[11px] font-semibold text-rose-600">*</span>
              ) : null}
            </div>
            {hint ? (
              <div className="mt-1 text-xs leading-relaxed text-slate-500 md:text-[13px]">
                {hint}
              </div>
            ) : null}
          </div>

          {required ? (
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
              Obrigatoria
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
              Opcional
            </span>
          )}
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
