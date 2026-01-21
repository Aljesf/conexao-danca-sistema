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

export default function CafeProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [novoPreco, setNovoPreco] = useState<string>("0");
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
    const res = await fetch("/api/cafe/tabelas-preco");
    const json = (await res.json()) as { ok?: boolean; data?: TabelaPreco[] };
    setTabelasPreco(Array.isArray(json?.data) ? json.data : []);
  }

  async function loadPrecos(produtoId: number) {
    setPrecosLoading(true);
    setError(null);
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
      for (const tabela of tabelasPreco) {
        if (!tabela.ativo) continue;
        const valor = map.has(tabela.id) ? map.get(tabela.id) : basePrice;
        next[tabela.id] = String(valor ?? 0);
      }
      setPrecosTabela(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar precos.");
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
    const preco = Number(novoPreco.replace(",", "."));
    if (!Number.isFinite(preco) || preco < 0) {
      setError("Preco invalido.");
      return;
    }

    const insumoDiretoId = novoInsumoDiretoId ? Number(novoInsumoDiretoId) : null;
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
        preco_venda_centavos: Math.round(preco),
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
    setNovoPreco("0");
    setNovoCategoria("");
    setNovoUnidadeVenda("un");
    setNovoPreparado(true);
    setNovoInsumoDiretoId("");
    setMessage("Produto criado.");
    await loadProdutos();
    if (json.data?.id) setSelectedProdutoId(json.data.id);
  }

  async function salvarProduto() {
    if (!selectedProduto) return;
    setError(null);
    setMessage(null);

    const payload = {
      nome: selectedProduto.nome,
      categoria: selectedProduto.categoria,
      unidade_venda: selectedProduto.unidade_venda,
      preco_venda_centavos: selectedProduto.preco_venda_centavos,
      preparado: selectedProduto.preparado,
      insumo_direto_id: selectedProduto.insumo_direto_id,
      ativo: selectedProduto.ativo,
    };

    const res = await fetch(`/api/cafe/produtos/${selectedProduto.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as { data?: Produto; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Falha ao salvar produto.");
      return;
    }

    setMessage("Produto atualizado.");
    await loadProdutos();
    if (json.data?.id) setSelectedProdutoId(json.data.id);
  }

  async function salvarReceita() {
    if (!selectedProdutoId) return;
    setError(null);
    setMessage(null);

    const itens = receitaItens.filter((i) => i.insumo_id && i.quantidade > 0 && i.unidade.trim());
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
    setError(null);
    setMessage(null);

    const precos = tabelasPreco
      .filter((t) => t.ativo)
      .map((t) => {
        const raw = precosTabela[t.id] ?? "";
        const value = raw.trim() === "" ? 0 : Number(raw);
        return {
          tabela_preco_id: t.id,
          preco_centavos: Math.round(value),
          ativo: true,
        };
      });

    if (precos.some((p) => !Number.isFinite(p.preco_centavos) || p.preco_centavos < 0)) {
      setError("Preco invalido.");
      return;
    }

    const res = await fetch(`/api/cafe/produtos/${selectedProdutoId}/precos`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precos }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Falha ao salvar precos.");
      return;
    }

    setMessage("Precos atualizados.");
    await loadPrecos(selectedProdutoId);
  }

  const insumoOptions = useMemo(() => insumos, [insumos]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Admin \u2014 Ballet Cafe \u2014 Produtos"
        description="Cadastre produtos, precos e configure receitas/insumos."
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

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
            <label className="text-sm font-medium">Preco (centavos)</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
            />
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
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={novoPreparado}
                onChange={(e) => setNovoPreparado(e.target.checked)}
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
                <th className="px-2 py-2 text-right">Preco</th>
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

      {selectedProduto ? (
        <SectionCard title={`Editar produto - ${selectedProduto.nome}`}>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={selectedProduto.nome}
                onChange={(e) =>
                  setProdutos((prev) =>
                    prev.map((p) => (p.id === selectedProduto.id ? { ...p, nome: e.target.value } : p))
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preco (centavos)</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={String(selectedProduto.preco_venda_centavos)}
                onChange={(e) =>
                  setProdutos((prev) =>
                    prev.map((p) =>
                      p.id === selectedProduto.id
                        ? { ...p, preco_venda_centavos: Number(e.target.value) || 0 }
                        : p
                    )
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={selectedProduto.categoria}
                onChange={(e) =>
                  setProdutos((prev) =>
                    prev.map((p) => (p.id === selectedProduto.id ? { ...p, categoria: e.target.value } : p))
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Unidade venda</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={selectedProduto.unidade_venda}
                onChange={(e) =>
                  setProdutos((prev) =>
                    prev.map((p) => (p.id === selectedProduto.id ? { ...p, unidade_venda: e.target.value } : p))
                  )
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Insumo direto</label>
              <select
                className="mt-1 w-full rounded-md border p-2"
                value={selectedProduto.insumo_direto_id ?? ""}
                onChange={(e) =>
                  setProdutos((prev) =>
                    prev.map((p) =>
                      p.id === selectedProduto.id
                        ? { ...p, insumo_direto_id: e.target.value ? Number(e.target.value) : null }
                        : p
                    )
                  )
                }
              >
                <option value="">--</option>
                {insumoOptions.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedProduto.preparado}
                  onChange={(e) =>
                    setProdutos((prev) =>
                      prev.map((p) => (p.id === selectedProduto.id ? { ...p, preparado: e.target.checked } : p))
                    )
                  }
                />
                Produto preparado
              </label>
            </div>
          </div>
          <div className="mt-4">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              onClick={() => void salvarProduto()}
            >
              Salvar produto
            </button>
          </div>
        </SectionCard>
      ) : null}

      {selectedProduto ? (
        <SectionCard title="Precos por tabela">
          {tabelasPreco.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma tabela de preco cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {tabelasPreco.filter((t) => t.ativo).map((tabela) => (
                <div key={tabela.id} className="grid gap-2 md:grid-cols-[2fr_1fr] items-center">
                  <div>
                    <div className="text-sm font-medium">
                      {tabela.nome} {tabela.is_default ? "(Default)" : ""}
                    </div>
                    <div className="text-xs text-slate-500">{tabela.codigo}</div>
                  </div>
                  <input
                    className="rounded-md border p-2 text-sm"
                    value={precosTabela[tabela.id] ?? ""}
                    onChange={(e) =>
                      setPrecosTabela((prev) => ({ ...prev, [tabela.id]: e.target.value }))
                    }
                    placeholder="Preco (centavos)"
                    disabled={precosLoading}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              onClick={() => void salvarPrecos()}
              disabled={precosLoading || tabelasPreco.length === 0}
            >
              {precosLoading ? "Carregando..." : "Salvar precos"}
            </button>
          </div>
        </SectionCard>
      ) : null}

      {selectedProduto ? (
        <SectionCard title="Receita/Composicao">
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
    </div>
  );
}
