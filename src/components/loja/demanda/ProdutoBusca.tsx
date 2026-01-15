"use client";

import { useEffect, useMemo, useState } from "react";

type ProdutoItem = {
  id: number;
  nome: string;
  codigo: string | null;
};

type VariacaoItem = {
  id: number;
  produto_id: number;
  sku: string | null;
  cor_id: number | null;
  numeracao_id: number | null;
  tamanho_id: number | null;
  ativo?: boolean | null;
};

type ProdutoBuscaProps = {
  disabled?: boolean;
  onSelect: (payload: { produtoId: number | null; variacaoId: number | null }) => void;
};

export default function ProdutoBusca({ disabled, onSelect }: ProdutoBuscaProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProdutoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<ProdutoItem | null>(null);

  const [variacoes, setVariacoes] = useState<VariacaoItem[]>([]);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [variacoesLoading, setVariacoesLoading] = useState(false);

  const queryTrim = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (disabled) return;
    if (!queryTrim) {
      setItems([]);
      setErro(null);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch(`/api/loja/produtos/busca?q=${encodeURIComponent(queryTrim)}`);
        const json = (await res.json().catch(() => null)) as
          | { items?: ProdutoItem[]; error?: string }
          | null;

        if (!res.ok) {
          setErro(json?.error || "erro_ao_buscar");
          setItems([]);
          return;
        }

        setItems(json?.items ?? []);
      } catch (e) {
        setErro("erro_ao_buscar");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [queryTrim, disabled]);

  useEffect(() => {
    if (!selecionado) {
      setVariacoes([]);
      setVariacaoId(null);
      return;
    }

    const fetchVariacoes = async () => {
      setVariacoesLoading(true);
      try {
        const res = await fetch(`/api/loja/produtos/${selecionado.id}/variacoes`);
        const json = (await res.json().catch(() => null)) as
          | { items?: VariacaoItem[]; error?: string }
          | null;

        if (!res.ok) {
          setVariacoes([]);
          return;
        }

        setVariacoes(json?.items ?? []);
      } catch (e) {
        setVariacoes([]);
      } finally {
        setVariacoesLoading(false);
      }
    };

    void fetchVariacoes();
  }, [selecionado?.id]);

  function handleSelect(item: ProdutoItem) {
    setSelecionado(item);
    setItems([]);
    setVariacaoId(null);
    setQuery(item.codigo ? `${item.nome} (${item.codigo})` : item.nome);
    onSelect({ produtoId: item.id, variacaoId: null });
  }

  function handleVariacaoChange(value: string) {
    const nextId = value ? Number(value) : null;
    setVariacaoId(nextId);
    onSelect({ produtoId: selecionado?.id ?? null, variacaoId: nextId });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm">Produto</label>
      <input
        className="w-full rounded-lg border px-3 py-2"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelecionado(null);
          setVariacoes([]);
          setVariacaoId(null);
          onSelect({ produtoId: null, variacaoId: null });
        }}
        placeholder="Digite nome ou codigo do produto"
        disabled={disabled}
      />

      {loading ? <div className="text-xs text-slate-500">Carregando...</div> : null}
      {erro ? <div className="text-xs text-red-600">{erro}</div> : null}

      {items.length > 0 ? (
        <div className="rounded-lg border bg-white shadow-sm">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => handleSelect(item)}
              disabled={disabled}
            >
              <span className="font-medium">{item.nome}</span>
              <span className="text-xs text-slate-500">{item.codigo ?? "-"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selecionado ? (
        <div className="space-y-1">
          <label className="text-sm">Variacao (opcional)</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={variacaoId ? String(variacaoId) : ""}
            onChange={(e) => handleVariacaoChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">{variacoesLoading ? "Carregando..." : "Sem variacao"}</option>
            {variacoes.map((v) => (
              <option key={v.id} value={String(v.id)}>
                {v.sku ?? `VAR-${v.id}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
