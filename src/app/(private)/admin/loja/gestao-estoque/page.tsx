"use client";

import React, { useEffect, useMemo, useState } from "react";

// Tipos basicos
type Produto = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao?: string | null;
  categoria: string | null;
  categoria_subcategoria_id?: number | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  observacoes?: string | null;

  // campos administrativos opcionais
  fornecedor_id?: number | null;
  fornecedor_nome?: string | null;
  data_cadastro?: string | null;
  data_atualizacao?: string | null;
};

type FornecedorResumo = {
  id: number;
  nome: string;
};

type SubcategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  categoria_id?: number | null;
  centro_custo_id?: number | null;
  receita_categoria_id?: number | null;
  despesa_categoria_id?: number | null;
};

type CategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  subcategorias: SubcategoriaLoja[];
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
  categoria_subcategoria_id: number | null;
  unidade: string;
  ativo: boolean;
  precoReais: string; // preco de venda (texto)
  precoCustoReais: string; // preco de custo (texto) - admin
  fornecedorId: number | null;
};

type CadastroAdminFormState = {
  nome: string;
  codigo: string;
  categoria: string;
  categoria_subcategoria_id: number | null;
  unidade: string;
  fornecedor_id: number | "";
  quantidade: number | "";
  precoCustoReais: string;
  precoVendaReais: string;
  observacoesProduto: string;
  observacoesEntrada: string;
};

function formatarReaisDeCentavos(
  valorCentavos: number | null | undefined
): string {
  if (valorCentavos == null || Number.isNaN(valorCentavos)) return "—";
  const valor = valorCentavos / 100;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatarData(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export default function GestaoEstoqueAdminPage() {
  const [aba, setAba] = useState<"REVISAR" | "CADASTRO">("REVISAR");

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResumo[]>([]);
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false);
  const [categoriasLoja, setCategoriasLoja] = useState<CategoriaLoja[]>([]);
  const [erroCategoriasLoja, setErroCategoriasLoja] = useState("");
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<number | "">("");
  const [categoriaCadastroSelecionadaId, setCategoriaCadastroSelecionadaId] = useState<number | "">("");

  const [loadingProdutos, setLoadingProdutos] = useState(false);
  // carregamento de fornecedores para selects

  const [savingEdicao, setSavingEdicao] = useState(false);
  const [savingCadastro, setSavingCadastro] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    search: "",
    apenasAtivos: true,
    modoPreco: "TODOS",
  });

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(
    null
  );

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null
  );
  const [emEdicao, setEmEdicao] = useState(false);

  const [editForm, setEditForm] = useState<EditFormState>({
    id: null,
    nome: "",
    codigo: "",
    categoria: "",
    categoria_subcategoria_id: null,
    unidade: "UN",
    ativo: true,
    precoReais: "",
    precoCustoReais: "",
    fornecedorId: null,
  });

  const [cadastroForm, setCadastroForm] = useState<CadastroAdminFormState>({
    nome: "",
    codigo: "",
    categoria: "",
    categoria_subcategoria_id: null,
    unidade: "UN",
    fornecedor_id: "",
    quantidade: "",
    precoCustoReais: "",
    precoVendaReais: "",
    observacoesProduto: "",
    observacoesEntrada: "",
  });
  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }

  async function carregarProdutos() {
    resetMensagem();
    setLoadingProdutos(true);
    try {
      const params = new URLSearchParams();
      params.set("modo", "admin");
      params.set("pageSize", "200");
      if (filtros.search.trim().length > 0) {
        params.set("search", filtros.search.trim());
      }
      if (filtros.apenasAtivos) {
        params.set("apenasAtivos", "true");
      }
      if (filtros.modoPreco === "AGUARDANDO_PRECO") {
        params.set("somenteComPreco", "false");
      } else if (filtros.modoPreco === "COM_PRECO") {
        params.set("somenteComPreco", "true");
      }

      const res = await fetch("/api/loja/produtos?" + params.toString(), {
        cache: "no-store",
      });
      const json: ApiResponse<ProdutosListResponse> = await res.json();

      if (!json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao carregar produtos.");
        return;
      }

      setProdutos(json.data.items ?? []);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao carregar produtos.");
    } finally {
      setLoadingProdutos(false);
    }
  }

  async function carregarFornecedores() {
    try {
      setCarregandoFornecedores(true);
      const res = await fetch("/api/loja/fornecedores", { cache: "no-store" });
      const json: ApiResponse<FornecedorResumo[]> = await res.json();
      if (!res.ok || !json.ok) {
        console.error("Erro ao buscar fornecedores:", json.error);
        return;
      }
      setFornecedores(json.data ?? []);
    } catch (err) {
      console.error("Erro inesperado ao buscar fornecedores:", err);
    } finally {
      setCarregandoFornecedores(false);
    }
  }

  async function carregarCategoriasLoja() {
    try {
      setErroCategoriasLoja("");
      const res = await fetch("/api/loja/produtos/categorias", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Erro ao listar categorias da loja.");
      }
      setCategoriasLoja(json.categorias ?? []);
    } catch (err: any) {
      console.error("Erro inesperado ao carregar categorias/subcategorias:", err);
      setCategoriasLoja([]);
      setErroCategoriasLoja(err.message || "Erro ao listar categorias da loja.");
    }
  }

  useEffect(() => {
    carregarProdutos();
    carregarFornecedores();
    carregarCategoriasLoja();
  }, []);

  const subcatToCatMap = useMemo(() => {
    const map: Record<number, number> = {};
    categoriasLoja.forEach((c) =>
      c.subcategorias.forEach((s) => {
        map[s.id] = c.id;
      })
    );
    return map;
  }, [categoriasLoja]);

  const subcategoriaNomeMap = useMemo(() => {
    const map: Record<number, string> = {};
    categoriasLoja.forEach((c) =>
      c.subcategorias.forEach((s) => {
        map[s.id] = `${c.nome} — ${s.nome}`;
      })
    );
    return map;
  }, [categoriasLoja]);

  useEffect(() => {
    if (editForm.categoria_subcategoria_id && subcatToCatMap[editForm.categoria_subcategoria_id]) {
      setCategoriaSelecionadaId(subcatToCatMap[editForm.categoria_subcategoria_id]);
    } else {
      setCategoriaSelecionadaId("");
    }
  }, [editForm.categoria_subcategoria_id, subcatToCatMap]);

  useEffect(() => {
    if (
      cadastroForm.categoria_subcategoria_id &&
      subcatToCatMap[cadastroForm.categoria_subcategoria_id]
    ) {
      setCategoriaCadastroSelecionadaId(subcatToCatMap[cadastroForm.categoria_subcategoria_id]);
    } else {
      setCategoriaCadastroSelecionadaId("");
    }
  }, [cadastroForm.categoria_subcategoria_id, subcatToCatMap]);

  const produtosFiltrados = useMemo(() => produtos, [produtos]);

  function selecionarProduto(p: Produto) {
    resetMensagem();
    setProdutoSelecionado(p);
    setEmEdicao(false);
    setEditForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      categoria: p.categoria ?? "",
      categoria_subcategoria_id: p.categoria_subcategoria_id ?? null,
      unidade: p.unidade ?? "UN",
      ativo: p.ativo,
      precoReais:
        p.preco_venda_centavos > 0
          ? (p.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
          : "",
      precoCustoReais: "",
      fornecedorId: p.fornecedor_principal_id ?? null,
    });
  }

  function limparSelecao() {
    resetMensagem();
    setProdutoSelecionado(null);
    setEmEdicao(false);
    setEditForm({
      id: null,
      nome: "",
      codigo: "",
      categoria: "",
      categoria_subcategoria_id: null,
      unidade: "UN",
      ativo: true,
      precoReais: "",
      precoCustoReais: "",
      fornecedorId: null,
  });
}

  function handleEditChange<K extends keyof EditFormState>(
    field: K,
    value: EditFormState[K]
  ) {
    resetMensagem();
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCadastroChange<K extends keyof CadastroAdminFormState>(
    field: K,
    value: CadastroAdminFormState[K]
  ) {
    resetMensagem();
    setCadastroForm((prev) => ({ ...prev, [field]: value }));
  }
  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!editForm.id) {
      setMensagemTipo("error");
      setMensagem("Selecione um produto para editar.");
      return;
    }

    let precoVendaCentavos: number | null = null;
    if (editForm.precoReais.trim().length > 0) {
      const clean = editForm.precoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valor = parseFloat(clean);
      if (Number.isNaN(valor) || valor < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de venda invalido.");
        return;
      }
      precoVendaCentavos = Math.round(valor * 100);
    } else {
      precoVendaCentavos = 0;
    }

    let precoCustoCentavos: number | null = null;
    if (editForm.precoCustoReais.trim().length > 0) {
      const cleanCusto = editForm.precoCustoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valorCusto = parseFloat(cleanCusto);
      if (Number.isNaN(valorCusto) || valorCusto < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de custo invalido.");
        return;
      }
      precoCustoCentavos = Math.round(valorCusto * 100);
    }

    setSavingEdicao(true);

    try {
      const payload: any = {
        id: editForm.id,
        nome: editForm.nome.trim(),
        codigo: editForm.codigo.trim() || null,
        categoria: editForm.categoria.trim() || null,
        categoria_subcategoria_id: editForm.categoria_subcategoria_id ?? null,
        unidade: editForm.unidade.trim() || "UN",
        ativo: editForm.ativo,
        preco_venda_centavos: precoVendaCentavos,
        fornecedor_principal_id: editForm.fornecedorId,
      };

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

      setProdutos((prev) => {
        const idx = prev.findIndex((p) => p.id === produtoAtualizado.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = produtoAtualizado;
          return clone;
        }
        return prev;
      });

      selecionarProduto(produtoAtualizado);

      if (precoCustoCentavos !== null) {
        const resCusto = await fetch("/api/loja/produtos/custo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produto_id: produtoAtualizado.id,
            preco_custo_centavos: precoCustoCentavos,
          }),
        });

        const jsonCusto: ApiResponse = await resCusto.json();
        if (!resCusto.ok || !jsonCusto.ok) {
          console.error("Falha ao registrar preco de custo:", jsonCusto.error);
          setMensagemTipo("error");
          setMensagem(
            "Preco de venda salvo, mas houve erro ao registrar o preco de custo."
          );
          return;
        }
      }

      setMensagemTipo("success");
      setMensagem("Produto atualizado com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao salvar produto:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao salvar produto.");
    } finally {
      setSavingEdicao(false);
    }
  }

  async function salvarCadastroAdmin(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!cadastroForm.nome.trim()) {
      setMensagemTipo("error");
      setMensagem("Informe o nome do produto.");
      return;
    }

    if (!cadastroForm.quantidade || cadastroForm.quantidade <= 0) {
      setMensagemTipo("error");
      setMensagem("Informe uma quantidade maior que zero.");
      return;
    }

    let precoCustoCentavos: number | null = null;
    if (cadastroForm.precoCustoReais.trim().length > 0) {
      const clean = cadastroForm.precoCustoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valor = parseFloat(clean);
      if (Number.isNaN(valor) || valor < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de custo invalido.");
        return;
      }
      precoCustoCentavos = Math.round(valor * 100);
    }

    if (!cadastroForm.precoVendaReais.trim()) {
      setMensagemTipo("error");
      setMensagem("Informe o preco de venda.");
      return;
    }
    const cleanVenda = cadastroForm.precoVendaReais
      .replace(/[^\d,.,]/g, "")
      .replace(".", "")
      .replace(",", ".");
    const valorVenda = parseFloat(cleanVenda);
    if (Number.isNaN(valorVenda) || valorVenda < 0) {
      setMensagemTipo("error");
      setMensagem("Preco de venda invalido.");
      return;
    }
    const precoVendaCentavos = Math.round(valorVenda * 100);

    setSavingCadastro(true);

    try {
      const payloadEntrada: any = {
        nome: cadastroForm.nome.trim(),
        quantidade: Number(cadastroForm.quantidade),
        unidade: cadastroForm.unidade.trim() || "UN",
        codigo: cadastroForm.codigo.trim() || undefined,
        categoria: cadastroForm.categoria.trim() || undefined,
        categoria_subcategoria_id: cadastroForm.categoria_subcategoria_id ?? undefined,
        fornecedor_id:
          cadastroForm.fornecedor_id === ""
            ? undefined
            : Number(cadastroForm.fornecedor_id),
        observacoes_produto:
          cadastroForm.observacoesProduto.trim() || undefined,
        observacoes_entrada:
          cadastroForm.observacoesEntrada.trim() || undefined,
      };

      if (precoCustoCentavos !== null) {
        payloadEntrada.preco_custo_centavos = precoCustoCentavos;
      }

      const resEntrada = await fetch("/api/loja/estoque/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadEntrada),
      });
      const jsonEntrada: ApiResponse<any> = await resEntrada.json();

      if (!resEntrada.ok || !jsonEntrada.ok || !jsonEntrada.data?.produto) {
        setMensagemTipo("error");
        setMensagem(
          jsonEntrada.error ||
            "Erro ao criar produto/estoque na entrada administrativa."
        );
        return;
      }

      const produtoCriado: Produto = jsonEntrada.data.produto;

      const payloadPreco = {
        id: produtoCriado.id,
        preco_venda_centavos: precoVendaCentavos,
      };

      const resPreco = await fetch("/api/loja/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPreco),
      });

      const jsonPreco: ApiResponse<Produto> = await resPreco.json();

      if (!resPreco.ok || !jsonPreco.ok || !jsonPreco.data) {
        setMensagemTipo("error");
        setMensagem(
          jsonPreco.error ||
            "Produto criado, mas houve erro ao definir o preco de venda."
        );
        setProdutos((prev) => [produtoCriado, ...prev]);
        return;
      }

      const produtoFinal = jsonPreco.data;

      setProdutos((prev) => [produtoFinal, ...prev]);

      setCadastroForm({
        nome: "",
        codigo: "",
        categoria: "",
        categoria_subcategoria_id: null,
        unidade: "UN",
        fornecedor_id: "",
        quantidade: "",
        precoCustoReais: "",
        precoVendaReais: "",
        observacoesProduto: "",
        observacoesEntrada: "",
      });

      setMensagemTipo("success");
      setMensagem("Produto criado com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao cadastrar produto:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao cadastrar produto.");
    } finally {
      setSavingCadastro(false);
    }
  }

  const fornecedoresOrdenados = useMemo(() => {
    return [...fornecedores].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [fornecedores]);
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Gestao de Estoque — Loja v0 (Admin)
        </h1>
        <p className="text-sm text-gray-500">
          Aqui voce revisa o que a equipe cadastrou via estoque, define precos
          de venda e tambem pode cadastrar produtos completos (estoque + custo + preco).
        </p>
      </header>

      <div className="inline-flex rounded-full border bg-gray-50 p-1">
        <button
          type="button"
          onClick={() => {
            resetMensagem();
            setAba("REVISAR");
          }}
          className={
            "px-4 py-1.5 text-xs font-medium rounded-full " +
            (aba === "REVISAR"
              ? "bg-indigo-600 text-white"
              : "text-gray-700 hover:bg-gray-100")
          }
        >
          Revisar e liberar produtos
        </button>
        <button
          type="button"
          onClick={() => {
            resetMensagem();
            setAba("CADASTRO");
          }}
          className={
            "px-4 py-1.5 text-xs font-medium rounded-full " +
            (aba === "CADASTRO"
              ? "bg-indigo-600 text-white"
              : "text-gray-700 hover:bg-gray-100")
          }
        >
          Cadastro completo (Admin)
        </button>
      </div>

      {mensagem && (
        <div
          className={
            "text-sm border rounded-md px-3 py-2 " +
            (mensagemTipo === "success"
              ? "bg-green-50 border-green-300 text-green-800"
              : "bg-red-50 border-red-300 text-red-800")
          }
        >
          {mensagem}
        </div>
      )}

      {aba === "REVISAR" && (
        <>
          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium mb-1">
                  Buscar por nome ou codigo
                </label>
                <input
                  type="text"
                  value={filtros.search}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-1.5 text-sm"
                  placeholder="Nome ou codigo..."
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
                  Filtro de preco:
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
                  <option value="AGUARDANDO_PRECO">Aguardando preco</option>
                  <option value="COM_PRECO">Com preco definido</option>
                </select>
              </div>

              <button
                type="button"
                onClick={carregarProdutos}
                disabled={loadingProdutos}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {loadingProdutos ? "Atualizando..." : "Atualizar lista"}
              </button>
            </div>
          </section>

          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">Produtos</h2>
              <span className="text-xs text-gray-500">
                {produtosFiltrados.length} produto(s)
              </span>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Codigo</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-right">Estoque</th>
                    <th className="px-3 py-2 text-right">Preco venda</th>
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
                        className={
                          "cursor-pointer " +
                          (selecionado ? "bg-indigo-50" : "hover:bg-gray-50")
                        }
                        onClick={() => selecionarProduto(p)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {p.nome}
                            </span>
                            {aguardandoPreco && (
                              <span className="text-[11px] text-amber-600">
                                Aguardando definicao de preco
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.codigo || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {subcategoriaNomeMap[p.categoria_subcategoria_id ?? -1] ?? p.categoria || "-"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {p.estoque_atual}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {p.preco_venda_centavos > 0
                            ? "R$ " +
                              (p.preco_venda_centavos / 100)
                                .toFixed(2)
                                .replace(".", ",")
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium " +
                              (p.ativo
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200")
                            }
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
          </section>

          <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
            <div className="mt-4">
              {produtoSelecionado ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="text-sm font-semibold">
                          {emEdicao ? "Editar produto" : "Detalhes do produto"}
                        </h2>
                        <p className="text-xs text-gray-500">
                          ID #{produtoSelecionado.id}
                          {produtoSelecionado.codigo
                            ? ` • Codigo: ${produtoSelecionado.codigo}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {!emEdicao && (
                          <button
                            type="button"
                            onClick={() => setEmEdicao(true)}
                            className="px-3 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50"
                            disabled={!editForm.id}
                          >
                            Editar produto
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="font-medium text-gray-600">Nome</div>
                        <div className="text-gray-900">{produtoSelecionado.nome}</div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Categoria</div>
                        <div className="text-gray-900">
                          {subcategoriaNomeMap[produtoSelecionado.categoria_subcategoria_id ?? -1] ?? produtoSelecionado.categoria || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Unidade</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.unidade || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Estoque atual</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.estoque_atual}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Status</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.ativo ? "Ativo" : "Inativo"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Preco de venda</div>
                        <div className="text-gray-900">
                          {formatarReaisDeCentavos(
                            produtoSelecionado.preco_venda_centavos
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Fornecedor</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.fornecedor_nome || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Data de cadastro</div>
                        <div className="text-gray-900">
                          {formatarData(produtoSelecionado.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">
                          Ultima atualizacao
                        </div>
                        <div className="text-gray-900">
                          {formatarData(produtoSelecionado.updated_at)}
                        </div>
                      </div>
                    </div>

                    {produtoSelecionado.observacoes && (
                      <div className="mt-3">
                        <div className="font-medium text-gray-600 text-xs">
                          Observacoes
                        </div>
                        <p className="text-xs text-gray-900 whitespace-pre-line">
                          {produtoSelecionado.observacoes}
                        </p>
                      </div>
                    )}
                  </div>

                  {emEdicao && (
                    <form onSubmit={salvarEdicao} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Nome do produto
                            </label>
                            <input
                              type="text"
                              value={editForm.nome}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, nome: e.target.value }))
                              }
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              placeholder="Ex.: Sapatilha de meia ponta"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">
                                Codigo interno
                              </label>
                              <input
                                type="text"
                                value={editForm.codigo}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    codigo: e.target.value,
                                  }))
                                }
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                placeholder="Opcional"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium mb-1">
                                Unidade
                              </label>
                              <input
                                type="text"
                                value={editForm.unidade}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    unidade: e.target.value,
                                  }))
                                }
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                placeholder="Ex.: UN, PAR"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            {erroCategoriasLoja && (
                              <p className="text-[11px] text-red-600">{erroCategoriasLoja}</p>
                            )}
                            {!erroCategoriasLoja && categoriasLoja.length === 0 && (
                              <p className="text-[11px] text-gray-500">
                                Nenhuma categoria cadastrada. Configure em{" "}
                                <a
                                  href="/admin/loja/categorias"
                                  className="underline"
                                >
                                  Administração da Loja ? Categorias
                                </a>
                                .
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Categoria</label>
                                <select
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  value={categoriaSelecionadaId ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : "";
                                    setCategoriaSelecionadaId(value as any);
                                    setEditForm((prev) => ({
                                      ...prev,
                                      categoria_subcategoria_id: null,
                                    }));
                                  }}
                                  disabled={categoriasLoja.length === 0}
                                >
                                  <option value="">Selecione uma categoria</option>
                                  {categoriasLoja.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">Subcategoria</label>
                                <select
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  value={editForm.categoria_subcategoria_id ?? ""}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      categoria_subcategoria_id: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    }))
                                  }
                                  disabled={!categoriaSelecionadaId || categoriasLoja.length === 0}
                                >
                                  <option value="">Selecione subcategoria</option>
                                  {categoriasLoja
                                    .find((cat) => cat.id === categoriaSelecionadaId)
                                    ?.subcategorias.map((sub) => (
                                      <option key={sub.id} value={sub.id}>
                                        {sub.nome}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Fornecedor principal
                            </label>
                            <select
                              value={editForm.fornecedorId ?? ""}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  fornecedorId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                              disabled={carregandoFornecedores}
                            >
                              <option value="">(Sem fornecedor definido)</option>
                              {fornecedores.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.nome}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Este fornecedor e usado como referencia principal para o produto.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              id="editar-ativo"
                              type="checkbox"
                              checked={editForm.ativo}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  ativo: e.target.checked,
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor="editar-ativo"
                              className="text-xs font-medium select-none"
                            >
                              Produto ativo
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide">
                                Precos & Liberacao
                              </h3>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                Admin
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Preco de venda (R$)
                                </label>
                                <input
                                  type="text"
                                  value={editForm.precoReais}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      precoReais: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  placeholder="Ex.: 120,00"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Preco de custo (R$) — apenas administrador
                                </label>
                                <input
                                  type="text"
                                  value={editForm.precoCustoReais}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      precoCustoReais: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  placeholder="Opcional. Ex.: 80,00"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Este valor e administrativo. Ele registra um historico de custo e nao aparece para a equipe da Loja.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEmEdicao(false);
                            if (produtoSelecionado) {
                              selecionarProduto(produtoSelecionado);
                            }
                          }}
                          className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                          disabled={savingEdicao}
                        >
                          Cancelar edicao
                        </button>

                        <button
                          type="button"
                          onClick={limparSelecao}
                          className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                          disabled={savingEdicao}
                        >
                          Limpar selecao
                        </button>

                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50"
                          disabled={savingEdicao || !editForm.id}
                        >
                          Salvar alteracoes
                        </button>

                        <button
                          type="submit"
                          onClick={() =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    ativo: true,
                                  }
                                : prev
                            )
                          }
                          className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={savingEdicao || !editForm.id}
                        >
                          Liberar produto
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Selecione um produto na lista para ver os detalhes.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {aba === "CADASTRO" && (
        <section className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold">
            Cadastro completo de produto (Admin)
          </h2>
          <p className="text-xs text-gray-500">
            Use esta aba quando voce quiser cadastrar um produto completo,
            definindo fornecedor, estoque inicial, preco de custo e preco de
            venda de uma vez so. Esta acao e exclusiva do administrador.
          </p>

          <form className="space-y-4" onSubmit={salvarCadastroAdmin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Nome do produto *
                </label>
                <input
                  type="text"
                  value={cadastroForm.nome}
                  onChange={(e) =>
                    handleCadastroChange("nome", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: Sapatilha meia ponta infantil"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Codigo interno
                </label>
                <input
                  type="text"
                  value={cadastroForm.codigo}
                  onChange={(e) =>
                    handleCadastroChange("codigo", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: SAP-MP-INF-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Categoria
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={categoriaCadastroSelecionadaId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : "";
                    setCategoriaCadastroSelecionadaId(value as any);
                    handleCadastroChange("categoria_subcategoria_id", null);
                  }}
                  disabled={categoriasLoja.length === 0}
                >
                  <option value="">Selecione uma categoria</option>
                  {categoriasLoja.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Subcategoria</label>
                <select
                  value={cadastroForm.categoria_subcategoria_id ?? ""}
                  onChange={(e) =>
                    handleCadastroChange(
                      "categoria_subcategoria_id",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={!categoriaCadastroSelecionadaId || categoriasLoja.length === 0}
                >
                  <option value="">Selecione subcategoria</option>
                  {categoriasLoja
                    .find((cat) => cat.id === categoriaCadastroSelecionadaId)
                    ?.subcategorias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Selecione a subcategoria da loja para vincular o produto.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Unidade
                </label>
                <input
                  type="text"
                  value={cadastroForm.unidade}
                  onChange={(e) =>
                    handleCadastroChange("unidade", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="UN, PAR, KIT..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Fornecedor
                </label>
                <select
                  value={
                    cadastroForm.fornecedor_id === ""
                      ? ""
                      : String(cadastroForm.fornecedor_id)
                  }
                  onChange={(e) =>
                    handleCadastroChange(
                      "fornecedor_id",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={carregandoFornecedores}
                >
                  <option value="">
                    {carregandoFornecedores
                      ? "Carregando fornecedores..."
                      : "Opcional - selecione um fornecedor"}
                  </option>
                  {fornecedoresOrdenados.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Quantidade inicial *
                </label>
                <input
                  type="number"
                  min={1}
                  value={cadastroForm.quantidade}
                  onChange={(e) =>
                    handleCadastroChange(
                      "quantidade",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Preco de custo (R$)
                </label>
                <input
                  type="text"
                  value={cadastroForm.precoCustoReais}
                  onChange={(e) =>
                    handleCadastroChange("precoCustoReais", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: 50,00"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Opcional. Se informado junto com o fornecedor, alimenta o seu
                  historico de preco de custo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Preco de venda (R$) *
                </label>
                <input
                  type="text"
                  value={cadastroForm.precoVendaReais}
                  onChange={(e) =>
                    handleCadastroChange("precoVendaReais", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: 79,90"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Este e o preco final que aparecera no caixa.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Observacoes do produto
                </label>
                <textarea
                  value={cadastroForm.observacoesProduto}
                  onChange={(e) =>
                    handleCadastroChange("observacoesProduto", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Numeracao disponivel, cores, colecao, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Observacoes da entrada
                </label>
                <textarea
                  value={cadastroForm.observacoesEntrada}
                  onChange={(e) =>
                    handleCadastroChange("observacoesEntrada", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex.: Lote de teste, colecao, numeracoes..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingCadastro}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingCadastro ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}






