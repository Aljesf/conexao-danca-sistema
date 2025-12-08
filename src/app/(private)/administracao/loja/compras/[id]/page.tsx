"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PedidoStatus = "RASCUNHO" | "EM_ANDAMENTO" | "PARCIAL" | "CONCLUIDO" | "CANCELADO";

type ItemPedido = {
  id: number;
  produto_id: number;
  produto_nome?: string | null;
  quantidade_solicitada: number;
  quantidade_recebida: number;
  preco_custo_centavos: number;
  observacoes?: string | null;
};

type Recebimento = {
  id: number;
  item_id: number;
  produto_id: number;
  quantidade_recebida: number;
  preco_custo_centavos: number;
  data_recebimento: string;
  observacao?: string | null;
};

type PedidoCompraDetalhe = {
  id: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
  observacoes?: string | null;
  conta_pagar_id?: number | null;
  itens: ItemPedido[];
  recebimentos: Recebimento[];
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type RecebimentoForm = {
  itemId: number;
  produtoId: number;
  quantidade: number;
  precoCentavos: number;
  observacao?: string;
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

export default function DetalheCompraAdminPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);

  const [pedido, setPedido] = useState<PedidoCompraDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [recebimentosForm, setRecebimentosForm] = useState<RecebimentoForm[]>([]);
  const [salvandoRecebimento, setSalvandoRecebimento] = useState(false);
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

      // preparar formulários de recebimento apenas para itens com saldo
      const forms: RecebimentoForm[] = [];
      json.data.itens.forEach((it) => {
        const saldo = it.quantidade_solicitada - it.quantidade_recebida;
        if (saldo > 0) {
          forms.push({
            itemId: it.id,
            produtoId: it.produto_id,
            quantidade: saldo,
            precoCentavos: it.preco_custo_centavos || 0,
          });
        }
      });
      setRecebimentosForm(forms);

      // carregar financeiro se houver conta vinculada
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
      const json: ApiResponse<any[]> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        console.error("Erro ao carregar contas financeiras:", json.error);
        return;
      }

      setContasFinanceiras(
        json.data.map((c) => ({
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
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
  }

  function formatarReais(centavos: number) {
    return (centavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function atualizarRecebimentoForm(
    itemId: number,
    campo: "quantidade" | "precoCentavos" | "observacao",
    valor: any
  ) {
    setRecebimentosForm((prev) =>
      prev.map((rf) =>
        rf.itemId === itemId
          ? {
              ...rf,
              [campo]:
                campo === "quantidade" || campo === "precoCentavos"
                  ? Number(valor) || 0
                  : (valor as string),
            }
          : rf
      )
    );
  }

  async function registrarRecebimentos(e: React.FormEvent) {
    e.preventDefault();
    setErroRecebimento(null);

    if (!pedido) return;

    const payloadRecebimentos = recebimentosForm
      .filter((rf) => rf.quantidade > 0)
      .map((rf) => ({
        item_id: rf.itemId,
        produto_id: rf.produtoId,
        quantidade_recebida: rf.quantidade,
        preco_custo_centavos: rf.precoCentavos,
        observacao: rf.observacao ?? null,
      }));

    if (payloadRecebimentos.length === 0) {
      setErroRecebimento("Informe ao menos uma quantidade para receber.");
      return;
    }

    setSalvandoRecebimento(true);
    try {
      const res = await fetch(`/api/loja/compras/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "RECEBER",
          recebimentos: payloadRecebimentos,
        }),
      });

      const json: ApiResponse<PedidoCompraDetalhe> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErroRecebimento(json.error || "Erro ao registrar recebimentos.");
        return;
      }

      setPedido(json.data);

      const forms: RecebimentoForm[] = [];
      json.data.itens.forEach((it) => {
        const saldo = it.quantidade_solicitada - it.quantidade_recebida;
        if (saldo > 0) {
          forms.push({
            itemId: it.id,
            produtoId: it.produto_id,
            quantidade: saldo,
            precoCentavos: it.preco_custo_centavos || 0,
          });
        }
      });
      setRecebimentosForm(forms);
      setErroRecebimento(null);

      if (json.data.conta_pagar_id) {
        await carregarContaPagar(json.data.conta_pagar_id);
        await carregarContasFinanceiras();
      }
    } catch (err) {
      console.error("Erro inesperado ao registrar recebimentos:", err);
      setErroRecebimento("Erro inesperado ao registrar recebimentos.");
    } finally {
      setSalvandoRecebimento(false);
    }
  }

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

      const json: ApiResponse<{ conta_pagar: any }> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErroPagamento(json.error || "Erro ao registrar pagamento.");
        return;
      }

      const cp = json.data.conta_pagar;
      const totalNovo = cp.valor_centavos ?? 0;
      const pagoNovo = cp.total_pago_centavos ?? 0;
      const saldoNovo = Math.max(totalNovo - pagoNovo, 0);

      setContaPagar({
        id: cp.id,
        descricao: cp.descricao,
        valor_centavos: totalNovo,
        vencimento: cp.vencimento ?? null,
        status: cp.status,
        total_pago_centavos: pagoNovo,
      });
      setPagamentoValorCentavos(saldoNovo);
      setErroPagamento(null);
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
        onClick={() => router.push("/administracao/loja/compras")}
      >
        ← Voltar para lista de compras
      </button>

      <header>
        <h1 className="text-lg font-semibold">Detalhe do pedido de compra #{id}</h1>
        <p className="text-xs text-gray-600 mt-1">
          Visualize os itens do pedido, recebimentos e o status atual. Ajustes de estoque e financeiro já estão integrados em etapas anteriores.
        </p>
      </header>

      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {loading && <p className="text-xs text-gray-500">Carregando pedido...</p>}

      {pedido && (
        <>
          {/* Cabeçalho */}
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

          {/* Itens */}
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              Itens do pedido
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-2 py-1">Produto</th>
                    <th className="text-right px-2 py-1">Solicitado</th>
                    <th className="text-right px-2 py-1">Recebido</th>
                    <th className="text-right px-2 py-1">Saldo</th>
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
                    pedido.itens.map((it) => {
                      const saldo = it.quantidade_solicitada - it.quantidade_recebida;
                      return (
                        <tr key={it.id} className="border-b">
                          <td className="px-2 py-1">
                            <div className="font-medium text-gray-800">
                              {it.produto_nome || `Produto #${it.produto_id}`}
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right">{it.quantidade_solicitada}</td>
                          <td className="px-2 py-1 text-right">{it.quantidade_recebida}</td>
                          <td className="px-2 py-1 text-right">{saldo}</td>
                          <td className="px-2 py-1 text-right">{it.preco_custo_centavos}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recebimentos */}
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              Recebimentos registrados
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-2 py-1">Data</th>
                    <th className="text-left px-2 py-1">Produto</th>
                    <th className="text-right px-2 py-1">Qtd recebida</th>
                    <th className="text-right px-2 py-1">Custo (centavos)</th>
                    <th className="text-left px-2 py-1">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {pedido.recebimentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-500">
                        Nenhum recebimento registrado ainda.
                      </td>
                    </tr>
                  ) : (
                    pedido.recebimentos.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="px-2 py-1">{formatarData(r.data_recebimento)}</td>
                        <td className="px-2 py-1">
                          {pedido.itens.find((it) => it.id === r.item_id)?.produto_nome ||
                            `Produto #${r.produto_id}`}
                        </td>
                        <td className="px-2 py-1 text-right">{r.quantidade_recebida}</td>
                        <td className="px-2 py-1 text-right">{r.preco_custo_centavos}</td>
                        <td className="px-2 py-1">{r.observacao || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Registrar recebimento (v0, já integrado no backend) */}
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              Registrar recebimento (v0)
            </h2>
            <p className="text-[11px] text-gray-500">
              Neste passo, os recebimentos já atualizam o estoque e criam/atualizam a conta
              a pagar. Use apenas para registrar o recebimento físico da mercadoria.
            </p>

            {erroRecebimento && <p className="text-xs text-red-600">{erroRecebimento}</p>}

            {recebimentosForm.length === 0 ? (
              <p className="text-xs text-gray-500">
                Todos os itens já foram recebidos. Não há saldo pendente.
              </p>
            ) : (
              <form onSubmit={registrarRecebimentos} className="space-y-2">
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-2 py-1">Produto</th>
                        <th className="text-right px-2 py-1">Saldo</th>
                        <th className="text-right px-2 py-1">Qtd a receber</th>
                        <th className="text-right px-2 py-1">Custo (centavos)</th>
                        <th className="text-left px-2 py-1">Observação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recebimentosForm.map((rf) => {
                        const item = pedido.itens.find((it) => it.id === rf.itemId)!;
                        const saldo = item.quantidade_solicitada - item.quantidade_recebida;
                        return (
                          <tr key={rf.itemId} className="border-b">
                            <td className="px-2 py-1">
                              <div className="font-medium text-gray-800">
                                {item.produto_nome || `Produto #${item.produto_id}`}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-right">{saldo}</td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                max={saldo}
                                value={rf.quantidade}
                                onChange={(e) =>
                                  atualizarRecebimentoForm(
                                    rf.itemId,
                                    "quantidade",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-20 border rounded-md px-2 py-1 text-right text-xs"
                              />
                            </td>
                            <td className="px-2 py-1 text-right">
                              <input
                                type="number"
                                min={0}
                                value={rf.precoCentavos}
                                onChange={(e) =>
                                  atualizarRecebimentoForm(
                                    rf.itemId,
                                    "precoCentavos",
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-24 border rounded-md px-2 py-1 text-right text-xs"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={rf.observacao ?? ""}
                                onChange={(e) =>
                                  atualizarRecebimentoForm(
                                    rf.itemId,
                                    "observacao",
                                    e.target.value
                                  )
                                }
                                className="w-full border rounded-md px-2 py-1 text-xs"
                                placeholder="Opcional"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={salvandoRecebimento}
                  >
                    Registrar recebimentos
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Pagamento da compra */}
          <section className="border rounded-lg bg-white p-3 space-y-2">
            <h2 className="text-xs font-semibold uppercase text-gray-500">
              Pagamento da compra
            </h2>

            {!pedido.conta_pagar_id && (
              <p className="text-[11px] text-gray-500">
                Ainda não há conta a pagar vinculada a este pedido. Ela é criada automaticamente ao registrar recebimentos.
              </p>
            )}

            {pedido.conta_pagar_id && !contaPagar && (
              <p className="text-[11px] text-gray-500">
                Carregando informações da conta a pagar #{pedido.conta_pagar_id}...
              </p>
            )}

            {pedido.conta_pagar_id && contaPagar && (
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
                      {contaPagar.vencimento ? formatarData(contaPagar.vencimento) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pago: {formatarReais(contaPagar.total_pago_centavos ?? 0)}</span>
                    <span>
                      Saldo:{" "}
                      {formatarReais(
                        Math.max(
                          (contaPagar.valor_centavos || 0) -
                            (contaPagar.total_pago_centavos ?? 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <a
                    href={`/administracao/financeiro/contas-a-pagar/${contaPagar.id}`}
                    className="text-[11px] text-purple-700 hover:underline"
                  >
                    Abrir no módulo Financeiro
                  </a>
                </div>

                {erroPagamento && <p className="text-xs text-red-600">{erroPagamento}</p>}

                {(contaPagar.valor_centavos || 0) - (contaPagar.total_pago_centavos ?? 0) <=
                0 ? (
                  <p className="text-[11px] text-gray-500">
                    Esta conta já está totalmente paga.
                  </p>
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
                        Pagar compra
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
