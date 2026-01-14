"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO } from "@/lib/formatters/date";

type Cobranca = {
  id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string | null;
  status: string;
  pessoa_id?: number | null;
  pessoa_nome?: string | null;
  centro_custo_nome?: string | null;
  centro_custo_codigo?: string | null;
  total_recebido_centavos: number;
  saldo_centavos: number;
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

type ListResponse = {
  ok: boolean;
  cobrancas?: Cobranca[];
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

const STATUS_OPCOES = ["TODOS", "PENDENTE", "RECEBIDO", "PAGO"] as const;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ContasReceberPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<(typeof STATUS_OPCOES)[number]>("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
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

  const loadCobrancas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFiltro && statusFiltro !== "TODOS") params.set("status", statusFiltro);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      const res = await fetch(`/api/financeiro/contas-receber?${params.toString()}`);
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json?.ok || !json.cobrancas) {
        throw new Error(json?.error || "Erro ao carregar contas a receber.");
      }
      setCobrancas(json.cobrancas);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao carregar contas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFiltro, dataInicio, dataFim]);

  const loadAvulsas = useCallback(async () => {
    setAvulsasLoading(true);
    setAvulsasError(null);
    try {
      const params = new URLSearchParams();
      const statusMap = statusFiltro === "RECEBIDO" ? "PAGO" : statusFiltro;
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
  }, [statusFiltro, dataInicio, dataFim]);

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
  }, [loadCobrancas, loadRefs, loadAvulsas]);

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
        `/api/financeiro/cobrancas-avulsas/${modalAvulsa.id}/registrar-pagamento`,
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
      const json = (await res.json()) as ReceberResponse;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao registrar pagamento.");
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
        pessoa_label: c.pessoa_nome || (c.pessoa_id ? `Pessoa #${c.pessoa_id}` : "--"),
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
            <p className="text-sm text-slate-600">Dados reais de cobrancas e recebimentos.</p>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              loadCobrancas();
              loadAvulsas();
            }}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
        <FinanceHelpCard
          subtitle="Operacao real"
          items={[
            "Lista de cobrancas (cartao e avulsas) filtradas por status e periodo.",
            "Total em aberto soma saldos das cobrancas e avulsas pendentes.",
            "Registrar recebimento atualiza saldo e status.",
          ]}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            Status
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
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
            }}
            disabled={loading}
          >
            Aplicar filtros
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total em aberto:</span>
            <span className="font-semibold text-slate-800">{formatBRLFromCents(totalAberto)}</span>
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
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {receberItens.map((item) => {
                  const isAvulsa = item.tipo === "AVULSA";
                  const cobranca = item.cobranca;
                  const avulsa = item.avulsa;
                  const vencidaAvulsa =
                    avulsa?.vencimento && avulsa.vencimento < hojeISO() && avulsa.status === "PENDENTE";
                  const statusLabel = vencidaAvulsa ? "VENCIDA" : item.status;
                  const canReceiveCobranca =
                    cobranca && !(cobranca.status === "RECEBIDO" || cobranca.saldo_centavos <= 0);
                  return (
                    <tr key={`${item.tipo}-${item.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">{isAvulsa ? "Avulsa" : "Cobranca"}</td>
                      <td className="px-3 py-2 text-slate-700">{item.pessoa_label}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {item.vencimento ? formatDateISO(item.vencimento) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBRLFromCents(item.valor_centavos)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {statusLabel}
                        </span>
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
