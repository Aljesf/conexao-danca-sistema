"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafeDashboardEstoqueAlertas from "@/components/cafe/CafeDashboardEstoqueAlertas";
import CafeDashboardPeriodoFiltro from "@/components/cafe/CafeDashboardPeriodoFiltro";
import CafeMetricCard from "@/components/cafe/CafeMetricCard";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import type { CafeDashboardData, CafeDashboardPeriodo } from "@/lib/cafe/dashboard";
import { formatBRLFromCentavos } from "@/lib/formatters";

type ApiState = {
  loading: boolean;
  error: string | null;
  data: CafeDashboardData | null;
};

const EMPTY_DATA: CafeDashboardData = {
  resumo: {
    faturamento_total_centavos: 0,
    total_vendas: 0,
    ticket_medio_centavos: 0,
    itens_vendidos: 0,
    clientes_identificados_percentual: 0,
  },
  horarios: {
    faixas: [],
    faixa_pico: { hora: null, vendas: 0, faturamento_centavos: 0 },
  },
  consumo_por_perfil: [],
  alunos: {
    top_produtos: [],
    horarios_preferidos: [],
  },
  produtos: {
    mais_vendidos: [],
    maior_receita: [],
  },
  estoque: {
    alertas: [],
    quantidade_alertas: 0,
    quantidade_repor_agora: 0,
    quantidade_zerado: 0,
  },
  financeiro: {
    total_imediato_recebido_centavos: 0,
    total_recebivel_cartao_centavos: 0,
    total_conta_interna_aluno_centavos: 0,
    total_conta_interna_colaborador_centavos: 0,
    total_pendente_liquidacao_centavos: 0,
    distribuicao_contas: [],
  },
  meios_pagamento: [],
  explicacao: {
    texto_curto: "Sem leitura operacional disponivel para o periodo selecionado.",
  },
};

const PERFIL_LABELS: Record<string, string> = {
  COLABORADOR: "Colaborador",
  ALUNO: "Aluno",
  CLIENTE_EXTERNO: "Cliente externo",
  NAO_IDENTIFICADO: "Nao identificado",
};

function formatHourLabel(hour: number | null) {
  if (hour === null || !Number.isFinite(hour)) return "Sem pico";
  return `${String(hour).padStart(2, "0")}h`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[24px] border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-64 animate-pulse rounded-[24px] border border-slate-200 bg-slate-100" />
        <div className="h-64 animate-pulse rounded-[24px] border border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}

export default function CafeDashboard() {
  const [periodo, setPeriodo] = useState<CafeDashboardPeriodo>("30d");
  const [state, setState] = useState<ApiState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const response = await fetch(`/api/cafe/dashboard?periodo=${periodo}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | CafeDashboardData
          | { detalhe?: string; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            typeof payload === "object" && payload && "detalhe" in payload && payload.detalhe
              ? String(payload.detalhe)
              : "Falha ao carregar dashboard do cafe.",
          );
        }

        setState({
          loading: false,
          error: null,
          data: (payload as CafeDashboardData | null) ?? EMPTY_DATA,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Falha ao carregar dashboard do cafe.",
          data: EMPTY_DATA,
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [periodo]);

  const data = state.data ?? EMPTY_DATA;
  const perfis = useMemo(() => {
    const existing = new Map(data.consumo_por_perfil.map((item) => [item.perfil, item]));
    return ["COLABORADOR", "ALUNO", "CLIENTE_EXTERNO", "NAO_IDENTIFICADO"].map((perfil) =>
      existing.get(perfil) ?? {
        perfil,
        faturamento_centavos: 0,
        itens: 0,
        ticket_medio_centavos: 0,
        top_produtos: [],
      },
    );
  }, [data.consumo_por_perfil]);

  if (state.loading && !state.data) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <CafeCard
        title="Leitura operacional do periodo"
        description="Acompanhe vendas, mix de consumo, horarios e alertas do Ballet Cafe em um unico painel."
        actions={<CafeDashboardPeriodoFiltro value={periodo} onChange={setPeriodo} />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CafeMetricCard
            label="Faturamento total"
            value={formatBRLFromCentavos(data.resumo.faturamento_total_centavos)}
            description="Soma do periodo selecionado."
          />
          <CafeMetricCard
            label="Total de vendas"
            value={data.resumo.total_vendas.toLocaleString("pt-BR")}
            description="Numero de vendas consolidadas na view analitica."
          />
          <CafeMetricCard
            label="Ticket medio"
            value={formatBRLFromCentavos(data.resumo.ticket_medio_centavos)}
            description="Media por venda no periodo."
          />
          <CafeMetricCard
            label="Itens vendidos"
            value={data.resumo.itens_vendidos.toLocaleString("pt-BR")}
            description="Itens somados nas comandas concluidas."
          />
          <CafeMetricCard
            label="Clientes identificados"
            value={formatPercent(data.resumo.clientes_identificados_percentual)}
            description="Participacao de vendas com pessoa reconhecida."
          />
        </div>
        {state.error ? (
          <CafePanel className="border border-rose-200 bg-rose-50">
            <p className="text-sm font-medium text-rose-700">Falha ao carregar o dashboard.</p>
            <p className="mt-1 text-sm text-rose-600">{state.error}</p>
          </CafePanel>
        ) : null}
      </CafeCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CafeCard
          title="Leitura rapida do Cafe"
          description="Resumo curto para orientar o turno e as decisoes operacionais."
          variant="muted"
        >
          <p className="text-sm leading-7 text-slate-700">{data.explicacao.texto_curto}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Faixa pico
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatHourLabel(data.horarios.faixa_pico.hora)}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {data.horarios.faixa_pico.vendas.toLocaleString("pt-BR")} venda(s) e{" "}
                {formatBRLFromCentavos(data.horarios.faixa_pico.faturamento_centavos)} no horario
                mais forte.
              </p>
            </CafePanel>
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Acoes rapidas
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/cafe/vendas"
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir PDV
                </Link>
                <Link
                  href="/cafe/caixa"
                  className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir caixa
                </Link>
              </div>
            </CafePanel>
          </div>
        </CafeCard>

        <CafeCard
          title="Faixa de horario"
          description="Observe distribuicao de vendas e faturamento ao longo do dia."
        >
          {data.horarios.faixas.length === 0 ? (
            <CafePanel className="border-dashed">
              <p className="text-sm font-medium text-slate-900">Sem horarios para mostrar.</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                O painel fica pronto para destacar o pico de operacao assim que houver vendas no
                periodo.
              </p>
            </CafePanel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.horarios.faixas.map((faixa) => (
                <CafePanel key={faixa.hora}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatHourLabel(faixa.hora)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {faixa.vendas.toLocaleString("pt-BR")} venda(s)
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {faixa.itens.toLocaleString("pt-BR")} itens
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {formatBRLFromCentavos(faixa.faturamento_centavos)}
                  </p>
                </CafePanel>
              ))}
            </div>
          )}
        </CafeCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CafeCard
          title="Financeiro do Cafe"
          description="A leitura financeira separa recebimento imediato, recebivel de cartao e lancamentos para liquidacao futura em conta interna."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recebido no ato
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatBRLFromCentavos(data.financeiro.total_imediato_recebido_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Total que entrou imediatamente no caixa ou nas contas do Ballet Cafe.
              </p>
            </CafePanel>
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recebivel de cartao
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatBRLFromCentavos(data.financeiro.total_recebivel_cartao_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Vendas em cartao externo que seguem conciliacao e recebimento conforme a maquininha.
              </p>
            </CafePanel>
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Conta interna do aluno
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatBRLFromCentavos(data.financeiro.total_conta_interna_aluno_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Consumo enviado para faturamento mensal do responsavel financeiro.
              </p>
            </CafePanel>
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Conta interna do colaborador
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatBRLFromCentavos(data.financeiro.total_conta_interna_colaborador_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Consumo reservado para fechamento futuro em folha ou conta interna do colaborador.
              </p>
            </CafePanel>
            <CafePanel>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Pendente de liquidacao
              </p>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {formatBRLFromCentavos(data.financeiro.total_pendente_liquidacao_centavos)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Saldos abertos que ainda exigem baixa real ou regularizacao operacional.
              </p>
            </CafePanel>
          </div>

          <div className="mt-5 space-y-3">
            <CafeSectionIntro
              title="Distribuicao por conta financeira"
              description="Leitura economica das vendas do periodo vinculadas ao centro de custo Ballet Cafe."
            />
            {data.financeiro.distribuicao_contas.length === 0 ? (
              <CafePanel className="border-dashed">
                <p className="text-sm text-slate-600">Nenhuma conta financeira apareceu no periodo.</p>
              </CafePanel>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {data.financeiro.distribuicao_contas.map((conta) => (
                  <CafePanel key={`conta-${conta.conta_financeira_id ?? "nao-resolvida"}`}>
                    <p className="text-sm font-semibold text-slate-950">{conta.conta_financeira_nome}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatBRLFromCentavos(conta.total_centavos)}
                    </p>
                  </CafePanel>
                ))}
              </div>
            )}
          </div>
        </CafeCard>

        <CafeCard
          title="Meios de pagamento utilizados"
          description="Veja quais formas de liquidacao estao puxando o faturamento do Ballet Cafe no periodo."
        >
          {data.meios_pagamento.length === 0 ? (
            <CafePanel className="border-dashed">
              <p className="text-sm font-medium text-slate-900">Sem meios para comparar.</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Assim que houver vendas, o painel destacara quais pagamentos estao puxando o caixa e a cobranca futura.
              </p>
            </CafePanel>
          ) : (
            <div className="space-y-3">
              {data.meios_pagamento.map((meio) => (
                <CafePanel key={meio.codigo}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{meio.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {meio.vendas.toLocaleString("pt-BR")} venda(s)
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {meio.codigo}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {formatBRLFromCentavos(meio.faturamento_centavos)}
                  </p>
                </CafePanel>
              ))}
            </div>
          )}
        </CafeCard>
      </div>

      <CafeCard
        title="Comportamento de consumo"
        description="Leia o peso financeiro e o mix de produtos por perfil de consumidor."
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {perfis.map((perfil) => (
            <CafePanel key={perfil.perfil} className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Perfil
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                  {PERFIL_LABELS[perfil.perfil] ?? perfil.perfil}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <p>Faturamento: {formatBRLFromCentavos(perfil.faturamento_centavos)}</p>
                <p>Itens: {perfil.itens.toLocaleString("pt-BR")}</p>
                <p>Ticket medio: {formatBRLFromCentavos(perfil.ticket_medio_centavos)}</p>
              </div>
              {perfil.top_produtos.length === 0 ? (
                <p className="text-sm text-slate-500">Sem produtos relevantes no periodo.</p>
              ) : (
                <div className="space-y-2">
                  {perfil.top_produtos.map((produto) => (
                    <div
                      key={`${perfil.perfil}-${produto.produto_id ?? produto.produto_nome}`}
                      className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-slate-900">{produto.produto_nome}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {produto.quantidade.toLocaleString("pt-BR")} item(ns) |{" "}
                        {formatBRLFromCentavos(produto.faturamento_centavos)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CafePanel>
          ))}
        </div>
      </CafeCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <CafeCard
          title="Produtos"
          description="Compare volume e receita para orientar cardapio e exposicao."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <CafeSectionIntro
                title="Mais vendidos"
                description="Itens com maior giro no periodo selecionado."
              />
              {data.produtos.mais_vendidos.length === 0 ? (
                <CafePanel className="border-dashed">
                  <p className="text-sm text-slate-600">Sem itens vendidos no periodo.</p>
                </CafePanel>
              ) : (
                data.produtos.mais_vendidos.map((produto, index) => (
                  <CafePanel key={`mais-${produto.produto_id ?? index}`}>
                    <p className="text-sm font-semibold text-slate-950">{produto.produto_nome}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {produto.quantidade.toLocaleString("pt-BR")} item(ns)
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatBRLFromCentavos(produto.faturamento_centavos)}
                    </p>
                  </CafePanel>
                ))
              )}
            </div>
            <div className="space-y-3">
              <CafeSectionIntro
                title="Maior receita"
                description="Produtos que mais geraram valor no periodo."
              />
              {data.produtos.maior_receita.length === 0 ? (
                <CafePanel className="border-dashed">
                  <p className="text-sm text-slate-600">Sem receita consolidada no periodo.</p>
                </CafePanel>
              ) : (
                data.produtos.maior_receita.map((produto, index) => (
                  <CafePanel key={`receita-${produto.produto_id ?? index}`}>
                    <p className="text-sm font-semibold text-slate-950">{produto.produto_nome}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatBRLFromCentavos(produto.faturamento_centavos)}
                    </p>
                  </CafePanel>
                ))
              )}
            </div>
          </div>
        </CafeCard>

        <CafeCard
          title="Alunos: padrao de consumo"
          description="Acompanhe horarios preferidos e itens mais consumidos por alunos."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <CafeSectionIntro
                title="Top produtos"
                description="Produtos que mais aparecem nas vendas ligadas a alunos."
              />
              {data.alunos.top_produtos.length === 0 ? (
                <CafePanel className="border-dashed">
                  <p className="text-sm text-slate-600">Sem consumo de alunos no periodo.</p>
                </CafePanel>
              ) : (
                data.alunos.top_produtos.map((produto, index) => (
                  <CafePanel key={`aluno-produto-${produto.produto_id ?? index}`}>
                    <p className="text-sm font-semibold text-slate-950">{produto.produto_nome}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {produto.quantidade.toLocaleString("pt-BR")} item(ns) |{" "}
                      {formatBRLFromCentavos(produto.faturamento_centavos)}
                    </p>
                  </CafePanel>
                ))
              )}
            </div>
            <div className="space-y-3">
              <CafeSectionIntro
                title="Horarios preferidos"
                description="Faixas em que alunos mais consomem no Ballet Cafe."
              />
              {data.alunos.horarios_preferidos.length === 0 ? (
                <CafePanel className="border-dashed">
                  <p className="text-sm text-slate-600">Sem horarios relevantes para alunos.</p>
                </CafePanel>
              ) : (
                data.alunos.horarios_preferidos.map((faixa) => (
                  <CafePanel key={`aluno-hora-${faixa.hora}`}>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatHourLabel(faixa.hora)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {faixa.vendas.toLocaleString("pt-BR")} venda(s)
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatBRLFromCentavos(faixa.faturamento_centavos)}
                    </p>
                  </CafePanel>
                ))
              )}
            </div>
          </div>
        </CafeCard>
      </div>

      <CafeCard
        title="Estoque e reposicao"
        description="Acompanhe alertas operacionais de insumos e custo medio registrado."
      >
        <CafeDashboardEstoqueAlertas
          alertas={data.estoque.alertas}
          quantidadeAlertas={data.estoque.quantidade_alertas}
          quantidadeReporAgora={data.estoque.quantidade_repor_agora}
          quantidadeZerado={data.estoque.quantidade_zerado}
        />
      </CafeCard>

      <CafeCard
        title="Acoes rapidas"
        description="Entre diretamente no fluxo operacional ou na governanca do modulo."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CafeShortcutCard
            href="/cafe/vendas"
            title="PDV / Vendas"
            description="Operacao rapida de balcao com catalogo visual."
            eyebrow="Operacao"
            featured
          />
          <CafeShortcutCard
            href="/cafe/caixa"
            title="Caixa / Lancamentos"
            description="Registro retroativo, baixas e ajustes administrativos."
            eyebrow="Regularizacao"
          />
          <CafeShortcutCard
            href="/cafe/admin"
            title="Gestao do Cafe"
            description="Governanca do modulo, catalogo, compras e suporte operacional."
            eyebrow="Governanca"
          />
          <CafeShortcutCard
            href="/cafe/admin/insumos"
            title="Insumos"
            description="Estoque, abastecimento e acompanhamento de saldo."
            eyebrow="Estoque"
          />
          <CafeShortcutCard
            href="/cafe/admin/tabelas-preco"
            title="Tabelas de preco"
            description="Politica comercial aplicada ao PDV e ao caixa."
            eyebrow="Preco"
          />
        </div>
      </CafeCard>
    </div>
  );
}
