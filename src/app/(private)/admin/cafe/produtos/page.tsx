"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Insumo = {
  id: number;
  nome: string;
  unidade_base: string;
};

type Produto = {
  id: number;
  nome: string;
  categoria: string;
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

export default function CafeProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoPrecoBRL, setNovoPrecoBRL] = useState<string>("0,00");
  const [novoCategoria, setNovoCategoria] = useState("");
  const [novoUnidadeVenda, setNovoUnidadeVenda] = useState("un");
  const [novoPreparado, setNovoPreparado] = useState(true);
  const [novoInsumoDiretoId, setNovoInsumoDiretoId] = useState<string>("");

  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const selectedProduto = useMemo(() => {
    if (!Array.isArray(produtos)) return null;
    return produtos.find((p) => p.id === selectedProdutoId) ?? null;
  }, [produtos, selectedProdutoId]);

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
        console.warn("Falha ao carregar tabelas de preco:", json?.error);
        setTabelasPreco([]);
        setPrecosError("Falha ao carregar tabelas de preco.");
        return;
      }

      setTabelasPreco(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("Erro inesperado ao carregar tabelas de preco", err);
      setTabelasPreco([]);
      setPrecosError("Erro inesperado ao carregar tabelas de preco.");
    }
  }

  async function loadPrecos(produtoId: number) {
    setPrecosLoading(true);
    setPrecosError(null);
    try {
      const res = await fetch(`/api/cafe/produtos/${produtoId}/precos`);
      const json = (await res.json()) as { ok?: boolean; data?: PrecoProduto[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Falha ao carregar precos.");

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
      setPrecosError(err instanceof Error ? err.message : "Erro ao carregar precos.");
      setPrecosTabela({});
      setPrecosOrigem({});
    } finally {
      setPrecosLoading(false);
    }
  }

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
  }, [selectedProdutoId, tabelasPreco]);


  async function criarProduto() {
    setError(null);
    setMessage(null);
    if (!novoNome.trim()) {
      setError("Nome obrigatorio.");
      return;
    }
    const precoCentavos = parseBRLToCentavos(novoPrecoBRL);
    if (!Number.isFinite(precoCentavos) || precoCentavos < 0) {
      setError("Preco invalido.");
      return;
    }

    const insumoDiretoId = novoPreparado ? null : (novoInsumoDiretoId ? Number(novoInsumoDiretoId) : null);
    if (novoInsumoDiretoId && !Number.isFinite(insumoDiretoId)) {
      setError("Insumo direto invalido.");
      return;
    }

    const res = await fetch("/api/cafe/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoNome,
        categoria: novoCategoria,
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
    setNovoCategoria("");
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
      setError("Receita obrigatoria para produto preparado.");
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
        setPrecosError("Preco invalido.");
        return;
      }

      const res = await fetch(`/api/cafe/produtos/${selectedProdutoId}/precos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precos }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setPrecosError(json.error ?? "Falha ao salvar precos.");
        return;
      }

      setPrecosMessage("Precos atualizados.");
      await loadPrecos(selectedProdutoId);
    } catch (err) {
      setPrecosError(err instanceof Error ? err.message : "Erro ao salvar precos.");
    } finally {
      setPrecosSaving(false);
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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Admin \u2014 Ballet Café \u2014 Produtos"
        description="Cadastre produtos, defina preços em reais e configure receitas/insumos."
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <SectionCard title="Novo produto">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Preco fallback (R$)</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={novoPrecoBRL}
                  onChange={(e) => setNovoPrecoBRL(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Usado quando uma tabela nao possui preco definido.</p>
              </div>
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={novoCategoria}
                  onChange={(e) => setNovoCategoria(e.target.value)}
                  placeholder="GERAL"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unidade venda</label>
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={novoUnidadeVenda}
                  onChange={(e) => setNovoUnidadeVenda(e.target.value)}
                  placeholder="un"
                />
              </div>
              {!novoPreparado ? (
                <div>
                  <label className="text-sm font-medium">Insumo direto (opcional)</label>
                  <select
                    className="mt-1 w-full rounded-md border p-2"
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
                className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                onClick={() => void criarProduto()}
              >
                Criar produto
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Produtos cadastrados">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Nome</th>
                    <th className="px-2 py-2 text-left">Categoria</th>
                    <th className="px-2 py-2 text-right">Preco fallback</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => (
                    <tr
                      key={p.id}
                      className={
                        "border-t hover:bg-slate-50 cursor-pointer " + (selectedProdutoId === p.id ? "bg-slate-50" : "")
                      }
                      onClick={() => setSelectedProdutoId(p.id)}
                    >
                      <td className="px-2 py-2">{p.nome}</td>
                      <td className="px-2 py-2">{p.categoria}</td>
                      <td className="px-2 py-2 text-right">{formatBRLFromCentavos(p.preco_venda_centavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loading ? <p className="mt-3 text-sm text-slate-600">Carregando...</p> : null}
            </div>
          </SectionCard>
        </div>

        {selectedProduto ? (
          <div className="space-y-6">
            <SectionCard title="Precos por tabela">
              {precosError ? <p className="text-sm text-red-600">{precosError}</p> : null}
              {precosMessage ? <p className="text-sm text-emerald-700">{precosMessage}</p> : null}
              {tabelasPreco.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhuma tabela de preco cadastrada.</p>
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
                            <div className="text-xs text-slate-500">Sugestao: fallback {sugestao}</div>
                          ) : null}
                        </div>
                        <input
                          className="rounded-md border p-2 text-sm"
                          value={precosTabela[tabela.id] ?? ""}
                          onChange={(e) => {
                            setPrecosTabela((prev) => ({ ...prev, [tabela.id]: e.target.value }));
                            setPrecosOrigem((prev) => ({ ...prev, [tabela.id]: "saved" }));
                          }}
                          placeholder="Preco (R$)"
                          disabled={precosLoading || precosSaving}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={() => void salvarPrecos()}
                  disabled={precosLoading || precosSaving || tabelasPreco.length === 0}
                >
                  {precosSaving ? "Salvando..." : "Salvar precos"}
                </button>
              </div>
            </SectionCard>

            {selectedProduto.preparado ? (
              <SectionCard title="Receita / Insumos">
                {receitaLoading ? <p className="text-sm text-slate-600">Carregando receita...</p> : null}
                <div className="mt-2 space-y-3">
                  {receitaItens.map((item, idx) => (
                    <div key={`${item.insumo_id}-${idx}`} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
                      <select
                        className="rounded-md border p-2 text-sm"
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
                        <option value={0}>Selecione insumo...</option>
                        {insumoOptions.map((insumo) => (
                          <option key={insumo.id} value={insumo.id}>
                            {insumo.nome}
                          </option>
                        ))}
                      </select>
                      <input
                        className="rounded-md border p-2 text-sm"
                        value={String(item.quantidade)}
                        onChange={(e) =>
                          setReceitaItens((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, quantidade: Number(e.target.value) || 0 } : r))
                          )
                        }
                        placeholder="Qtd"
                      />
                      <input
                        className="rounded-md border p-2 text-sm"
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
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={() => setReceitaItens((prev) => [...prev, { insumo_id: 0, quantidade: 0, unidade: "" }])}
                  >
                    Adicionar item
                  </button>
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                    onClick={() => void salvarReceita()}
                  >
                    Salvar receita
                  </button>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Resumo">
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tabela default</span>
                  <span className="font-medium">{tabelaDefault?.nome ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Preco default</span>
                  <span className="font-medium">{precoDefault ?? "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Preco fallback</span>
                  <span className="font-medium">{precoFallback ?? "-"}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Se uma tabela nao tiver preco salvo, o sistema sugere o fallback do produto.
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
