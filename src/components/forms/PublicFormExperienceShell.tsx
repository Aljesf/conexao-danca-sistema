"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";

type ProgressMode = "auto" | "manual";

export type PublicFormExperienceShellProps = {
  title: string;
  subtitle?: string;
  headerImageUrl?: string | null;
  hideHeader?: boolean;

  /**
   * Conteudo introdutorio (texto curto para orientar e acolher).
   * Aceita string simples (sem HTML). Se quiser markdown no futuro, evoluimos depois.
   */
  introText?: string;

  /**
   * Contagem de campos obrigatorios / respondidos (para progress).
   * Se voce ainda nao tiver isso no render atual, pode comecar com mode="manual" e passar 0/0.
   */
  progress?: {
    mode?: ProgressMode;
    totalRequired?: number;
    answeredRequired?: number;
  };

  children: React.ReactNode;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function PublicFormExperienceShell(props: PublicFormExperienceShellProps) {
  const { title, subtitle, headerImageUrl, introText, progress, children, hideHeader } = props;

  const mode: ProgressMode = progress?.mode ?? "manual";
  const total = progress?.totalRequired ?? 0;
  const done = progress?.answeredRequired ?? 0;

  const pct = mode === "auto" && total > 0 ? Math.round((done / total) * 100) : 0;

  const pctSafe = clamp(pct, 0, 100);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-5 md:py-12">
        {!hideHeader ? (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            {headerImageUrl ? (
              <div className="relative">
                <div className="bg-gradient-to-r from-slate-50 to-white">
                  <div className="px-6 pt-6">
                    <div className="w-full">
                      <div className="relative w-full overflow-hidden rounded-xl bg-slate-100">
                        <img
                          src={headerImageUrl}
                          alt=""
                          className="mx-auto h-auto w-full max-h-[260px] object-contain md:max-h-[320px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-5">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-1 text-sm text-slate-600 md:text-base">{subtitle}</p>
                  ) : null}

                  {introText ? (
                    <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                      <p className="text-sm leading-relaxed text-slate-700 sm:text-base sm:leading-relaxed">
                        {introText}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Leva poucos minutos. Responda com calma - nao existe resposta perfeita.
                      </p>
                    </div>
                  ) : null}

                  {mode === "auto" && total > 0 ? (
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                          Progresso: <strong>{done}</strong>/<strong>{total}</strong> obrigatorias
                        </span>
                        <span className="tabular-nums">{pctSafe}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900/80 transition-all"
                          style={{ width: `${pctSafe}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="px-6 py-6">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-sm text-slate-600 md:text-base">{subtitle}</p>
                ) : null}

                {introText ? (
                  <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                    <p className="text-sm leading-relaxed text-slate-700 sm:text-base sm:leading-relaxed">
                      {introText}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Leva poucos minutos. Responda com calma - nao existe resposta perfeita.
                    </p>
                  </div>
                ) : null}

                {mode === "auto" && total > 0 ? (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Progresso: <strong>{done}</strong>/<strong>{total}</strong> obrigatorias
                      </span>
                      <span className="tabular-nums">{pctSafe}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900/80 transition-all"
                        style={{ width: `${pctSafe}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Content */}
        <div className="mt-6 space-y-4">{children}</div>

        {/* Footer microcopy (neuro: fechamento com seguranca) */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Suas respostas ajudam a escola a decidir com responsabilidade e cuidado.
          </p>
        </div>
      </div>
    </div>
  );
}
