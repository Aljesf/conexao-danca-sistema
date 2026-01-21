"use client";

import * as React from "react";

type OptionBreakdown = {
  option_id?: string;
  valor?: string;
  rotulo?: string;
  quantidade: number;
  percentual: number;
};

type AnalyticsPayload =
  | { kind: "single_choice" | "multi_choice" | "boolean"; total: number; opcoes: OptionBreakdown[] }
  | { kind: "number" | "scale"; total: number; media: number | null; min: number | null; max: number | null }
  | { kind: "text" | "textarea"; total: number; respostas: string[] }
  | { kind: "unknown"; total: number };

export type AnalyticsQuestionItem = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  ordem?: number;
  totalResponses: number;
  filled: number;
  analytics?: AnalyticsPayload;
};

function fmtPercent(v: number): string {
  if (!Number.isFinite(v)) return "0%";
  return `${v}%`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function BarRow(props: { label: string; count: number; pct: number }) {
  const width = clamp(props.pct, 0, 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium text-slate-800">{props.label}</div>
        <div className="text-slate-600">
          {props.count} - {fmtPercent(props.pct)}
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-violet-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AnalyticsQuestionCard({ item }: { item: AnalyticsQuestionItem }) {
  const [showAllText, setShowAllText] = React.useState(false);

  const tipoLabel = item.tipo ?? "-";
  const a = item.analytics;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold text-slate-900">{item.titulo}</div>
        <div className="text-xs text-slate-500">
          {item.codigo} - {tipoLabel}
        </div>
      </div>

      <div className="mt-4">
        {a && (a.kind === "single_choice" || a.kind === "multi_choice" || a.kind === "boolean") && (
          <div className="flex flex-col gap-3">
            {a.opcoes.length === 0 ? (
              <div className="text-sm text-slate-500">Sem opcoes registradas para exibir.</div>
            ) : (
              a.opcoes
                .slice()
                .sort((x, y) => (y.percentual ?? 0) - (x.percentual ?? 0))
                .map((op, idx) => (
                  <BarRow
                    key={op.option_id ?? `${op.valor ?? "op"}-${idx}`}
                    label={op.rotulo ?? op.valor ?? "-"}
                    count={op.quantidade ?? 0}
                    pct={op.percentual ?? 0}
                  />
                ))
            )}
            <div className="text-xs text-slate-500">
              Base: {item.totalResponses} respostas - Registradas: {item.filled}
            </div>
          </div>
        )}

        {a && (a.kind === "number" || a.kind === "scale") && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Media</div>
              <div className="text-lg font-semibold text-slate-900">
                {a.media == null ? "-" : a.media.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Minimo</div>
              <div className="text-lg font-semibold text-slate-900">{a.min == null ? "-" : a.min}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Maximo</div>
              <div className="text-lg font-semibold text-slate-900">{a.max == null ? "-" : a.max}</div>
            </div>
            <div className="col-span-3 text-xs text-slate-500">
              Respostas numericas validas: {a.total} - Total de respostas do formulario: {item.totalResponses}
            </div>
          </div>
        )}

        {a && (a.kind === "text" || a.kind === "textarea") && (
          <div className="flex flex-col gap-2">
            {a.respostas.length === 0 ? (
              <div className="text-sm text-slate-500">Sem respostas textuais.</div>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  {showAllText ? (
                    <div className="flex flex-col gap-2">
                      {a.respostas.map((t, i) => (
                        <div key={`${i}-${t.slice(0, 16)}`} className="whitespace-pre-wrap">
                          - {t}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{a.respostas[0]}</div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">Total de respostas textuais: {a.total}</div>
                  {a.total > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowAllText((v) => !v)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {showAllText ? "Ver menos" : "Ver mais"}
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  Proxima etapa: gerar opiniao geral (IA) a partir dessas respostas.
                </div>
              </>
            )}
          </div>
        )}

        {!a && <div className="text-sm text-slate-500">Sem analytics disponivel para esta pergunta.</div>}
        {a && a.kind === "unknown" && (
          <div className="text-sm text-slate-500">Tipo nao suportado para analise detalhada.</div>
        )}
      </div>
    </div>
  );
}
