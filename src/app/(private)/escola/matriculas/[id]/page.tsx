"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO, formatDateTimeISO } from "@/lib/formatters/date";

type MatriculaDetalheResp = {
  ok: boolean;
  matricula?: Record<string, unknown> | null;
  pessoa?: { id?: number; nome?: string | null } | null;
  responsavel_financeiro?: { id?: number; nome?: string | null } | null;
  servico?: { id?: number; titulo?: string | null } | null;
  turma?: { turma_id?: number; nome?: string | null } | null;
  unidade_execucao?: { unidade_execucao_id?: number; denominacao?: string | null; nome?: string | null } | null;
  unidade_execucao_label?: string | null;
  preco_aplicado?: { valor_centavos?: number; moeda?: string | null; created_at?: string | null } | null;
  plano_pagamento?: { id?: number; titulo?: string | null; ciclo_cobranca?: string | null; numero_parcelas?: number | null } | null;
  financeiro_resumo?: {
    entrada_total_paga_centavos: number;
    parcelas_pendentes_count: number;
    parcelas_pendentes_total_centavos: number;
    proximo_vencimento: string | null;
    ultima_atualizacao: string | null;
  } | null;
  resumo_financeiro_cartao_conexao?: {
    parcelas_pendentes: number;
    proximo_vencimento: string | null;
    fatura_id_proxima: number | null;
  } | null;
  error?: string;
  message?: string;
};

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return `HTTP ${status}`;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data as T;
}

function labelFromPessoa(pessoa?: { nome?: string | null } | null, fallbackId?: number | null): string {
  const nome = pessoa?.nome?.trim();
  if (nome) return nome;
  return fallbackId ? `Pessoa #${fallbackId}` : "-";
}

export default function MatriculaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<MatriculaDetalheResp | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        setErro(null);
        setLoading(true);
        const resp = await fetchJSON<MatriculaDetalheResp>(`/api/escola/matriculas/${id}`);
        if (ativo) setData(resp);
      } catch (e: unknown) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar matricula.");
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [id]);

  const matricula = data?.matricula ?? null;
  const pessoaId = useMemo(() => Number(matricula?.pessoa_id ?? NaN), [matricula]);
  const respId = useMemo(() => Number(matricula?.responsavel_financeiro_id ?? NaN), [matricula]);
  const resumo = data?.financeiro_resumo ?? null;
  const resumoCartao = data?.resumo_financeiro_cartao_conexao ?? null;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Matricula #{id}</h1>
          <p className="text-sm text-muted-foreground">Detalhe operacional da matricula.</p>
        </div>
        <Link href="/escola/matriculas" className="text-sm text-muted-foreground hover:underline">
          Voltar para lista
        </Link>
      </div>

      {erro ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div> : null}
      {loading && !data ? <div className="text-sm text-muted-foreground">Carregando...</div> : null}

      {!data ? null : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm font-semibold">Dados principais</div>
            <div>Aluno: {labelFromPessoa(data.pessoa, Number.isFinite(pessoaId) ? pessoaId : null)}</div>
            <div>
              Responsavel: {labelFromPessoa(data.responsavel_financeiro, Number.isFinite(respId) ? respId : null)}
            </div>
            <div>Ano: {matricula?.ano_referencia ?? "-"}</div>
            <div>Status: {String(matricula?.status ?? "-")}</div>
            <div>Tipo: {String(matricula?.tipo_matricula ?? "-")}</div>
            <div>Criada em: {formatDateTimeISO(String(matricula?.created_at ?? ""))}</div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm font-semibold">Servico e unidade de execucao</div>
            <div>
              Servico: {data.servico?.titulo?.trim() || (data.servico?.id ? `Servico #${data.servico.id}` : "-")}
            </div>
            <div>Servico ID: {data.servico?.id ?? "-"}</div>
            <div>Unidade de execucao: {data.unidade_execucao_label ?? "-"}</div>
            <div>UE ID: {data.unidade_execucao?.unidade_execucao_id ?? "-"}</div>
            <div>Turma ID: {data.turma?.turma_id ?? "-"}</div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm font-semibold">Resumo financeiro</div>
            <div>
              Entrada paga:{" "}
              {resumo
                ? formatBRLFromCents(Number(resumo.entrada_total_paga_centavos))
                : "-"}
            </div>
            <div>
              Parcelas pendentes:{" "}
              {resumoCartao ? (
                <>
                  <span>{resumoCartao.parcelas_pendentes}</span>
                </>
              ) : (
                "-"
              )}
            </div>
            <div>
              Proximo vencimento:{" "}
              {resumoCartao?.proximo_vencimento ? formatDateISO(resumoCartao.proximo_vencimento) : "-"}
            </div>
            <div>
              Ultima atualizacao: {resumo?.ultima_atualizacao ? formatDateTimeISO(resumo.ultima_atualizacao) : "-"}
            </div>
            <div>
              Mensalidade aplicada:{" "}
              {data.preco_aplicado?.valor_centavos !== undefined
                ? formatBRLFromCents(Number(data.preco_aplicado.valor_centavos))
                : "-"}
            </div>
            <div>Moeda: {data.preco_aplicado?.moeda ?? "-"}</div>
            <div>
              Plano de pagamento:{" "}
              {data.plano_pagamento?.titulo?.trim() || (data.plano_pagamento?.id ? `Plano #${data.plano_pagamento.id}` : "-")}
            </div>
            <div>
              Ciclo: {data.plano_pagamento?.ciclo_cobranca ?? "-"}{" "}
              {data.plano_pagamento?.numero_parcelas ? `(${data.plano_pagamento.numero_parcelas} parcelas)` : ""}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-semibold">Documentos</div>
            <p className="text-sm text-muted-foreground">
              Emissao e consulta de documentos vinculados a esta matricula.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/escola/matriculas/${id}/documentos`}
                className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:underline"
              >
                Ver documentos
              </Link>
              <Link
                href={`/admin/config/documentos/modelos?emitirParaMatriculaId=${id}`}
                className="rounded-md border border-slate-800 px-3 py-2 text-sm font-medium"
              >
                Emitir documento
              </Link>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <div className="text-sm font-semibold">Acoes</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                disabled
                title="TODO: conectar API de encerramento"
              >
                Encerrar
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                disabled
                title="TODO: conectar API de cancelamento"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
