"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CobrancaOperacionalActions } from "@/components/financeiro/cobrancas/CobrancaOperacionalActions";
import { RecibosContaConexao } from "@/components/documentos/RecibosContaConexao";
import { ReciboModal, type ReciboModalParams } from "@/components/documentos/ReciboModal";
import { EXPURGO_TIPO_LABELS, type ExpurgoTipo } from "@/lib/financeiro/expurgo-types";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type ResumoFinanceiro = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  responsavel_financeiro?: { id: number; nome: string | null } | null;
  cobrancas: Array<{
    id: number;
    devedor_pessoa_id: number;
    data_vencimento: string | null;
    valor_centavos: number;
    status: string;
    origem_tipo: string;
    origem_subtipo: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  cobrancas_canceladas_expurgaveis: Array<{
    cobranca_id: number;
    devedor_pessoa_id: number;
    data_vencimento: string | null;
    valor_centavos: number;
    status: string;
    origem_tipo: string;
    origem_subtipo: string;
    origem_id: number | null;
    created_at: string | null;
  }>;
  cobrancas_matricula?: Array<{
    cobranca_id: number;
    vencimento: string | null;
    valor_centavos: number;
    saldo_aberto_centavos: number;
    dias_atraso: number;
    status_cobranca: string;
    origem_tipo: string;
    origem_id: number | null;
    situacao_saas: string;
    bucket_vencimento: string;
  }>;
  cobrancas_canonicas?: Array<{
    cobranca_id: number;
    vencimento: string | null;
    valor_centavos: number;
    saldo_aberto_centavos: number;
    dias_atraso: number;
    status_cobranca: string;
    situacao_saas: string;
    bucket_vencimento: string | null;
    origem_tipo: string | null;
    origem_subtipo: string | null;
    origem_id: number | null;
    origem_label: string;
    origem_secundaria: string | null;
    origem_tecnica: string | null;
    origem_badge_label: string | null;
    origem_badge_tone: "success" | "warning" | "neutral";
    origemAgrupadorTipo: string | null;
    origemAgrupadorId: number | null;
    origemItemTipo: string | null;
    origemItemId: number | null;
    contaInternaId: number | null;
    alunoNome: string | null;
    matriculaId: number | null;
    origemLabel: string;
    migracaoContaInternaStatus: string | null;
    vencimentoOriginal: string | null;
    vencimentoAjustadoEm: string | null;
    vencimentoAjustadoPor: string | null;
    vencimentoAjusteMotivo: string | null;
    canceladaEm: string | null;
    canceladaPor: string | null;
    cancelamentoMotivo: string | null;
    cancelamentoTipo: string | null;
    matriculaStatus: string | null;
    matriculaCancelamentoTipo: string | null;
  }>;
  faturas_credito_conexao: Array<{
    id: number;
    conta_conexao_id: number;
    periodo_referencia: string;
    data_vencimento: string | null;
    valor_total_centavos: number;
    status: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  agregados: {
    cobrancas_pendentes_qtd: number;
    cobrancas_pendentes_total_centavos: number;
    cobrancas_vencidas_qtd: number;
    faturas_pendentes_qtd: number;
    faturas_pendentes_total_centavos: number;
    faturas_vencidas_qtd: number;
  };
};

type CobrancaAvulsa = {
  id: number;
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

type DependenteFinanceiro = {
  dependente_pessoa_id: number;
  dependente_nome: string | null;
  dependente_cpf: string | null;
  dependente_telefone: string | null;
  ativo: boolean;
  origem_tipo: string | null;
  origem_id: number | null;
  atualizado_em: string | null;
};

type GrupoExpurgoOrigem = {
  chave: string;
  label: string;
  ids: number[];
  items: ResumoFinanceiro["cobrancas_canceladas_expurgaveis"];
};

type CobrancaCanonicaResumo = NonNullable<ResumoFinanceiro["cobrancas_canonicas"]>[number];

function formatBRLFromCentavos(v: number): string {
  const reais = (v ?? 0) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(label: string, tone: "neutral" | "warning") {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";
  const toneClass =
    tone === "warning"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`${base} ${toneClass}`}>{label}</span>;
}

function formatDateTimeOrDash(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function origemGroupLabel(origemTipo: string, origemId: number | null): string {
  const tipo = origemTipo.trim() || "SEM ORIGEM";
  return origemId ? `${tipo} #${origemId}` : `${tipo} sem ID`;
}

function origemBadgeClass(tone: CobrancaCanonicaResumo["origem_badge_tone"]) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function PessoaResumoFinanceiro({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResumoFinanceiro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avulsas, setAvulsas] = useState<CobrancaAvulsa[]>([]);
  const [avulsasError, setAvulsasError] = useState<string | null>(null);
  const [dependentes, setDependentes] = useState<DependenteFinanceiro[]>([]);
  const [dependentesError, setDependentesError] = useState<string | null>(null);
  const [dependentesLoading, setDependentesLoading] = useState(false);
  const [dependentesBaseId, setDependentesBaseId] = useState<number>(pessoaId);

  const [payOpen, setPayOpen] = useState(false);
  const [payCobrancaId, setPayCobrancaId] = useState<number | null>(null);
  const [payValor, setPayValor] = useState<number>(0);
  const [payMetodo, setPayMetodo] = useState<string>("PIX");
  const [payComprovante, setPayComprovante] = useState<string>("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [reciboOpen, setReciboOpen] = useState(false);
  const [reciboParams, setReciboParams] = useState<ReciboModalParams | null>(null);
  const [selectedCobrancas, setSelectedCobrancas] = useState<number[]>([]);
  const [expurgoOpen, setExpurgoOpen] = useState(false);
  const [expurgoTarget, setExpurgoTarget] = useState<{ ids: number[]; label: string } | null>(null);
  const [expurgoTipo, setExpurgoTipo] = useState<ExpurgoTipo>("ERRO_TECNICO");
  const [expurgoMotivo, setExpurgoMotivo] = useState("");
  const [expurgoError, setExpurgoError] = useState<string | null>(null);
  const [expurgoLoading, setExpurgoLoading] = useState(false);

  const loadDependentes = useCallback(async (basePessoaId: number) => {
    if (!Number.isFinite(basePessoaId) || basePessoaId <= 0) {
      setDependentes([]);
      setDependentesError("responsavel_financeiro_invalido");
      return;
    }

    setDependentesLoading(true);
    setDependentesError(null);
    setDependentesBaseId(basePessoaId);
    try {
      const res = await fetch(`/api/admin/pessoas/${basePessoaId}/dependentes-financeiros`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `erro_dependentes_${res.status}`);
      }
      setDependentes(Array.isArray(json?.dependentes) ? (json.dependentes as DependenteFinanceiro[]) : []);
    } catch (e) {
      setDependentes([]);
      setDependentesError(e instanceof Error ? e.message : "falha_ao_carregar_dependentes");
    } finally {
      setDependentesLoading(false);
    }
  }, []);

  const loadResumo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAvulsasError(null);
    try {
      const res = await fetch(`/api/pessoas/${pessoaId}/resumo-financeiro`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `erro_http_${res.status}`);
      }
      const j = (await res.json()) as ResumoFinanceiro;
      setData(j);
      const responsavelId = Number(j.responsavel_financeiro_id || pessoaId);
      const alvoDependentes = Number.isFinite(responsavelId) && responsavelId > 0 ? responsavelId : pessoaId;
      await loadDependentes(alvoDependentes);

      try {
        const alvoId = Number.isFinite(responsavelId) ? responsavelId : pessoaId;
        const resAv = await fetch(`/api/financeiro/pessoas/${alvoId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const jsonAv = await resAv.json().catch(() => ({}));
        if (!resAv.ok || !jsonAv?.ok || !Array.isArray(jsonAv?.data)) {
          setAvulsas([]);
          setAvulsasError("Falha ao carregar cobrancas avulsas.");
        } else {
          setAvulsas(jsonAv.data as CobrancaAvulsa[]);
        }
      } catch {
        setAvulsas([]);
        setAvulsasError("Falha ao carregar cobrancas avulsas.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro_carregar_resumo";
      setError(message);
      setData(null);
      setAvulsas([]);
      await loadDependentes(pessoaId);
    } finally {
      setLoading(false);
    }
  }, [loadDependentes, pessoaId]);

  useEffect(() => {
    void loadResumo();
  }, [loadResumo]);

  const canceladasExpurgaveis = useMemo(
    () => data?.cobrancas_canceladas_expurgaveis ?? [],
    [data?.cobrancas_canceladas_expurgaveis],
  );
  const canceladasExpurgaveisIds = useMemo(
    () => canceladasExpurgaveis.map((item) => item.cobranca_id),
    [canceladasExpurgaveis],
  );

  const gruposExpurgoPorOrigem = useMemo<GrupoExpurgoOrigem[]>(() => {
    const groups = new Map<string, GrupoExpurgoOrigem>();

    for (const item of canceladasExpurgaveis) {
      const chave = `${item.origem_tipo || "SEM_ORIGEM"}:${item.origem_id ?? "SEM_ID"}`;
      const existente = groups.get(chave);
      if (existente) {
        existente.ids.push(item.cobranca_id);
        existente.items.push(item);
        continue;
      }

      groups.set(chave, {
        chave,
        label: origemGroupLabel(item.origem_tipo, item.origem_id),
        ids: [item.cobranca_id],
        items: [item],
      });
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [canceladasExpurgaveis]);

  useEffect(() => {
    const validIds = new Set(canceladasExpurgaveisIds);
    setSelectedCobrancas((current) => current.filter((id) => validIds.has(id)));
  }, [canceladasExpurgaveisIds]);

  const responsavelLabel = useMemo(() => {
    if (!data) return null;
    const rf = data.responsavel_financeiro;
    if (!rf) return `#${data.responsavel_financeiro_id}`;
    return rf.nome ? `${rf.nome} (#${rf.id})` : `#${rf.id}`;
  }, [data]);

  const cobrancasAbertas = useMemo<CobrancaCanonicaResumo[]>(() => {
    if (!data) return [];
    if (Array.isArray(data.cobrancas_canonicas)) return data.cobrancas_canonicas;
    return (data.cobrancas_matricula ?? []).map((item) => ({
      cobranca_id: item.cobranca_id,
      vencimento: item.vencimento,
      valor_centavos: item.valor_centavos,
      saldo_aberto_centavos: item.saldo_aberto_centavos,
      dias_atraso: item.dias_atraso,
      status_cobranca: item.status_cobranca,
      situacao_saas: item.situacao_saas,
      bucket_vencimento: item.bucket_vencimento,
      origem_tipo: item.origem_tipo,
      origem_subtipo: null,
      origem_id: item.origem_id,
      origem_label: item.origem_tipo ? `${item.origem_tipo}${item.origem_id ? ` #${item.origem_id}` : ""}` : "Origem em revisao",
      origem_secundaria: null,
      origem_tecnica: item.origem_tipo ? `${item.origem_tipo}${item.origem_id ? ` #${item.origem_id}` : ""}` : null,
      origem_badge_label: null,
      origem_badge_tone: "neutral",
      origemAgrupadorTipo: null,
      origemAgrupadorId: null,
      origemItemTipo: null,
      origemItemId: null,
      contaInternaId: null,
      alunoNome: null,
      matriculaId: item.origem_id,
      origemLabel: item.origem_tipo ? `${item.origem_tipo}${item.origem_id ? ` #${item.origem_id}` : ""}` : "Origem em revisao",
      migracaoContaInternaStatus: null,
      vencimentoOriginal: null,
      vencimentoAjustadoEm: null,
      vencimentoAjustadoPor: null,
      vencimentoAjusteMotivo: null,
      canceladaEm: null,
      canceladaPor: null,
      cancelamentoMotivo: null,
      cancelamentoTipo: null,
      matriculaStatus: null,
      matriculaCancelamentoTipo: null,
    }));
  }, [data]);

  const allSelecionadas =
    canceladasExpurgaveisIds.length > 0 && canceladasExpurgaveisIds.every((id) => selectedCobrancas.includes(id));

  function toggleCobrancaSelecionada(cobrancaId: number) {
    setSelectedCobrancas((current) =>
      current.includes(cobrancaId) ? current.filter((id) => id !== cobrancaId) : [...current, cobrancaId],
    );
  }

  function toggleSelecionarTodas() {
    setSelectedCobrancas(allSelecionadas ? [] : canceladasExpurgaveisIds);
  }

  function toggleSelecionarGrupo(ids: number[]) {
    const todosSelecionados = ids.every((id) => selectedCobrancas.includes(id));
    setSelectedCobrancas((current) => {
      if (todosSelecionados) {
        return current.filter((id) => !ids.includes(id));
      }
      return Array.from(new Set([...current, ...ids]));
    });
  }

  function abrirExpurgo(ids: number[], label: string) {
    if (ids.length === 0) return;
    setExpurgoTarget({ ids, label });
    setExpurgoTipo("ERRO_TECNICO");
    setExpurgoMotivo("");
    setExpurgoError(null);
    setExpurgoOpen(true);
  }

  async function confirmarExpurgoLote() {
    if (!expurgoTarget) return;
    const motivo = expurgoMotivo.trim();
    if (!motivo) {
      setExpurgoError("Informe o motivo do expurgo.");
      return;
    }

    setExpurgoLoading(true);
    setExpurgoError(null);

    try {
      const response = await fetch("/api/financeiro/cobrancas/expurgar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_ids: expurgoTarget.ids,
          motivo,
          tipo: expurgoTipo,
        }),
      });

      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; details?: unknown } | null;
      if (!response.ok || !json?.ok) {
        const details =
          typeof json?.details === "string"
            ? json.details
            : json?.details
              ? JSON.stringify(json.details)
              : null;
        throw new Error(details ?? json?.error ?? "erro_expurgar_lote");
      }

      setExpurgoOpen(false);
      setExpurgoTarget(null);
      setSelectedCobrancas((current) => current.filter((id) => !expurgoTarget.ids.includes(id)));
      await loadResumo();
    } catch (error) {
      setExpurgoError(error instanceof Error ? error.message : "erro_expurgar_lote");
    } finally {
      setExpurgoLoading(false);
    }
  }

  async function pagarCobranca() {
    if (!payCobrancaId) return;
    setPayLoading(true);
    setPayError(null);

    try {
      const res = await fetch(
        `/api/financeiro/cobrancas-avulsas/${payCobrancaId}/registrar-recebimento`,
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

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        const message = j?.message || j?.details || j?.error || `erro_pagamento_${res.status}`;
        throw new Error(message);
      }

      setPayOpen(false);
      setPayCobrancaId(null);
      await loadResumo();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao registrar recebimento";
      setPayError(message);
    } finally {
      setPayLoading(false);
    }
  }

  const isOutroResponsavel = data ? data.responsavel_financeiro_id !== data.pessoa_id : false;
  const pessoaTitularIdRecibos = data?.responsavel_financeiro_id ?? pessoaId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dependentes financeiros</CardTitle>
          <CardDescription>
            Vinculos reutilizados da base de Vinculos: responsavel #{dependentesBaseId}.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {dependentesLoading ? (
            <div className="text-sm text-muted-foreground">Carregando dependentes...</div>
          ) : dependentesError ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-700">
              Falha ao carregar dependentes: {dependentesError}
            </div>
          ) : dependentes.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum dependente financeiro vinculado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 text-left">Dependente</th>
                    <th className="py-2 text-left">Origem</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dependentes.map((d) => (
                    <tr key={d.dependente_pessoa_id} className="border-t">
                      <td className="py-2">
                        <div className="font-medium text-slate-900">
                          {d.dependente_nome
                            ? `${d.dependente_nome} (#${d.dependente_pessoa_id})`
                            : `Pessoa #${d.dependente_pessoa_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {d.dependente_cpf ? `CPF: ${d.dependente_cpf}` : ""}
                          {d.dependente_telefone ? `${d.dependente_cpf ? " • " : ""}Tel: ${d.dependente_telefone}` : ""}
                        </div>
                      </td>
                      <td className="py-2 text-xs text-slate-600">
                        {d.origem_tipo ?? "--"} {d.origem_id ? `#${d.origem_id}` : ""}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50"
                            href={`/pessoas/${d.dependente_pessoa_id}`}
                          >
                            Abrir dependente
                          </Link>
                          <Link
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs hover:bg-slate-50"
                            href={`/admin/financeiro/contas-receber?pessoa_id=${d.dependente_pessoa_id}`}
                          >
                            Ver cobrancas
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando resumo financeiro...</div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Resumo financeiro legado indisponivel no momento: {error}
        </div>
      ) : null}

      {!loading && !data ? (
        <div className="text-sm text-muted-foreground">
          Alguns blocos do resumo antigo nao puderam ser carregados.
        </div>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Responsavel financeiro</CardTitle>
              <CardDescription>
                {isOutroResponsavel ? (
                  <>
                    Pagador identificado:{" "}
                    <Link className="text-slate-900 underline" href={`/pessoas/${data.responsavel_financeiro_id}`}>
                      {responsavelLabel}
                    </Link>
                  </>
                ) : (
                  <>A propria pessoa e o responsavel financeiro.</>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Canceladas elegiveis a expurgo</CardTitle>
              <CardDescription>
                Cobrancas canceladas ainda nao expurgadas, agrupadas por origem operacional para saneamento auditavel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {canceladasExpurgaveis.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Nenhuma cobranca cancelada elegivel a expurgo foi encontrada para este responsavel financeiro.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={allSelecionadas} onChange={toggleSelecionarTodas} />
                      Selecionar todas as canceladas exibidas
                    </label>
                    <div className="flex flex-col gap-2 text-sm text-slate-600 md:items-end">
                      <span>{selectedCobrancas.length} cobranca(s) selecionada(s)</span>
                      {selectedCobrancas.length > 0 ? (
                        <Button type="button" variant="secondary" onClick={() => abrirExpurgo(selectedCobrancas, "cobrancas selecionadas")}>
                          Expurgar selecionadas
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {gruposExpurgoPorOrigem.map((grupo) => {
                      const grupoSelecionado = grupo.ids.every((id) => selectedCobrancas.includes(id));
                      return (
                        <div key={grupo.chave} className="rounded-xl border border-slate-200 bg-white">
                          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{grupo.label}</div>
                              <div className="text-xs text-slate-500">
                                {grupo.items.length} cobranca(s) cancelada(s) nesta origem
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 md:items-end">
                              <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={grupoSelecionado}
                                  onChange={() => toggleSelecionarGrupo(grupo.ids)}
                                />
                                Selecionar origem
                              </label>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => abrirExpurgo(grupo.ids, grupo.label)}
                              >
                                Expurgar todas desta origem
                              </Button>
                            </div>
                          </div>

                          <div className="overflow-x-auto px-4 py-4">
                            <table className="w-full text-sm">
                              <thead className="text-xs uppercase text-muted-foreground">
                                <tr>
                                  <th className="py-2 text-left">Sel.</th>
                                  <th className="py-2 text-left">Cobranca</th>
                                  <th className="py-2 text-left">Vencimento</th>
                                  <th className="py-2 text-right">Valor</th>
                                  <th className="py-2 text-left">Criada em</th>
                                  <th className="py-2 text-left">Origem fina</th>
                                  <th className="py-2 text-right">Acao</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.items.map((item) => (
                                  <tr key={item.cobranca_id} className="border-t">
                                    <td className="py-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedCobrancas.includes(item.cobranca_id)}
                                        onChange={() => toggleCobrancaSelecionada(item.cobranca_id)}
                                      />
                                    </td>
                                    <td className="py-2">
                                      <div className="font-medium text-slate-900">#{item.cobranca_id}</div>
                                      <div className="text-xs text-slate-500">{item.status}</div>
                                    </td>
                                    <td className="py-2">{item.data_vencimento ?? "-"}</td>
                                    <td className="py-2 text-right">{formatBRLFromCentavos(item.valor_centavos)}</td>
                                    <td className="py-2">{formatDateTimeOrDash(item.created_at)}</td>
                                    <td className="py-2 text-xs text-slate-600">
                                      {item.origem_subtipo || "Sem subtipo"}
                                    </td>
                                    <td className="py-2 text-right">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => abrirExpurgo([item.cobranca_id], `cobranca #${item.cobranca_id}`)}
                                      >
                                        Expurgar
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Titulos em aberto</CardTitle>
              <CardDescription>
                Leitura canonica das cobrancas em aberto, sem ocultar casos ambiguos ou sem conta interna associada.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Cobranca</th>
                      <th className="py-2 text-left">Vencimento</th>
                      <th className="py-2 text-right">Saldo aberto</th>
                      <th className="py-2 text-left">Situacao</th>
                      <th className="py-2 text-left">Origem</th>
                      <th className="py-2 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrancasAbertas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-3 text-muted-foreground">
                          Nenhuma cobranca em aberto encontrada.
                        </td>
                      </tr>
                    ) : (
                      cobrancasAbertas.map((c) => (
                        <tr key={c.cobranca_id} className="border-t">
                          <td className="py-2">#{c.cobranca_id}</td>
                          <td className="py-2">
                            <div>{c.vencimento ?? "-"}</div>
                            {Number(c.dias_atraso || 0) > 0 ? (
                              <div className="text-xs text-rose-600">{c.dias_atraso} dia(s) em atraso</div>
                            ) : null}
                            {c.vencimentoOriginal ? (
                              <div className="text-xs text-slate-500">Original: {c.vencimentoOriginal}</div>
                            ) : null}
                          </td>
                          <td className="py-2 text-right">
                            {formatBRLFromCentavos(Number(c.saldo_aberto_centavos || 0))}
                          </td>
                          <td className="py-2">
                            <div>{c.situacao_saas || "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              Status interno: {c.status_cobranca || "-"}
                            </div>
                            {c.contaInternaId ? (
                              <div className="text-xs text-slate-500">Conta interna #{c.contaInternaId}</div>
                            ) : null}
                            {c.alunoNome ? <div className="text-xs text-slate-500">Aluno: {c.alunoNome}</div> : null}
                            {c.matriculaId ? <div className="text-xs text-slate-500">Matricula #{c.matriculaId}</div> : null}
                            {c.matriculaStatus === "CANCELADA" ? (
                              <div className="text-xs text-amber-700">
                                Matricula cancelada{c.matriculaCancelamentoTipo ? ` · ${c.matriculaCancelamentoTipo}` : ""}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2">
                            <div className="font-medium text-slate-900">
                              {c.contaInternaId ? `Conta interna #${c.contaInternaId}` : c.origem_label || c.origemLabel || "Origem em revisao"}
                            </div>
                            {c.origem_secundaria ? <div className="text-xs text-slate-500">{c.origem_secundaria}</div> : null}
                            {c.origem_badge_label || c.origem_tecnica ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {c.origem_badge_label ? (
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${origemBadgeClass(c.origem_badge_tone)}`}>
                                    {c.origem_badge_label}
                                  </span>
                                ) : null}
                                {c.origem_tecnica ? <span className="text-[11px] text-slate-400">{c.origem_tecnica}</span> : null}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <CobrancaOperacionalActions
                                cobrancaId={c.cobranca_id}
                                descricao={c.origem_label}
                                origemLabel={c.origemLabel}
                                status={c.status_cobranca}
                                vencimento={c.vencimento}
                                vencimentoOriginal={c.vencimentoOriginal}
                                vencimentoAjustadoEm={c.vencimentoAjustadoEm}
                                vencimentoAjusteMotivo={c.vencimentoAjusteMotivo}
                                canceladaEm={c.canceladaEm}
                                cancelamentoTipo={c.cancelamentoTipo}
                                matriculaStatus={c.matriculaStatus}
                                matriculaCancelamentoTipo={c.matriculaCancelamentoTipo}
                                compact
                                onSuccess={loadResumo}
                              />
                              <Link
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                                href={`/financeiro/cobrancas/${c.cobranca_id}`}
                              >
                                Abrir
                              </Link>
                              <Link
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                                href={`/admin/financeiro/contas-receber`}
                              >
                                Receber
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobrancas avulsas</CardTitle>
              <CardDescription>
                Cobrancas geradas manualmente para excecoes (fora da conta interna).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {avulsasError ? (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                  {avulsasError}
                </div>
              ) : null}

              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Cobranca</th>
                      <th className="py-2 text-left">Vencimento</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Meio</th>
                      <th className="py-2 text-right">Valor</th>
                      <th className="py-2 text-left">Motivo</th>
                      <th className="py-2 text-right">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {avulsas.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-3 text-muted-foreground">
                          Nenhuma cobranca avulsa encontrada.
                        </td>
                      </tr>
                    ) : (
                      avulsas.map((c) => {
                        const vencida =
                          c.vencimento && c.vencimento < new Date().toISOString().slice(0, 10);
                        return (
                          <tr key={c.id} className="border-t">
                            <td className="py-2">#{c.id}</td>
                            <td className="py-2">{c.vencimento}</td>
                            <td className="py-2">
                              {vencida && c.status === "PENDENTE"
                                ? statusBadge("VENCIDA", "warning")
                                : statusBadge(c.status, "neutral")}
                            </td>
                            <td className="py-2">{c.meio}</td>
                            <td className="py-2 text-right">{formatBRLFromCentavos(c.valor_centavos)}</td>
                            <td className="py-2">{c.motivo_excecao}</td>
                            <td className="py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                                  href={`/administracao/financeiro/cobrancas-avulsas/${c.id}`}
                                >
                                  Descricao
                                </Link>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setReciboParams({
                                      tipo: "COBRANCA_AVULSA",
                                      cobranca_avulsa_id: c.id,
                                    });
                                    setReciboOpen(true);
                                  }}
                                >
                                  Recibo
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setPayCobrancaId(c.id);
                                    setPayValor(c.valor_centavos);
                                    setPayMetodo("PIX");
                                    setPayComprovante("");
                                    setPayOpen(true);
                                  }}
                                  disabled={c.status !== "PENDENTE"}
                                >
                                  Registrar recebimento
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conta interna (faturas)</CardTitle>
              <CardDescription>
                Faturas pendentes: {data.agregados.faturas_pendentes_qtd} - Total:{" "}
                {formatBRLFromCentavos(data.agregados.faturas_pendentes_total_centavos)} - Em atraso:{" "}
                {data.agregados.faturas_vencidas_qtd}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Fatura</th>
                      <th className="py-2 text-left">Competencia</th>
                      <th className="py-2 text-left">Vencimento</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-right">Total</th>
                      <th className="py-2 text-right">Abrir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.faturas_credito_conexao.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-3 text-muted-foreground">
                          Nenhuma fatura pendente da conta interna encontrada.
                        </td>
                      </tr>
                    ) : (
                      data.faturas_credito_conexao.map((f) => {
                        const semValor = (f.valor_total_centavos ?? 0) <= 0;
                        const atrasada = f.vencida && !semValor;
                        const statusLabel = semValor ? "SEM LANCAMENTOS" : f.status;
                        return (
                          <tr key={f.id} className="border-t">
                            <td className="py-2">#{f.id}</td>
                            <td className="py-2">{f.periodo_referencia}</td>
                            <td className="py-2">{f.data_vencimento ?? "-"}</td>
                            <td className="py-2">
                              {atrasada ? statusBadge("EM ATRASO", "warning") : statusBadge(statusLabel, "neutral")}
                            </td>
                            <td className="py-2 text-right">
                              {formatBRLFromCentavos(f.valor_total_centavos)}
                            </td>
                            <td className="py-2 text-right">
                              <Link
                                className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                                href={`/administracao/financeiro/credito-conexao/faturas/${f.id}`}
                              >
                                Abrir
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Observacao: o link de fatura usa a rota do admin financeiro. Se a rota real for diferente, ajuste.
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      <RecibosContaConexao pessoaTitularId={pessoaTitularIdRecibos} />

      <ReciboModal
        open={reciboOpen}
        onClose={() => setReciboOpen(false)}
        params={reciboParams}
        title="Recibo da cobranca avulsa"
      />

      <Dialog open={expurgoOpen} onOpenChange={setExpurgoOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Confirmar expurgo</DialogTitle>
              <DialogDescription>
                O expurgo remove as cobrancas canceladas da leitura financeira principal, sem alterar o historico bruto.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Alvo</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {expurgoTarget ? `${expurgoTarget.label} · ${expurgoTarget.ids.length} cobranca(s)` : "--"}
              </div>
            </div>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Tipo do expurgo</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                value={expurgoTipo}
                onChange={(event) => setExpurgoTipo(event.target.value as ExpurgoTipo)}
              >
                {Object.entries(EXPURGO_TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span>Motivo</span>
              <Textarea
                className="min-h-28 border-slate-200 bg-white text-slate-900"
                value={expurgoMotivo}
                onChange={(event) => setExpurgoMotivo(event.target.value)}
                placeholder="Descreva por que essas cobrancas canceladas devem ser expurgadas."
              />
            </label>

            {expurgoError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {expurgoError}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={expurgoLoading}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void confirmarExpurgoLote()}
                disabled={expurgoLoading || !expurgoTarget}
              >
                {expurgoLoading ? "Expurgando..." : "Confirmar expurgo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {data && payOpen && payCobrancaId ? (
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
                  Padrao: {formatBRLFromCentavos(payValor)}.
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
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                {payError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPayOpen(false);
                  setPayCobrancaId(null);
                }}
              >
                Cancelar
              </Button>

              <Button onClick={pagarCobranca} disabled={payLoading}>
                {payLoading ? "Processando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
