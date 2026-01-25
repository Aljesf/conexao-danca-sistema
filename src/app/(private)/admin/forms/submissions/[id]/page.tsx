"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Submission = {
  id: string;
  template_id: string;
  template_versao: number | null;
  pessoa_id: number | null;
  responsavel_id: number | null;
  public_token: string | null;
  created_at: string | null;
  submitted_at?: string | null;
};

type PessoaResumo = { id: number; nome: string | null };

type Answer = {
  id: string;
  template_item_id: string | null;
  question_id: string | null;
  value_text: string | null;
  value_number: number | null;
  value_bool: boolean | null;
  value_date: string | null;
  value_json: unknown;
  question_titulo_snapshot: string | null;
  option_rotulos_snapshot: string | null;
  created_at: string | null;
  question?: { id: string; codigo: string | null; titulo: string | null } | null;
};

type ApiResponse = {
  data?: {
    submission: Submission;
    pessoa?: PessoaResumo | null;
    responsavel?: PessoaResumo | null;
    answers: Answer[];
  };
  error?: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("pt-BR");
}

function formatAnswerValue(answer: Answer): string {
  if (answer.option_rotulos_snapshot) return answer.option_rotulos_snapshot;
  if (answer.value_text) return answer.value_text;
  if (typeof answer.value_number === "number" && Number.isFinite(answer.value_number)) {
    return String(answer.value_number);
  }
  if (typeof answer.value_bool === "boolean") return answer.value_bool ? "Sim" : "Nao";
  if (answer.value_date) return answer.value_date;
  if (answer.value_json != null) {
    if (Array.isArray(answer.value_json)) return answer.value_json.map(String).join(", ");
    return JSON.stringify(answer.value_json);
  }
  return "-";
}

export default function AdminFormsSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse["data"] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/forms/submissions/${id}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar respostas.");
      setData(json.data ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const answers = useMemo(() => data?.answers ?? [], [data]);
  const submission = data?.submission ?? null;
  const answersCount = answers.length;

  if (loading) return <div className="p-6 text-sm text-slate-600">Carregando...</div>;
  if (err && !data) return <div className="p-6 text-sm text-red-600">{err}</div>;
  if (!submission) return <div className="p-6 text-sm text-slate-600">Envio nao encontrado.</div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Respostas do formulario" description={`Envio #${submission.id}`} />

      {msg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {msg}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <SectionCard title="Resumo do envio" description="Informacoes principais deste formulario.">
        <div className="grid gap-2 text-sm text-slate-700">
          <div>
            <span className="font-medium text-slate-600">Template:</span>{" "}
            {submission.template_id}
          </div>
          <div>
            <span className="font-medium text-slate-600">Pessoa:</span>{" "}
            {data?.pessoa?.nome ?? (submission.pessoa_id ? `#${submission.pessoa_id}` : "-")}
          </div>
          <div>
            <span className="font-medium text-slate-600">Responsavel:</span>{" "}
            {data?.responsavel?.nome ?? (submission.responsavel_id ? `#${submission.responsavel_id}` : "-")}
          </div>
          <div>
            <span className="font-medium text-slate-600">Gerado em:</span> {formatDate(submission.created_at)}
          </div>
          <div>
            <span className="font-medium text-slate-600">Respondido em:</span>{" "}
            {submission.submitted_at ? formatDate(submission.submitted_at) : "Pendente"}
          </div>
          <div>
            <span className="font-medium text-slate-600">Total de respostas:</span> {answersCount}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end">
          <button
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            onClick={async () => {
              const ok = window.confirm("Resetar respostas deste envio?");
              if (!ok) return;
              setErr(null);
              setMsg(null);
              const res = await fetch(`/api/admin/forms/submissions/${submission.id}/reset`, {
                method: "POST",
              });
              const json = (await res.json()) as { ok?: boolean; error?: string };
              if (!res.ok || json.ok === false) {
                setErr(json.error ?? "Falha ao resetar respostas.");
                return;
              }
              setMsg("Respostas resetadas com sucesso.");
              await load();
            }}
          >
            Resetar respostas
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Respostas" description="Lista de respostas registradas.">
        {answers.length === 0 ? (
          <div className="text-sm text-slate-500">Nenhuma resposta enviada ainda.</div>
        ) : (
          <div className="grid gap-3">
            {answers.map((answer) => {
              const label =
                answer.question?.titulo ??
                answer.question_titulo_snapshot ??
                answer.question?.codigo ??
                "Pergunta";
              const code = answer.question?.codigo;
              const key =
                answer.id ??
                `${submission.id ?? "sub"}:${answer.template_item_id ?? "item"}:${answer.question_id ?? "q"}`;
              return (
                <div key={key} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium text-slate-900">
                    {label}
                    {code ? <span className="ml-2 text-xs text-slate-500">({code})</span> : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{formatAnswerValue(answer)}</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
