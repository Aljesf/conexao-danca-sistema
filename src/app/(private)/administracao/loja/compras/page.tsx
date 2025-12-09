"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PedidoStatus = "RASCUNHO" | "EM_ANDAMENTO" | "PARCIAL" | "CONCLUIDO" | "CANCELADO";

type PedidoCompraResumo = {
  id: number;
  fornecedor_id: number;
  fornecedor_nome?: string | null;
  data_pedido: string;
  status: PedidoStatus;
  valor_estimado_centavos: number;
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type FornecedorResumo = {
  id: number;
  pessoa_id: number;
  pessoa_nome: string | null;
};

type ProdutoResumo = {
  id: number;
  nome: string;
  codigo: string | null;
};

export default function ListaComprasAdminPage() {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<PedidoStatus | "TODOS">("TODOS");
  const [pedidos, setPedidos] = useState<PedidoCompraResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrandoNovo, setMostrandoNovo] = useState(false);

  // estados para novo pedido
  const [fornecedores, setFornecedores] = useState<FornecedorResumo[]>([]);
  const [fornecedorIdSelecionado, setFornecedorIdSelecionado] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<ProdutoResumo[]>([]);
  const [itensNovo, setItensNovo] = useState<
    {
      idTemp: string;
      produtoId: number | null;
      quantidade: number;
      custoCentavos: number;
      observacoes?: string;
    }[]
  >([]);
  const [observacoesNovo, setObservacoesNovo] = useState("");
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState<string | null>(null);

  useEffect(() => {
    carregarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro]);

  async function carregarPedidos() {
    try {
      setLoading(true);
      setErro(null);

      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());
      if (statusFiltro !== "TODOS") params.set("status", statusFiltro);

      const res = await fetch(`/api/loja/compras?${params.toString()}`);
      const json: ApiResponse<PedidoCompraResumo[]> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErro(json.error || "Erro ao carregar pedidos de compra.");
        setPedidos([]);
        return;
      }

      setPedidos(json.data);
    } catch (err) {
      console.error("Erro inesperado ao carregar pedidos:", err);
      setErro("Erro inesperado ao carregar pedidos de compra.");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarFornecedoresEProdutosSeNecessario() {
    try {
      // Fornecedores
      if (fornecedores.length === 0) {
        const resF = await fetch("/api/loja/fornecedores");
        const jsonF: ApiResponse<any[]> = await resF.json();
        if (resF.ok && jsonF.ok && jsonF.data) {
          setFornecedores(
            jsonF.data.map((f: any) => ({
              id: f.id,
              pessoa_id: f.pessoa_id,
              pessoa_nome: f.pessoa_nome ?? f.pessoas?.nome ?? null,
            }))
          );
        }
      }

      // Produtos básicos
      if (produtos.length === 0) {
        const resP = await fetch("/api/loja/produtos?apenasAtivos=true&modo=admin");
        const jsonP: ApiResponse<any> = await resP.json();
        if (resP.ok && jsonP.ok && jsonP.data) {
          const items = Array.isArray(jsonP.data.items) ? jsonP.data.items : jsonP.data;
          setProdutos(
            (items ?? []).map((p: any) => ({
              id: p.id,
              nome: p.nome,
              codigo: p.codigo ?? null,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Erro ao carregar fornecedores/produtos:", err);
    }
  }

  function abrirNovoPedido() {
    setErroNovo(null);
    setFornecedorIdSelecionado(null);
    setItensNovo([]);
    setObservacoesNovo("");
    setMostrandoNovo(true);
    carregarFornecedoresEProdutosSeNecessario();
  }

  function adicionarItemNovo() {
    setItensNovo((prev) => [
      ...prev,
      {
        idTemp: crypto.randomUUID(),
        produtoId: null,
        quantidade: 1,
        custoCentavos: 0,
      },
    ]);
  }

  function atualizarItemNovo(
    idTemp: string,
    campo: "produtoId" | "quantidade" | "custoCentavos",
    valor: any
  ) {
    setItensNovo((prev) =>
      prev.map((it) =>
        it.idTemp === idTemp
          ? {
              ...it,
              [campo]:
                campo === "quantidade" || campo === "custoCentavos"
                  ? Number(valor) || 0
                  : valor,
            }
          : it
      )
    );
  }

  function removerItemNovo(idTemp: string) {
    setItensNovo((prev) => prev.filter((it) => it.idTemp !== idTemp));
  }

  async function salvarNovoPedido(e: React.FormEvent) {
    e.preventDefault();
    setErroNovo(null);

    if (!fornecedorIdSelecionado) {
      setErroNovo("Selecione um fornecedor.");
      return;
    }
    if (itensNovo.length === 0) {
      setErroNovo("Adicione pelo menos um item ao pedido.");
      return;
    }
    const itensValidos = itensNovo.filter((it) => it.produtoId && it.quantidade > 0);
    if (itensValidos.length === 0) {
      setErroNovo("Os itens do pedido precisam ter produto e quantidade maior que zero.");
      return;
    }

    setSalvandoNovo(true);
    try {
      const payload = {
        fornecedor_id: fornecedorIdSelecionado,
        observacoes: observacoesNovo || null,
        itens: itensValidos.map((it) => ({
          produto_id: it.produtoId!,
          quantidade_solicitada: it.quantidade,
          preco_custo_centavos: it.custoCentavos,
          observacoes: it.observacoes ?? null,
        })),
      };

      const res = await fetch("/api/loja/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<{ id: number }> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setErroNovo(json.error || "Erro ao criar pedido de compra.");
        return;
      }

      setMostrandoNovo(false);
      await carregarPedidos();
      router.push(`/administracao/loja/compras/${json.data.id}`);
    } catch (err) {
      console.error("Erro inesperado ao criar pedido de compra:", err);
      setErroNovo("Erro inesperado ao criar pedido de compra.");
    } finally {
      setSalvandoNovo(false);
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-lg font-semibold">Compras — Loja v0 (Admin)</h1>
        <p className="text-xs text-gray-600 mt-1">
          Registre pedidos de compra para abastecer o estoque da AJ Dance Store. Esta tela é
          administrativa e não aparece para a equipe de atendimento da Loja.
        </p>
      </header>

      <section className="border rounded-lg bg-white p-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium">Buscar por fornecedor ou Nº do pedido</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex.: Fornecedor Teste ou 12"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Status</label>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="TODOS">Todos</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="PARCIAL">Parcial</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="RASCUNHO">Rascunho</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={carregarPedidos}
              className="px-4 py-2 rounded-md border text-sm bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Atualizar lista
            </button>
            <button
              type="button"
              onClick={abrirNovoPedido}
              className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-700"
            >
              Novo pedido
            </button>
          </div>
        </div>

        {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
      </section>

      <section className="border rounded-lg bg-white p-3">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs font-semibold uppercase text-gray-500">Pedidos de compra</h2>
          <span className="text-[11px] text-gray-500">
            {pedidos.length} pedido(s){loading ? " — carregando..." : ""}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2">Nº</th>
                <th className="text-left py-2 px-2">Data</th>
                <th className="text-left py-2 px-2">Fornecedor</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Valor estimado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                pedidos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/administracao/loja/compras/${p.id}`)}
                  >
                    <td className="py-2 px-2">#{p.id}</td>
                    <td className="py-2 px-2">{formatarData(p.data_pedido)}</td>
                    <td className="py-2 px-2">
                      {p.fornecedor_nome || `Fornecedor #${p.fornecedor_id}`}
                    </td>
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      {formatarReais(p.valor_estimado_centavos)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mostrandoNovo && (
        <section className="border rounded-lg bg-white p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold">Novo pedido de compra</h2>
            <button
              type="button"
              className="text-xs text-gray-500 hover:underline"
              onClick={() => setMostrandoNovo(false)}
            >
              Fechar
            </button>
          </div>

          {erroNovo && <p className="text-xs text-red-600">{erroNovo}</p>}

          <form onSubmit={salvarNovoPedido} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Fornecedor</label>
              <select
                value={fornecedorIdSelecionado ?? ""}
                onChange={(e) =>
                  setFornecedorIdSelecionado(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione um fornecedor</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.pessoa_nome || `Fornecedor #${f.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium">Itens do pedido</label>
                <button
                  type="button"
                  onClick={adicionarItemNovo}
                  className="text-xs px-2 py-1 border rounded-md bg-gray-50 hover:bg-gray-100"
                >
                  Adicionar item
                </button>
              </div>

              {itensNovo.length === 0 ? (
                <p className="text-xs text-gray-500 mt-1">
                  Nenhum item adicionado. Clique em &quot;Adicionar item&quot; para começar.
                </p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-2 py-1">Produto</th>
                        <th className="text-right px-2 py-1">Qtd</th>
                        <th className="text-right px-2 py-1">Custo (centavos)</th>
                        <th className="text-right px-2 py-1">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensNovo.map((it) => (
                        <tr key={it.idTemp} className="border-b">
                          <td className="px-2 py-1">
                            <select
                              value={it.produtoId ?? ""}
                              onChange={(e) =>
                                atualizarItemNovo(
                                  it.idTemp,
                                  "produtoId",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="border rounded-md px-2 py-1 text-xs w-full"
                            >
                              <option value="">Selecione</option>
                              {produtos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} {p.codigo ? `(${p.codigo})` : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              min={1}
                              value={it.quantidade}
                              onChange={(e) =>
                                atualizarItemNovo(
                                  it.idTemp,
                                  "quantidade",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-16 border rounded-md px-2 py-1 text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              min={0}
                              value={it.custoCentavos}
                              onChange={(e) =>
                                atualizarItemNovo(
                                  it.idTemp,
                                  "custoCentavos",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-24 border rounded-md px-2 py-1 text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <button
                              type="button"
                              onClick={() => removerItemNovo(it.idTemp)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Observações</label>
              <textarea
                value={observacoesNovo}
                onChange={(e) => setObservacoesNovo(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-2 text-xs border rounded-md bg-white hover:bg-gray-50"
                onClick={() => setMostrandoNovo(false)}
                disabled={salvandoNovo}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={salvandoNovo}
              >
                Criar pedido
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
