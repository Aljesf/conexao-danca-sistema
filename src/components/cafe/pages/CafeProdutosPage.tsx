"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import { useCafeCategorias } from "@/lib/cafe/useCafeCategorias";

type Insumo = {
  id: number;
  nome: string;
  unidade_base: string;
};

type Produto = {
  id: number;
  nome: string;
  categoria: string;
  categoria_id: number | null;
  subcategoria_id: number | null;
  categoria_nome?: string | null;
  subcategoria_nome?: string | null;
  unidade_venda: string;
  preco_venda_centavos: number;
  preparado: boolean;
  insumo_direto_id: number | null;
  ativo: boolean;
};

type ReceitaItem = {
  insumo_id: number;
  quantidade: number;
  unidade: string;
  ordem?: number;
  ativo?: boolean;
};

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
};

type PrecoProduto = {
  tabela_preco_id: number;
  preco_centavos: number;
  ativo: boolean;
};

function formatBRLFromCentavos(value: number): string {
  const val = (value || 0) / 100;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseBRLToCentavos(input: string): number {
  const clean = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(clean);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

const fieldClassName =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const compactFieldClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50";

export default function CafeProdutosPage() {
  const {
    categorias,
    loading: categoriasLoading,
    error: categoriasError,
    reload: reloadCategorias,
  } = useCafeCategorias();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoPrecoBRL, setNovoPrecoBRL] = useState<string>("0,00");
  const [novaCategoriaId, setNovaCategoriaId] = useState<number | "">("");
  const [novaSubcategoriaId, setNovaSubcategoriaId] = useState<number | "">("");
  const [novoUnidadeVenda, setNovoUnidadeVenda] = useState("un");
  const [novoPreparado, setNovoPreparado] = useState(true);
  const [novoInsumoDiretoId, setNovoInsumoDiretoId] = useState<string>("");
  const [buscaListagem, setBuscaListagem] = useState("");

  const [editCategoriaId, setEditCategoriaId] = useState<number | "">("");
  const [editSubcategoriaId, setEditSubcategoriaId] = useState<number | "">("");
  const [salvandoClassificacao, setSalvandoClassificacao] = useState(false);

  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const selectedProduto = useMemo(() => {
    if (!Array.isArray(produtos)) return null;
    return produtos.find((p) => p.id === selectedProdutoId) ?? null;
  }, [produtos, selectedProdutoId]);

  const novaSubcategorias = useMemo(() => {
    if (!novaCategoriaId) return [];
    const categoria = categorias.find((c) => c.id === Number(novaCategoriaId));
    return categoria?.subcategorias ?? [];
  }, [categorias, novaCategoriaId]);

  const editSubcategorias = useMemo(() => {
    if (!editCategoriaId) return [];
    const categoria = categorias.find((c) => c.id === Number(editCategoriaId));
    return categoria?.subcategorias ?? [];
  }, [categorias, editCategoriaId]);

  const [receitaItens, setReceitaItens] = useState<ReceitaItem[]>([]);
  const [receitaLoading, setReceitaLoading] = useState(false);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>([]);
  const [precosTabela, setPrecosTabela] = useState<Record<number, string>>({});
  const [precosLoading, setPrecosLoading] = useState(false);
  const [precosOrigem, setPrecosOrigem] = useState<Record<number, "saved" | "fallback">>({});
  const [precosSaving, setPrecosSaving] = useState(false);
  const [precosError, setPrecosError] = useState<string | null>(null);
  const [precosMessage, setPrecosMessage] = useState<string | null>(null);

  async function loadProdutos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cafe/produtos?search=&page=1&pageSize=50");
      const json = (await res.json()) as { data?: { items?: Produto[] }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar produtos.");
      const items = Array.isArray(json?.data?.items) ? json.data.items : [];
      setProdutos(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInsumos() {
    const res = await fetch("/api/cafe/insumos");
    const json = (await res.json()) as { data?: Insumo[] };
    setInsumos(json.data ?? []);
  }

  async function loadTabelasPreco() {
    try {
      const res = await fetch("/api/cafe/tabelas-preco");
      const json = (await res.json()) as { ok?: boolean; data?: TabelaPreco[]; error?: string };

      if (!res.ok || !json.ok) {
        console.warn("Falha ao carregar tabelas de preço:", json?.error);
        setTabelasPreco([]);
        setPrecosError("Falha ao carregar tabelas de preço.");
        return;
      }

      setTabelasPreco(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("Erro inesperado ao carregar tabelas de preço", err);
      setTabelasPreco([]);
      setPrecosError("Erro inesperado ao carregar tabelas de preço.");
    }
  }

  const loadPrecos = useCallback(async (produtoId: number) => {
    setPrecosLoading(true);
    setPrecosError(null);
    try {
      const res = await fetch(`/api/cafe/produtos/${produtoId}/precos`);
      const json = (await res.json()) as { ok?: boolean; data?: PrecoProduto[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Falha ao carregar preços.");

      const basePrice = selectedProduto?.preco_venda_centavos ?? 0;
      const map = new Map<number, number>();
      for (const row of json.data ?? []) {
        map.set(row.tabela_preco_id, Number(row.preco_centavos ?? 0));
      }

      const next: Record<number, string> = {};
      const origem: Record<number, "saved" | "fallback"> = {};
      for (const tabela of tabelasPreco) {
        if (!tabela.ativo) continue;
        const hasSaved = map.has(tabela.id);
        const valor = hasSaved ? map.get(tabela.id) : basePrice;
        next[tabela.id] = formatBRLFromCentavos(Number(valor ?? 0));
        origem[tabela.id] = hasSaved ? "saved" : "fallback";
      }
      setPrecosTabela(next);
      setPrecosOrigem(origem);
    } catch (err) {
      setPrecosError(err instanceof Error ? err.message : "Erro ao carregar preços.");
      setPrecosTabela({});
      setPrecosOrigem({});
    } finally {
      setPrecosLoading(false);
    }
  }, [selectedProduto?.preco_venda_centavos, tabelasPreco]);

  async function loadReceita(produtoId: number) {
    setReceitaLoading(true);
    try {
      const res = await fetch(`/api/cafe/produtos/${produtoId}/receita`);
      const json = (await res.json()) as { data?: ReceitaItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar receita.");
      setReceitaItens(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar receita.");
    } finally {
      setReceitaLoading(false);
    }
  }

  useEffect(() => {
    void loadProdutos();
    void loadInsumos();
    void loadTabelasPreco();
  }, []);

  useEffect(() => {
    if (selectedProdutoId) void loadReceita(selectedProdutoId);
  }, [selectedProdutoId]);

  useEffect(() => {
    if (selectedProdutoId && tabelasPreco.length > 0) {
      void loadPrecos(selectedProdutoId);
    }
  }, [selectedProdutoId, tabelasPreco, loadPrecos]);

  useEffect(() => {
    if (!selectedProduto) {
      setEditCategoriaId("");
      setEditSubcategoriaId("");
      return;
    }
    setEditCategoriaId(selectedProduto.categoria_id ?? "");
    setEditSubcategoriaId(selectedProduto.subcategoria_id ?? "");
  }, [selectedProduto]);

  useEffect(() => {
    if (!novaCategoriaId) {
      setNovaSubcategoriaId("");
      return;
    }
    const subcatValida = novaSubcategorias.some((s) => s.id === Number(novaSubcategoriaId));
    if (!subcatValida) {
      setNovaSubcategoriaId("");
    }
  }, [novaCategoriaId, novaSubcategoriaId, novaSubcategorias]);

  useEffect(() => {
    if (!editCategoriaId) {
      setEditSubcategoriaId("");
      return;
    }
    const subcatValida = editSubcategorias.some((s) => s.id === Number(editSubcategoriaId));
    if (!subcatValida) {
      setEditSubcategoriaId("");
    }
  }, [editCategoriaId, editSubcategoriaId, editSubcategorias]);


  async function criarProduto() {
    setError(null);
    setMessage(null);
    if (!novoNome.trim()) {
      setError("Nome obrigatório.");
      return;
    }
    if (!novaCategoriaId) {
      setError("Categoria obrigatória.");
      return;
    }
    const precoCentavos = parseBRLToCentavos(novoPrecoBRL);
    if (!Number.isFinite(precoCentavos) || precoCentavos < 0) {
      setError("Preço inválido.");
      return;
    }

    const insumoDiretoId = novoPreparado ? null : (novoInsumoDiretoId ? Number(novoInsumoDiretoId) : null);
    if (novoInsumoDiretoId && !Number.isFinite(insumoDiretoId)) {
      setError("Insumo direto inválido.");
      return;
    }

    const categoria = categorias.find((c) => c.id === Number(novaCategoriaId));
    if (!categoria) {
      setError("Categoria inválida.");
      return;
    }

    const res = await fetch("/api/cafe/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoNome,
        categoria: categoria.nome,
        categoria_id: Number(novaCategoriaId),
        subcategoria_id: novaSubcategoriaId ? Number(novaSubcategoriaId) : null,
        unidade_venda: novoUnidadeVenda,
        preco_venda_centavos: precoCentavos,
        preparado: novoPreparado,
        insumo_direto_id: insumoDiretoId,
      }),
    });

    const json = (await res.json()) as { data?: Produto; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Falha ao criar produto.");
      return;
    }

    setNovoNome("");
    setNovoPrecoBRL("0,00");
    setNovaCategoriaId("");
    setNovaSubcategoriaId("");
    setNovoUnidadeVenda("un");
    setNovoPreparado(true);
    setNovoInsumoDiretoId("");
    setMessage("Produto criado.");
    await loadProdutos();
    if (json.data?.id) setSelectedProdutoId(json.data.id);
  }

  async function salvarReceita() {
    if (!selectedProdutoId) return;
    setError(null);
    setMessage(null);

    const seen = new Set<number>();
    const itens = receitaItens
      .filter((i) => i.insumo_id && i.quantidade > 0 && i.unidade.trim())
      .filter((i) => {
        if (seen.has(i.insumo_id)) return false;
        seen.add(i.insumo_id);
        return true;
      });

    if (selectedProduto?.preparado && itens.length === 0) {
      setError("Receita obrigatória para produto preparado.");
      return;
    }
    const res = await fetch(`/api/cafe/produtos/${selectedProdutoId}/receita`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens }),
    });

    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error ?? "Falha ao salvar receita.");
      return;
    }

    setMessage("Receita salva.");
    await loadReceita(selectedProdutoId);
  }

  async function criarCategoriaRapida() {
    const nome = window.prompt("Nome da nova categoria:");
    if (!nome || nome.trim().length < 2) return;

    setError(null);
    setMessage(null);

    const res = await fetch("/api/cafe/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), ordem: 0 }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      categoria?: { id?: number };
    };
    if (!res.ok) {
      setError(json.error ?? "Falha ao criar categoria.");
      return;
    }

    await reloadCategorias();

    const categoriaId = Number(json.categoria?.id);
    if (Number.isFinite(categoriaId) && categoriaId > 0) {
      setNovaCategoriaId(categoriaId);
      setNovaSubcategoriaId("");
    }
    setMessage("Categoria criada com sucesso.");
  }

  async function salvarPrecos() {
    if (!selectedProdutoId) return;
    setPrecosError(null);
    setPrecosMessage(null);
    setPrecosSaving(true);

    try {
      const precos = tabelasPreco
        .filter((t) => t.ativo)
        .map((t) => {
          const raw = precosTabela[t.id] ?? "";
          const value = parseBRLToCentavos(raw);
          return {
            tabela_preco_id: t.id,
            preco_centavos: Math.round(value),
            ativo: true,
          };
        });

      if (precos.some((p) => !Number.isFinite(p.preco_centavos) || p.preco_centavos < 0)) {
        setPrecosError("Preço inválido.");
        return;
      }

      const res = await fetch(`/api/cafe/produtos/${selectedProdutoId}/precos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precos }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setPrecosError(json.error ?? "Falha ao salvar preços.");
        return;
      }

      setPrecosMessage("Preços atualizados.");
      await loadPrecos(selectedProdutoId);
    } catch (err) {
      setPrecosError(err instanceof Error ? err.message : "Erro ao salvar preços.");
    } finally {
      setPrecosSaving(false);
    }
  }

  async function salvarClassificacaoProduto() {
    if (!selectedProduto) return;

    if (!editCategoriaId) {
      setError("Categoria obrigatória para atualizar o produto.");
      return;
    }

    const categoria = categorias.find((c) => c.id === Number(editCategoriaId));
    if (!categoria) {
      setError("Categoria inválida.");
      return;
    }

    setSalvandoClassificacao(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cafe/produtos/${selectedProduto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: categoria.nome,
          categoria_id: Number(editCategoriaId),
          subcategoria_id: editSubcategoriaId ? Number(editSubcategoriaId) : null,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Falha ao atualizar categoria do produto.");
        return;
      }

      setMessage("Classificação do produto atualizada.");
      await loadProdutos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar classificação.");
    } finally {
      setSalvandoClassificacao(false);
    }
  }

  const insumoOptions = useMemo(() => insumos, [insumos]);
  const tabelaDefault = tabelasPreco.find((t) => t.ativo && t.is_default) ?? null;
  const precoFallback = selectedProduto
    ? formatBRLFromCentavos(selectedProduto.preco_venda_centavos)
    : null;
  const precoDefault = selectedProduto && tabelaDefault
    ? (precosTabela[tabelaDefault.id] ?? precoFallback ?? "")
    : null;
  const categoriasEmUso = useMemo(() => {
    const keys = new Set(
      produtos
        .map((produto) => String(produto.categoria_nome ?? produto.categoria ?? "").trim())
        .filter(Boolean),
    );
    return keys.size;
  }, [produtos]);
  const produtosPreparados = useMemo(
    () => produtos.filter((produto) => produto.preparado).length,
    [produtos],
  );
  const produtosSimples = Math.max(produtos.length - produtosPreparados, 0);
  const produtosOrdenados = useMemo(() => {
    return [...produtos].sort((a, b) => {
      const categoriaComparada = String(a.categoria_nome ?? a.categoria ?? "").localeCompare(
        String(b.categoria_nome ?? b.categoria ?? ""),
        "pt-BR",
      );
      if (categoriaComparada !== 0) return categoriaComparada;

      const subcategoriaComparada = String(a.subcategoria_nome ?? "").localeCompare(
        String(b.subcategoria_nome ?? ""),
        "pt-BR",
      );
      if (subcategoriaComparada !== 0) return subcategoriaComparada;

      return String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR");
    });
  }, [produtos]);
  const produtosVisiveis = useMemo(() => {
    const termo = buscaListagem
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    if (!termo) return produtosOrdenados;

    return produtosOrdenados.filter((produto) => {
      const alvo = [
        produto.nome,
        produto.categoria_nome ?? produto.categoria,
        produto.subcategoria_nome ?? "",
      ]
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      return alvo.includes(termo);
    });
  }, [buscaListagem, produtosOrdenados]);

  return (
    <CafePageShell
      eyebrow="Gestão do Café"
      title="Gestão do Ballet Café - Produtos"
      description="Cadastre produtos, organize categorias, defina preços por tabela e mantenha receitas e insumos com classificação relacional correta."
      className="max-w-[1600px]"
      summary={
        <>
          <CafeStatCard
            label="Total de produtos"
            value={produtos.length}
            description="Itens cadastrados para catálogo e operação do caixa."
          />
          <CafeStatCard
            label="Categorias em uso"
            value={categoriasEmUso}
            description="Leitura rápida da estrutura comercial atualmente utilizada."
          />
          <CafeStatCard
            label="Preparados x simples"
            value={`${produtosPreparados} / ${produtosSimples}`}
            description="Produtos preparados versus itens simples vinculados a insumo direto."
          />
        </>
      }
    >
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}
      {categoriasError ? <div className="text-sm text-amber-700">Categorias: {categoriasError}</div> : null}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.9fr)]">
        <div className="space-y-6">
          <CafeCard title="Novo produto">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input
                  className={fieldClassName}
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preço fallback (R$)</label>
                <input
                  className={fieldClassName}
                  value={novoPrecoBRL}
                  onChange={(e) => setNovoPrecoBRL(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Usado quando uma tabela não possui preço definido.</p>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select
                  className={fieldClassName}
                  value={novaCategoriaId}
                  onChange={(e) => setNovaCategoriaId(e.target.value ? Number(e.target.value) : "")}
                  disabled={categoriasLoading}
                >
                  <option value="">Selecione...</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() =>
                    window.open("/admin/cafe/categorias", "_blank", "noopener,noreferrer")
                  }
                >
                  Gerenciar categorias
                </button>
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() => void criarCategoriaRapida()}
                >
                  + Nova categoria
                </button>
              </div>
              <div>
                <label className="text-sm font-medium">Subcategoria (opcional)</label>
                <select
                  className={fieldClassName}
                  value={novaSubcategoriaId}
                  onChange={(e) => setNovaSubcategoriaId(e.target.value ? Number(e.target.value) : "")}
                  disabled={!novaCategoriaId}
                >
                  <option value="">--</option>
                  {novaSubcategorias.map((subcategoria) => (
                    <option key={subcategoria.id} value={subcategoria.id}>
                      {subcategoria.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Unidade de venda</label>
                <input
                  className={fieldClassName}
                  value={novoUnidadeVenda}
                  onChange={(e) => setNovoUnidadeVenda(e.target.value)}
                  placeholder="un"
                />
              </div>
              {!novoPreparado ? (
                <div>
                  <label className="text-sm font-medium">Insumo direto (opcional)</label>
                  <select
                    className={fieldClassName}
                    value={novoInsumoDiretoId}
                    onChange={(e) => setNovoInsumoDiretoId(e.target.value)}
                  >
                    <option value="">--</option>
                    {insumoOptions.map((insumo) => (
                      <option key={insumo.id} value={insumo.id}>
                        {insumo.nome}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={novoPreparado}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setNovoPreparado(next);
                      if (next) setNovoInsumoDiretoId("");
                    }}
                  />
                  Produto preparado
                </label>
              </div>
            </div>
            <div className="mt-4">
              <button
                className={primaryButtonClassName}
                onClick={() => void criarProduto()}
              >
                Criar produto
              </button>
            </div>
          </CafeCard>

          <CafeCard
            title="Produtos cadastrados"
            description="Listagem ordenada por categoria, subcategoria e nome, usando a classificação relacional do Café."
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-600">
                {produtosVisiveis.length} produto(s) exibido(s) na organização atual.
              </p>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70 md:max-w-sm"
                value={buscaListagem}
                onChange={(e) => setBuscaListagem(e.target.value)}
                placeholder="Buscar por nome, categoria ou subcategoria"
              />
            </div>
            <div className="overflow-hidden rounded-[20px] border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Categoria</th>
                    <th className="px-4 py-3 text-left">Subcategoria</th>
                    <th className="px-4 py-3 text-right">Preço fallback</th>
                    <th className="px-4 py-3 text-center">Preparado</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosVisiveis.map((p) => (
                    <tr
                      key={p.id}
                      className={
                        "cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 " + (selectedProdutoId === p.id ? "bg-amber-50/60" : "bg-white")
                      }
                      onClick={() => setSelectedProdutoId(p.id)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
                      <td className="px-4 py-3">{p.categoria_nome ?? p.categoria ?? "-"}</td>
                      <td className="px-4 py-3">{p.subcategoria_nome ?? "-"}</td>
                      <td className="px-4 py-3 text-right">{formatBRLFromCentavos(p.preco_venda_centavos)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium " +
                            (p.preparado
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700")
                          }
                        >
                          {p.preparado ? "Sim" : "Não"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {produtosVisiveis.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-center text-sm text-slate-500" colSpan={5}>
                        Nenhum produto encontrado para o filtro informado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {loading ? <p className="mt-3 text-sm text-slate-600">Carregando...</p> : null}
            </div>
            </div>
          </CafeCard>
        </div>

        {selectedProduto ? (
          <div className="space-y-6">
            <CafeCard title="Classificação do produto">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    className={fieldClassName}
                    value={editCategoriaId}
                    onChange={(e) => setEditCategoriaId(e.target.value ? Number(e.target.value) : "")}
                    disabled={salvandoClassificacao || categoriasLoading}
                  >
                    <option value="">Selecione...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={secondaryButtonClassName}
                      onClick={() =>
                        window.open("/admin/cafe/categorias", "_blank", "noopener,noreferrer")
                      }
                    >
                      Gerenciar categorias
                    </button>
                    <button
                      type="button"
                      className={secondaryButtonClassName}
                      onClick={() => void criarCategoriaRapida()}
                    >
                      + Nova categoria
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Subcategoria (opcional)</label>
                  <select
                    className={fieldClassName}
                    value={editSubcategoriaId}
                    onChange={(e) => setEditSubcategoriaId(e.target.value ? Number(e.target.value) : "")}
                    disabled={salvandoClassificacao || !editCategoriaId}
                  >
                    <option value="">--</option>
                    {editSubcategorias.map((subcategoria) => (
                      <option key={subcategoria.id} value={subcategoria.id}>
                        {subcategoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  className={primaryButtonClassName}
                  onClick={() => void salvarClassificacaoProduto()}
                  disabled={salvandoClassificacao}
                >
                  {salvandoClassificacao ? "Salvando..." : "Salvar classificação"}
                </button>
              </div>
            </CafeCard>

            <CafeCard title="Preços por tabela">
              {precosError ? <p className="text-sm text-red-600">{precosError}</p> : null}
              {precosMessage ? <p className="text-sm text-emerald-700">{precosMessage}</p> : null}
              {tabelasPreco.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma tabela de preço cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {tabelasPreco.filter((t) => t.ativo).map((tabela) => {
                    const origem = precosOrigem[tabela.id];
                    const sugestao = origem === "fallback" ? precoFallback : null;
                    return (
                      <div key={tabela.id} className="grid gap-2 md:grid-cols-[2fr_1fr] items-center">
                        <div>
                          <div className="text-sm font-medium">
                            {tabela.nome} {tabela.is_default ? "(Default)" : ""}
                          </div>
                          <div className="text-xs text-slate-500">{tabela.codigo}</div>
                          {sugestao ? (
                            <div className="text-xs text-slate-500">Sugestão: fallback {sugestao}</div>
                          ) : null}
                        </div>
                        <input
                          className={compactFieldClassName}
                          value={precosTabela[tabela.id] ?? ""}
                          onChange={(e) => {
                            setPrecosTabela((prev) => ({ ...prev, [tabela.id]: e.target.value }));
                            setPrecosOrigem((prev) => ({ ...prev, [tabela.id]: "saved" }));
                          }}
                          placeholder="Preço (R$)"
                          disabled={precosLoading || precosSaving}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <button
                  className={primaryButtonClassName}
                  onClick={() => void salvarPrecos()}
                  disabled={precosLoading || precosSaving || tabelasPreco.length === 0}
                >
                  {precosSaving ? "Salvando..." : "Salvar preços"}
                </button>
              </div>
            </CafeCard>

            {selectedProduto.preparado ? (
              <CafeCard title="Receita e insumos">
                {receitaLoading ? <p className="text-sm text-slate-600">Carregando receita...</p> : null}
                <div className="mt-2 space-y-3">
                  {receitaItens.map((item, idx) => (
                    <div key={`${item.insumo_id}-${idx}`} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                      <select
                        className={compactFieldClassName}
                        value={item.insumo_id}
                        onChange={(e) => {
                          const insumoId = Number(e.target.value);
                          const insumo = insumoOptions.find((i) => i.id === insumoId);
                          setReceitaItens((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, insumo_id: insumoId, unidade: r.unidade || insumo?.unidade_base || "" } : r
                            )
                          );
                        }}
                      >
                        <option value={0}>Selecione o insumo...</option>
                        {insumoOptions.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        className={compactFieldClassName}
                        value={String(item.quantidade)}
                        onChange={(e) =>
                          setReceitaItens((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, quantidade: Number(e.target.value) || 0 } : r))
                          )
                        }
                        placeholder="Qtd"
                      />
                      <input
                        className={compactFieldClassName}
                        value={item.unidade}
                        onChange={(e) =>
                          setReceitaItens((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, unidade: e.target.value } : r))
                          )
                        }
                        placeholder="unidade"
                      />
                      <button
                        className="rounded-md border px-3 py-2 text-sm"
                        onClick={() => setReceitaItens((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    className={secondaryButtonClassName}
                    onClick={() => setReceitaItens((prev) => [...prev, { insumo_id: 0, quantidade: 0, unidade: "" }])}
                  >
                    Adicionar item
                  </button>
                  <button
                    className={primaryButtonClassName}
                    onClick={() => void salvarReceita()}
                  >
                    Salvar receita
                  </button>
                </div>
              </CafeCard>
            ) : null}

            <CafeCard title="Resumo">
              <CafePanel className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tabela principal</span>
                  <span className="font-medium">{tabelaDefault?.nome ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Preço principal</span>
                  <span className="font-medium">{precoDefault ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Preço fallback</span>
                  <span className="font-medium">{precoFallback ?? "-"}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Se uma tabela não tiver preço salvo, o sistema sugere o fallback do produto.
                </div>
              </CafePanel>
            </CafeCard>
          </div>
        ) : null}
      </div>
    </CafePageShell>
  );
}

