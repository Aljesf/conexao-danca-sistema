"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ChoiceCount = { valor: string; rotulo: string; count: number; percent: number };
type NumericStats = { min: number | null; max: number | null; avg: number | null; filled: number };
type ByQuestion =
  | {
      id: string;
      codigo: string;
      titulo: string;
      tipo: string;
      totalResponses: number;
      kind: "CHOICE";
      counts: ChoiceCount[];
    }
  | {
      id: string;
      codigo: string;
      titulo: string;
      tipo: string;
      totalResponses: number;
      kind: "BOOLEAN";
      counts: ChoiceCount[];
    }
  | {
      id: string;
      codigo: string;
      titulo: string;
      tipo: string;
      totalResponses: number;
      kind: "NUMERIC";
      stats: NumericStats;
    }
  | {
      id: string;
      codigo: string;
      titulo: string;
      tipo: string;
      totalResponses: number;
      kind: "BASIC";
      filled: number;
    };

export default function TemplateAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number>(0);
  const [byQuestion, setByQuestion] = useState<ByQuestion[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/forms/templates/${templateId}/analytics`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setTotal(json?.totalResponses ?? 0);
        setByQuestion((json?.byQuestion ?? []) as ByQuestion[]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
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
              <h1 className="text-xl font-semibold">Analytics do Formulário</h1>
              <p className="text-sm text-slate-600">
                Percentuais e estatísticas por pergunta (baseado nas respostas recebidas).
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

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-700">
            <span className="font-medium">Total de respostas:</span>{" "}
            {loading ? "Carregando..." : total}
          </div>
        </div>

        <div className="space-y-4">
          {loading && (
            <div className="rounded-2xl border bg-white p-6 shadow-sm text-sm text-slate-500">
              Carregando...
            </div>
          )}

          {!loading &&
            byQuestion.map((q) => (
              <div key={q.id} className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
                <div>
                  <div className="text-base font-semibold text-slate-900">{q.titulo}</div>
                  <div className="text-xs text-slate-500">
                    {q.codigo} • {q.tipo}
                  </div>
                </div>

                {q.kind === "CHOICE" || q.kind === "BOOLEAN" ? (
                  <div className="space-y-2">
                    {q.counts.map((c) => (
                      <div
                        key={c.valor}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
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
                      <div className="text-xs text-slate-500">Mín</div>
                      <div className="font-medium">{q.stats.min ?? "-"}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-slate-500">Máx</div>
                      <div className="font-medium">{q.stats.max ?? "-"}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-slate-500">Média</div>
                      <div className="font-medium">{q.stats.avg ?? "-"}</div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="text-xs text-slate-500">Preenchidas</div>
                      <div className="font-medium">{q.stats.filled}</div>
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
