"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalyticsQuestionCard, type AnalyticsQuestionItem } from "@/components/forms/analytics/AnalyticsQuestionCard";

type ApiPayload = {
  template_id: string;
  totalResponses: number;
  firstAt?: string | null;
  lastAt?: string | null;
  byQuestion: AnalyticsQuestionItem[];
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
  const [byQuestion, setByQuestion] = useState<AnalyticsQuestionItem[]>([]);
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
        setByQuestion((json.byQuestion ?? []) as AnalyticsQuestionItem[]);
        setFirstAt(json.firstAt ? new Date(json.firstAt).toLocaleString("pt-BR") : null);
        setLastAt(json.lastAt ? new Date(json.lastAt).toLocaleString("pt-BR") : null);

        if (json.warning) {
          setWarning(
            `Aviso: ${json.warning}${json.sourceTemplateQuestions ? ` (junction: ${json.sourceTemplateQuestions})` : ""}${
              json.junction_error ? ` - ${json.junction_error}` : ""
            }`
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
            <span className="font-medium">Total de respostas:</span> {loading ? "Carregando..." : total}
          </div>
          <div className="text-sm text-slate-600">
            <span className="font-medium">Primeira:</span> {firstAt ?? "-"}{" "}
            <span className="mx-2">-</span>
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
            <AnalyticsQuestionCard key={q.id} item={q} />
          ))}
        </div>
      </div>
    </div>
  );
}
