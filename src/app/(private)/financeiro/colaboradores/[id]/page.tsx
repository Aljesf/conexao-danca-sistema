"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CompetenciaResumo = {
  competencia: string;
  valor_bruto_receber_centavos: number;
  proventos_centavos: number;
  adicionais_centavos: number;
  adiantamentos_centavos: number;
  descontos_centavos: number;
  descontos_excluindo_adiantamentos_centavos: number;
  consumo_conta_interna_centavos: number;
  saldo_liquido_centavos: number;
  status_competencia: string;
  status_fatura: string | null;
  status_folha: string | null;
  status_importacao_folha: string;
  folha_pagamento_colaborador_id: number | null;
  folha_pagamento_id: number | null;
  fatura_id: number | null;
  cobranca_id: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  espelho_disponivel: boolean;
};

type Adiantamento = {
  id: number;
  tipo: "ADIANTAMENTO" | "SAQUE";
  competencia: string;
  data_pagamento: string | null;
  valor_centavos: number;
  observacao: string | null;
  folha_pagamento_colaborador_id: number | null;
  folha_evento_id: number | null;
};

type Painel = {
  colaborador: {
    id: number;
    pessoa_id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    email: string | null;
    status_vinculo: "ATIVO" | "INATIVO";
    tipo_vinculo: string | null;
    funcao_principal: string | null;
  };
  configuracao_pagamento: {
    gera_folha: boolean;
    tipo_remuneracao: string | null;
    salario_base_centavos: number;
    valor_hora_centavos: number;
    politica_desconto_cartao: string | null;
    politica_corte_cartao: string | null;
  };
  conta_interna: {
    existe: boolean;
    id: number | null;
    tipo_conta: string;
    descricao_exibicao: string | null;
    situacao_atual: string;
    saldo_em_aberto_centavos: number;
    quantidade_faturas: number;
    quantidade_competencias_abertas: number;
    ultima_fatura_id: number | null;
  };
  competencia_atual: string;
  resumo_mes_atual: CompetenciaResumo;
  ultimas_competencias: CompetenciaResumo[];
  totais_mes_atual: {
    adiantamentos_centavos: number;
    importado_conta_interna_centavos: number;
    saldo_liquido_estimado_centavos: number;
  };
  adiantamentos_mes_atual: Adiantamento[];
  adiantamentos_recentes: Adiantamento[];
};

type PainelResponse = { ok: boolean; data?: Painel; error?: string };
type CompetenciasResponse = {
  ok: boolean;
  colaborador_id?: number;
  competencias?: CompetenciaResumo[];
  error?: string;
};
type AdiantamentosResponse = {
  ok: boolean;
  data?: {
    colaborador_id: number;
    competencia: string | null;
    total_adiantamentos_centavos: number;
    adiantamentos: Adiantamento[];
    recentes: Adiantamento[];
  };
  error?: string;
};

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function competenciaLabel(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return value ?? "-";
  const [ano, mes] = value.split("-");
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function isoHoje() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function badgeClass(status: string | null | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["ATIVO", "IMPORTADA", "PAGA", "PAGO"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["ABERTA", "PENDENTE_IMPORTACAO", "PENDENTE", "EM_ABERTO"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["INATIVO", "CANCELADA", "CANCELADO"].includes(normalized)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function FichaFinanceiraColaboradorPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const colaboradorId = Number(params?.id);
  const competenciaQuery = searchParams.get("competencia");

  const [painel, setPainel] = useState<Painel | null>(null);
  const [competencias, setCompetencias] = useState<CompetenciaResumo[]>([]);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState("");
  const [adiantamentosCompetencia, setAdiantamentosCompetencia] = useState<Adiantamento[]>([]);
  const [adiantamentosRecentes, setAdiantamentosRecentes] = useState<Adiantamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdiantamentos, setLoadingAdiantamentos] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    competencia: "",
    valor: "",
    data_pagamento: isoHoje(),
    observacao: "",
  });

  useEffect(() => {
    let active = true;

    async function carregar() {
      if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;

      setLoading(true);
      setMessage(null);

      try {
        const [painelRes, competenciasRes] = await Promise.all([
          fetch(`/api/financeiro/colaboradores/${colaboradorId}/painel`, { cache: "no-store" }),
          fetch(`/api/financeiro/colaboradores/${colaboradorId}/competencias`, { cache: "no-store" }),
        ]);

        const painelJson = (await painelRes.json().catch(() => null)) as PainelResponse | null;
        const competenciasJson = (await competenciasRes.json().catch(() => null)) as CompetenciasResponse | null;

        if (!painelRes.ok) throw new Error(painelJson?.error ?? "falha_carregar_painel");
        if (!competenciasRes.ok) throw new Error(competenciasJson?.error ?? "falha_carregar_competencias");

        if (!active) return;

        const nextPainel = painelJson?.data ?? null;
        const nextCompetencias = Array.isArray(competenciasJson?.competencias) ? competenciasJson.competencias : [];
        const defaultCompetencia =
          (competenciaQuery &&
            nextCompetencias.some((item) => item.competencia === competenciaQuery) &&
            competenciaQuery) ||
          nextPainel?.competencia_atual ||
          nextCompetencias[0]?.competencia ||
          "";

        setPainel(nextPainel);
        setCompetencias(nextCompetencias);
        setCompetenciaSelecionada(defaultCompetencia);
        setForm((prev) => ({ ...prev, competencia: defaultCompetencia }));
      } catch (error) {
        if (!active) return;
        setPainel(null);
        setCompetencias([]);
        setAdiantamentosCompetencia([]);
        setAdiantamentosRecentes([]);
        setMessage(error instanceof Error ? error.message : "falha_carregar_painel");
      } finally {
        if (active) setLoading(false);
      }
    }

    void carregar();
    return () => {
      active = false;
    };
  }, [colaboradorId, competenciaQuery, reloadToken]);

  useEffect(() => {
    let active = true;

    async function carregarAdiantamentos() {
      if (!Number.isFinite(colaboradorId) || colaboradorId <= 0 || !competenciaSelecionada) return;

      setLoadingAdiantamentos(true);
      try {
        const response = await fetch(
          `/api/financeiro/colaboradores/${colaboradorId}/adiantamentos?competencia=${competenciaSelecionada}`,
          { cache: "no-store" },
        );
        const json = (await response.json().catch(() => null)) as AdiantamentosResponse | null;
        if (!response.ok) throw new Error(json?.error ?? "falha_carregar_adiantamentos");
        if (!active) return;
        setAdiantamentosCompetencia(json?.data?.adiantamentos ?? []);
        setAdiantamentosRecentes(json?.data?.recentes ?? []);
      } catch (error) {
        if (!active) return;
        setAdiantamentosCompetencia([]);
        setAdiantamentosRecentes([]);
        setMessage(error instanceof Error ? error.message : "falha_carregar_adiantamentos");
      } finally {
        if (active) setLoadingAdiantamentos(false);
      }
    }

    void carregarAdiantamentos();
    return () => {
      active = false;
    };
  }, [colaboradorId, competenciaSelecionada, reloadToken]);

  const competenciaAtual = useMemo(
    () =>
      competencias.find((item) => item.competencia === competenciaSelecionada) ??
      painel?.resumo_mes_atual ??
      null,
    [competenciaSelecionada, competencias, painel],
  );

  async function registrarAdiantamento() {
    if (!competenciaSelecionada) {
      setMessage("Selecione a competencia antes de registrar o adiantamento.");
      return;
    }

    const valorNumero = Number(String(form.valor).replace(",", "."));
    if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
      setMessage("Informe um valor valido para o adiantamento.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/financeiro/colaboradores/${colaboradorId}/adiantamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia: form.competencia || competenciaSelecionada,
          valor_centavos: Math.round(valorNumero * 100),
          data_pagamento: form.data_pagamento,
          observacao: form.observacao.trim() || null,
        }),
      });

      const json = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "falha_registrar_adiantamento");

      setForm({
        competencia: competenciaSelecionada,
        valor: "",
        data_pagamento: isoHoje(),
        observacao: "",
      });
      setFormOpen(false);
      setMessage("Adiantamento registrado na ficha financeira.");
      setReloadToken((current) => current + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "falha_registrar_adiantamento");
    } finally {
      setSubmitting(false);
    }
  }

  if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) {
    return <div className="p-6 text-sm text-red-600">Colaborador invalido.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b9894d]">
                Ficha financeira do colaborador
              </div>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                {painel?.colaborador.nome ?? "Colaborador"}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {painel?.colaborador.tipo_vinculo ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    {painel.colaborador.tipo_vinculo}
                  </span>
                ) : null}
                {painel?.colaborador.funcao_principal ? (
                  <span className="rounded-full bg-[#fff3e0] px-3 py-1 text-[#9a3412]">
                    {painel.colaborador.funcao_principal}
                  </span>
                ) : null}
                <span className={`rounded-full border px-3 py-1 ${badgeClass(painel?.colaborador.status_vinculo)}`}>
                  {painel?.colaborador.status_vinculo ?? "SEM_STATUS"}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-slate-600">
                Tela operacional da ficha financeira por competencia, com leitura de remuneracao, adiantamentos,
                desconto da conta interna e saldo liquido estimado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/financeiro/colaboradores">
                Voltar ao financeiro dos colaboradores
              </Link>
              <Link
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                href={`/financeiro/colaboradores/${colaboradorId}/conta-interna`}
              >
                Abrir conta interna
              </Link>
              {painel?.conta_interna.ultima_fatura_id ? (
                <Link
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                  href={`/admin/financeiro/credito-conexao/faturas/${painel.conta_interna.ultima_fatura_id}`}
                >
                  Abrir ultima fatura
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-700">{message}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Carregando ficha financeira...
          </div>
        ) : !painel || !competenciaAtual ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Nenhum dado financeiro encontrado para este colaborador.
          </div>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Competencia da ficha</div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <select
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                    value={competenciaSelecionada}
                    onChange={(event) => {
                      setCompetenciaSelecionada(event.target.value);
                      setForm((prev) => ({ ...prev, competencia: event.target.value }));
                    }}
                  >
                    {competencias.map((item) => (
                      <option key={item.competencia} value={item.competencia}>
                        {competenciaLabel(item.competencia)}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${badgeClass(competenciaAtual.status_competencia)}`}
                  >
                    {competenciaAtual.status_competencia}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Conta interna vinculada</div>
                    <div className="mt-1 font-medium text-slate-950">
                      {painel.conta_interna.id ? `Conta interna #${painel.conta_interna.id}` : "Conta interna nao criada"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Tipo: {painel.conta_interna.tipo_conta}{" "}
                      {painel.conta_interna.descricao_exibicao ? `- ${painel.conta_interna.descricao_exibicao}` : ""}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Leitura em folha</div>
                    <div className="mt-1 font-medium text-slate-950">{competenciaAtual.status_importacao_folha}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Politica: {painel.configuracao_pagamento.politica_desconto_cartao ?? "Nao configurada"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Bruto da competencia</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">
                    {brl(competenciaAtual.valor_bruto_receber_centavos)}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Base remuneratoria apurada para a competencia</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Desconto da conta interna
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">
                    {brl(competenciaAtual.consumo_conta_interna_centavos)}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Valor importado da conta interna para a competencia</div>
                </div>
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo liquido estimado</div>
                  <div className="mt-3 text-2xl font-semibold text-slate-950">
                    {brl(competenciaAtual.saldo_liquido_centavos)}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Valor estimado apos adiantamentos e descontos</div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Remuneracao</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">{brl(competenciaAtual.proventos_centavos)}</div>
                <div className="mt-1 text-sm text-slate-600">Proventos e adicionais consolidados</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Adiantamentos</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {brl(competenciaAtual.adiantamentos_centavos)}
                </div>
                <div className="mt-1 text-sm text-slate-600">Pagamentos antecipados desta competencia</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Desconto da conta interna</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {brl(competenciaAtual.consumo_conta_interna_centavos)}
                </div>
                <div className="mt-1 text-sm text-slate-600">Importacao da fatura para a folha desta competencia</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Outros descontos</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {brl(competenciaAtual.descontos_excluindo_adiantamentos_centavos)}
                </div>
                <div className="mt-1 text-sm text-slate-600">Descontos operacionais fora de adiantamentos</div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo da conta interna</div>
                <div className="mt-2 text-xl font-semibold text-slate-950">
                  {brl(painel.conta_interna.saldo_em_aberto_centavos)}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {painel.conta_interna.id ? `Conta interna #${painel.conta_interna.id}` : "Sem conta interna"}
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Adiantamentos da ficha</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Registre e confira os adiantamentos da competencia selecionada sem sair da ficha.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => {
                      setFormOpen((current) => !current);
                      setForm((prev) => ({ ...prev, competencia: competenciaSelecionada }));
                    }}
                  >
                    {formOpen ? "Fechar formulario" : "Registrar adiantamento"}
                  </button>
                </div>

                {formOpen ? (
                  <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span>Valor</span>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={form.valor}
                        onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>Data de pagamento</span>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                        type="date"
                        value={form.data_pagamento}
                        onChange={(event) => setForm((prev) => ({ ...prev, data_pagamento: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>Competencia</span>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={form.competencia}
                        onChange={(event) => setForm((prev) => ({ ...prev, competencia: event.target.value }))}
                        placeholder="YYYY-MM"
                      />
                    </label>
                    <label className="space-y-1 text-sm md:col-span-2">
                      <span>Observacao</span>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2"
                        value={form.observacao}
                        onChange={(event) => setForm((prev) => ({ ...prev, observacao: event.target.value }))}
                        placeholder="Ex.: adiantamento de transporte"
                      />
                    </label>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm hover:bg-white disabled:opacity-60"
                        disabled={submitting}
                        onClick={() => void registrarAdiantamento()}
                      >
                        {submitting ? "Salvando..." : "Salvar adiantamento"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Total da competencia selecionada
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-950">
                    {brl(competenciaAtual.adiantamentos_centavos)}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{competenciaLabel(competenciaSelecionada)}</div>
                </div>

                <div className="mt-4 space-y-3">
                  {loadingAdiantamentos ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      Carregando adiantamentos...
                    </div>
                  ) : adiantamentosCompetencia.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                      Nenhum adiantamento registrado nesta competencia.
                    </div>
                  ) : (
                    adiantamentosCompetencia.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-950">{item.observacao ?? "Adiantamento sem observacao"}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              {item.data_pagamento ?? "-"} - {competenciaLabel(item.competencia)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-950">{brl(item.valor_centavos)}</div>
                            <div className="text-xs text-slate-500">Lancamento #{item.id}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">Historico de competencias</h2>
                  <div className="mt-4 space-y-3">
                    {competencias.slice(0, 8).map((item) => (
                      <button
                        key={item.competencia}
                        type="button"
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          item.competencia === competenciaSelecionada
                            ? "border-[#c57f39] bg-[#fff8ef]"
                            : "border-slate-200 bg-slate-50 hover:bg-white"
                        }`}
                        onClick={() => {
                          setCompetenciaSelecionada(item.competencia);
                          setForm((prev) => ({ ...prev, competencia: item.competencia }));
                        }}
                      >
                        <div>
                          <div className="font-medium text-slate-950">{competenciaLabel(item.competencia)}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {item.status_importacao_folha} - Conta interna {brl(item.consumo_conta_interna_centavos)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-950">{brl(item.saldo_liquido_centavos)}</div>
                          <div className="text-xs text-slate-500">Liquido estimado</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">Atalhos operacionais</h2>
                  <div className="mt-4 grid gap-3">
                    <Link
                      href={`/financeiro/colaboradores/${colaboradorId}/conta-interna`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:bg-white"
                    >
                      Abrir conta interna individual
                    </Link>
                    {competenciaAtual.fatura_id ? (
                      <Link
                        href={`/admin/financeiro/credito-conexao/faturas/${competenciaAtual.fatura_id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:bg-white"
                      >
                        Abrir fatura da competencia
                      </Link>
                    ) : null}
                    {competenciaAtual.folha_pagamento_colaborador_id ? (
                      <Link
                        href={`/admin/financeiro/folha/colaboradores/${competenciaAtual.folha_pagamento_colaborador_id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:bg-white"
                      >
                        Abrir folha da competencia
                      </Link>
                    ) : null}
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
                      {painel.conta_interna.id
                        ? `Conta interna #${painel.conta_interna.id} - ${painel.conta_interna.situacao_atual}`
                        : "Conta interna ainda nao vinculada"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-950">Historico recente de adiantamentos</h2>
                  <div className="mt-4 space-y-3">
                    {adiantamentosRecentes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                        Nenhum adiantamento recente encontrado.
                      </div>
                    ) : (
                      adiantamentosRecentes.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-950">{competenciaLabel(item.competencia)}</div>
                              <div className="mt-1 text-sm text-slate-600">{item.observacao ?? "Sem observacao"}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-950">{brl(item.valor_centavos)}</div>
                              <div className="text-xs text-slate-500">{item.data_pagamento ?? "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
