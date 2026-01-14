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
    parcelas_proximas: Array<{
      periodo: string | null;
      vencimento: string | null;
      valor_centavos: number;
      status: string | null;
    }>;
  } | null;
  documentos_emitidos?: Array<{
    id: number;
    matricula_id: number | null;
    contrato_modelo_id: number | null;
    status_assinatura: string | null;
    created_at: string | null;
  }>;
  itens_matricula?: Array<{
    turma_id: number;
    turma_nome: string | null;
    ue_id: number | null;
    ue_label: string | null;
  }>;
  turmas_vinculadas?: Array<{
    turma_id: number;
    nome: string | null;
  }>;
  error?: string;
  message?: string;
};

type CobrancaAvulsa = {
  id: number;
  pessoa_id: number;
  origem_tipo: string;
  origem_id: number;
  valor_centavos: number;
  vencimento: string;
  status: string;
  meio: string;
  motivo_excecao: string;
  observacao: string | null;
  criado_em: string | null;
  pago_em: string | null;
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
  const [avulsas, setAvulsas] = useState<CobrancaAvulsa[]>([]);
  const [avulsasErro, setAvulsasErro] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payCobrancaId, setPayCobrancaId] = useState<number | null>(null);
  const [payValor, setPayValor] = useState<number>(0);
  const [payMetodo, setPayMetodo] = useState<string>("PIX");
  const [payComprovante, setPayComprovante] = useState<string>("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

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
  const documentosEmitidos = data?.documentos_emitidos ?? [];
  const itensMatricula = data?.itens_matricula ?? [];
  const verDocs = `/escola/matriculas/${id}/documentos`;
  const emitirDocs = `/escola/matriculas/${id}/documentos?emitir=1`;
  const matriculaIdNum = useMemo(() => Number(matricula?.id ?? id ?? NaN), [matricula, id]);
  const totalMensalidadeCentavos = Number(matricula?.total_mensalidade_centavos ?? NaN);
  const totalMensalidadeLabel = Number.isFinite(totalMensalidadeCentavos)
    ? formatBRLFromCents(totalMensalidadeCentavos)
    : "-";
  const cobrancaEntrada = useMemo(() => {
    if (!Number.isFinite(matriculaIdNum)) return null;
    const relacionadas = avulsas.filter(
      (c) => c.origem_tipo === "MATRICULA_ENTRADA" && Number(c.origem_id) === matriculaIdNum,
    );
    if (relacionadas.length === 0) return null;
    return relacionadas.find((c) => c.status === "PENDENTE") ?? relacionadas[0];
  }, [avulsas, matriculaIdNum]);

  useEffect(() => {
    let ativo = true;
    const responsavelId = Number(respId);
    if (!Number.isFinite(responsavelId)) return undefined;

    (async () => {
      try {
        setAvulsasErro(null);
        const res = await fetch(`/api/financeiro/pessoas/${responsavelId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.ok || !Array.isArray(json?.data)) {
          if (ativo) {
            setAvulsas([]);
            setAvulsasErro("Falha ao carregar cobrancas avulsas.");
          }
          return;
        }
        if (ativo) setAvulsas(json.data as CobrancaAvulsa[]);
      } catch {
        if (ativo) {
          setAvulsas([]);
          setAvulsasErro("Falha ao carregar cobrancas avulsas.");
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [respId]);

  async function registrarPagamentoAvulsa() {
    if (!payCobrancaId) return;
    setPayLoading(true);
    setPayError(null);

    try {
      const res = await fetch(
        `/api/financeiro/cobrancas-avulsas/${payCobrancaId}/registrar-pagamento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forma_pagamento: payMetodo,
            valor_pago_centavos: payValor,
            comprovante: payComprovante || null,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error ?? `erro_http_${res.status}`);
      }

      setPayOpen(false);
      setPayCobrancaId(null);

      const responsavelId = Number(respId);
      if (Number.isFinite(responsavelId)) {
        const refresh = await fetch(`/api/financeiro/pessoas/${responsavelId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const json = await refresh.json().catch(() => ({}));
        if (refresh.ok && json?.ok && Array.isArray(json?.data)) {
          setAvulsas(json.data as CobrancaAvulsa[]);
          setAvulsasErro(null);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao registrar recebimento";
      setPayError(message);
    } finally {
      setPayLoading(false);
    }
  }

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
            <div className="text-sm font-semibold">Itens da matricula</div>
            {itensMatricula.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum item ativo encontrado.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {itensMatricula.map((it) => (
                  <div key={it.turma_id} className="rounded-md border p-2">
                    <div className="font-medium">{it.turma_nome ?? `Turma #${it.turma_id}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {it.ue_label ? `UE: ${it.ue_label}` : `Turma ID: ${it.turma_id}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.servico || data.unidade_execucao_label || data.turma?.turma_id ? (
              <div className="mt-3 text-sm">
                <div className="font-semibold">Principal (legado)</div>
                <div className="text-muted-foreground">
                  Servico:{" "}
                  {data.servico?.titulo?.trim() || (data.servico?.id ? `Servico #${data.servico.id}` : "-")} | UE:{" "}
                  {data.unidade_execucao_label ?? "-"} | Turma ID: {data.turma?.turma_id ?? "-"}
                </div>
              </div>
            ) : null}

            <div className="mt-3 text-sm">
              <div className="text-sm font-semibold">Mensalidade consolidada (referencia)</div>
              <div className="text-muted-foreground">{totalMensalidadeLabel}</div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-2">
            <div className="text-sm font-semibold">Resumo financeiro</div>
            <div>
              Entrada paga:{" "}
              {resumo
                ? formatBRLFromCents(Number(resumo.entrada_total_paga_centavos))
                : "-"}
            </div>
            {avulsasErro ? (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {avulsasErro}
              </div>
            ) : null}
            {cobrancaEntrada ? (
              <div className="mt-2 text-sm space-y-1">
                <div className="font-medium">Entrada (cobranca avulsa)</div>
                <div className="text-muted-foreground">
                  Status: {cobrancaEntrada.status} | Vencimento:{" "}
                  {cobrancaEntrada.vencimento ? formatDateISO(cobrancaEntrada.vencimento) : "-"}
                </div>
                <div className="text-muted-foreground">
                  Valor: {formatBRLFromCents(Number(cobrancaEntrada.valor_centavos))}
                </div>
                {cobrancaEntrada.status === "PENDENTE" ? (
                  <button
                    className="mt-2 inline-flex items-center rounded-md border px-3 py-2 text-sm"
                    onClick={() => {
                      setPayCobrancaId(cobrancaEntrada.id);
                      setPayValor(cobrancaEntrada.valor_centavos);
                      setPayMetodo("PIX");
                      setPayComprovante("");
                      setPayOpen(true);
                    }}
                  >
                    Registrar recebimento
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 text-sm">
              <div className="font-medium">Mensalidade consolidada</div>
              <div className="text-muted-foreground">{totalMensalidadeLabel}</div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              A mensalidade recorrente e cobrada via <strong>Cartao Conexao</strong> (faturas mensais). Use o painel
              de faturas para acompanhar o ciclo mensal.
            </div>
            <Link
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
              href="/admin/financeiro/credito-conexao/faturas"
            >
              Ver faturas do Cartao Conexao
            </Link>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/escola/matriculas/${id}/reprocessar`}
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
              >
                Reprocessar matricula
              </Link>
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
                href={verDocs}
                className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:underline"
              >
                Ver documentos
              </Link>
              <Link
                href={emitirDocs}
                className="rounded-md border border-slate-800 px-3 py-2 text-sm font-medium"
              >
                Emitir documento
              </Link>
            </div>
            {documentosEmitidos.length === 0 ? (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Nenhum documento emitido para esta matricula.
              </div>
            ) : (
              <div className="grid gap-2">
                {documentosEmitidos.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/admin/config/documentos/emitidos/${doc.id}`}
                    className="rounded-md border bg-white px-3 py-2 text-xs hover:bg-slate-50"
                  >
                    <div className="font-semibold">Documento #{doc.id}</div>
                    <div className="mt-1 text-muted-foreground">
                      Modelo: {doc.contrato_modelo_id ?? "-"} | Status: {doc.status_assinatura ?? "-"} | Criado em:{" "}
                      {doc.created_at ? formatDateTimeISO(doc.created_at) : "-"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
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

      {payOpen && payCobrancaId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow">
            <div className="font-semibold">Registrar recebimento</div>
            <div className="mt-1 text-sm text-muted-foreground">Cobranca #{payCobrancaId}</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Forma de pagamento
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payMetodo}
                  onChange={(e) => setPayMetodo(e.target.value)}
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO_AVISTA">Cartao de credito (a vista)</option>
                  <option value="CARTAO_CREDITO_PARCELADO">Cartao de credito (parcelado)</option>
                  <option value="CARTAO_CONEXAO_ALUNO">Cartao Conexao (Aluno)</option>
                  <option value="CARTAO_CONEXAO_COLABORADOR">Cartao Conexao (Colaborador)</option>
                  <option value="CREDITO_INTERNO_ALUNO">Credito interno (Aluno)</option>
                  <option value="CREDIARIO_COLABORADOR">Crediario (Colaborador)</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>

              <label className="text-sm">
                Valor pago (centavos)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  type="number"
                  value={payValor}
                  onChange={(e) => setPayValor(Number(e.target.value))}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Padrao: {formatBRLFromCents(payValor)}.
                </div>
              </label>

              <label className="text-sm md:col-span-2">
                Comprovante (opcional)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payComprovante}
                  onChange={(e) => setPayComprovante(e.target.value)}
                />
              </label>
            </div>

            {payError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {payError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 hover:bg-slate-50"
                onClick={() => {
                  setPayOpen(false);
                  setPayCobrancaId(null);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:opacity-90"
                onClick={registrarPagamentoAvulsa}
                disabled={payLoading}
              >
                {payLoading ? "Processando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
