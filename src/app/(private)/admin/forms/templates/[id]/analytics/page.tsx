"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ChoiceCount = { valor: string; rotulo: string; count: number; percent: number };
type NumericStats = { min: number | null; max: number | null; avg: number | null; filled: number };

type ByQuestion =
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "CHOICE"; counts: ChoiceCount[] }
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "MULTI"; counts: ChoiceCount[] }
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "BOOLEAN"; counts: ChoiceCount[] }
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "NUMERIC"; stats: NumericStats }
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "TEXT"; filled: number; samples: string[] }
  | { id: string; codigo: string; titulo: string; tipo: string; totalResponses: number; kind: "BASIC"; filled: number };

type ApiPayload = {
  template_id: string;
  totalResponses: number;
  firstAt?: string | null;
  lastAt?: string | null;
  byQuestion: ByQuestion[];
  warning?: string;
  junction_error?: string;
  sourceTemplateQuestions?: string | null;
};

export default function TemplateAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number>(0);
  const [firstAt, setFirstAt] = useState<string | null>(null);
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [byQuestion, setByQuestion] = useState<ByQuestion[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setWarning(null);

      try {
        const res = await fetch(`/api/forms/templates/${templateId}/analytics`, { cache: "no-store" });

        if (!res.ok) {
          const txt = await res.text();
          if (!alive) return;
          setErrorMsg(`Falha ao carregar analytics (${res.status}). Resposta: ${txt.slice(0, 400)}`);
          setByQuestion([]);
          setTotal(0);
          setFirstAt(null);
          setLastAt(null);
          return;
        }

        const json = (await res.json()) as ApiPayload;
        if (!alive) return;

        setTotal(json.totalResponses ?? 0);
        setByQuestion((json.byQuestion ?? []) as ByQuestion[]);
        setFirstAt(json.firstAt ? new Date(json.firstAt).toLocaleString("pt-BR") : null);
        setLastAt(json.lastAt ? new Date(json.lastAt).toLocaleString("pt-BR") : null);

        if (json.warning) {
          setWarning(
            `Aviso: ${json.warning}${
              json.sourceTemplateQuestions ? ` (junction: ${json.sourceTemplateQuestions})` : ""
            }${json.junction_error ? ` - ${json.junction_error}` : ""}`
          );
        }
      } catch (e) {
        if (!alive) return;
        setErrorMsg(`Erro inesperado ao carregar analytics: ${String(e)}`);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [templateId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Analytics do Formulario</h1>
              <p className="text-sm text-slate-600">
                Percentuais e estatisticas por pergunta (baseado nas respostas recebidas).
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href={`/admin/forms/templates/${templateId}/responses`}
              >
                Ver lista de respostas
              </Link>
              <Link
                className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                href="/admin/forms/templates"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-2">
          <div className="text-sm text-slate-700">
            <span className="font-medium">Total de respostas:</span>{" "}
            {loading ? "Carregando..." : total}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium">Primeira:</span> {firstAt ?? "-"}{" "}
            <span className="mx-2">•</span>
            <span className="font-medium">Ultima:</span> {lastAt ?? "-"}
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {warning && !errorMsg && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            {warning}
          </div>
        )}

        <div className="space-y-4">
          {loading && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-slate-500">
              Carregando...
            </div>
          )}

          {!loading && !errorMsg && byQuestion.length === 0 && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-slate-600">
              Nenhuma pergunta foi encontrada para este template no analytics.
              <div className="mt-2 text-xs text-slate-500">
                Isso normalmente indica que a tabela de vinculo Template - Perguntas (junction) nao foi identificada.
              </div>
            </div>
          )}

          {!loading && !errorMsg && byQuestion.map((q) => (
            <div key={q.id} className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
              <div>
                <div className="text-base font-semibold text-slate-900">{q.titulo}</div>
                <div className="text-xs text-slate-500">{q.codigo} • {q.tipo}</div>
              </div>

              {(q.kind === "CHOICE" || q.kind === "MULTI" || q.kind === "BOOLEAN") ? (
                <div className="space-y-2">
                  {q.counts.map((c) => (
                    <div key={c.valor} className="flex items-center justify-between gap-3 text-sm">
                      <div className="text-slate-700">{c.rotulo}</div>
                      <div className="text-slate-600">
                        {c.count} ({c.percent}%)
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {q.kind === "NUMERIC" ? (
                <div className="grid gap-3 sm:grid-cols-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">Min</div>
                    <div className="font-medium">{q.stats.min ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">Max</div>
                    <div className="font-medium">{q.stats.max ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">Media</div>
                    <div className="font-medium">{q.stats.avg ?? "-"}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-slate-500">Preenchidas</div>
                    <div className="font-medium">{q.stats.filled}</div>
                  </div>
                </div>
              ) : null}

              {q.kind === "TEXT" ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-600">
                    Preenchidas: <span className="font-medium">{q.filled}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border p-3 text-sm text-slate-700 space-y-2">
                    {q.samples.length === 0 ? (
                      <div className="text-slate-500">Sem respostas textuais registradas.</div>
                    ) : (
                      q.samples.map((t, idx) => (
                        <div key={`${idx}-${t.slice(0, 12)}`} className="border-b last:border-b-0 pb-2 last:pb-0">
                          {t}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {q.kind === "BASIC" ? (
                <div className="text-sm text-slate-600">
                  Respostas registradas: <span className="font-medium">{q.filled}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
