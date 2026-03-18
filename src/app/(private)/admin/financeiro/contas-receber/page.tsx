"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { CobrancaAuditDetail } from "@/components/financeiro/contas-receber/CobrancaAuditDetail";
import { CobrancasTable } from "@/components/financeiro/contas-receber/CobrancasTable";
import { ContasReceberFilters } from "@/components/financeiro/contas-receber/ContasReceberFilters";
import { DevedoresTable } from "@/components/financeiro/contas-receber/DevedoresTable";
import { PerdasCancelamentoCard } from "@/components/financeiro/contas-receber/PerdasCancelamentoCard";
import { ResumoRankingTable } from "@/components/financeiro/contas-receber/ResumoRankingTable";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type {
  CobrancaListaItem,
  ContasReceberAuditoriaPayload,
  DevedorAuditoriaItem,
  DetalheCobrancaAuditoria,
  KpiVisaoCard,
} from "@/lib/financeiro/contas-receber-auditoria";
import {
  CONTAS_RECEBER_VIEW_CONFIG,
  getContextoLabel,
  getOrdenacoesDisponiveis,
  type ContasReceberOrdenacao,
  type ContasReceberTipoPeriodo,
  type ContasReceberVisao,
} from "@/lib/financeiro/contas-receber-view-config";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shadcn/ui";

type ApiResponse = ContasReceberAuditoriaPayload & {
  ok: boolean;
  error?: string;
  details?: string;
};

type TituloVencido = {
  cobranca_id: number;
  pessoa_id: number;
  vencimento: string | null;
  dias_atraso: number;
  valor_centavos: number;
  saldo_aberto_centavos: number;
  origem_tipo: string | null;
  origem_id: number | null;
  status_cobranca: string | null;
  bucket_vencimento: string | null;
  situacao_saas: string | null;
};

type TitulosResponse = {
  ok?: boolean;
  error?: string;
  titulos?: TituloVencido[];
};

type ReceberResponse = {
  ok?: boolean;
  error?: string;
};

type ReceberForm = {
  data_pagamento: string;
  metodo_pagamento: "PIX" | "DINHEIRO";
};

type ContextoFilter = "TODOS" | "ESCOLA" | "CAFE" | "LOJA" | "OUTRO";
type SituacaoFilter = "TODAS" | "VENCIDA" | "EM_ABERTO" | "QUITADA";
type StatusFilter = "TODOS" | "PENDENTE" | "RECEBIDO" | "CANCELADA";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function renderKpiValue(item: KpiVisaoCard) {
  if (item.tipo === "currency") return formatBRLFromCents(item.valor_centavos ?? 0);
  if (item.tipo === "days") return `${item.valor_numero ?? 0} dias`;
  if (item.tipo === "date") return formatDateISO(item.valor_data);
  return String(item.valor_numero ?? 0);
}

function KpiCard({ item }: { item: KpiVisaoCard }) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="space-y-1 py-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
        <p className="text-2xl font-semibold text-slate-900">{renderKpiValue(item)}</p>
        <p className="text-sm text-slate-600">{item.descricao}</p>
      </CardContent>
    </Card>
  );
}

function contextoDescricao(visao: ContasReceberVisao, quantidade: number) {
  if (visao === "RECEBIDAS") return `${quantidade} recebimento(s) no recorte`;
  if (visao === "INCONSISTENCIAS") return `${quantidade} caso(s) em revisao`;
  if (visao === "A_VENCER") return `${quantidade} titulo(s) a vencer`;
  return `${quantidade} titulo(s) vencidos`;
}

export default function AdminContasReceberPage() {
  const [q, setQ] = useState("");
  const [visao, setVisao] = useState<ContasReceberVisao>("VENCIDAS");
  const [tipoPeriodo, setTipoPeriodo] = useState<ContasReceberTipoPeriodo>("SEM_PERIODO");
  const [contexto, setContexto] = useState<ContextoFilter>("TODOS");
  const [situacao, setSituacao] = useState<SituacaoFilter>("TODAS");
  const [status, setStatus] = useState<StatusFilter>("TODOS");
  const [bucket, setBucket] = useState("");
  const [ordenacao, setOrdenacao] = useState<ContasReceberOrdenacao>(CONTAS_RECEBER_VIEW_CONFIG.VENCIDAS.ordenacaoPadrao);
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");
  const [competenciaInicio, setCompetenciaInicio] = useState("");
  const [competenciaFim, setCompetenciaFim] = useState("");
  const [vencimentoInicio, setVencimentoInicio] = useState("");
  const [vencimentoFim, setVencimentoFim] = useState("");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [payload, setPayload] = useState<ContasReceberAuditoriaPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllRanking, setShowAllRanking] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetalheCobrancaAuditoria | null>(null);
  const [receberOpen, setReceberOpen] = useState(false);
  const [receberItem, setReceberItem] = useState<CobrancaListaItem | null>(null);
  const [receberForm, setReceberForm] = useState<ReceberForm>({ data_pagamento: todayIso(), metodo_pagamento: "PIX" });
  const [receberLoading, setReceberLoading] = useState(false);
  const [titulosOpen, setTitulosOpen] = useState(false);
  const [titulosPessoa, setTitulosPessoa] = useState<DevedorAuditoriaItem | null>(null);
  const [titulos, setTitulos] = useState<TituloVencido[]>([]);
  const [titulosLoading, setTitulosLoading] = useState(false);
  const [titulosError, setTitulosError] = useState<string | null>(null);

  const qDeferred = useDeferredValue(q);
  const viewConfig = CONTAS_RECEBER_VIEW_CONFIG[visao];
  const ordenacoesDisponiveis = useMemo(() => getOrdenacoesDisponiveis(visao), [visao]);

  useEffect(() => {
    const defaultOrdenacao = CONTAS_RECEBER_VIEW_CONFIG[visao].ordenacaoPadrao;
    if (!ordenacoesDisponiveis.includes(ordenacao)) {
      setOrdenacao(defaultOrdenacao);
    }
  }, [ordenacao, ordenacoesDisponiveis, visao]);

  useEffect(() => {
    if (tipoPeriodo !== "MES_ANO") setMes("");
    if (tipoPeriodo !== "MES_ANO" && tipoPeriodo !== "ANO_INTEIRO") setAno("");
    if (tipoPeriodo !== "COMPETENCIA") {
      setCompetenciaInicio("");
      setCompetenciaFim("");
    }
    if (tipoPeriodo !== "ENTRE_DATAS") {
      setVencimentoInicio("");
      setVencimentoFim("");
    }
  }, [tipoPeriodo]);

  useEffect(() => {
    if (visao !== "INCONSISTENCIAS" && status === "CANCELADA") {
      setStatus("TODOS");
    }
  }, [status, visao]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("visao", visao);
    params.set("tipo_periodo", tipoPeriodo);
    params.set("ordenacao", ordenacao);
    if (situacao !== "TODAS") params.set("situacao", situacao);
    if (status !== "TODOS") params.set("status", status);
    if (contexto !== "TODOS") params.set("contexto", contexto);
    if (bucket) params.set("bucket", bucket);
    if (tipoPeriodo === "MES_ANO") {
      if (mes) params.set("mes", mes);
      if (ano) params.set("ano", ano);
    }
    if (tipoPeriodo === "ANO_INTEIRO" && ano) {
      params.set("ano", ano);
    }
    if (tipoPeriodo === "ENTRE_DATAS") {
      if (vencimentoInicio) params.set("vencimento_inicio", vencimentoInicio);
      if (vencimentoFim) params.set("vencimento_fim", vencimentoFim);
    }
    if (tipoPeriodo === "COMPETENCIA") {
      if (competenciaInicio) params.set("competencia_inicio", competenciaInicio);
      if (competenciaFim) params.set("competencia_fim", competenciaFim);
    }
    if (qDeferred.trim()) params.set("q", qDeferred.trim());
    params.set("page", String(page));
    params.set("page_size", "50");
    return params.toString();
  }, [
    ano,
    bucket,
    competenciaFim,
    competenciaInicio,
    contexto,
    mes,
    ordenacao,
    page,
    qDeferred,
    situacao,
    status,
    tipoPeriodo,
    vencimentoFim,
    vencimentoInicio,
    visao,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/financeiro/contas-a-receber?${queryString}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as ApiResponse | null;
        if (!response.ok || !json?.ok) {
          throw new Error(json?.error ?? "erro_carregar_contas_receber");
        }
        setPayload(json);
      } catch (loadError: unknown) {
        if ((loadError as { name?: string }).name === "AbortError") return;
        setPayload(null);
        setError(loadError instanceof Error ? loadError.message : "erro_carregar_contas_receber");
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [queryString, reloadToken]);

  useEffect(() => {
    setPage(1);
    setShowAllRanking(false);
  }, [
    bucket,
    competenciaFim,
    competenciaInicio,
    contexto,
    ordenacao,
    qDeferred,
    situacao,
    status,
    tipoPeriodo,
    vencimentoFim,
    vencimentoInicio,
    visao,
    ano,
    mes,
  ]);

  async function abrirTitulos(item: DevedorAuditoriaItem) {
    setTitulosPessoa(item);
    setTitulosOpen(true);
    setTitulosLoading(true);
    setTitulosError(null);
    setTitulos([]);
    try {
      const response = await fetch(`/api/financeiro/contas-a-receber/vencidas/por-pessoa?pessoa_id=${item.pessoa_id}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as TitulosResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_carregar_titulos");
      }
      setTitulos(json.titulos ?? []);
    } catch (loadError: unknown) {
      setTitulosError(loadError instanceof Error ? loadError.message : "erro_carregar_titulos");
    } finally {
      setTitulosLoading(false);
    }
  }

  async function abrirAuditoria(item: CobrancaListaItem) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const response = await fetch(`/api/financeiro/contas-a-receber?${queryString}&detalhe_cobranca_id=${item.cobranca_id}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_carregar_detalhe");
      }
      setDetailData(json.detalhe_cobranca);
    } catch (loadError: unknown) {
      setDetailError(loadError instanceof Error ? loadError.message : "erro_carregar_detalhe");
    } finally {
      setDetailLoading(false);
    }
  }

  function abrirRecebimento(item: CobrancaListaItem) {
    setReceberItem(item);
    setReceberForm({ data_pagamento: todayIso(), metodo_pagamento: "PIX" });
    setReceberOpen(true);
  }

  async function confirmarRecebimento() {
    if (!receberItem) return;
    setReceberLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/financeiro/contas-receber/receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_id: receberItem.cobranca_id,
          valor_centavos: receberItem.valor_aberto_centavos,
          data_pagamento: receberForm.data_pagamento,
          metodo_pagamento: receberForm.metodo_pagamento,
        }),
      });
      const json = (await response.json().catch(() => null)) as ReceberResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_registrar_recebimento");
      }
      setReceberOpen(false);
      setReceberItem(null);
      setPage(1);
      const refreshed = await fetch(`/api/financeiro/contas-a-receber?${queryString}`, { cache: "no-store" });
      const refreshedJson = (await refreshed.json().catch(() => null)) as ApiResponse | null;
      if (refreshed.ok && refreshedJson?.ok) setPayload(refreshedJson);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "erro_registrar_recebimento");
    } finally {
      setReceberLoading(false);
    }
  }

  function handleExpurgoConcluido() {
    setReloadToken((current) => current + 1);
  }

  function limparFiltros() {
    setQ("");
    setVisao("VENCIDAS");
    setTipoPeriodo("SEM_PERIODO");
    setContexto("TODOS");
    setSituacao("TODAS");
    setStatus("TODOS");
    setBucket("");
    setOrdenacao(CONTAS_RECEBER_VIEW_CONFIG.VENCIDAS.ordenacaoPadrao);
    setMes("");
    setAno("");
    setCompetenciaInicio("");
    setCompetenciaFim("");
    setVencimentoInicio("");
    setVencimentoFim("");
  }

  const metricasVisao = payload?.metricas_visao ?? [];
  const contextosVisao = (payload?.contextos_visao ?? []).filter(
    (item) => item.contexto !== "OUTRO" || item.valor_centavos > 0,
  );
  const rankingPrincipal = payload?.ranking_principal ?? [];

  return (
    <FinancePageShell
      title="Contas a Receber"
      subtitle="Saude financeira, auditoria por devedor e leitura operacional da origem das cobrancas."
      actions={
        <Button type="button" variant="secondary" onClick={limparFiltros}>
          Limpar filtros
        </Button>
      }
    >
      <FinanceHelpCard
        items={[
          "Use a visao para mudar o foco da tela entre atraso, exposicao futura, recebimento e revisao.",
          "O contexto mostra onde o saldo nasce de verdade: Escola, Cafe, Loja ou casos em revisao.",
          "A auditoria da cobranca abre a trilha financeira completa e a composicao da fatura do Cartao Conexao quando existir.",
        ]}
      />

      <ContasReceberFilters
        busca={q}
        visao={visao}
        tipoPeriodo={tipoPeriodo}
        contexto={contexto}
        situacao={situacao}
        status={status}
        bucket={bucket}
        ordenacao={ordenacao}
        mes={mes}
        ano={ano}
        vencimentoInicio={vencimentoInicio}
        vencimentoFim={vencimentoFim}
        competenciaInicio={competenciaInicio}
        competenciaFim={competenciaFim}
        ordenacoesDisponiveis={ordenacoesDisponiveis}
        onBuscaChange={setQ}
        onVisaoChange={setVisao}
        onTipoPeriodoChange={setTipoPeriodo}
        onContextoChange={setContexto}
        onSituacaoChange={setSituacao}
        onStatusChange={setStatus}
        onBucketChange={setBucket}
        onOrdenacaoChange={setOrdenacao}
        onMesChange={setMes}
        onAnoChange={setAno}
        onVencimentoInicioChange={setVencimentoInicio}
        onVencimentoFimChange={setVencimentoFim}
        onCompetenciaInicioChange={setCompetenciaInicio}
        onCompetenciaFimChange={setCompetenciaFim}
      />

      <Card className="border-slate-200 bg-white">
        <CardContent className="flex flex-col gap-2 py-5">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{visao.replaceAll("_", " ")}</div>
          <h2 className="text-2xl font-semibold text-slate-950">{viewConfig.tituloBlocoPrincipal}</h2>
          <p className="max-w-3xl text-sm text-slate-600">{viewConfig.subtituloBlocoPrincipal}</p>
          {loading ? <p className="text-xs uppercase tracking-wide text-slate-400">Atualizando leitura...</p> : null}
        </CardContent>
      </Card>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricasVisao.map((item) => (
          <KpiCard key={item.id} item={item} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {contextosVisao.map((item) => (
          <Card key={item.contexto} className="border-slate-200 bg-white">
            <CardContent className="space-y-1 py-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{getContextoLabel(item.contexto)}</p>
              <p className="text-2xl font-semibold text-slate-900">{formatBRLFromCents(item.valor_centavos)}</p>
              <p className="text-sm text-slate-600">{contextoDescricao(visao, item.quantidade_cobrancas)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {visao === "VENCIDAS" ? (
        <DevedoresTable
          items={payload?.devedores_lista ?? []}
          showAll={showAllRanking}
          onToggleAll={() => setShowAllRanking((current) => !current)}
          onVerTitulos={abrirTitulos}
          title={viewConfig.tituloRanking}
          subtitle={viewConfig.subtituloRanking}
          emptyMessage="Nenhum devedor vencido foi encontrado com os filtros atuais."
        />
      ) : (
        <ResumoRankingTable
          title={viewConfig.tituloRanking}
          subtitle={viewConfig.subtituloRanking}
          mode={viewConfig.rankingModo}
          items={rankingPrincipal}
          showAll={showAllRanking}
          onToggleAll={() => setShowAllRanking((current) => !current)}
          emptyMessage="Nenhum destaque relevante foi encontrado para a visao atual."
        />
      )}

      <CobrancasTable
        items={payload?.cobrancas_lista ?? []}
        page={payload?.paginacao.page ?? 1}
        totalPages={payload?.paginacao.total_paginas ?? 1}
        total={payload?.paginacao.total ?? 0}
        visao={visao}
        title={viewConfig.tituloTabela}
        subtitle={viewConfig.subtituloTabela}
        onPageChange={(nextPage) => setPage(nextPage)}
        onAuditar={abrirAuditoria}
        onReceber={abrirRecebimento}
        onExpurgoConcluido={handleExpurgoConcluido}
      />

      <PerdasCancelamentoCard items={payload?.perdas_cancelamento ?? []} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Detalhe da cobranca</DialogTitle>
              <DialogDescription>Trilha financeira, contexto operacional e composicao de fatura quando aplicavel.</DialogDescription>
            </div>
          </DialogHeader>
          <CobrancaAuditDetail detalhe={detailData} loading={detailLoading} error={detailError} />
        </DialogContent>
      </Dialog>

      <Dialog open={titulosOpen} onOpenChange={setTitulosOpen}>
        <DialogContent className="max-w-4xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Titulos vencidos</DialogTitle>
              <DialogDescription>{titulosPessoa ? titulosPessoa.pessoa_nome : "Pessoa selecionada"}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="p-6">
            {titulosLoading ? (
              <div className="text-sm text-slate-500">Carregando titulos...</div>
            ) : titulosError ? (
              <div className="text-sm text-rose-700">{titulosError}</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">Cobranca</th>
                    <th className="px-3 py-3 font-medium">Vencimento</th>
                    <th className="px-3 py-3 font-medium">Atraso</th>
                    <th className="px-3 py-3 font-medium">Origem</th>
                    <th className="px-3 py-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {titulos.map((item) => (
                    <tr key={item.cobranca_id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-3 text-slate-700">#{item.cobranca_id}</td>
                      <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
                      <td className="px-3 py-3 text-slate-700">{item.dias_atraso} dias</td>
                      <td className="px-3 py-3 text-slate-700">
                        {item.origem_tipo ?? "--"}
                        {item.origem_id ? ` #${item.origem_id}` : ""}
                      </td>
                      <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(item.saldo_aberto_centavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={receberOpen} onOpenChange={setReceberOpen}>
        <DialogContent className="max-w-xl p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <DialogTitle>Registrar recebimento</DialogTitle>
            <DialogDescription>{receberItem?.pessoa_nome ?? "Cobranca selecionada"}</DialogDescription>
          </div>
          <div className="space-y-4 p-6">
            <LinhaFormulario label="Cobranca" value={receberItem ? `#${receberItem.cobranca_id} · ${receberItem.origem_label}` : "--"} />
            <LinhaFormulario label="Saldo aberto" value={formatBRLFromCents(receberItem?.valor_aberto_centavos ?? 0)} />
            <label className="space-y-1 text-sm text-slate-700">
              <span>Data do pagamento</span>
              <Input
                type="date"
                value={receberForm.data_pagamento}
                onChange={(event) => setReceberForm((current) => ({ ...current, data_pagamento: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Metodo</span>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={receberForm.metodo_pagamento}
                onChange={(event) =>
                  setReceberForm((current) => ({
                    ...current,
                    metodo_pagamento: event.target.value === "DINHEIRO" ? "DINHEIRO" : "PIX",
                  }))
                }
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button type="button" onClick={() => void confirmarRecebimento()} disabled={receberLoading || !receberItem}>
                {receberLoading ? "Registrando..." : "Confirmar recebimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FinancePageShell>
  );
}

function LinhaFormulario({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
