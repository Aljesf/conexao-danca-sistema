"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Produto = {
  id: number;
  nome: string;
  preco_venda_centavos: number;
  ativo: boolean;
};

type VendaItem = {
  produto_id: number;
  quantidade: number;
};

type VendaRow = {
  id: number;
  valor_total_centavos: number;
  forma_pagamento: string;
  status_pagamento: string;
  created_at: string;
};

function formatBRLFromCentavos(value: number): string {
  const val = (value || 0) / 100;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CafeVendasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itens, setItens] = useState<VendaItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<
    "PIX" | "DINHEIRO" | "CARTAO_CONEXAO_ALUNO" | "CARTAO_CONEXAO_COLABORADOR"
  >("PIX");
  const [pagadorId, setPagadorId] = useState("");
  const [consumidorId, setConsumidorId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [vendasRecentes, setVendasRecentes] = useState<VendaRow[]>([]);

  const produtoMap = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const totalCentavos = useMemo(() => {
    return itens.reduce((acc, item) => {
      const produto = produtoMap.get(item.produto_id);
      if (!produto) return acc;
      return acc + produto.preco_venda_centavos * item.quantidade;
    }, 0);
  }, [itens, produtoMap]);

  async function loadProdutos() {
    const res = await fetch("/api/cafe/produtos");
    const json = (await res.json()) as { data?: Produto[] };
    setProdutos((json.data ?? []).filter((p) => p.ativo));
  }

  async function loadVendas() {
    const res = await fetch("/api/cafe/vendas");
    const json = (await res.json()) as { data?: VendaRow[] };
    setVendasRecentes(json.data ?? []);
  }

  useEffect(() => {
    void loadProdutos();
    void loadVendas();
  }, []);

  function addProduto(produtoId: number) {
    setItens((prev) => {
      const existing = prev.find((i) => i.produto_id === produtoId);
      if (existing) {
        return prev.map((i) => (i.produto_id === produtoId ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...prev, { produto_id: produtoId, quantidade: 1 }];
    });
  }

  function updateQuantidade(produtoId: number, quantidade: number) {
    setItens((prev) =>
      prev
        .map((i) => (i.produto_id === produtoId ? { ...i, quantidade } : i))
        .filter((i) => i.quantidade > 0)
    );
  }

  async function registrarVenda() {
    setError(null);
    setMessage(null);

    if (itens.length === 0) {
      setError("Adicione ao menos um item.");
      return;
    }

    const payload = {
      forma_pagamento: formaPagamento,
      pagador_pessoa_id: pagadorId ? Number(pagadorId) : null,
      consumidor_pessoa_id: consumidorId ? Number(consumidorId) : null,
      observacoes: observacoes.trim() ? observacoes.trim() : null,
      itens,
    };

    const res = await fetch("/api/cafe/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as { data?: VendaRow; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Falha ao registrar venda.");
      return;
    }

    setItens([]);
    setObservacoes("");
    setPagadorId("");
    setConsumidorId("");
    setMessage(`Venda registrada (#${json.data?.id}).`);
    await loadVendas();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Ballet Café — Vendas"
        description="Frente de caixa simplificada para registrar vendas e pagamentos."
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

      <SectionCard title="Produtos">
        <div className="grid gap-2 md:grid-cols-3">
          {produtos.map((p) => (
            <button
              key={p.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => addProduto(p.id)}
            >
              <span>{p.nome}</span>
              <span className="text-slate-600">{formatBRLFromCentavos(p.preco_venda_centavos)}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Itens da venda">
        {itens.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum item adicionado.</div>
        ) : (
          <div className="space-y-3">
            {itens.map((item) => {
              const produto = produtoMap.get(item.produto_id);
              if (!produto) return null;
              return (
                <div key={item.produto_id} className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] items-center">
                  <div className="text-sm font-medium">{produto.nome}</div>
                  <input
                    className="rounded-md border p-2 text-sm"
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => updateQuantidade(item.produto_id, Number(e.target.value))}
                  />
                  <div className="text-sm text-right">
                    {formatBRLFromCentavos(produto.preco_venda_centavos * item.quantidade)}
                  </div>
                  <button
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={() => updateQuantidade(item.produto_id, 0)}
                  >
                    Remover
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4 text-right text-sm font-semibold">
          Total: {formatBRLFromCentavos(totalCentavos)}
        </div>
      </SectionCard>

      <SectionCard title="Pagamento">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Forma de pagamento</label>
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={formaPagamento}
              onChange={(e) =>
                setFormaPagamento(
                  e.target.value as "PIX" | "DINHEIRO" | "CARTAO_CONEXAO_ALUNO" | "CARTAO_CONEXAO_COLABORADOR"
                )
              }
            >
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">DINHEIRO</option>
              <option value="CARTAO_CONEXAO_ALUNO">CARTAO CONEXAO (ALUNO)</option>
              <option value="CARTAO_CONEXAO_COLABORADOR">CARTAO CONEXAO (COLAB)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Pagador pessoa_id (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={pagadorId}
              onChange={(e) => setPagadorId(e.target.value)}
              placeholder="ex: 123"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Consumidor pessoa_id (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={consumidorId}
              onChange={(e) => setConsumidorId(e.target.value)}
              placeholder="ex: 456"
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium">Observacoes</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            onClick={() => void registrarVenda()}
          >
            Registrar venda
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Vendas recentes">
        {vendasRecentes.length === 0 ? (
          <div className="text-sm text-slate-600">Sem vendas registradas.</div>
        ) : (
          <div className="space-y-2 text-sm">
            {vendasRecentes.slice(0, 10).map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  #{v.id} • {formatBRLFromCentavos(v.valor_total_centavos)}
                </div>
                <div className="text-slate-600">
                  {v.forma_pagamento} / {v.status_pagamento}
                </div>
                <div className="text-slate-500">{new Date(v.created_at).toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
