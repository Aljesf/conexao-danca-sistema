"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { PessoaResumoFinanceiro } from "@/components/pessoas/PessoaResumoFinanceiro";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO } from "@/lib/formatters/date";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

type Cobranca = {
  id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string | null;
  status: string;
  situacao_saas?: "QUITADA" | "EM_ABERTO" | "VENCIDA" | null;
  competencia_ano_mes?: string | null;
  bucket_vencimento?: string | null;
  dias_atraso?: number;
  pessoa_id?: number | null;
  pessoa_nome?: string | null;
  centro_custo_nome?: string | null;
  centro_custo_codigo?: string | null;
  total_recebido_centavos: number;
  saldo_centavos: number;
};

type ContaReceberSaasRow = {
  cobranca_id: number;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  data_vencimento: string | null;
  status_cobranca: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
  valor_total_centavos: number;
  valor_recebido_centavos: number;
  saldo_aberto_centavos: number;
  competencia_ano_mes: string | null;
  dias_atraso: number;
  situacao_saas: "QUITADA" | "EM_ABERTO" | "VENCIDA";
  bucket_vencimento: string | null;
};

type DevedorAtrasadoRow = {
  pessoa_id: number;
  titulos_vencidos_qtd: number;
  total_vencido_centavos: number;
  vencimento_mais_antigo: string | null;
  maior_dias_atraso: number;
  pessoa: { id: number; nome: string | null };
};

type CobrancaAvulsa = {
  id: number;
  pessoa_id: number;
  origem_tipo: string;
  origem_id: number;
  valor_centavos: number;
  vencimento: string | null;
  status: string;
  meio: string;
  motivo_excecao: string;
  observacao?: string | null;
  criado_em?: string | null;
  pago_em?: string | null;
};

type ReceberItem = {
  tipo: "COBRANCA" | "AVULSA";
  id: number;
  pessoa_label: string;
  vencimento: string | null;
  valor_centavos: number;
  status: string;
  origem_label: string;
  cobranca?: Cobranca;
  avulsa?: CobrancaAvulsa;
};

type ContasReceberListResponse = {
  ok: boolean;
  itens?: ContaReceberSaasRow[];
  kpis?: { total_aberto_centavos?: number };
  total?: number;
  error?: string;
};

type DevedoresResponse = {
  ok: boolean;
  itens?: DevedorAtrasadoRow[];
  total_vencido_centavos?: number;
  error?: string;
};

type AvulsasResponse = {
  ok: boolean;
  data?: CobrancaAvulsa[];
  error?: string;
};

type ReceberResponse = {
  ok: boolean;
  error?: string;
};

type ReceberForm = {
  valor_centavos: number;
  data_pagamento: string;
  forma_pagamento_codigo: string;
  metodo_pagamento_texto: string;
  cartao_maquina_id: number | null;
  cartao_bandeira_id: number | null;
  cartao_numero_parcelas: number | null;
  observacoes: string;
};

type FormaPagamento = {
  id: number;
  codigo: string;
  nome: string;
  tipo_base: string;
  ativo: boolean;
};

type MaquinaOp = { id: number; nome?: string | null };
type BandeiraOp = { id: number; nome?: string | null; codigo?: string | null };

const SITUACAO_OPCOES = ["TODAS", "VENCIDA", "EM_ABERTO", "QUITADA"] as const;
const STATUS_INTERNO_OPCOES = ["TODOS", "PENDENTE", "RECEBIDO", "PAGO", "PAGA"] as const;
type QuickPreset = "VENCIDAS" | "A_VENCER_7" | "A_VENCER_30" | "MES_ATUAL" | "PROXIMO_MES" | "LIMPAR";

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function anoMesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function anoMesProximo() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ContasReceberPage() {
  const pessoaHref = (id: number) => `/pessoas/${id}`;

  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [situacaoFiltro, setSituacaoFiltro] = useState<(typeof SITUACAO_OPCOES)[number]>("TODAS");
  const [statusInternoFiltro, setStatusInternoFiltro] = useState<(typeof STATUS_INTERNO_OPCOES)[number]>("TODOS");
  const [bucketFiltro, setBucketFiltro] = useState<string>("");
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [totalAbertoKpi, setTotalAbertoKpi] = useState<number>(0);
  const [devedores, setDevedores] = useState<DevedorAtrasadoRow[]>([]);
  const [devedoresLoading, setDevedoresLoading] = useState(false);
  const [devedoresError, setDevedoresError] = useState<string | null>(null);
  const [totalVencidoKpi, setTotalVencidoKpi] = useState<number>(0);
  const [modalCobranca, setModalCobranca] = useState<Cobranca | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaOp[]>([]);
  const [bandeiras, setBandeiras] = useState<BandeiraOp[]>([]);
  const [refsErro, setRefsErro] = useState<string | null>(null);
  const [refsLoading, setRefsLoading] = useState(false);
  const [avulsas, setAvulsas] = useState<CobrancaAvulsa[]>([]);
  const [avulsasLoading, setAvulsasLoading] = useState(false);
  const [avulsasError, setAvulsasError] = useState<string | null>(null);
  const [form, setForm] = useState<ReceberForm>({
    valor_centavos: 0,
    data_pagamento: hojeISO(),
    forma_pagamento_codigo: "",
    metodo_pagamento_texto: "",
    cartao_maquina_id: null,
    cartao_bandeira_id: null,
    cartao_numero_parcelas: null,
    observacoes: "",
  });
  const [modalAvulsa, setModalAvulsa] = useState<CobrancaAvulsa | null>(null);
  const [avulsaForma, setAvulsaForma] = useState<string>("PIX");
  const [avulsaValor, setAvulsaValor] = useState<number>(0);
  const [avulsaComprovante, setAvulsaComprovante] = useState<string>("");
  const [avulsaPayError, setAvulsaPayError] = useState<string | null>(null);
  const [avulsaPayLoading, setAvulsaPayLoading] = useState(false);
  const [openPessoaResumo, setOpenPessoaResumo] = useState(false);
  const [pessoaResumoId, setPessoaResumoId] = useState<number | null>(null);
  const [pessoaResumoNome, setPessoaResumoNome] = useState<string | null>(null);

  const loadCobrancas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (situacaoFiltro && situacaoFiltro !== "TODAS") params.set("situacao", situacaoFiltro);
      if (statusInternoFiltro && statusInternoFiltro !== "TODOS") params.set("status", statusInternoFiltro);
      if (bucketFiltro) params.set("bucket", bucketFiltro);
      if (competenciaFiltro) params.set("competencia", competenciaFiltro);
      if (dataInicio) params.set("vencimento_inicio", dataInicio);
      if (dataFim) params.set("vencimento_fim", dataFim);
      if (situacaoFiltro === "VENCIDA" || situacaoFiltro === "EM_ABERTO") {
        params.set("somente_abertas", "1");
      }
      params.set("page", "1");
      params.set("page_size", "100");

      const res = await fetch(`/api/financeiro/contas-a-receber?${params.toString()}`);
      const json = (await res.json()) as ContasReceberListResponse;
      if (!res.ok || !json?.ok || !Array.isArray(json.itens)) {
        throw new Error(json?.error || "Erro ao carregar contas a receber.");
      }

      const mapped: Cobranca[] = json.itens.map((row) => {
        const origemLabel = row.origem_tipo
          ? `${row.origem_tipo}${row.origem_id ? ` #${row.origem_id}` : ""}`
          : `Cobranca #${row.cobranca_id}`;

        return {
          id: row.cobranca_id,
          descricao: origemLabel,
          valor_centavos: Number(row.valor_total_centavos || 0),
          vencimento: row.data_vencimento,
          status: row.status_cobranca || "PENDENTE",
          situacao_saas: row.situacao_saas,
          pessoa_id: row.pessoa_id,
          pessoa_nome: row.pessoa_nome,
          total_recebido_centavos: Number(row.valor_recebido_centavos || 0),
          saldo_centavos: Number(row.saldo_aberto_centavos || 0),
          competencia_ano_mes: row.competencia_ano_mes,
          bucket_vencimento: row.bucket_vencimento,
          dias_atraso: Number(row.dias_atraso || 0),
        };
      });

      setCobrancas(mapped);
      setTotalAbertoKpi(Number(json?.kpis?.total_aberto_centavos ?? 0));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao carregar contas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [situacaoFiltro, statusInternoFiltro, bucketFiltro, competenciaFiltro, dataInicio, dataFim]);

  const loadDevedores = useCallback(async () => {
    setDevedoresLoading(true);
    setDevedoresError(null);
    try {
      const res = await fetch("/api/financeiro/contas-a-receber/devedores-atrasados?limit=10", {
        cache: "no-store",
      });
      const json = (await res.json()) as DevedoresResponse;
      if (!res.ok || !json?.ok || !Array.isArray(json.itens)) {
        throw new Error(json?.error || "Erro ao carregar devedores atrasados.");
      }
      setDevedores(json.itens);
      setTotalVencidoKpi(Number(json.total_vencido_centavos ?? 0));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar devedores atrasados.";
      setDevedoresError(message);
      setDevedores([]);
      setTotalVencidoKpi(0);
    } finally {
      setDevedoresLoading(false);
    }
  }, []);

  const loadAvulsas = useCallback(async () => {
    setAvulsasLoading(true);
    setAvulsasError(null);
    try {
      const params = new URLSearchParams();
      const statusMap = statusInternoFiltro === "RECEBIDO" ? "PAGO" : statusInternoFiltro;
      if (statusMap && statusMap !== "TODOS") params.set("status", statusMap);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);

      const res = await fetch(`/api/financeiro/cobrancas-avulsas?${params.toString()}`);
      const json = (await res.json()) as AvulsasResponse;
      if (!res.ok || !json?.ok || !Array.isArray(json.data)) {
        throw new Error(json?.error || "Erro ao carregar cobrancas avulsas.");
      }
      setAvulsas(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar cobrancas avulsas.";
      setAvulsasError(message);
      setAvulsas([]);
    } finally {
      setAvulsasLoading(false);
    }
  }, [statusInternoFiltro, dataInicio, dataFim]);

  const loadRefs = useCallback(async () => {
    setRefsLoading(true);
    setRefsErro(null);
    try {
      const [formasRes, maquinasRes, bandeirasRes] = await Promise.all([
        fetch("/api/financeiro/formas-pagamento/dicionario"),
        fetch("/api/financeiro/cartao/maquinas/opcoes"),
        fetch("/api/financeiro/cartao/bandeiras/opcoes"),
      ]);
      const formasJson = await formasRes.json().catch(() => ({}));
      const maquinasJson = await maquinasRes.json().catch(() => ({}));
      const bandeirasJson = await bandeirasRes.json().catch(() => ({}));

      if (formasRes.ok && formasJson?.ok && Array.isArray(formasJson.formas)) {
        setFormas(formasJson.formas);
      } else {
        setRefsErro("Falha ao carregar dicionario de formas de pagamento.");
      }
      if (maquinasRes.ok && maquinasJson?.ok && Array.isArray(maquinasJson.maquinas)) {
        setMaquinas(maquinasJson.maquinas);
      }
      if (bandeirasRes.ok && bandeirasJson?.ok && Array.isArray(bandeirasJson.bandeiras)) {
        setBandeiras(bandeirasJson.bandeiras);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar bases auxiliares.";
      setRefsErro(message);
    } finally {
      setRefsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCobrancas();
    loadRefs();
    loadAvulsas();
    loadDevedores();
  }, [loadCobrancas, loadRefs, loadAvulsas, loadDevedores]);

  function aplicarPreset(p: QuickPreset) {
    if (p === "LIMPAR") {
      setSituacaoFiltro("TODAS");
      setBucketFiltro("");
      setCompetenciaFiltro("");
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (p === "VENCIDAS") {
      setSituacaoFiltro("VENCIDA");
      setBucketFiltro("VENCIDA");
      setCompetenciaFiltro("");
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (p === "A_VENCER_7") {
      setSituacaoFiltro("EM_ABERTO");
      setBucketFiltro("A_VENCER_7");
      setCompetenciaFiltro("");
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (p === "A_VENCER_30") {
      setSituacaoFiltro("EM_ABERTO");
      setBucketFiltro("A_VENCER_30");
      setCompetenciaFiltro("");
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (p === "MES_ATUAL") {
      setSituacaoFiltro("TODAS");
      setCompetenciaFiltro(anoMesAtual());
      setBucketFiltro("");
      setDataInicio("");
      setDataFim("");
      return;
    }

    setSituacaoFiltro("TODAS");
    setCompetenciaFiltro(anoMesProximo());
    setBucketFiltro("");
    setDataInicio("");
    setDataFim("");
  }

  function abrirModal(c: Cobranca) {
    setModalCobranca(c);
    setForm({
      valor_centavos: c.saldo_centavos || c.valor_centavos,
      data_pagamento: hojeISO(),
      forma_pagamento_codigo: "",
      metodo_pagamento_texto: "",
      cartao_maquina_id: null,
      cartao_bandeira_id: null,
      cartao_numero_parcelas: null,
      observacoes: "",
    });
  }

  function abrirResumoPessoa(pessoaId: number, pessoaNome?: string | null) {
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) return;
    setPessoaResumoId(pessoaId);
    setPessoaResumoNome(pessoaNome ?? null);
    setOpenPessoaResumo(true);
  }

  function abrirModalAvulsa(c: CobrancaAvulsa) {
    setModalAvulsa(c);
    setAvulsaForma("PIX");
    setAvulsaValor(c.valor_centavos);
    setAvulsaComprovante("");
    setAvulsaPayError(null);
  }

  const formaSelecionada = useMemo(
    () => formas.find((f) => f.codigo === form.forma_pagamento_codigo),
    [formas, form.forma_pagamento_codigo]
  );
  const isCartao = useMemo(() => {
    const tipo = (formaSelecionada?.tipo_base || "").toUpperCase();
    return tipo.includes("CARTAO") || tipo.includes("CREDITO") || tipo.includes("DEBITO");
  }, [formaSelecionada]);

  async function salvarRecebimento(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCobranca) return;
    setSalvando(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        cobranca_id: modalCobranca.id,
        valor_centavos: form.valor_centavos,
        data_pagamento: form.data_pagamento,
        forma_pagamento_codigo: form.forma_pagamento_codigo || undefined,
        metodo_pagamento: form.metodo_pagamento_texto || undefined,
        observacoes: form.observacoes || null,
      };
      if (isCartao) {
        payload.cartao_maquina_id = form.cartao_maquina_id || null;
        payload.cartao_bandeira_id = form.cartao_bandeira_id || null;
        payload.cartao_numero_parcelas = form.cartao_numero_parcelas || null;
      }

      const res = await fetch("/api/financeiro/contas-receber/receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ReceberResponse;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao registrar recebimento.");
      }
      setModalCobranca(null);
      await loadCobrancas();
      await loadAvulsas();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar recebimento.";
      setError(message);
    } finally {
      setSalvando(false);
    }
  }

  async function registrarPagamentoAvulsa() {
    if (!modalAvulsa) return;
    setAvulsaPayLoading(true);
    setAvulsaPayError(null);

    try {
      const res = await fetch(
        `/api/financeiro/cobrancas-avulsas/${modalAvulsa.id}/registrar-recebimento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forma_pagamento: avulsaForma,
            valor_pago_centavos: avulsaValor,
            comprovante: avulsaComprovante || null,
          }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as ReceberResponse & {
        message?: string;
        details?: string;
      };
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || json?.details || json?.error || "Erro ao registrar pagamento.");
      }

      setModalAvulsa(null);
      await loadAvulsas();
      await loadCobrancas();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao registrar pagamento.";
      setAvulsaPayError(message);
    } finally {
      setAvulsaPayLoading(false);
    }
  }

  const receberItens = useMemo<ReceberItem[]>(() => {
    const itensCobranca = cobrancas.map((c) => {
      const saldo = Number(c.saldo_centavos || 0);
      return {
        tipo: "COBRANCA" as const,
        id: c.id,
        pessoa_label: c.pessoa_nome ? `${c.pessoa_nome} (#${c.pessoa_id ?? "--"})` : c.pessoa_id ? `Pessoa #${c.pessoa_id}` : "--",
        vencimento: c.vencimento,
        valor_centavos: saldo > 0 ? saldo : Number(c.valor_centavos || 0),
        status: c.status,
        origem_label: c.descricao,
        cobranca: c,
      };
    });

    const itensAvulsas = avulsas.map((a) => {
      const origem =
        a.origem_tipo && a.origem_id
          ? `${a.origem_tipo} #${a.origem_id}`
          : a.origem_tipo || "Cobranca avulsa";
      return {
        tipo: "AVULSA" as const,
        id: a.id,
        pessoa_label: `Pessoa #${a.pessoa_id}`,
        vencimento: a.vencimento,
        valor_centavos: Number(a.valor_centavos || 0),
        status: a.status,
        origem_label: origem,
        avulsa: a,
      };
    });

    const itens = [...itensCobranca, ...itensAvulsas];
    itens.sort((a, b) => {
      const va = a.vencimento || "9999-12-31";
      const vb = b.vencimento || "9999-12-31";
      if (va < vb) return -1;
      if (va > vb) return 1;
      return a.id - b.id;
    });
    return itens;
  }, [cobrancas, avulsas]);

  const totalAberto = useMemo(() => {
    return receberItens.reduce((acc, item) => {
      if (item.tipo === "COBRANCA") {
        const saldo = item.cobranca?.saldo_centavos ?? 0;
        return acc + Math.max(0, Number(saldo));
      }
      const status = String(item.status || "").toUpperCase();
      if (status === "PAGO" || status === "CANCELADO") return acc;
      return acc + Math.max(0, Number(item.valor_centavos || 0));
    }, 0);
  }, [receberItens]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Contas a receber</h1>
            <p className="text-sm text-slate-600">
              Central SaaS de cobrança com foco em vencimento, competência e recuperação de inadimplência.
            </p>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              loadCobrancas();
              loadAvulsas();
              loadDevedores();
            }}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
        <FinanceHelpCard
          subtitle="Operacao real"
          items={[
            "Filtros rapidos por vencimento: vencidas, 7 dias e 30 dias.",
            "Filtro por competencia (YYYY-MM) para operacao mensal.",
            "Card de principais devedores atrasados (top 10) para cobrança ativa.",
          ]}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("VENCIDAS")}>
            Vencidas
          </button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("A_VENCER_7")}>
            Vence em 7 dias
          </button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("A_VENCER_30")}>
            Vence em 30 dias
          </button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("MES_ATUAL")}>
            Mes atual
          </button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("PROXIMO_MES")}>
            Proximo mes
          </button>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => aplicarPreset("LIMPAR")}>
            Limpar
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <label className="text-sm text-slate-700">
            Situacao (SaaS)
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={situacaoFiltro}
              onChange={(e) => setSituacaoFiltro(e.target.value as (typeof SITUACAO_OPCOES)[number])}
            >
              {SITUACAO_OPCOES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Status interno (opcional)
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={statusInternoFiltro}
              onChange={(e) => setStatusInternoFiltro(e.target.value as (typeof STATUS_INTERNO_OPCOES)[number])}
            >
              {STATUS_INTERNO_OPCOES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Competencia (YYYY-MM)
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="2026-03"
              value={competenciaFiltro}
              onChange={(e) => setCompetenciaFiltro(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            Vencimento inicio
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </label>
          <label className="text-sm text-slate-700">
            Vencimento fim
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2 text-sm">
          <button
            className="rounded-md bg-purple-600 px-3 py-2 text-white shadow-sm hover:bg-purple-500 disabled:opacity-60"
            onClick={() => {
              loadCobrancas();
              loadAvulsas();
              loadDevedores();
            }}
            disabled={loading}
          >
            Aplicar filtros
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total em aberto:</span>
            <span className="font-semibold text-slate-800">{formatBRLFromCents(totalAbertoKpi)}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total em aberto (operacao):</span>
            <span className="font-semibold text-slate-800">{formatBRLFromCents(totalAberto)}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total vencido:</span>
            <span className="font-semibold text-slate-800">{formatBRLFromCents(totalVencidoKpi)}</span>
          </div>
        </div>
        {error ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {refsErro ? (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {refsErro} (usando fallback se necessario)
          </div>
        ) : null}
        {refsLoading ? <div className="mt-2 text-xs text-slate-500">Carregando bases auxiliares...</div> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Principais devedores atrasados</h2>
            <p className="text-sm text-slate-600">Top 10 por saldo vencido para priorizar régua de cobrança.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Total vencido (top)</div>
            <div className="text-sm font-semibold text-slate-800">{formatBRLFromCents(totalVencidoKpi)}</div>
          </div>
        </div>

        {devedoresError ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {devedoresError}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-800">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Pessoa</th>
                <th className="px-3 py-2 text-right">Titulos vencidos</th>
                <th className="px-3 py-2 text-right">Total vencido</th>
                <th className="px-3 py-2 text-right">Maior atraso</th>
              </tr>
            </thead>
            <tbody>
              {devedoresLoading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={4}>
                    Carregando devedores...
                  </td>
                </tr>
              ) : devedores.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-600" colSpan={4}>
                    Nenhum devedor atrasado encontrado.
                  </td>
                </tr>
              ) : (
                devedores.map((d) => (
                  <tr key={d.pessoa_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-medium text-slate-900 hover:underline"
                        onClick={() => abrirResumoPessoa(d.pessoa_id, d.pessoa?.nome ?? null)}
                      >
                        {d.pessoa?.nome ? `${d.pessoa.nome} (#${d.pessoa_id})` : `Pessoa #${d.pessoa_id}`}
                      </button>
                      <div className="text-xs text-slate-500">Vencimento mais antigo: {d.vencimento_mais_antigo ?? "--"}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{d.titulos_vencidos_qtd}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatBRLFromCents(d.total_vencido_centavos)}</td>
                    <td className="px-3 py-2 text-right">{d.maior_dias_atraso} dias</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {avulsasError ? (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {avulsasError}
          </div>
        ) : null}
        {loading || avulsasLoading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : receberItens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma cobranca encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Competencia/Bucket</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Situacao</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {receberItens.map((item) => {
                  const isAvulsa = item.tipo === "AVULSA";
                  const cobranca = item.cobranca;
                  const avulsa = item.avulsa;
                  const pessoaId = cobranca?.pessoa_id ?? avulsa?.pessoa_id ?? null;
                  const vencidaAvulsa =
                    avulsa?.vencimento && avulsa.vencimento < hojeISO() && avulsa.status === "PENDENTE";
                  const statusLabel = vencidaAvulsa ? "VENCIDA" : item.status;
                  const situacaoLabel = cobranca?.situacao_saas ?? statusLabel;
                  const canReceiveCobranca =
                    cobranca && !(cobranca.status === "RECEBIDO" || cobranca.saldo_centavos <= 0);
                  return (
                    <tr key={`${item.tipo}-${item.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{isAvulsa ? "Avulsa" : "Cobranca"}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {pessoaId ? (
                          <button
                            type="button"
                            className="text-left font-medium text-slate-900 hover:underline"
                            onClick={() => abrirResumoPessoa(Number(pessoaId), cobranca?.pessoa_nome ?? null)}
                          >
                            {item.pessoa_label}
                          </button>
                        ) : (
                          item.pessoa_label
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.vencimento ? formatDateISO(item.vencimento) : "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {cobranca ? (
                          <div>
                            <div>Comp: {cobranca.competencia_ano_mes || "--"}</div>
                            <div>Bucket: {cobranca.bucket_vencimento || "--"}</div>
                            {cobranca.situacao_saas === "VENCIDA" &&
                            Number(cobranca.saldo_centavos || 0) > 0 &&
                            Number(cobranca.dias_atraso || 0) > 0 ? (
                              <div className="text-rose-600">{cobranca.dias_atraso} dia(s) em atraso</div>
                            ) : null}
                          </div>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBRLFromCents(item.valor_centavos)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="space-y-1">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {situacaoLabel}
                          </span>
                          <div className="text-[11px] text-slate-500">Interno: {item.status || "-"}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.origem_label || "--"}</td>
                      <td className="px-3 py-2 text-center">
                        {isAvulsa ? (
                          avulsa?.status === "PENDENTE" ? (
                            <button
                              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                              onClick={() => avulsa && abrirModalAvulsa(avulsa)}
                            >
                              Registrar recebimento
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )
                        ) : (
                          <button
                            className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                            disabled={!canReceiveCobranca}
                            onClick={() => cobranca && abrirModal(cobranca)}
                          >
                            Registrar recebimento
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Dialog open={openPessoaResumo} onOpenChange={setOpenPessoaResumo}>
        <DialogContent className="max-w-5xl">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle>Resumo financeiro da pessoa</DialogTitle>
              <DialogDescription>
                {pessoaResumoId ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {pessoaResumoNome ? `${pessoaResumoNome} (#${pessoaResumoId})` : `Pessoa #${pessoaResumoId}`}
                    </span>
                    <Link className="text-slate-900 underline" href={pessoaHref(pessoaResumoId)} target="_blank">
                      Abrir em nova aba
                    </Link>
                  </span>
                ) : (
                  <span>Selecione uma pessoa.</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 max-h-[75vh] overflow-auto rounded-xl border bg-white p-4">
              {pessoaResumoId ? <PessoaResumoFinanceiro pessoaId={pessoaResumoId} /> : null}
            </div>

            <div className="mt-4 flex justify-end">
              <DialogClose asChild>
                <button className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  Fechar
                </button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {modalCobranca ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 sm:items-center">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Recebimento</p>
                <h2 className="text-lg font-semibold text-slate-800">{modalCobranca.descricao}</h2>
                <p className="text-sm text-slate-600">
                  Saldo: {formatBRLFromCents(modalCobranca.saldo_centavos)}
                </p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setModalCobranca(null)}
              >
                Fechar
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={salvarRecebimento}>
              <label className="text-sm text-slate-700">
                Valor (centavos)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.valor_centavos}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valor_centavos: Number(e.target.value || 0) }))
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Data pagamento
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.data_pagamento}
                    onChange={(e) => setForm((f) => ({ ...f, data_pagamento: e.target.value }))}
                  />
                </label>
                {formas.length > 0 ? (
                  <label className="text-sm text-slate-700">
                    Forma de pagamento
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.forma_pagamento_codigo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, forma_pagamento_codigo: e.target.value }))
                      }
                    >
                      <option value="">Selecione</option>
                      {formas
                        .filter((f) => f.ativo)
                        .map((f) => (
                          <option key={f.codigo} value={f.codigo}>
                            {f.nome} ({f.codigo})
                          </option>
                        ))}
                    </select>
                  </label>
                ) : (
                  <label className="text-sm text-slate-700">
                    Metodo (texto)
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.metodo_pagamento_texto}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, metodo_pagamento_texto: e.target.value }))
                      }
                      placeholder="PIX, Cartao..."
                    />
                  </label>
                )}
              </div>

              {isCartao ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Maquininha
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.cartao_maquina_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cartao_maquina_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    >
                      <option value="">Nao especificado</option>
                      {maquinas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome || `Maquina #${m.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Bandeira
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.cartao_bandeira_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cartao_bandeira_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    >
                      <option value="">Nao especificada</option>
                      {bandeiras.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome || b.codigo || `Bandeira #${b.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Parcelas
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.cartao_numero_parcelas ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cartao_numero_parcelas: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    />
                  </label>
                </div>
              ) : null}

              <label className="text-sm text-slate-700">
                Observacoes
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalCobranca(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Confirmar recebimento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalAvulsa ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 sm:items-center">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="font-semibold text-slate-800">Registrar recebimento</div>
            <div className="mt-1 text-sm text-slate-600">Cobranca avulsa #{modalAvulsa.id}</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                Forma de pagamento
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={avulsaForma}
                  onChange={(e) => setAvulsaForma(e.target.value)}
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

              <label className="text-sm text-slate-700">
                Valor pago (centavos)
                <input
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={avulsaValor}
                  onChange={(e) => setAvulsaValor(Number(e.target.value || 0))}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Padrao: {formatBRLFromCents(avulsaValor)}.
                </div>
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                Comprovante (opcional)
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={avulsaComprovante}
                  onChange={(e) => setAvulsaComprovante(e.target.value)}
                />
              </label>
            </div>

            {avulsaPayError ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {avulsaPayError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setModalAvulsa(null);
                  setAvulsaPayError(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                onClick={registrarPagamentoAvulsa}
                disabled={avulsaPayLoading}
              >
                {avulsaPayLoading ? "Processando..." : "Confirmar pagamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
