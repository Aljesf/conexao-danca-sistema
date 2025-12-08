"use client";

import React, { useEffect, useMemo, useState } from "react";

type Produto = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao?: string | null;
  categoria: string | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  observacoes?: string | null;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

type ProdutosListResponse = {
  items: Produto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type FiltrosState = {
  search: string;
  apenasAtivos: boolean;
  modoPreco: "TODOS" | "AGUARDANDO_PRECO" | "COM_PRECO";
};

type EditFormState = {
  id: number | null;
  nome: string;
  codigo: string;
  categoria: string;
  unidade: string;
  ativo: boolean;
  precoReais: string;
};

export default function LojaGerenciarProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    search: "",
    apenasAtivos: true,
    modoPreco: "TODOS",
  });

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(
    null
  );

  const [editForm, setEditForm] = useState<EditFormState>({
    id: null,
    nome: "",
    codigo: "",
    categoria: "",
    unidade: "UN",
    ativo: true,
    precoReais: "",
  });

  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }

  async function carregarProdutos() {
    resetMensagem();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("pageSize", "200");
      if (filtros.search.trim().length > 0) {
        params.set("search", filtros.search.trim());
      }
      if (filtros.apenasAtivos) {
        params.set("apenasAtivos", "true");
      }

      // filtros de preço
      if (filtros.modoPreco === "AGUARDANDO_PRECO") {
        params.set("somenteComPreco", "false");
      } else if (filtros.modoPreco === "COM_PRECO") {
        params.set("somenteComPreco", "true");
      }

      const res = await fetch(`/api/loja/produtos?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResponse<ProdutosListResponse> = await res.json();

      if (!json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao carregar produtos.");
        return;
      }

      setProdutos(json.data.items ?? []);
    } catch (e) {
      console.error("Erro ao carregar produtos:", e);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const produtosFiltrados = useMemo(() => {
    return produtos;
  }, [produtos]);

  function selecionarProduto(p: Produto) {
    resetMensagem();
    setEditForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      categoria: p.categoria ?? "",
      unidade: p.unidade ?? "UN",
      ativo: p.ativo,
      precoReais:
        p.preco_venda_centavos > 0
          ? (p.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
          : "",
    });
  }

  function limparSelecao() {
    resetMensagem();
    setEditForm({
      id: null,
      nome: "",
      codigo: "",
      categoria: "",
      unidade: "UN",
      ativo: true,
      precoReais: "",
    });
  }

  function handleEditChange<K extends keyof EditFormState>(
    field: K,
    value: EditFormState[K]
  ) {
    resetMensagem();
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!editForm.id) {
      setMensagemTipo("error");
      setMensagem("Selecione um produto para editar.");
      return;
    }

    // Converter precoReais → centavos
    let precoCentavos: number | null = null;
    if (editForm.precoReais.trim().length > 0) {
      const clean = editForm.precoReais
        .replace(/[^\d,.-]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valor = parseFloat(clean);
      if (Number.isNaN(valor) || valor < 0) {
        setMensagemTipo("error");
        setMensagem("Preço inválido.");
        return;
      }
      precoCentavos = Math.round(valor * 100);
    } else {
      // preço em branco → produto aguardando definição de preço
      precoCentavos = 0;
    }

    setSaving(true);

    try {
      const payload: any = {
        id: editForm.id,
        nome: editForm.nome.trim(),
        codigo: editForm.codigo.trim() || null,
        categoria: editForm.categoria.trim() || null,
        unidade: editForm.unidade.trim() || "UN",
        ativo: editForm.ativo,
      };

      // mandar em preco ou preco_venda_centavos (API aceita ambos)
      payload.preco_venda_centavos = precoCentavos;

      const res = await fetch("/api/loja/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Produto> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao salvar produto.");
        return;
      }

      const produtoAtualizado = json.data;

      // Atualiza lista local
      setProdutos((prev) => {
        const idx = prev.findIndex((p) => p.id === produtoAtualizado.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = produtoAtualizado;
          return clone;
        }
        return prev;
      });

      // Atualiza form
      selecionarProduto(produtoAtualizado);

      setMensagemTipo("success");
      setMensagem("Produto atualizado com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao salvar produto:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Gerenciar Produtos — Loja v0</h1>
        <p className="text-sm text-gray-500">
          Nesta tela você define preços de venda, ativa/inativa produtos e
          ajusta informações básicas. Produtos com preço em branco ficam
          marcados como &quot;aguardando preço&quot; e não aparecem no caixa.
        </p>
      </header>

      {/* Filtros */}
      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1">
              Buscar por nome ou código
            </label>
            <input
              type="text"
              value={filtros.search}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full border rounded-md px-3 py-1.5 text-sm"
              placeholder="Digite parte do nome ou código interno..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="apenasAtivos"
              type="checkbox"
              checked={filtros.apenasAtivos}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  apenasAtivos: e.target.checked,
                }))
              }
              className="rounded border-gray-300"
            />
            <label
              htmlFor="apenasAtivos"
              className="text-xs font-medium text-gray-700"
            >
              Apenas ativos
            </label>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-medium text-gray-700">
              Filtro de preço:
            </span>
            <select
              value={filtros.modoPreco}
              onChange={(e) =>
                setFiltros((prev) => ({
                  ...prev,
                  modoPreco: e.target.value as FiltrosState["modoPreco"],
                }))
              }
              className="border rounded-md px-2 py-1 text-xs"
            >
              <option value="TODOS">Todos</option>
              <option value="AGUARDANDO_PRECO">Aguardando preço</option>
              <option value="COM_PRECO">Com preço definido</option>
            </select>
          </div>

          <button
            type="button"
            onClick={carregarProdutos}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>
      </section>

      {/* Lista de produtos */}
      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Produtos</h2>
          <span className="text-xs text-gray-500">
            {produtosFiltrados.length} produto(s) carregado(s)
          </span>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-right">Estoque</th>
                <th className="px-3 py-2 text-right">Preço venda</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-xs text-gray-500"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}

              {produtosFiltrados.map((p) => {
                const selecionado = editForm.id === p.id;
                const aguardandoPreco = p.preco_venda_centavos === 0;

                return (
                  <tr
                    key={p.id}
                    className={`cursor-pointer ${
                      selecionado ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => selecionarProduto(p)}
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">
                          {p.nome}
                        </span>
                        {aguardandoPreco && (
                          <span className="text-[11px] text-amber-600">
                            Aguardando definição de preço
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {p.codigo || "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {p.categoria || "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {p.estoque_atual}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {p.preco_venda_centavos > 0
                        ? `R$ ${(p.preco_venda_centavos / 100)
                            .toFixed(2)
                            .replace(".", ",")}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.ativo
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {mensagem && (
          <div
            className={`text-sm mt-2 border rounded-md px-3 py-2 ${
              mensagemTipo === "success"
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-red-50 border-red-300 text-red-800"
            }`}
          >
            {mensagem}
          </div>
        )}
      </section>

      {/* Formulário de edição */}
      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edição do produto</h2>
          <button
            type="button"
            onClick={limparSelecao}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Limpar seleção
          </button>
        </div>

        {!editForm.id ? (
          <p className="text-xs text-gray-500">
            Clique em um produto na tabela acima para editar preço, categoria,
            unidade e status.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={salvarEdicao}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Nome do produto
                </label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => handleEditChange("nome", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Código interno
                </label>
                <input
                  type="text"
                  value={editForm.codigo}
                  onChange={(e) => handleEditChange("codigo", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={editForm.categoria}
                  onChange={(e) =>
                    handleEditChange("categoria", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Unidade
                </label>
                <input
                  type="text"
                  value={editForm.unidade}
                  onChange={(e) => handleEditChange("unidade", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="UN, PAR, KIT..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Preço de venda (R$)
                </label>
                <input
                  type="text"
                  value={editForm.precoReais}
                  onChange={(e) => handleEditChange("precoReais", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Deixe em branco para 'aguardando preço'"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Este é o preço de venda final. Se deixar em branco, o produto
                  ficará &quot;aguardando preço&quot; e não aparecerá no caixa.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="produtoAtivo"
                  type="checkbox"
                  checked={editForm.ativo}
                  onChange={(e) => handleEditChange("ativo", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor="produtoAtivo"
                  className="text-xs font-medium text-gray-700"
                >
                  Produto ativo
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
