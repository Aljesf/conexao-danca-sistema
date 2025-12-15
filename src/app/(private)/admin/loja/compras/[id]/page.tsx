"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PedidoStatus = "RASCUNHO" | "EM_ANDAMENTO" | "PARCIAL" | "CONCLUIDO" | "CANCELADO";

type PedidoCompraItem = {
  id: number;
  produto_id: number;
  variante_id: number;
  variante_sku?: string | null;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  quantidade_pendente: number;
  preco_custo_centavos: number;
  observacoes?: string | null;
};

type RecebimentoCompra = {
  id: number;
  item_id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  data_recebimento: string;
  observacao?: string | null;
};

type PedidoCompraDetalhe = {
  id: number;
  numero_pedido: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
  observacoes?: string | null;
  conta_pagar_id?: number | null;
  itens: PedidoCompraItem[];
  recebimentos: RecebimentoCompra[];
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type ContaPagarResumo = {
  id: number;
  descricao: string;
  valor_centavos: number;
  vencimento?: string | null;
  status: string;
  total_pago_centavos?: number;
};

type ContaFinanceiraResumo = {
  id: number;
  nome: string;
  codigo?: string | null;
  centro_custo_id: number;
};

const hojeEmISO = () => new Date().toISOString().slice(0, 10);

export default function DetalheCompraAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [pedido, setPedido] = useState<PedidoCompraDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [receberAgora, setReceberAgora] = useState<Record<number, number>>({});
  const [dataRecebimento, setDataRecebimento] = useState<string>(() => hojeEmISO());
  const [observacaoRecebimento, setObservacaoRecebimento] = useState("");
  const [isSavingRecebimento, setIsSavingRecebimento] = useState(false);
  const [erroRecebimento, setErroRecebimento] = useState<string | null>(null);

  // financeiro
  const [contaPagar, setContaPagar] = useState<ContaPagarResumo | null>(null);
  const [contasFinanceiras, setContasFinanceiras] = useState<ContaFinanceiraResumo[]>([]);
  const [pagamentoValorCentavos, setPagamentoValorCentavos] = useState(0);
  const [pagamentoContaId, setPagamentoContaId] = useState<number | null>(null);
  const [pagamentoData, setPagamentoData] = useState(new Date().toISOString().slice(0, 10));
  const [pagamentoMetodo, setPagamentoMetodo] = useState("");
  const [pagamentoObs, setPagamentoObs] = useState("");
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [mostrarNovaContaModal, setMostrarNovaContaModal] = useState(false);
  const [isCriandoConta, setIsCriandoConta] = useState(false);
  const [erroCriarConta, setErroCriarConta] = useState("");

  useEffect(() => {
    if (!Number.isNaN(id)) {
      carregarPedido();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function carregarPedido() {
    try {
      setLoading(true);
      setErro(null);

      const res = await fetch(`/api/loja/compras/${id}`);
      const json: ApiResponse<PedidoCompraDetalhe> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErro(json.error || "Erro ao carregar pedido de compra.");
        setPedido(null);
        return;
      }

      setPedido(json.data);
      setReceberAgora({});
      setErroRecebimento(null);

      if (json.data.conta_pagar_id) {
        await carregarContaPagar(json.data.conta_pagar_id);
        await carregarContasFinanceiras();
      } else {
        setContaPagar(null);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar pedido de compra:", err);
      setErro("Erro inesperado ao carregar pedido de compra.");
      setPedido(null);
    } finally {
      setLoading(false);
    }
  }

  async function carregarContaPagar(contaPagarId: number) {
    try {
      const res = await fetch(`/api/financeiro/contas-pagar/${contaPagarId}`);
      const json: ApiResponse<any> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        console.error("Erro ao carregar conta a pagar:", json.error);
        return;
      }

      const cp = json.data;
      const total = cp.valor_centavos ?? 0;
      const pago = cp.total_pago_centavos ?? 0;
      const saldo = Math.max(total - pago, 0);

      setContaPagar({
        id: cp.id,
        descricao: cp.descricao,
        valor_centavos: total,
        vencimento: cp.vencimento ?? null,
        status: cp.status,
        total_pago_centavos: pago,
      });

      setPagamentoValorCentavos(saldo);
      setErroPagamento(null);
    } catch (err) {
      console.error("Erro inesperado ao carregar conta a pagar:", err);
    }
  }

  async function carregarContasFinanceiras() {
    try {
      const res = await fetch("/api/financeiro/contas-financeiras");
      const json = await res.json();

      // API retorna { ok: true, contas: [...] }
      if (!res.ok || !json?.ok || !Array.isArray(json?.contas)) {
        console.error("Erro ao carregar contas financeiras:", json?.error ?? json);
        return;
      }

      setContasFinanceiras(
        json.contas.map((c: any) => ({
          id: c.id,
          nome: c.nome,
          codigo: c.codigo ?? null,
          centro_custo_id: c.centro_custo_id,
        }))
      );
    } catch (err) {
      console.error("Erro inesperado ao carregar contas financeiras:", err);
    }
  }

  function formatarData(dateStr: string | null | undefined) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR");
  }

  function formatarReais(centavos: number) {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handleChangeReceberAgora(itemId: number, value: string) {
    const qtd = Number(value.replace(/\D/g, ""));
    setReceberAgora((prev) => ({
      ...prev,
      [itemId]: Number.isFinite(qtd) ? qtd : 0,
    }));
  }

  const preencherTudoPendente = () => {
    if (!pedido) return;
    const map: Record<number, number> = {};
    for (const item of pedido.itens) {
      if (item.quantidade_pendente > 0) {
        map[item.id] = item.quantidade_pendente;
      }
    }
    setReceberAgora(map);
  };

  const registrarRecebimento = async () => {
    setErroRecebimento(null);
    if (!pedido) return;

    const itensPayload = pedido.itens
      .map((item) => ({
        itemId: item.id,
        quantidade: receberAgora[item.id] ?? 0,
      }))
      .filter((it) => it.quantidade > 0);

    if (itensPayload.length === 0) {
      setErroRecebimento("Informe ao menos uma quantidade para receber.");
      return;
    }

    setIsSavingRecebimento(true);
    try {
      const res = await fetch(`/api/loja/compras/${pedido.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registrar_recebimento",
          itens: itensPayload,
          dataRecebimento,
          observacao: observacaoRecebimento || null,
        }),
      });

      const json: ApiResponse<PedidoCompraDetalhe> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErroRecebimento(json.error || "Erro ao registrar recebimento.");
        return;
      }

      await carregarPedido();
      setReceberAgora({});
      setObservacaoRecebimento("");
    } catch (err) {
      console.error("Erro inesperado ao registrar recebimento:", err);
      setErroRecebimento("Erro inesperado ao registrar recebimento.");
    } finally {
      setIsSavingRecebimento(false);
    }
  };

  const criarContaPagarDaCompra = async () => {
    setErroPagamento(null);
    setErroCriarConta("");
    setMostrarNovaContaModal(true);
  };

  async function handlePagarCompra(e: React.FormEvent) {
    e.preventDefault();
    setErroPagamento(null);

    if (!pedido || !pedido.conta_pagar_id || !contaPagar) {
      setErroPagamento("Conta a pagar ainda não está vinculada a este pedido.");
      return;
    }

    const total = contaPagar.valor_centavos || 0;
    const pago = contaPagar.total_pago_centavos ?? 0;
    const saldo = Math.max(total - pago, 0);

    if (saldo <= 0) {
      setErroPagamento("Nenhum saldo pendente para pagamento.");
      return;
    }

    if (!pagamentoContaId) {
      setErroPagamento("Selecione uma conta financeira.");
      return;
    }

    if (pagamentoValorCentavos <= 0) {
      setErroPagamento("Informe um valor maior que zero.");
      return;
    }

    const valor = Math.min(pagamentoValorCentavos, saldo);

    setSalvandoPagamento(true);
    try {
      const payload = {
        conta_pagar_id: pedido.conta_pagar_id,
        conta_financeira_id: pagamentoContaId,
        valor_centavos: valor,
        juros_centavos: 0,
        desconto_centavos: 0,
        data_pagamento: pagamentoData,
        metodo_pagamento: pagamentoMetodo || null,
        observacoes: pagamentoObs || null,
      };

      const res = await fetch("/api/financeiro/contas-pagar/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<any> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErroPagamento(json.error || "Erro ao registrar pagamento.");
        return;
      }

      setErroPagamento(null);
      await carregarPedido();
    } catch (err) {
      console.error("Erro inesperado ao pagar compra:", err);
      setErroPagamento("Erro inesperado ao pagar compra.");
    } finally {
      setSalvandoPagamento(false);
    }
  }

  if (Number.isNaN(id)) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-red-600">ID de pedido inválido.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <button
        type="button"
        className="text-xs text-purple-700 hover:underline"
        onClick={() => router.push("/admin/loja/compras")}
      >
        ← Voltar para lista de compras
      </button>

      <header>
        <h1 className="text-lg font-semibold">
          Detalhe do pedido de compra #{pedido?.numero_pedido ?? id}
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Visualize o status, registre recebimentos parciais e acompanhe o financeiro.
        </p>
      </header>

      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {loading && <p className="text-xs text-gray-500">Carregando pedido...</p>}

      {pedido && (
        <>
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="text-xs text-gray-500">Fornecedor</div>
                <div className="text-sm font-semibold">
                  {pedido.fornecedor_nome || `Fornecedor #${pedido.fornecedor_id}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Data do pedido</div>
                <div className="text-sm">{formatarData(pedido.data_pedido)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                  {pedido.status}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Valor estimado</div>
                <div className="text-sm font-semibold">
                  {formatarReais(pedido.valor_estimado_centavos)}
                </div>
              </div>
            </div>
            {pedido.observacoes && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-500">Observações</div>
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {pedido.observacoes}
                </p>
              </div>
            )}
          </section>

          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              Itens do pedido
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-2 py-1">Produto</th>
                    <th className="text-right px-2 py-1">Qtd pedida</th>
                    <th className="text-right px-2 py-1">Recebida</th>
                    <th className="text-right px-2 py-1">Pendente</th>
                    <th className="text-right px-2 py-1">Custo previsto (centavos)</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-500">
                        Nenhum item neste pedido.
                      </td>
                    </tr>
                  ) : (
                    pedido.itens.map((it) => (
                      <tr key={it.id} className="border-b">
                        <td className="px-2 py-1">
                          <div className="font-medium text-gray-800">
                            {it.produto_nome || `Produto #${it.produto_id}`}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Variante: {it.variante_sku || `#${it.variante_id}`}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right">{it.quantidade_pedida}</td>
                        <td className="px-2 py-1 text-right">{it.quantidade_recebida}</td>
                        <td className="px-2 py-1 text-right">{it.quantidade_pendente}</td>
                        <td className="px-2 py-1 text-right">{it.preco_custo_centavos}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border rounded-lg bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recebimentos da compra (estoque)</h2>
              <button
                type="button"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border bg-white hover:bg-gray-50 disabled:opacity-60"
                onClick={preencherTudoPendente}
                disabled={
                  !pedido ||
                  pedido.itens.length === 0 ||
                  pedido.itens.every((i) => i.quantidade_pendente <= 0)
                }
              >
                Receber tudo pendente
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Registre os recebimentos parciais desta compra. O estoque é atualizado apenas
              para as quantidades informadas aqui. Você pode registrar quantas entradas forem
              necessárias até completar todos os itens.
            </p>

            {erroRecebimento && <p className="text-xs text-red-600">{erroRecebimento}</p>}

            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs font-medium mb-1">Data do recebimento</label>
                <input
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                  className="border rounded-md px-2 py-1 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs font-medium mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={observacaoRecebimento}
                  onChange={(e) => setObservacaoRecebimento(e.target.value)}
                  className="border rounded-md px-2 py-1 text-sm w-full"
                  placeholder="Lote parcial, mercadoria dividida, etc."
                />
              </div>
            </div>

            <div className="overflow-x-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Qtd pedida</th>
                    <th className="px-3 py-2 text-right">Já recebida</th>
                    <th className="px-3 py-2 text-right">Pendente</th>
                    <th className="px-3 py-2 text-right">Receber agora</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-xs text-gray-500">
                        Nenhum item neste pedido.
                      </td>
                    </tr>
                  ) : (
                    pedido.itens.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800">
                            {item.produto_nome}
                          </div>
                          <div className="text-[11px] text-gray-600">
                            Variante: {item.variante_sku || `#${item.variante_id}`}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantidade_pedida}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade_recebida}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade_pendente}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={item.quantidade_pendente}
                            value={receberAgora[item.id] ?? ""}
                            onChange={(e) => handleChangeReceberAgora(item.id, e.target.value)}
                            className="w-24 border rounded-md px-2 py-1 text-right text-sm"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                onClick={registrarRecebimento}
                disabled={isSavingRecebimento}
              >
                {isSavingRecebimento ? "Registrando..." : "Registrar recebimento"}
              </button>
            </div>
          </section>

          {pedido.recebimentos.length > 0 && (
            <section className="border rounded-lg bg-white p-3 space-y-2">
              <h3 className="text-sm font-semibold">Histórico de recebimentos</h3>
              <div className="space-y-1 text-xs">
                {pedido.recebimentos.map((rec) => (
                  <div key={rec.id} className="flex justify-between gap-2">
                    <span>
                      {formatarData(rec.data_recebimento)} — {rec.produto_nome} —{" "}
                      {(() => {
                        const itemVar = pedido.itens.find((i) => i.id === rec.item_id);
                        return itemVar ? itemVar.variante_sku || `#${itemVar.variante_id}` : "Variante n/d";
                      })()}{" "}
                      — {rec.quantidade} un.
                    </span>
                    {rec.observacao && (
                      <span className="text-gray-500 italic">{rec.observacao}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pagamento da compra */}
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-base font-semibold">Pagamento da compra</h2>

            {!contaPagar && (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-600">
                  Ainda não há conta a pagar vinculada a este pedido. Você pode criar a conta agora
                  para registrar os pagamentos desta compra.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border bg-white hover:bg-gray-50 disabled:opacity-60"
                  onClick={criarContaPagarDaCompra}
                  disabled={!pedido}
                >
                  Criar conta a pagar desta compra
                </button>
              </div>
            )}

            {pedido.conta_pagar_id && !contaPagar && (
              <p className="text-[11px] text-gray-500">
                Carregando informações da conta a pagar #{pedido.conta_pagar_id}...
              </p>
            )}

            {contaPagar && (
              <>
                <div className="border rounded-md p-2 bg-gray-50 text-xs space-y-1 mb-2">
                  <div className="flex justify-between">
                    <span>Conta a pagar #{contaPagar.id}</span>
                    <span className="font-semibold">
                      {formatarReais(contaPagar.valor_centavos)}
                    </span>
                  </div>
                  <div>{contaPagar.descricao}</div>
                  <div className="flex justify-between">
                    <span>Status: {contaPagar.status}</span>
                    <span>
                      Vencimento:{" "}
                      {contaPagar.vencimento ? formatarData(contaPagar.vencimento) : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pago: {formatarReais(contaPagar.total_pago_centavos ?? 0)}</span>
                    <span>
                      Saldo:{" "}
                      {formatarReais(
                        Math.max(
                          (contaPagar.valor_centavos || 0) - (contaPagar.total_pago_centavos ?? 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <a
                    href={`/admin/financeiro/contas-pagar/${contaPagar.id}`}
                    className="text-[11px] text-purple-700 hover:underline"
                  >
                    Abrir no módulo Financeiro
                  </a>
                </div>

                {erroPagamento && <p className="text-xs text-red-600">{erroPagamento}</p>}

                {(contaPagar.valor_centavos || 0) - (contaPagar.total_pago_centavos ?? 0) <= 0 ? (
                  <p className="text-[11px] text-gray-500">Esta conta já está totalmente paga.</p>
                ) : (
                  <form onSubmit={handlePagarCompra} className="grid gap-2 md:grid-cols-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-medium">Conta financeira</label>
                      <select
                        value={pagamentoContaId ?? ""}
                        onChange={(e) =>
                          setPagamentoContaId(e.target.value ? Number(e.target.value) : null)
                        }
                        className="border rounded-md px-2 py-1 text-xs"
                      >
                        <option value="">Selecione</option>
                        {contasFinanceiras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} {c.codigo ? `(${c.codigo})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium">Data</label>
                      <input
                        type="date"
                        value={pagamentoData}
                        onChange={(e) => setPagamentoData(e.target.value)}
                        className="border rounded-md px-2 py-1 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium">Valor (centavos)</label>
                      <input
                        type="number"
                        min={1}
                        value={pagamentoValorCentavos}
                        onChange={(e) => setPagamentoValorCentavos(Number(e.target.value) || 0)}
                        className="border rounded-md px-2 py-1 text-xs text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium">Método / Obs.</label>
                      <input
                        type="text"
                        value={pagamentoMetodo}
                        onChange={(e) => setPagamentoMetodo(e.target.value)}
                        placeholder="PIX, dinheiro..."
                        className="border rounded-md px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={pagamentoObs}
                        onChange={(e) => setPagamentoObs(e.target.value)}
                        placeholder="Observações (opcional)"
                        className="border rounded-md px-2 py-1 text-xs mt-1"
                      />
                    </div>

                    <div className="md:col-span-4 flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={salvandoPagamento}
                      >
                        Registrar pagamento
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </>
      )}

      {mostrarNovaContaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">Nova conta a pagar desta compra</h3>
                <p className="text-xs text-gray-600">
                  Configure os dados básicos da conta a pagar gerada a partir deste pedido.
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setMostrarNovaContaModal(false);
                  setErroCriarConta("");
                }}
              >
                ✕
              </button>
            </div>

            {erroCriarConta && (
              <p className="mt-2 text-xs text-red-600">{erroCriarConta}</p>
            )}

            {pedido && (
              <form
                className="mt-3 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsCriandoConta(true);
                  setErroCriarConta("");
                  try {
                    const formData = new FormData(e.currentTarget);
                    const vencimentoSelecionado =
                      (formData.get("vencimento") as string) || "";
                    const valorReais = (formData.get("valor_reais") as string) || "0";

                    const valorCentavos = Math.round(
                      (parseFloat(valorReais.replace(",", ".")) || 0) * 100
                    );

                    const resConta = await fetch(`/api/loja/compras/${pedido.id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "criar_conta_pagar",
                        vencimento: vencimentoSelecionado,
                        valor_centavos: valorCentavos,
                      }),
                    });

                    const dataConta = await resConta.json();
                    if (!resConta.ok || !dataConta?.ok) {
                      throw new Error(dataConta?.error || "Erro ao criar conta a pagar.");
                    }

                    setMostrarNovaContaModal(false);
                    await carregarPedido();
                  } catch (err: any) {
                    console.error(err);
                    setErroCriarConta(err.message || "Erro inesperado ao criar conta.");
                  } finally {
                    setIsCriandoConta(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Vencimento</label>
                    <input
                      type="date"
                      name="vencimento"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      defaultValue={
                        pedido.data_pedido
                          ? new Date(pedido.data_pedido).toISOString().slice(0, 10)
                          : new Date().toISOString().slice(0, 10)
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="valor_reais"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      defaultValue={(pedido.valor_estimado_centavos ?? 0) / 100}
                    />
                  </div>

                  <p className="text-xs text-gray-600">
                    Centro de custo e categoria poderao ser definidos depois no modulo Financeiro,
                    em Contas a pagar.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border bg-white hover:bg-gray-50"
                    onClick={() => {
                      setMostrarNovaContaModal(false);
                      setErroCriarConta("");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    disabled={isCriandoConta}
                  >
                    {isCriandoConta ? "Criando..." : "Criar conta"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
