"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatDateISO } from "@/lib/formatters/date";

type Cobranca = {
  id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string | null;
  status: string;
  pessoa_nome?: string | null;
  centro_custo_nome?: string | null;
  centro_custo_codigo?: string | null;
  total_recebido_centavos: number;
  saldo_centavos: number;
};

type ListResponse = {
  ok: boolean;
  cobrancas?: Cobranca[];
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

  async function loadCobrancas() {
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
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao carregar contas.");
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
    } catch (err: any) {
      setRefsErro(err?.message || "Erro ao carregar bases auxiliares.");
    } finally {
      setRefsLoading(false);
    }
  }

  useEffect(() => {
    loadCobrancas();
    loadRefs();
  }, []);

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

  const formaSelecionada = useMemo(
    () => formas.find((f) => f.codigo === form.forma_pagamento_codigo),
    [formas, form.forma_pagamento_codigo]
  );
  const isCartao = useMemo(() => {
    const tipo = (formaSelecionada?.tipo_base || "").toUpperCase();
    return tipo.includes("CARTAO") || tipo.includes("CARTÃO") || tipo.includes("CREDITO") || tipo.includes("DEBITO");
  }, [formaSelecionada]);

  async function salvarRecebimento(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCobranca) return;
    setSalvando(true);
    setError(null);
    try {
      const payload: any = {
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
    } catch (err: any) {
      setError(err?.message || "Erro ao registrar recebimento.");
    } finally {
      setSalvando(false);
    }
  }

  const totalAberto = useMemo(
    () => cobrancas.reduce((acc, c) => acc + (c.saldo_centavos || 0), 0),
    [cobrancas]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Contas a receber</h1>
            <p className="text-sm text-slate-600">Dados reais de cobranças e recebimentos.</p>
          </div>
          <button
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={loadCobrancas}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
        <FinanceHelpCard
          subtitle="Operação real"
          items={[
            "Lista de cobranças filtradas por status e período.",
            "Total recebido/saldo calculados pelos recebimentos reais.",
            "Registrar recebimento atualiza saldo e status para RECEBIDO quando zerar.",
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
            onClick={loadCobrancas}
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
            {refsErro} (usando fallback se necessário)
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : cobrancas.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma cobrança encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-800">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-left">Centro</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-right">Recebido</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{formatDateISO(c.vencimento)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.descricao}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.pessoa_nome || "--"}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.centro_custo_nome || c.centro_custo_codigo || "--"}
                    </td>
                    <td className="px-3 py-2 text-right">{formatBRLFromCents(c.valor_centavos)}</td>
                    <td className="px-3 py-2 text-right">
                      {formatBRLFromCents(c.total_recebido_centavos)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatBRLFromCents(c.saldo_centavos)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 disabled:opacity-60"
                        disabled={c.status === "RECEBIDO" || c.saldo_centavos <= 0}
                        onClick={() => abrirModal(c)}
                      >
                        Registrar recebimento
                      </button>
                    </td>
                  </tr>
                ))}
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
                    Método (texto)
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.metodo_pagamento_texto}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, metodo_pagamento_texto: e.target.value }))
                      }
                      placeholder="PIX, Cartão..."
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
                      value={form.cartao_bandeira_id ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
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
                Observações
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
    </div>
  );
}
