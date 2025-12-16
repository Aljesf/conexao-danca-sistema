"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO } from "@/lib/formatters/date";

type ContaPagar = {
  id: number;
  descricao: string;
  observacoes?: string | null;
  vencimento: string | null;
  valor_centavos: number;
  status: string;
  centro_custo_nome?: string | null;
  centro_custo_codigo?: string | null;
  categoria_nome?: string | null;
  categoria_codigo?: string | null;
  pessoa_nome?: string | null;
  total_pago_centavos: number;
  saldo_centavos: number;
};

type ListResponse = {
  ok: boolean;
  contas?: ContaPagar[];
  error?: string;
};

type PagarResponse = {
  ok: boolean;
  error?: string;
};

type PagamentoForm = {
  valor_centavos: number;
  juros_centavos: number;
  desconto_centavos: number;
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

const STATUS_OPCOES = ["TODOS", "PENDENTE", "PARCIAL", "PAGO", "CANCELADO"] as const;

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<(typeof STATUS_OPCOES)[number]>("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [modalConta, setModalConta] = useState<ContaPagar | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [maquinas, setMaquinas] = useState<MaquinaOp[]>([]);
  const [bandeiras, setBandeiras] = useState<BandeiraOp[]>([]);
  const [refsErro, setRefsErro] = useState<string | null>(null);
  const [refsLoading, setRefsLoading] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoForm>({
    valor_centavos: 0,
    juros_centavos: 0,
    desconto_centavos: 0,
    data_pagamento: hojeISO(),
    forma_pagamento_codigo: "",
    metodo_pagamento_texto: "",
    cartao_maquina_id: null,
    cartao_bandeira_id: null,
    cartao_numero_parcelas: null,
    observacoes: "",
  });

  async function loadContas() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFiltro && statusFiltro !== "TODOS") params.set("status", statusFiltro);
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);
      const res = await fetch(`/api/financeiro/contas-pagar?${params.toString()}`);
      const json = (await res.json()) as ListResponse;
      if (!res.ok || !json?.ok || !json.contas) {
        throw new Error(json?.error || "Erro ao carregar contas a pagar.");
      }
      setContas(json.contas);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao carregar contas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRefs() {
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
        setRefsErro("Falha ao carregar dicionário de formas de pagamento.");
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
  }

  useEffect(() => {
    loadContas();
    loadRefs();
  }, []);

  function abrirModal(conta: ContaPagar) {
    setModalConta(conta);
    setPagamentoForm({
      valor_centavos: conta.saldo_centavos || conta.valor_centavos,
      juros_centavos: 0,
      desconto_centavos: 0,
      data_pagamento: hojeISO(),
      forma_pagamento_codigo: "",
      metodo_pagamento_texto: "",
      cartao_maquina_id: null,
      cartao_bandeira_id: null,
      cartao_numero_parcelas: null,
      observacoes: "",
    });
  }

  const formaSelecionada = useMemo(
    () => formas.find((f) => f.codigo === pagamentoForm.forma_pagamento_codigo),
    [formas, pagamentoForm.forma_pagamento_codigo]
  );
  const isCartao = useMemo(() => {
    const tipo = (formaSelecionada?.tipo_base || "").toUpperCase();
    return tipo.includes("CARTAO") || tipo.includes("CARTÃO") || tipo.includes("CREDITO") || tipo.includes("DEBITO");
  }, [formaSelecionada]);

  async function salvarPagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!modalConta) return;
    setSalvando(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        conta_pagar_id: modalConta.id,
        valor_centavos: pagamentoForm.valor_centavos,
        juros_centavos: pagamentoForm.juros_centavos,
        desconto_centavos: pagamentoForm.desconto_centavos,
        data_pagamento: pagamentoForm.data_pagamento,
        metodo_pagamento: pagamentoForm.metodo_pagamento_texto || undefined,
        forma_pagamento_codigo: pagamentoForm.forma_pagamento_codigo || undefined,
        observacoes: pagamentoForm.observacoes || null,
      };
      if (isCartao) {
        payload.cartao_maquina_id = pagamentoForm.cartao_maquina_id || null;
        payload.cartao_bandeira_id = pagamentoForm.cartao_bandeira_id || null;
        payload.cartao_numero_parcelas = pagamentoForm.cartao_numero_parcelas || null;
      }

      const res = await fetch("/api/financeiro/contas-pagar/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as PagarResponse;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Erro ao registrar pagamento.");
      }
      setModalConta(null);
      await loadContas();
    } catch (err: any) {
      setError(err?.message || "Erro ao registrar pagamento.");
    } finally {
      setSalvando(false);
    }
  }

  const totalAberto = useMemo(
    () => contas.reduce((acc, c) => acc + (c.saldo_centavos || 0), 0),
    [contas]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Contas a pagar</h1>
            <p className="text-sm text-slate-600">Dados reais do Supabase, sem mocks.</p>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={loadContas}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
        <FinanceHelpCard
          subtitle="Operação real"
          items={[
            "Lista de contas a pagar filtradas por status e período.",
            "Total pago/saldo calculados a partir de pagamentos reais.",
            "Registrar pagamento insere movimento financeiro e atualiza status.",
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
            Vencimento início
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
            onClick={loadContas}
            disabled={loading}
          >
            Aplicar filtros
          </button>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total aberto:</span>
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
            {refsErro} (usando fallback se necessário)
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : contas.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma conta encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Centro</th>
                  <th className="px-3 py-2 text-left">Categoria</th>
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-right">Pago</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{formatDateISO(c.vencimento)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.descricao}</div>
                      {c.observacoes ? (
                        <div className="text-xs text-slate-500">{c.observacoes}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.centro_custo_nome || c.centro_custo_codigo || "--"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.categoria_nome || c.categoria_codigo || "--"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.pessoa_nome || "--"}</td>
                    <td className="px-3 py-2 text-right">{formatBRLFromCents(c.valor_centavos)}</td>
                    <td className="px-3 py-2 text-right">{formatBRLFromCents(c.total_pago_centavos)}</td>
                    <td className="px-3 py-2 text-right">{formatBRLFromCents(c.saldo_centavos)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                        disabled={c.status === "PAGO" || c.saldo_centavos <= 0}
                        onClick={() => abrirModal(c)}
                      >
                        Registrar pagamento
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalConta ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 sm:items-center">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Pagamento</p>
                <h2 className="text-lg font-semibold text-slate-800">{modalConta.descricao}</h2>
                <p className="text-sm text-slate-600">
                  Saldo: {formatBRLFromCents(modalConta.saldo_centavos)}
                </p>
              </div>
              <button
                className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setModalConta(null)}
              >
                Fechar
              </button>
            </div>

            <form className="mt-4 space-y-3" onSubmit={salvarPagamento}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Valor principal
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.valor_centavos}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({ ...f, valor_centavos: Number(e.target.value || 0) }))
                    }
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Juros (centavos)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.juros_centavos}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({ ...f, juros_centavos: Number(e.target.value || 0) }))
                    }
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Desconto (centavos)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.desconto_centavos}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({
                        ...f,
                        desconto_centavos: Number(e.target.value || 0),
                      }))
                    }
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Data pagamento
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.data_pagamento}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({ ...f, data_pagamento: e.target.value }))
                    }
                  />
                </label>
              </div>

              {formas.length > 0 ? (
                <label className="text-sm text-slate-700">
                  Forma de pagamento
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.forma_pagamento_codigo}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({
                        ...f,
                        forma_pagamento_codigo: e.target.value,
                      }))
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
                  Método (texto)
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={pagamentoForm.metodo_pagamento_texto}
                    onChange={(e) =>
                      setPagamentoForm((f) => ({ ...f, metodo_pagamento_texto: e.target.value }))
                    }
                    placeholder="PIX, Dinheiro, Cartão..."
                  />
                </label>
              )}

              {isCartao ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Maquininha
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={pagamentoForm.cartao_maquina_id ?? ""}
                      onChange={(e) =>
                        setPagamentoForm((f) => ({
                          ...f,
                          cartao_maquina_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    >
                      <option value="">Não especificado</option>
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
                      value={pagamentoForm.cartao_bandeira_id ?? ""}
                      onChange={(e) =>
                        setPagamentoForm((f) => ({
                          ...f,
                          cartao_bandeira_id: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    >
                      <option value="">Não especificada</option>
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
                      value={pagamentoForm.cartao_numero_parcelas ?? ""}
                      onChange={(e) =>
                        setPagamentoForm((f) => ({
                          ...f,
                          cartao_numero_parcelas: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                    />
                  </label>
                </div>
              ) : null}

              <label className="text-sm text-slate-700">
                Observações
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={pagamentoForm.observacoes}
                  onChange={(e) =>
                    setPagamentoForm((f) => ({ ...f, observacoes: e.target.value }))
                  }
                  rows={3}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setModalConta(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                  disabled={salvando}
                >
                  {salvando ? "Salvando..." : "Confirmar pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
