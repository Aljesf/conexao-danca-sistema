"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SectionCard from "@/components/layout/SectionCard";
import ProdutoBusca from "@/components/loja/demanda/ProdutoBusca";
import PessoaBusca from "@/components/loja/demanda/PessoaBusca";

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
  pessoa_id: number | null;
  descricao_livre: string | null;
  quantidade: number;
  observacoes: string | null;
};

export default function LojaListaDemandaDetalhePage() {
  const params = useParams();
  const listaId = Number(params.id);

  const [lista, setLista] = useState<Lista | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [buscaKey, setBuscaKey] = useState(0);
  const [descricaoLivre, setDescricaoLivre] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");
  const [observacoes, setObservacoes] = useState<string>("");

  const podeEditar = useMemo(() => {
    if (!lista) return false;
    return lista.status === "ATIVA" && !lista.bloqueada;
  }, [lista]);

  async function carregar() {
    setErro(null);
    const r = await fetch(`/api/loja/listas-demanda/${listaId}`);
    const j = (await r.json()) as { data?: { lista: Lista; itens: Item[] }; error?: string };
    if (!r.ok) return setErro(j.error ?? "erro_ao_carregar");
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
    if (!r.ok) return setErro(j.error ?? "erro_ao_atualizar");
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
    if (!r.ok) return setErro(j.error ?? "erro_ao_encerrar");
    await carregar();
  }

  async function adicionarItem() {
    setErro(null);

    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      return setErro("quantidade_invalida");
    }

    const body = {
      produto_id: produtoId,
      produto_variacao_id: variacaoId,
      pessoa_id: pessoaId,
      descricao_livre: descricaoLivre.trim().length ? descricaoLivre.trim() : null,
      quantidade: qtd,
      observacoes: observacoes.trim().length ? observacoes.trim() : null,
    };

    const r = await fetch(`/api/loja/listas-demanda/${listaId}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok || j.ok === false) return setErro(j.error ?? "erro_ao_adicionar");

    setProdutoId(null);
    setVariacaoId(null);
    setPessoaId(null);
    setBuscaKey((prev) => prev + 1);
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
          title={lista ? `Lista #${lista.id} — ${lista.titulo}` : "Lista de demanda"}
          subtitle="Você pode travar (cadeado) para evitar novas inclusões. Encerrar é definitivo."
        />

        <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="text-sm text-slate-700">
              Status:{" "}
              <span className="font-semibold">
                {lista?.status ?? "—"}
              </span>{" "}
              {lista?.bloqueada ? "• 🔒 Travada" : lista ? "• Editável" : ""}
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
            <div className="md:col-span-2 space-y-1">
              <ProdutoBusca
                key={`produto-busca-${buscaKey}`}
                disabled={!podeEditar}
                onSelect={(sel) => {
                  setProdutoId(sel.produtoId);
                  setVariacaoId(sel.variacaoId);
                }}
              />
              <div className="text-xs text-slate-500">
                Use a busca para selecionar produto e variacao. Ou descreva manualmente.
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <PessoaBusca
                key={`pessoa-busca-${buscaKey}`}
                disabled={!podeEditar}
                onSelect={(sel) => setPessoaId(sel.pessoaId)}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm">Descrição livre (quando não houver produto)</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={descricaoLivre}
                onChange={(e) => setDescricaoLivre(e.target.value)}
                placeholder="Ex.: Perfume institucional para recepção"
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
              <label className="text-sm">Observações (opcional)</label>
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
            <button className="rounded-lg bg-black px-4 py-2 text-white" onClick={() => void adicionarItem()} disabled={!podeEditar}>
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
                  <th className="px-2 py-2 text-left">Variação</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-right">Qtd</th>
                  <th className="px-2 py-2 text-left">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-4 text-slate-600">Nenhum item.</td>
                  </tr>
                ) : null}

                {itens.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-2">{it.id}</td>
                    <td className="px-2 py-2">{it.produto_id ?? "—"}</td>
                    <td className="px-2 py-2">{it.produto_variacao_id ?? "—"}</td>
                    <td className="px-2 py-2">{it.descricao_livre ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{it.quantidade}</td>
                    <td className="px-2 py-2">{it.observacoes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">
            Observação: edição/remoção de itens pode ser adicionada depois. O essencial aqui é criar, travar e encerrar.
          </div>
        </div>
      </div>
    </div>
  );
}

