
"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type Produto = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao?: string | null;
  categoria: string | null;
  categoria_subcategoria_id?: number | null;
  categoria_nome?: string | null;
  subcategoria_nome?: string | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  observacoes?: string | null;
  fornecedor_principal_id?: number | null;
};

type Variante = {
  id: number;
  produto_id: number;
  sku: string;
  cor_id: number | null;
  numeracao_id: number | null;
  tamanho_id: number | null;
  estoque_atual: number;
  preco_venda_centavos: number | null;
  ativo: boolean;
};

type ApiResponse<T> = { ok?: boolean; error?: string; data?: T };

type ProdutosListResponse = {
  items: Produto[];
  pagination: { page: number; pageSize: number; total: number };
};

type CategoriaRow = { id: number; nome: string; codigo: string | null; ativo: boolean };

type SubcategoriaRow = { id: number; categoria_id: number; nome: string; codigo: string | null; ativo: boolean };

type FornecedorRow = {
  id: number;
  pessoa_id: number;
  codigo_interno: string | null;
  ativo: boolean;
  observacoes?: string | null;
  pessoa_nome?: string | null;
  pessoa_documento?: string | null;
};

type CorRow = { id: number; nome: string; codigo: string | null; hex: string | null; ativo: boolean };

type NumeracaoRow = { id: number; tipo: string; valor: number; ativo: boolean };

type TamanhoRow = { id: number; tipo: string; nome: string; ordem?: number | null; ativo: boolean };

type AtributosData = { cores: CorRow[]; numeracoes: NumeracaoRow[]; tamanhos: TamanhoRow[] };

type FiltrosState = {
  search: string;
  apenasAtivos: boolean;
  modoPreco: "TODOS" | "AGUARDANDO_PRECO" | "COM_PRECO";
};

type CreateFormState = {
  nome: string;
  codigo: string;
  categoria_id: string;
  subcategoria_id: string;
  unidade: string;
  fornecedor_id: string;
  estoque_inicial: string;
  preco_custo: string;
  preco_venda: string;
  ativo: boolean;
  observacoes_produto: string;
  observacoes_entrada: string;
  criar_variante_padrao: boolean;
};

type EditFormState = {
  id: number | null;
  nome: string;
  codigo: string;
  subcategoria_id: string;
  unidade: string;
  fornecedor_id: string;
  ativo: boolean;
  preco_venda: string;
  observacoes: string;
};

type VarianteFormState = {
  modo: "PADRAO" | "ATRIBUTOS";
  cor_id: string;
  numeracao_id: string;
  tamanho_id: string;
};

function moneyToCentavos(input: string): number | null {
  const clean = input.replace(/\./g, "").replace(",", ".").trim();
  if (!clean) return null;
  const n = Number(clean);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatCentavos(value: number | null | undefined): string {
  if (!Number.isFinite(value ?? NaN)) return "-";
  return `R$ ${(Number(value) / 100).toFixed(2).replace(".", ",")}`;
}

export default function AdminLojaProdutosPage() {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [subcategorias, setSubcategorias] = useState<SubcategoriaRow[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([]);
  const [atributos, setAtributos] = useState<AtributosData>({ cores: [], numeracoes: [], tamanhos: [] });

  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingFornecedores, setLoadingFornecedores] = useState(false);
  const [loadingAtributos, setLoadingAtributos] = useState(false);

  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [showModalSubcategoria, setShowModalSubcategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaCodigo, setNovaCategoriaCodigo] = useState("");
  const [novaSubcategoriaNome, setNovaSubcategoriaNome] = useState("");
  const [novaSubcategoriaCodigo, setNovaSubcategoriaCodigo] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    nome: "",
    codigo: "",
    categoria_id: "",
    subcategoria_id: "",
    unidade: "UN",
    fornecedor_id: "",
    estoque_inicial: "",
    preco_custo: "",
    preco_venda: "",
    ativo: true,
    observacoes_produto: "",
    observacoes_entrada: "",
    criar_variante_padrao: true,
  });
  const [createdProduto, setCreatedProduto] = useState<Produto | null>(null);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [criandoVariante, setCriandoVariante] = useState(false);
  const [erroVariantes, setErroVariantes] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosState>({
    search: "",
    apenasAtivos: true,
    modoPreco: "TODOS",
  });

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(null);

  const [editForm, setEditForm] = useState<EditFormState>({
    id: null,
    nome: "",
    codigo: "",
    subcategoria_id: "",
    unidade: "UN",
    fornecedor_id: "",
    ativo: true,
    preco_venda: "",
    observacoes: "",
  });

  const [varianteForm, setVarianteForm] = useState<VarianteFormState>({
    modo: "PADRAO",
    cor_id: "",
    numeracao_id: "",
    tamanho_id: "",
  });
  const [mostrarFormVariante, setMostrarFormVariante] = useState(false);

  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }

  async function carregarCategorias() {
    setLoadingCats(true);
    try {
      const res = await fetch("/api/loja/categorias", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<CategoriaRow[]>;
      if (!res.ok || json.ok === false || !json.data) return;
      setCategorias(json.data);
    } finally {
      setLoadingCats(false);
    }
  }

  const carregarSubcategoriasByCategoria = useCallback(async (categoriaId: number) => {
    setLoadingSubs(true);
    try {
      const res = await fetch(`/api/loja/subcategorias?categoria_id=${categoriaId}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<SubcategoriaRow[]>;
      if (!res.ok || json.ok === false || !json.data) return;
      setSubcategorias(json.data);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  async function carregarFornecedores() {
    setLoadingFornecedores(true);
    try {
      const res = await fetch("/api/loja/fornecedores", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<FornecedorRow[]>;
      if (!res.ok || json.ok === false || !json.data) return;
      setFornecedores(json.data.filter((f) => f.ativo));
    } finally {
      setLoadingFornecedores(false);
    }
  }

  async function carregarAtributos() {
    setLoadingAtributos(true);
    try {
      const res = await fetch("/api/loja/atributos", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<AtributosData>;
      if (!res.ok || json.ok === false || !json.data) return;
      setAtributos({
        cores: json.data.cores ?? [],
        numeracoes: json.data.numeracoes ?? [],
        tamanhos: json.data.tamanhos ?? [],
      });
    } finally {
      setLoadingAtributos(false);
    }
  }

  async function carregarProdutos() {
    resetMensagem();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("modo", "admin");
      params.set("pageSize", "200");
      if (filtros.search.trim().length > 0) params.set("search", filtros.search.trim());
      if (filtros.apenasAtivos) params.set("apenasAtivos", "true");

      if (filtros.modoPreco === "AGUARDANDO_PRECO") params.set("somenteComPreco", "false");
      else if (filtros.modoPreco === "COM_PRECO") params.set("somenteComPreco", "true");

      const res = await fetch(`/api/loja/produtos?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<ProdutosListResponse>;
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
    void carregarCategorias();
    void carregarProdutos();
    void carregarFornecedores();
    void carregarAtributos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSubcategorias([]);
    setCreateForm((prev) => ({ ...prev, subcategoria_id: "" }));
    const catId = Number(createForm.categoria_id);
    if (!Number.isNaN(catId) && catId > 0) {
      void carregarSubcategoriasByCategoria(catId);
    }
  }, [createForm.categoria_id, carregarSubcategoriasByCategoria]);

  const produtosFiltrados = useMemo(() => produtos, [produtos]);
  async function carregarVariantes(produtoId: number) {
    setErroVariantes(null);
    setLoadingVariantes(true);
    try {
      const qs = new URLSearchParams();
      qs.set("produto_id", String(produtoId));
      const res = await fetch(`/api/loja/variantes?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;

      const lista = (json?.["variantes"] || json?.["items"] || json?.["data"] || []) as unknown;
      if (!res.ok || (json as { ok?: boolean } | null)?.ok === false) {
        setErroVariantes(((json as { error?: string } | null)?.error) || "Erro ao carregar variantes.");
        setVariantes([]);
        return;
      }
      setVariantes(Array.isArray(lista) ? (lista as Variante[]) : []);
    } catch (err) {
      console.error("Erro ao carregar variantes:", err);
      setErroVariantes("Erro inesperado ao carregar variantes.");
      setVariantes([]);
    } finally {
      setLoadingVariantes(false);
    }
  }

  function selecionarProduto(p: Produto) {
    resetMensagem();
    setProdutoSelecionado(p);
    setEditForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      subcategoria_id: p.categoria_subcategoria_id ? String(p.categoria_subcategoria_id) : "",
      unidade: p.unidade ?? "UN",
      fornecedor_id: p.fornecedor_principal_id ? String(p.fornecedor_principal_id) : "",
      ativo: p.ativo,
      preco_venda: p.preco_venda_centavos > 0 ? (p.preco_venda_centavos / 100).toFixed(2).replace(".", ",") : "",
      observacoes: p.observacoes ?? "",
    });
    setVarianteForm({ modo: "PADRAO", cor_id: "", numeracao_id: "", tamanho_id: "" });
    setMostrarFormVariante(false);
    void carregarVariantes(p.id);
  }

  function limparSelecao() {
    resetMensagem();
    setProdutoSelecionado(null);
    setEditForm({
      id: null,
      nome: "",
      codigo: "",
      subcategoria_id: "",
      unidade: "UN",
      fornecedor_id: "",
      ativo: true,
      preco_venda: "",
      observacoes: "",
    });
    setVariantes([]);
    setErroVariantes(null);
    setMostrarFormVariante(false);
  }

  async function criarCategoria() {
    resetMensagem();
    const nome = novaCategoriaNome.trim();
    if (!nome) {
      setMensagemTipo("error");
      setMensagem("Informe o nome da categoria.");
      return;
    }

    const res = await fetch("/api/loja/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, codigo: novaCategoriaCodigo.trim() || undefined }),
    });

    const json = (await res.json()) as ApiResponse<CategoriaRow>;
    if (!res.ok || json.ok === false || !json.data) {
      setMensagemTipo("error");
      setMensagem(json.error || "Erro ao criar categoria.");
      return;
    }

    await carregarCategorias();
    setCreateForm((prev) => ({ ...prev, categoria_id: String(json.data!.id) }));
    setShowModalCategoria(false);
    setNovaCategoriaNome("");
    setNovaCategoriaCodigo("");
    setMensagemTipo("success");
    setMensagem("Categoria cadastrada e selecionada.");
  }

  async function criarSubcategoria() {
    resetMensagem();
    const catId = Number(createForm.categoria_id);
    if (Number.isNaN(catId) || catId <= 0) {
      setMensagemTipo("error");
      setMensagem("Selecione uma categoria antes de cadastrar subcategoria.");
      return;
    }

    const nome = novaSubcategoriaNome.trim();
    if (!nome) {
      setMensagemTipo("error");
      setMensagem("Informe o nome da subcategoria.");
      return;
    }

    const res = await fetch("/api/loja/subcategorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria_id: catId,
        nome,
        codigo: novaSubcategoriaCodigo.trim() || undefined,
      }),
    });

    const json = (await res.json()) as ApiResponse<SubcategoriaRow>;
    if (!res.ok || json.ok === false || !json.data) {
      setMensagemTipo("error");
      setMensagem(json.error || "Erro ao criar subcategoria.");
      return;
    }

    await carregarSubcategoriasByCategoria(catId);
    setCreateForm((prev) => ({ ...prev, subcategoria_id: String(json.data!.id) }));
    setShowModalSubcategoria(false);
    setNovaSubcategoriaNome("");
    setNovaSubcategoriaCodigo("");
    setMensagemTipo("success");
    setMensagem("Subcategoria cadastrada e selecionada.");
  }

  async function criarVariante(payload: Record<string, unknown>) {
    const res = await fetch("/api/loja/variantes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error || "Erro ao criar variante." };
    }

    return { ok: true };
  }

  async function criarVarianteAgora() {
    resetMensagem();
    if (!produtoSelecionado) {
      setMensagemTipo("error");
      setMensagem("Selecione um produto antes de criar variante.");
      return;
    }

    if (
      varianteForm.modo === "ATRIBUTOS" &&
      !varianteForm.cor_id &&
      !varianteForm.numeracao_id &&
      !varianteForm.tamanho_id
    ) {
      setMensagemTipo("error");
      setMensagem("Informe ao menos um atributo para criar variante.");
      return;
    }

    setCriandoVariante(true);
    try {
      const payload: Record<string, unknown> = { produto_id: produtoSelecionado.id };
      if (varianteForm.modo === "ATRIBUTOS") {
        payload.cor_id = varianteForm.cor_id ? Number(varianteForm.cor_id) : null;
        payload.numeracao_id = varianteForm.numeracao_id ? Number(varianteForm.numeracao_id) : null;
        payload.tamanho_id = varianteForm.tamanho_id ? Number(varianteForm.tamanho_id) : null;
      }

      const resultado = await criarVariante(payload);
      if (!resultado.ok) {
        setMensagemTipo("error");
        setMensagem(resultado.error || "Erro ao criar variante.");
        return;
      }

      setMensagemTipo("success");
      setMensagem("Variante criada com sucesso.");
      setVarianteForm((prev) => ({ ...prev, cor_id: "", numeracao_id: "", tamanho_id: "" }));
      await carregarVariantes(produtoSelecionado.id);
      await carregarProdutos();
    } catch (e) {
      console.error("Erro ao criar variante:", e);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao criar variante.");
    } finally {
      setCriandoVariante(false);
    }
  }
  async function cadastrarProduto() {
    resetMensagem();
    setCreatedProduto(null);

    const nome = createForm.nome.trim();
    if (!nome) {
      setMensagemTipo("error");
      setMensagem("Nome do produto e obrigatorio.");
      return;
    }

    const subId = createForm.subcategoria_id ? Number(createForm.subcategoria_id) : NaN;
    if (Number.isNaN(subId) || subId <= 0) {
      setMensagemTipo("error");
      setMensagem("Selecione a subcategoria.");
      return;
    }

    const precoVendaCentavos = moneyToCentavos(createForm.preco_venda);
    if (precoVendaCentavos === null) {
      setMensagemTipo("error");
      setMensagem("Preco de venda invalido.");
      return;
    }

    const estoqueInicialRaw = createForm.estoque_inicial.trim();
    const estoqueInicial = estoqueInicialRaw.length ? Number(estoqueInicialRaw) : 0;
    if (!Number.isFinite(estoqueInicial) || estoqueInicial < 0) {
      setMensagemTipo("error");
      setMensagem("Estoque inicial invalido.");
      return;
    }

    const precoCustoRaw = createForm.preco_custo.trim();
    const precoCustoCentavos = precoCustoRaw.length ? moneyToCentavos(precoCustoRaw) : null;
    if (precoCustoRaw.length && precoCustoCentavos === null) {
      setMensagemTipo("error");
      setMensagem("Preco de custo invalido.");
      return;
    }

    const observacoesEntrada = createForm.observacoes_entrada.trim();
    if (estoqueInicial <= 0 && (precoCustoCentavos !== null || observacoesEntrada.length > 0)) {
      setMensagemTipo("error");
      setMensagem("Para registrar entrada, informe estoque inicial maior que zero.");
      return;
    }

    const fornecedorId = createForm.fornecedor_id ? Number(createForm.fornecedor_id) : null;
    if (createForm.fornecedor_id && (!Number.isFinite(fornecedorId) || fornecedorId <= 0)) {
      setMensagemTipo("error");
      setMensagem("Fornecedor selecionado invalido.");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        nome,
        codigo: createForm.codigo.trim() || null,
        categoria_subcategoria_id: subId,
        preco_venda_centavos: precoVendaCentavos,
        unidade: createForm.unidade.trim() || "UN",
        ativo: createForm.ativo,
        observacoes: createForm.observacoes_produto.trim() || null,
        fornecedor_principal_id: fornecedorId,
      };

      const res = await fetch("/api/loja/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiResponse<Produto>;
      if (!res.ok || json.ok === false || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao cadastrar produto.");
        return;
      }

      const novoProduto = json.data;
      setCreatedProduto(novoProduto);
      setProdutoSelecionado(novoProduto);
      setEditForm({
        id: novoProduto.id,
        nome: novoProduto.nome,
        codigo: novoProduto.codigo ?? "",
        subcategoria_id: novoProduto.categoria_subcategoria_id ? String(novoProduto.categoria_subcategoria_id) : "",
        unidade: novoProduto.unidade ?? "UN",
        fornecedor_id: novoProduto.fornecedor_principal_id ? String(novoProduto.fornecedor_principal_id) : "",
        ativo: novoProduto.ativo,
        preco_venda:
          novoProduto.preco_venda_centavos > 0
            ? (novoProduto.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
            : "",
        observacoes: novoProduto.observacoes ?? "",
      });

      const avisos: string[] = [];

      if (estoqueInicial > 0) {
        const resEntrada = await fetch("/api/loja/estoque/entrada", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produto_id: novoProduto.id,
            quantidade: Math.trunc(estoqueInicial),
            fornecedor_id: fornecedorId ?? undefined,
            preco_custo_centavos: precoCustoCentavos ?? undefined,
            observacoes_entrada: observacoesEntrada || undefined,
          }),
        });

        const jsonEntrada = (await resEntrada.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!resEntrada.ok || jsonEntrada.ok === false) {
          avisos.push(jsonEntrada.error || "Falha ao registrar entrada de estoque.");
        }
      }

      if (createForm.criar_variante_padrao) {
        const resultado = await criarVariante({ produto_id: novoProduto.id });
        if (!resultado.ok) {
          avisos.push(resultado.error || "Falha ao criar variante padrao.");
        }
      }

      await carregarProdutos();
      await carregarVariantes(novoProduto.id);

      setCreateForm((prev) => ({
        ...prev,
        nome: "",
        codigo: "",
        estoque_inicial: "",
        preco_custo: "",
        preco_venda: "",
        observacoes_produto: "",
        observacoes_entrada: "",
        criar_variante_padrao: true,
      }));

      if (avisos.length > 0) {
        setMensagemTipo("error");
        setMensagem(`Produto cadastrado, mas ${avisos.join(" ")}`);
      } else {
        setMensagemTipo("success");
        setMensagem("Produto cadastrado com sucesso.");
      }
    } catch (e) {
      console.error("Erro ao cadastrar produto:", e);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao cadastrar produto.");
    } finally {
      setCreating(false);
    }
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!editForm.id) {
      setMensagemTipo("error");
      setMensagem("Selecione um produto para editar.");
      return;
    }

    if (!editForm.nome.trim()) {
      setMensagemTipo("error");
      setMensagem("Nome do produto e obrigatorio.");
      return;
    }

    const precoCentavos = editForm.preco_venda.trim().length > 0 ? moneyToCentavos(editForm.preco_venda) : 0;
    if (precoCentavos === null) {
      setMensagemTipo("error");
      setMensagem("Preco de venda invalido.");
      return;
    }

    const subId = editForm.subcategoria_id ? Number(editForm.subcategoria_id) : null;
    if (editForm.subcategoria_id && (!Number.isFinite(subId) || (subId as number) <= 0)) {
      setMensagemTipo("error");
      setMensagem("Subcategoria invalida.");
      return;
    }

    const fornecedorId = editForm.fornecedor_id ? Number(editForm.fornecedor_id) : null;
    if (editForm.fornecedor_id && (!Number.isFinite(fornecedorId) || (fornecedorId as number) <= 0)) {
      setMensagemTipo("error");
      setMensagem("Fornecedor selecionado invalido.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        id: editForm.id,
        nome: editForm.nome.trim(),
        codigo: editForm.codigo.trim() || null,
        categoria_subcategoria_id: subId,
        unidade: editForm.unidade.trim() || "UN",
        ativo: editForm.ativo,
        preco_venda_centavos: precoCentavos,
        observacoes: editForm.observacoes.trim() || null,
        fornecedor_principal_id: fornecedorId,
      };

      const res = await fetch("/api/loja/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiResponse<Produto>;
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

      setProdutoSelecionado(produtoAtualizado);
      setEditForm((prev) => ({
        ...prev,
        nome: produtoAtualizado.nome,
        codigo: produtoAtualizado.codigo ?? "",
        subcategoria_id: produtoAtualizado.categoria_subcategoria_id
          ? String(produtoAtualizado.categoria_subcategoria_id)
          : "",
        unidade: produtoAtualizado.unidade ?? "UN",
        fornecedor_id: produtoAtualizado.fornecedor_principal_id
          ? String(produtoAtualizado.fornecedor_principal_id)
          : "",
        ativo: produtoAtualizado.ativo,
        preco_venda:
          produtoAtualizado.preco_venda_centavos > 0
            ? (produtoAtualizado.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
            : "",
        observacoes: produtoAtualizado.observacoes ?? "",
      }));

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs tracking-widest text-slate-500">LOJA (ADMIN)</div>
          <h1 className="mt-2 text-2xl font-semibold">Produtos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastro completo com estoque inicial, categorias e variantes.
          </p>
        </div>

        {mensagem && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              mensagemTipo === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {mensagem}
          </div>
        )}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Cadastrar produto</h2>
              <p className="mt-1 text-sm text-slate-600">
                Se o codigo interno nao for informado, o sistema gera automaticamente.
              </p>
            </div>
            <Link
              href="/admin/loja/gestao-estoque"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ir para Gestao de Estoque
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Nome do produto *</label>
              <input
                value={createForm.nome}
                onChange={(e) => setCreateForm((p) => ({ ...p, nome: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Uniforme Conexao Danca 2026"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Codigo interno (opcional)</label>
              <input
                value={createForm.codigo}
                onChange={(e) => setCreateForm((p) => ({ ...p, codigo: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: UNIF-2026"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Unidade</label>
              <input
                value={createForm.unidade}
                onChange={(e) => setCreateForm((p) => ({ ...p, unidade: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="UN"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={createForm.categoria_id}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") {
                    setShowModalCategoria(true);
                    return;
                  }
                  setCreateForm((p) => ({ ...p, categoria_id: v }));
                }}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                disabled={loadingCats}
              >
                <option value="">{loadingCats ? "Carregando..." : "Selecione a categoria"}</option>
                {categorias.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nome}
                  </option>
                ))}
                <option value="__new__">+ Cadastrar nova categoria...</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Subcategoria *</label>
              <select
                value={createForm.subcategoria_id}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new__") {
                    setShowModalSubcategoria(true);
                    return;
                  }
                  setCreateForm((p) => ({ ...p, subcategoria_id: v }));
                }}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                disabled={!createForm.categoria_id || loadingSubs}
              >
                <option value="">
                  {!createForm.categoria_id
                    ? "Selecione uma categoria primeiro"
                    : loadingSubs
                      ? "Carregando..."
                      : "Selecione a subcategoria"}
                </option>
                {subcategorias.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nome}
                  </option>
                ))}
                {createForm.categoria_id ? <option value="__new__">+ Cadastrar nova subcategoria...</option> : null}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Fornecedor principal</label>
              <select
                value={createForm.fornecedor_id}
                onChange={(e) => setCreateForm((p) => ({ ...p, fornecedor_id: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                disabled={loadingFornecedores}
              >
                <option value="">{loadingFornecedores ? "Carregando..." : "Selecione o fornecedor"}</option>
                {fornecedores.map((f) => {
                  const nome = f.pessoa_nome || f.codigo_interno || `Fornecedor #${f.id}`;
                  const doc = f.pessoa_documento ? ` (${f.pessoa_documento})` : "";
                  return (
                    <option key={f.id} value={String(f.id)}>
                      {`${nome}${doc}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Estoque inicial</label>
              <input
                value={createForm.estoque_inicial}
                onChange={(e) => setCreateForm((p) => ({ ...p, estoque_inicial: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="0"
              />
              <p className="mt-1 text-xs text-slate-500">Entrada so e registrada se o estoque inicial for maior que zero.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Preco de custo (opcional)</label>
              <input
                value={createForm.preco_custo}
                onChange={(e) => setCreateForm((p) => ({ ...p, preco_custo: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: 40,00"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Preco de venda (R$) *</label>
              <input
                value={createForm.preco_venda}
                onChange={(e) => setCreateForm((p) => ({ ...p, preco_venda: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: 79,90"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Observacoes do produto</label>
              <textarea
                value={createForm.observacoes_produto}
                onChange={(e) => setCreateForm((p) => ({ ...p, observacoes_produto: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={3}
                placeholder="Detalhes gerais do produto..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Observacoes da entrada</label>
              <textarea
                value={createForm.observacoes_entrada}
                onChange={(e) => setCreateForm((p) => ({ ...p, observacoes_entrada: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={2}
                placeholder="Notas sobre a entrada inicial de estoque..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="novoAtivo"
                type="checkbox"
                checked={createForm.ativo}
                onChange={(e) => setCreateForm((p) => ({ ...p, ativo: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="novoAtivo" className="text-sm font-medium text-slate-700">
                Produto ativo
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="criarVariantePadrao"
                type="checkbox"
                checked={createForm.criar_variante_padrao}
                onChange={(e) => setCreateForm((p) => ({ ...p, criar_variante_padrao: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="criarVariantePadrao" className="text-sm font-medium text-slate-700">
                Criar variante padrao automaticamente
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => void cadastrarProduto()}
              disabled={creating}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {creating ? "Cadastrando..." : "Cadastrar produto"}
            </button>

            {createdProduto ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-xl border bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Codigo:</span>{" "}
                  <span className="font-semibold">{createdProduto.codigo ?? "-"}</span>
                </span>
                <Link
                  href={`/admin/loja/gestao-estoque?produtoId=${createdProduto.id}`}
                  className="rounded-xl border px-4 py-2 font-medium hover:bg-slate-50"
                >
                  Abrir na Gestao de Estoque
                </Link>
                <Link
                  href={`/admin/loja/produtos/${createdProduto.id}/variantes`}
                  className="rounded-xl border px-4 py-2 font-medium hover:bg-slate-50"
                >
                  Cadastrar variante
                </Link>
              </div>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Painel do produto</h2>
              <p className="mt-1 text-sm text-slate-600">
                Selecione um item na lista para editar dados e criar variantes.
              </p>
            </div>
            {produtoSelecionado ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarFormVariante((prev) => !prev)}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  {mostrarFormVariante ? "Ocultar variante" : "Adicionar variante"}
                </button>
                <Link
                  href={`/admin/loja/gestao-estoque?produtoId=${produtoSelecionado.id}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Gestao de Estoque
                </Link>
              </div>
            ) : null}
          </div>

          {!produtoSelecionado ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum produto selecionado.</p>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-4">
                <div className="text-sm text-slate-600">
                  Codigo: <span className="font-semibold text-slate-900">{produtoSelecionado.codigo ?? "-"}</span>
                </div>
                <div className="text-sm text-slate-600">
                  Categoria: <span className="font-semibold text-slate-900">{produtoSelecionado.categoria ?? "-"}</span>
                </div>
                <div className="text-sm text-slate-600">
                  Preco:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatCentavos(produtoSelecionado.preco_venda_centavos)}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  Estoque: <span className="font-semibold text-slate-900">{produtoSelecionado.estoque_atual}</span>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Editar produto</h3>
                  <button type="button" onClick={limparSelecao} className="text-xs text-gray-500 hover:text-gray-700">
                    Limpar selecao
                  </button>
                </div>

                <form className="mt-4 space-y-4" onSubmit={salvarEdicao}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Nome do produto</label>
                      <input
                        type="text"
                        value={editForm.nome}
                        onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Codigo interno</label>
                      <input
                        type="text"
                        value={editForm.codigo}
                        onChange={(e) => setEditForm((p) => ({ ...p, codigo: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Subcategoria (ID)</label>
                      <input
                        type="text"
                        value={editForm.subcategoria_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, subcategoria_id: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="ID da subcategoria"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Unidade</label>
                      <input
                        type="text"
                        value={editForm.unidade}
                        onChange={(e) => setEditForm((p) => ({ ...p, unidade: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="UN, PAR, KIT..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Fornecedor principal</label>
                      <select
                        value={editForm.fornecedor_id}
                        onChange={(e) => setEditForm((p) => ({ ...p, fornecedor_id: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        disabled={loadingFornecedores}
                      >
                        <option value="">{loadingFornecedores ? "Carregando..." : "Selecione o fornecedor"}</option>
                        {fornecedores.map((f) => {
                          const nome = f.pessoa_nome || f.codigo_interno || `Fornecedor #${f.id}`;
                          const doc = f.pessoa_documento ? ` (${f.pessoa_documento})` : "";
                          return (
                            <option key={f.id} value={String(f.id)}>
                              {`${nome}${doc}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1">Preco de venda (R$)</label>
                      <input
                        type="text"
                        value={editForm.preco_venda}
                        onChange={(e) => setEditForm((p) => ({ ...p, preco_venda: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder="Deixe em branco para aguardando preco"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Observacoes</label>
                      <textarea
                        value={editForm.observacoes}
                        onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="produtoAtivo"
                        type="checkbox"
                        checked={editForm.ativo}
                        onChange={(e) => setEditForm((p) => ({ ...p, ativo: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="produtoAtivo" className="text-xs font-medium text-gray-700">
                        Produto ativo
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar alteracoes"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Variantes</h3>
                  <button
                    type="button"
                    onClick={() => void carregarVariantes(produtoSelecionado.id)}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    Recarregar
                  </button>
                </div>

                {mostrarFormVariante ? (
                  <div className="mt-4 space-y-3 rounded-lg border bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="varianteModo"
                          checked={varianteForm.modo === "PADRAO"}
                          onChange={() => setVarianteForm((p) => ({ ...p, modo: "PADRAO" }))}
                        />
                        Variante padrao
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="varianteModo"
                          checked={varianteForm.modo === "ATRIBUTOS"}
                          onChange={() => setVarianteForm((p) => ({ ...p, modo: "ATRIBUTOS" }))}
                        />
                        Com atributos
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium">Cor</label>
                        <select
                          value={varianteForm.cor_id}
                          onChange={(e) => setVarianteForm((p) => ({ ...p, cor_id: e.target.value }))}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          disabled={varianteForm.modo !== "ATRIBUTOS" || loadingAtributos}
                        >
                          <option value="">{loadingAtributos ? "Carregando..." : "Selecione"}</option>
                          {atributos.cores.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Numeracao</label>
                        <select
                          value={varianteForm.numeracao_id}
                          onChange={(e) => setVarianteForm((p) => ({ ...p, numeracao_id: e.target.value }))}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          disabled={varianteForm.modo !== "ATRIBUTOS" || loadingAtributos}
                        >
                          <option value="">{loadingAtributos ? "Carregando..." : "Selecione"}</option>
                          {atributos.numeracoes.map((n) => (
                            <option key={n.id} value={String(n.id)}>
                              {n.valor}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Tamanho</label>
                        <select
                          value={varianteForm.tamanho_id}
                          onChange={(e) => setVarianteForm((p) => ({ ...p, tamanho_id: e.target.value }))}
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          disabled={varianteForm.modo !== "ATRIBUTOS" || loadingAtributos}
                        >
                          <option value="">{loadingAtributos ? "Carregando..." : "Selecione"}</option>
                          {atributos.tamanhos.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void criarVarianteAgora()}
                      disabled={criandoVariante}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                    >
                      {criandoVariante ? "Criando..." : "Criar variante agora"}
                    </button>
                  </div>
                ) : null}

                {erroVariantes && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {erroVariantes}
                  </div>
                )}

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                          Estoque
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                          Preco
                        </th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ativo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingVariantes && (
                        <tr>
                          <td colSpan={4} className="px-5 py-6 text-slate-500">
                            Carregando variantes...
                          </td>
                        </tr>
                      )}

                      {!loadingVariantes && variantes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-slate-500">
                            Nenhuma variante encontrada.
                          </td>
                        </tr>
                      )}

                      {!loadingVariantes &&
                        variantes.map((v) => (
                          <tr key={v.id} className="border-t border-slate-100">
                            <td className="px-5 py-3 font-medium text-slate-900">{v.sku}</td>
                            <td className="px-5 py-3 text-right text-slate-700">{v.estoque_atual}</td>
                            <td className="px-5 py-3 text-right text-slate-700">
                              {v.preco_venda_centavos != null ? formatCentavos(v.preco_venda_centavos) : "-"}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border ${
                                  v.ativo
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {v.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/loja/produtos/${produtoSelecionado.id}/variantes`}
                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Abrir cadastro de variantes
                  </Link>
                  <Link
                    href={`/admin/loja/gestao-estoque?produtoId=${produtoSelecionado.id}`}
                    className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  >
                    Abrir na Gestao de Estoque
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium mb-1">Buscar por nome ou codigo</label>
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => setFiltros((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Digite parte do nome ou do codigo..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="apenasAtivos"
                type="checkbox"
                checked={filtros.apenasAtivos}
                onChange={(e) => setFiltros((prev) => ({ ...prev, apenasAtivos: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="apenasAtivos" className="text-xs font-medium text-gray-700">
                Apenas ativos
              </label>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-medium text-gray-700">Filtro de preco:</span>
              <select
                value={filtros.modoPreco}
                onChange={(e) => setFiltros((prev) => ({ ...prev, modoPreco: e.target.value as FiltrosState["modoPreco"] }))}
                className="rounded-xl border px-3 py-2 text-xs"
              >
                <option value="TODOS">Todos</option>
                <option value="AGUARDANDO_PRECO">Aguardando preco</option>
                <option value="COM_PRECO">Com preco definido</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void carregarProdutos()}
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Atualizando..." : "Atualizar lista"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto border rounded-xl">
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
                    <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500">
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
                      className={`cursor-pointer ${selecionado ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                      onClick={() => selecionarProduto(p)}
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{p.nome}</span>
                          {aguardandoPreco && (
                            <span className="text-[11px] text-amber-600">Aguardando definicao de preco</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.codigo || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.categoria || "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.estoque_atual}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {p.preco_venda_centavos > 0 ? formatCentavos(p.preco_venda_centavos) : "-"}
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
        </div>

        {showModalCategoria ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold">Cadastrar nova categoria</h3>
              <p className="mt-1 text-sm text-slate-600">Cria e ja seleciona no cadastro.</p>

              <label className="mt-4 block text-sm font-medium">Nome</label>
              <input
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Vestuario"
              />

              <label className="mt-3 block text-sm font-medium">Codigo (opcional)</label>
              <input
                value={novaCategoriaCodigo}
                onChange={(e) => setNovaCategoriaCodigo(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: VESTUARIO"
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowModalCategoria(false);
                    setNovaCategoriaNome("");
                    setNovaCategoriaCodigo("");
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void criarCategoria()}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showModalSubcategoria ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold">Cadastrar nova subcategoria</h3>
              <p className="mt-1 text-sm text-slate-600">Cria e ja seleciona no cadastro.</p>

              <label className="mt-4 block text-sm font-medium">Nome</label>
              <input
                value={novaSubcategoriaNome}
                onChange={(e) => setNovaSubcategoriaNome(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Camisas"
              />

              <label className="mt-3 block text-sm font-medium">Codigo (opcional)</label>
              <input
                value={novaSubcategoriaCodigo}
                onChange={(e) => setNovaSubcategoriaCodigo(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: CAMISAS"
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowModalSubcategoria(false);
                    setNovaSubcategoriaNome("");
                    setNovaSubcategoriaCodigo("");
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => void criarSubcategoria()}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
