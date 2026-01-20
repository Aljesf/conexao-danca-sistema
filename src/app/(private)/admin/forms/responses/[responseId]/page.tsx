"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ApiAnswer = {
  id: string;
  valor_texto: string | null;
  valor_numero: number | null;
  valor_boolean: boolean | null;
  valor_data: string | null;
  valor_opcao: string | null;
  form_questions: { id: string; codigo: string; titulo: string; tipo: string } | null;
  selected_options: { option_id: string; valor: string; rotulo: string }[];
};

export default function ResponseDetailPage() {
  const params = useParams<{ responseId: string }>();
  const responseId = params.responseId;

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    response?: {
      id: string;
      template_id: string;
      pessoa_id: number;
      status: string;
      started_at: string | null;
      submitted_at: string | null;
      created_at: string;
      updated_at: string;
      pessoas?: {
        id: number;
        nome?: string | null;
        telefone?: string | null;
        email?: string | null;
      } | null;
      form_templates?: {
        id: string;
        nome?: string | null;
        descricao?: string | null;
        status?: string | null;
        versao?: number | null;
      } | null;
    } | null;
    answers?: ApiAnswer[];
  } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/forms/responses/${responseId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setPayload(json);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [responseId]);

  const templateId = payload?.response?.template_id as string | undefined;

  const renderValue = (a: ApiAnswer) => {
    if (a.selected_options?.length) {
      return a.selected_options.map((o) => o.rotulo).join(", ");
    }
    if (a.valor_opcao) return a.valor_opcao;
    if (a.valor_texto) return a.valor_texto;
    if (typeof a.valor_numero === "number") return String(a.valor_numero);
    if (typeof a.valor_boolean === "boolean") return a.valor_boolean ? "Sim" : "Não";
    if (a.valor_data) return new Date(a.valor_data).toLocaleDateString("pt-BR");
    return "-";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Resposta Individual</h1>
              <p className="text-sm text-slate-600">
                Leitura e auditoria da resposta preenchida.
              </p>
              {!loading && payload?.response?.pessoas?.nome && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Pessoa:</span>{" "}
                  {payload.response.pessoas.nome}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {templateId && (
                <Link
                  className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  href={`/admin/forms/templates/${templateId}/responses`}
                >
                  Voltar para lista
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          {loading && <div className="text-sm text-slate-500">Carregando...</div>}

          {!loading && (
            <>
              <div className="text-sm text-slate-700">
                <span className="font-medium">Status:</span>{" "}
                {payload?.response?.status ?? "-"} <span className="mx-2">•</span>
                <span className="font-medium">Enviado em:</span>{" "}
                {payload?.response?.submitted_at
                  ? new Date(payload.response.submitted_at).toLocaleString("pt-BR")
                  : "-"}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">Pergunta</th>
                      <th className="px-3 py-2 text-left">Resposta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payload?.answers ?? []).map((a: ApiAnswer) => (
                      <tr key={a.id} className="border-b last:border-b-0 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">
                            {a.form_questions?.titulo ?? "Pergunta"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {a.form_questions?.codigo ?? ""}{" "}
                            {a.form_questions?.tipo ? `• ${a.form_questions.tipo}` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2">{renderValue(a)}</td>
                      </tr>
                    ))}
                    {(payload?.answers ?? []).length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-slate-500" colSpan={2}>
                          Nenhuma resposta encontrada para este preenchimento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
