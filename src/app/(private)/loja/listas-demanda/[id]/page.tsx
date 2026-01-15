"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SectionCard from "@/components/layout/SectionCard";

type Lista = {
  id: number;
  titulo: string;
  contexto: string | null;
  status: "ATIVA" | "ENCERRADA";
  bloqueada: boolean;
};

type Item = {
  id: number;
  lista_id: number;
  produto_id: number | null;
  produto_variacao_id: number | null;
  descricao_livre: string | null;
  quantidade: number;
  observacoes: string | null;
};

export default function LojaListaDemandaDetalhePage() {
  const params = useParams<{ id: string }>();
  const listaId = Number(params.id);

  const [lista, setLista] = useState<Lista | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [produtoId, setProdutoId] = useState("");
  const [variacaoId, setVariacaoId] = useState("");
  const [descricaoLivre, setDescricaoLivre] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [observacoes, setObservacoes] = useState("");

  const podeEditar = useMemo(() => {
    if (!lista) return false;
    return lista.status === "ATIVA" && !lista.bloqueada;
  }, [lista]);

  async function carregar() {
    setErro(null);
    const r = await fetch(`/api/loja/listas-demanda/${listaId}`);
    const j = (await r.json()) as { data?: { lista: Lista; itens: Item[] }; error?: string };
    if (!r.ok) {
      setErro(j.error ?? "erro_ao_carregar");
      return;
    }
    setLista(j.data?.lista ?? null);
    setItens(j.data?.itens ?? []);
  }

  async function travarOuDestravar(bloqueada: boolean) {
    setErro(null);
    const r = await fetch(`/api/loja/listas-demanda/${listaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "BLOQUEAR", bloqueada }),
    });
    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok) {
      setErro(j.error ?? "erro_ao_atualizar");
      return;
    }
    await carregar();
  }

  async function encerrar() {
    setErro(null);
    const r = await fetch(`/api/loja/listas-demanda/${listaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao: "ENCERRAR" }),
    });
    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok) {
      setErro(j.error ?? "erro_ao_encerrar");
      return;
    }
    await carregar();
  }

  async function adicionarItem() {
    setErro(null);

    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      setErro("quantidade_invalida");
      return;
    }

    const body = {
      produto_id: produtoId ? Number(produtoId) : null,
      produto_variacao_id: variacaoId ? Number(variacaoId) : null,
      descricao_livre: descricaoLivre.trim().length ? descricaoLivre.trim() : null,
      quantidade: qtd,
      observacoes: observacoes.trim().length ? observacoes.trim() : null,
    };

    const r = await fetch(`/api/loja/listas-demanda/${listaId}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = (await r.json()) as { data?: { id: number }; error?: string };
    if (!r.ok) {
      setErro(j.error ?? "erro_ao_adicionar");
      return;
    }

    setProdutoId("");
    setVariacaoId("");
    setDescricaoLivre("");
    setQuantidade("1");
    setObservacoes("");

    await carregar();
  }

  useEffect(() => {
    if (!Number.isFinite(listaId) || listaId <= 0) return;
    void carregar();
  }, [listaId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionCard
          title={lista ? `Lista #${lista.id} - ${lista.titulo}` : "Lista de demanda"}
          subtitle="Voce pode travar (cadeado) para evitar novas inclusoes. Encerrar e definitivo."
        />

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-700">
              Status: <span className="font-semibold">{lista?.status ?? "-"}</span>{" "}
              {lista?.bloqueada ? "• 🔒 Travada" : lista ? "• Editavel" : ""}
            </div>

            <div className="flex gap-2">
              <button
                className="rounded-lg border px-4 py-2"
                onClick={() => void travarOuDestravar(!(lista?.bloqueada ?? false))}
                disabled={!lista || lista.status === "ENCERRADA"}
              >
                {lista?.bloqueada ? "Destravar" : "Travar"}
              </button>
              <button
                className="rounded-lg bg-black px-4 py-2 text-white"
                onClick={() => void encerrar()}
                disabled={!lista || lista.status === "ENCERRADA"}
              >
                Encerrar
              </button>
              <button className="rounded-lg border px-4 py-2" onClick={() => void carregar()}>
                Atualizar
              </button>
            </div>
          </div>

          {erro ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Adicionar item</div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Produto ID (opcional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                placeholder="Ex.: 123"
                disabled={!podeEditar}
              />
              <div className="text-xs text-slate-500">
                Neste MVP, informe o ID do produto (ou use descricao livre). Integracao com
                busca/combobox pode vir depois.
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Variacao ID (opcional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={variacaoId}
                onChange={(e) => setVariacaoId(e.target.value)}
                placeholder="Ex.: 456"
                disabled={!podeEditar}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm">Descricao livre (quando nao houver produto)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={descricaoLivre}
                onChange={(e) => setDescricaoLivre(e.target.value)}
                placeholder="Ex.: Perfume institucional para recepcao"
                disabled={!podeEditar}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Quantidade</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                disabled={!podeEditar}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Observacoes (opcional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: prioridade alta / evento"
                disabled={!podeEditar}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded-lg bg-black px-4 py-2 text-white"
              onClick={() => void adicionarItem()}
              disabled={!podeEditar}
            >
              Adicionar
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm font-semibold">Itens</div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-2 py-2 text-left">ID</th>
                  <th className="px-2 py-2 text-left">Produto</th>
                  <th className="px-2 py-2 text-left">Variacao</th>
                  <th className="px-2 py-2 text-left">Descricao</th>
                  <th className="px-2 py-2 text-right">Qtd</th>
                  <th className="px-2 py-2 text-left">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-slate-600">
                      Nenhum item.
                    </td>
                  </tr>
                ) : null}

                {itens.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-2">{it.id}</td>
                    <td className="px-2 py-2">{it.produto_id ?? "-"}</td>
                    <td className="px-2 py-2">{it.produto_variacao_id ?? "-"}</td>
                    <td className="px-2 py-2">{it.descricao_livre ?? "-"}</td>
                    <td className="px-2 py-2 text-right">{it.quantidade}</td>
                    <td className="px-2 py-2">{it.observacoes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">
            Observacao: edicao/remocao de itens pode ser adicionada depois. O essencial aqui e
            criar, travar e encerrar.
          </div>
        </div>
      </div>
    </div>
  );
}
