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

type FiltrosState = {
  search: string;
  apenasAtivos: boolean;
  modoPreco: "TODOS" | "AGUARDANDO_PRECO" | "COM_PRECO";
};

type CreateFormState = {
  nome: string;
  categoria_id: string;
  subcategoria_id: string;
  unidade: string;
  precoReais: string;
  ativo: boolean;
};

type EditFormState = {
  id: number | null;
  nome: string;
  codigo: string;
  subcategoria_id: string;
  unidade: string;
  ativo: boolean;
  precoReais: string;
};

function moneyToCentavos(input: string): number | null {
  const clean = input.replace(/\./g, "").replace(",", ".").trim();
  if (!clean) return null;
  const n = Number(clean);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function AdminLojaProdutosPage() {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [subcategorias, setSubcategorias] = useState<SubcategoriaRow[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [showModalSubcategoria, setShowModalSubcategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaCodigo, setNovaCategoriaCodigo] = useState("");
  const [novaSubcategoriaNome, setNovaSubcategoriaNome] = useState("");
  const [novaSubcategoriaCodigo, setNovaSubcategoriaCodigo] = useState("");

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    nome: "",
    categoria_id: "",
    subcategoria_id: "",
    unidade: "UN",
    precoReais: "",
    ativo: true,
  });
  const [createdProduto, setCreatedProduto] = useState<Produto | null>(null);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
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
    ativo: true,
    precoReais: "",
  });

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
    setEditForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      subcategoria_id: p.categoria_subcategoria_id ? String(p.categoria_subcategoria_id) : "",
      unidade: p.unidade ?? "UN",
      ativo: p.ativo,
      precoReais: p.preco_venda_centavos > 0 ? (p.preco_venda_centavos / 100).toFixed(2).replace(".", ",") : "",
    });
    void carregarVariantes(p.id);
  }

  function limparSelecao() {
    resetMensagem();
    setEditForm({
      id: null,
      nome: "",
      codigo: "",
      subcategoria_id: "",
      unidade: "UN",
      ativo: true,
      precoReais: "",
    });
    setVariantes([]);
    setErroVariantes(null);
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

  async function cadastrarProduto() {
    resetMensagem();
    setCreatedProduto(null);

    const nome = createForm.nome.trim();
    if (!nome) {
      setMensagemTipo("error");
      setMensagem("Nome do produto é obrigatório.");
      return;
    }

    const subId = createForm.subcategoria_id ? Number(createForm.subcategoria_id) : NaN;
    if (Number.isNaN(subId) || subId <= 0) {
      setMensagemTipo("error");
      setMensagem("Selecione a subcategoria.");
      return;
    }

    const precoCentavos = moneyToCentavos(createForm.precoReais);
    if (precoCentavos === null) {
      setMensagemTipo("error");
      setMensagem("Preço de venda inválido.");
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        nome,
        categoria_subcategoria_id: subId,
        preco_venda_centavos: precoCentavos,
        unidade: createForm.unidade.trim() || "UN",
        ativo: createForm.ativo,
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

      setCreatedProduto(json.data);
      setMensagemTipo("success");
      setMensagem("Produto cadastrado com sucesso.");

      setCreateForm((prev) => ({ ...prev, nome: "", precoReais: "" }));
      await carregarProdutos();
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

    const precoCentavos = editForm.precoReais.trim().length > 0 ? moneyToCentavos(editForm.precoReais) : 0;
    if (precoCentavos === null) {
      setMensagemTipo("error");
      setMensagem("Preço inválido.");
      return;
    }

    const subId = editForm.subcategoria_id ? Number(editForm.subcategoria_id) : null;

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs tracking-widest text-slate-500">LOJA (ADMIN)</div>
          <h1 className="mt-2 text-2xl font-semibold">Produtos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre produtos, organize categorias/subcategorias e gerencie preços/variantes.
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
                O código institucional é gerado automaticamente quando não for informado.
              </p>
            </div>
            <Link
              href="/admin/loja/gestao-estoque"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ir para Gestão de Estoque
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Nome do produto *</label>
              <input
                value={createForm.nome}
                onChange={(e) => setCreateForm((p) => ({ ...p, nome: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Uniforme Conexão Dança 2026"
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
                <option value="__new__">+ Cadastrar nova categoria…</option>
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
                {createForm.categoria_id ? <option value="__new__">+ Cadastrar nova subcategoria…</option> : null}
              </select>
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
              <label className="text-sm font-medium">Preço de venda (R$) *</label>
              <input
                value={createForm.precoReais}
                onChange={(e) => setCreateForm((p) => ({ ...p, precoReais: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: 79,90"
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
                  <span className="text-slate-500">Código:</span>{" "}
                  <span className="font-semibold">{createdProduto.codigo ?? "-"}</span>
                </span>
                <Link
                  href={`/admin/loja/gestao-estoque?produtoId=${createdProduto.id}`}
                  className="rounded-xl border px-4 py-2 font-medium hover:bg-slate-50"
                >
                  Abrir na Gestão de Estoque
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium mb-1">Buscar por nome ou código</label>
              <input
                type="text"
                value={filtros.search}
                onChange={(e) => setFiltros((prev) => ({ ...prev, search: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Digite parte do nome ou do código..."
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
              <span className="text-xs font-medium text-gray-700">Filtro de preço:</span>
              <select
                value={filtros.modoPreco}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    modoPreco: e.target.value as FiltrosState["modoPreco"],
                  }))
                }
                className="rounded-xl border px-3 py-2 text-xs"
              >
                <option value="TODOS">Todos</option>
                <option value="AGUARDANDO_PRECO">Aguardando preço</option>
                <option value="COM_PRECO">Com preço definido</option>
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
                            <span className="text-[11px] text-amber-600">Aguardando definição de preço</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{p.codigo || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{p.categoria || "-"}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{p.estoque_atual}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {p.preco_venda_centavos > 0
                          ? `R$ ${(p.preco_venda_centavos / 100).toFixed(2).replace(".", ",")}`
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
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Edição do produto</h2>
            <button type="button" onClick={limparSelecao} className="text-xs text-gray-500 hover:text-gray-700">
              Limpar seleção
            </button>
          </div>

          {!editForm.id ? (
            <p className="mt-2 text-xs text-gray-500">Clique em um produto na tabela acima para editar.</p>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={salvarEdicao}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-medium mb-1">Código</label>
                  <input
                    type="text"
                    value={editForm.codigo}
                    onChange={(e) => setEditForm((p) => ({ ...p, codigo: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Subcategoria</label>
                  <input
                    type="text"
                    value={editForm.subcategoria_id}
                    onChange={(e) => setEditForm((p) => ({ ...p, subcategoria_id: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="ID da subcategoria (por enquanto)"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Ajuste fino: depois podemos trocar por select também (igual ao cadastro).
                  </p>
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
                  <label className="block text-xs font-medium mb-1">Preço de venda (R$)</label>
                  <input
                    type="text"
                    value={editForm.precoReais}
                    onChange={(e) => setEditForm((p) => ({ ...p, precoReais: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Deixe em branco para 'aguardando preço'"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
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
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          )}

          {editForm.id && (
            <div className="mt-6 rounded-3xl border border-indigo-100 bg-white/95 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Variantes</h3>
                  <p className="text-xs text-slate-600">
                    Produto #{editForm.id} - {editForm.nome || "Selecionado"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void carregarVariantes(editForm.id as number)}
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Recarregar variantes
                </button>
              </div>

              {erroVariantes && (
                <div className="px-5 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
                  {erroVariantes}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                        Estoque
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">
                        Preço
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
                          Nenhuma variante encontrada. Crie a variante padrão no Admin.
                        </td>
                      </tr>
                    )}

                    {!loadingVariantes &&
                      variantes.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-medium text-slate-900">{v.sku}</td>
                          <td className="px-5 py-3 text-right text-slate-700">{v.estoque_atual}</td>
                          <td className="px-5 py-3 text-right text-slate-700">
                            {v.preco_venda_centavos != null
                              ? `R$ ${(v.preco_venda_centavos / 100).toFixed(2).replace(".", ",")}`
                              : "—"}
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
            </div>
          )}

          {editForm.id ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/admin/loja/produtos/${editForm.id}/variantes`}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Abrir cadastro de variantes
              </Link>
              <Link
                href={`/admin/loja/gestao-estoque?produtoId=${editForm.id}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Abrir na Gestão de Estoque
              </Link>
            </div>
          ) : null}
        </div>

        {showModalCategoria ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
              <h3 className="text-lg font-semibold">Cadastrar nova categoria</h3>
              <p className="mt-1 text-sm text-slate-600">Cria e já seleciona no cadastro.</p>

              <label className="mt-4 block text-sm font-medium">Nome</label>
              <input
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Vestuário"
              />

              <label className="mt-3 block text-sm font-medium">Código (opcional)</label>
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
              <p className="mt-1 text-sm text-slate-600">Cria e já seleciona no cadastro.</p>

              <label className="mt-4 block text-sm font-medium">Nome</label>
              <input
                value={novaSubcategoriaNome}
                onChange={(e) => setNovaSubcategoriaNome(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Ex.: Camisas"
              />

              <label className="mt-3 block text-sm font-medium">Código (opcional)</label>
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
