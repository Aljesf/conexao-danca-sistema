"use client";

import { useEffect, useMemo, useState } from "react";
import CafePanel from "@/components/cafe/CafePanel";
import { useCafeCategorias } from "@/lib/cafe/useCafeCategorias";

export type CafeCatalogoProduto = {
  id: number;
  nome: string;
  preco_venda_centavos: number;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
  categoria_nome?: string | null;
  subcategoria_nome?: string | null;
  unidade_venda?: string | null;
};

type ProdutoResponse = {
  data?: {
    items?: CafeCatalogoProduto[];
  };
  error?: string;
};

type CafeCatalogoProdutosProps = {
  onAddProduct: (produto: CafeCatalogoProduto) => void;
  quantitiesByProductId?: Record<number, number>;
  disabled?: boolean;
  searchPlaceholder?: string;
  helperText?: string;
  emptyText?: string;
  addLabel?: string;
  disabledText?: string;
};

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CafeCatalogoProdutos({
  onAddProduct,
  quantitiesByProductId = {},
  disabled = false,
  searchPlaceholder = "Nome do produto",
  helperText = "Use a busca como apoio, mas priorize os cards do catalogo para montar a operacao.",
  emptyText = "Nenhum produto encontrado para o filtro atual.",
  addLabel = "Adicionar",
  disabledText = "Edicao bloqueada nesta etapa. Os itens exibidos abaixo permanecem apenas como referencia.",
}: CafeCatalogoProdutosProps) {
  const { categorias, loading: categoriasLoading } = useCafeCategorias();
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(null);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtos, setProdutos] = useState<CafeCatalogoProduto[]>([]);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (categoriaId !== null || categorias.length === 0) return;
    setCategoriaId(categorias[0]?.id ?? null);
  }, [categorias, categoriaId]);

  const categoriaAtual = useMemo(
    () => categorias.find((item) => item.id === categoriaId) ?? null,
    [categorias, categoriaId],
  );

  const subcategorias = categoriaAtual?.subcategorias ?? [];

  useEffect(() => {
    const controller = new AbortController();

    async function carregarProdutos() {
      setProdutosLoading(true);
      setErro(null);
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "200" });
        if (buscaProduto.trim()) params.set("search", buscaProduto.trim());
        if (categoriaId) params.set("categoria_id", String(categoriaId));
        if (subcategoriaId) params.set("subcategoria_id", String(subcategoriaId));

        const response = await fetch(`/api/cafe/produtos?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as ProdutoResponse | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "falha_carregar_produtos");
        }

        setProdutos(Array.isArray(payload?.data?.items) ? payload.data.items : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setProdutos([]);
          setErro(error instanceof Error ? error.message : "falha_carregar_produtos");
        }
      } finally {
        if (!controller.signal.aborted) {
          setProdutosLoading(false);
        }
      }
    }

    void carregarProdutos();
    return () => controller.abort();
  }, [buscaProduto, categoriaId, subcategoriaId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Buscar produto</span>
          <input
            className="w-full rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c57f39] disabled:bg-slate-50"
            value={buscaProduto}
            onChange={(event) => setBuscaProduto(event.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
          />
        </label>

        <div className="rounded-2xl border border-[#eadfcd] bg-[#fff8ef] px-4 py-3 text-sm text-slate-600">
          {disabled ? disabledText : helperText}
        </div>
      </div>

      <CafePanel>
        <div className="flex flex-wrap gap-2">
          {categoriasLoading ? (
            <div className="text-sm text-slate-500">Carregando categorias...</div>
          ) : (
            categorias.map((categoria) => (
              <button
                key={categoria.id}
                type="button"
                onClick={() => {
                  setCategoriaId(categoria.id);
                  setSubcategoriaId(null);
                }}
                disabled={disabled}
                className={[
                  "rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60",
                  categoria.id === categoriaId
                    ? "border-[#9a3412] bg-[#9a3412] text-white"
                    : "border-[#e6d3b8] bg-white text-slate-700 hover:bg-[#fff8ef]",
                ].join(" ")}
              >
                {categoria.nome}
              </button>
            ))
          )}
        </div>

        {subcategorias.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubcategoriaId(null)}
              disabled={disabled}
              className={[
                "rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                subcategoriaId === null
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-[#e6d3b8] bg-white text-slate-700 hover:bg-[#fff8ef]",
              ].join(" ")}
            >
              Todas
            </button>
            {subcategorias.map((subcategoria) => (
              <button
                key={subcategoria.id}
                type="button"
                onClick={() => setSubcategoriaId(subcategoria.id)}
                disabled={disabled}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-60",
                  subcategoria.id === subcategoriaId
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-[#e6d3b8] bg-white text-slate-700 hover:bg-[#fff8ef]",
                ].join(" ")}
              >
                {subcategoria.nome}
              </button>
            ))}
          </div>
        ) : null}
      </CafePanel>

      {erro ? (
        <div className="rounded-[20px] border border-dashed border-[#eadfcd] px-4 py-12 text-center text-sm text-amber-700">
          {erro}
        </div>
      ) : produtosLoading ? (
        <div className="rounded-[20px] border border-dashed border-[#eadfcd] px-4 py-12 text-center text-sm text-slate-500">
          Carregando catalogo...
        </div>
      ) : produtos.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#eadfcd] px-4 py-12 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {produtos.map((produto) => {
            const quantidadeAtual = quantitiesByProductId[produto.id] ?? 0;

            return (
              <button
                key={produto.id}
                type="button"
                onClick={() => onAddProduct(produto)}
                disabled={disabled}
                className="group rounded-[22px] border border-[#eadfcd] bg-white p-4 text-left shadow-[0_14px_32px_-28px_rgba(148,91,31,0.4)] transition hover:-translate-y-0.5 hover:border-[#c57f39] hover:bg-[#fffaf4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9894d]">
                    {produto.subcategoria_nome ?? produto.categoria_nome ?? "Catalogo"}
                  </div>
                  {quantidadeAtual > 0 ? (
                    <span className="rounded-full border border-[#e6d3b8] bg-[#fff8ef] px-2.5 py-1 text-[11px] font-semibold text-[#8c6640]">
                      x{quantidadeAtual}
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 text-base font-semibold tracking-tight text-slate-950">{produto.nome}</div>
                <div className="mt-1 text-sm text-slate-500">{produto.unidade_venda ?? "un"}</div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="text-lg font-semibold text-[#9a3412]">{brl(produto.preco_venda_centavos)}</div>
                  <div className="rounded-full border border-[#eadfcd] px-3 py-1 text-xs text-slate-600 transition group-hover:border-[#c57f39]">
                    {addLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
