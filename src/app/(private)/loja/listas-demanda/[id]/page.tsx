"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SectionCard, pillAccent, pillNeutral } from "@/components/ui/conexao-cards";
import ProdutoBusca from "@/components/loja/demanda/ProdutoBusca";
import PessoaBusca from "@/components/loja/demanda/PessoaBusca";

type Lista = {
  id: number;
  titulo: string;
  contexto: string | null;
  status: "ATIVA" | "ENCERRADA";
  bloqueada: boolean;
};

type ItemEnriquecido = {
  item: number;
  id: number;
  quantidade: number;
  observacoes: string | null;
  descricao_livre: string | null;
  produto: { id: number; nome: string; codigo: string | null } | null;
  variacao: { id: number; label: string | null; sku: string | null } | null;
  destinatario: { id: number; nome: string; cpf: string | null } | null;
  raw: {
    produto_id: number | null;
    produto_variacao_id: number | null;
    pessoa_id: number | null;
  };
};

type ResumoItem = {
  produto: string;
  variacao: string;
  quantidade: number;
};

export default function LojaListaDemandaDetalhePage() {
  const params = useParams();
  const listaId = Number(params.id);

  const [lista, setLista] = useState<Lista | null>(null);
  const [itens, setItens] = useState<ItemEnriquecido[]>([]);
  const [resumo, setResumo] = useState<ResumoItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [buscaKey, setBuscaKey] = useState(0);
  const [descricaoLivre, setDescricaoLivre] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("1");
  const [observacoes, setObservacoes] = useState<string>("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editQtd, setEditQtd] = useState<string>("1");
  const [editObs, setEditObs] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");

  const podeEditar = useMemo(() => {
    if (!lista) return false;
    return lista.status === "ATIVA" && !lista.bloqueada;
  }, [lista]);

  const totalItens = useMemo(() => {
    return (itens ?? []).reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0);
  }, [itens]);

  async function carregar() {
    setErro(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/loja/listas-demanda/${listaId}/detalhe`);
      const j = (await r.json()) as {
        lista?: Lista;
        itens?: ItemEnriquecido[];
        resumo?: ResumoItem[];
        error?: string;
      };
      if (!r.ok) {
        setErro(j.error ?? "erro_ao_carregar");
        return;
      }
      setLista(j.lista ?? null);
      setItens(j.itens ?? []);
      setResumo(j.resumo ?? []);
    } finally {
      setLoading(false);
    }
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

  async function removerItem(itemId: number) {
    setErro(null);
    const r = await fetch(`/api/loja/listas-demanda/${listaId}/itens/${itemId}`, { method: "DELETE" });
    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok || j.ok === false) return setErro(j.error ?? "erro_ao_remover");
    await carregar();
  }

  async function salvarEdicao(itemId: number) {
    setErro(null);
    const qtd = Number(editQtd);
    if (!Number.isFinite(qtd) || qtd <= 0) return setErro("quantidade_invalida");

    const body = {
      quantidade: qtd,
      observacoes: editObs.trim().length ? editObs.trim() : null,
      descricao_livre: editDesc.trim().length ? editDesc.trim() : null,
    };

    const r = await fetch(`/api/loja/listas-demanda/${listaId}/itens/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const j = (await r.json()) as { ok?: boolean; error?: string };
    if (!r.ok || j.ok === false) return setErro(j.error ?? "erro_ao_salvar");

    setEditandoId(null);
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
          subtitle="Organize itens e acompanhe o status da lista."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-sm text-slate-600">
              <div>
                Contexto: <span className="font-semibold">{lista?.contexto ?? "-"}</span>
              </div>
              <div>
                Status: <span className="font-semibold">{lista?.status ?? "-"}</span>
                {lista?.bloqueada ? " - Travada" : lista ? " - Editavel" : ""}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={pillNeutral}
                onClick={() => void travarOuDestravar(!(lista?.bloqueada ?? false))}
                disabled={!lista || lista.status === "ENCERRADA"}
              >
                {lista?.bloqueada ? "Destravar" : "Travar"}
              </button>
              <button
                className={pillAccent}
                onClick={() => void encerrar()}
                disabled={!lista || lista.status === "ENCERRADA"}
              >
                Encerrar
              </button>
              <button className={pillNeutral} onClick={() => void carregar()}>
                Atualizar
              </button>
            </div>
          </div>

          {erro ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          ) : null}

          {loading ? <div className="mt-3 text-sm text-slate-500">Carregando...</div> : null}
        </SectionCard>

        <SectionCard title="Adicionar item" subtitle="Selecione produto, variacao e destinatario quando houver.">
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
              <label className="text-sm">Descricao livre (quando nao houver produto)</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={descricaoLivre}
                onChange={(e) => setDescricaoLivre(e.target.value)}
                placeholder="Ex.: Perfume institucional para recepcao"
                disabled={!podeEditar}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Quantidade</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                disabled={!podeEditar}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Observacoes (opcional)</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex.: prioridade alta / evento"
                disabled={!podeEditar}
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              className={pillAccent}
              onClick={() => void adicionarItem()}
              disabled={!podeEditar}
            >
              Adicionar
            </button>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-2 py-2 text-left">Item</th>
                  <th className="px-2 py-2 text-left">Produto</th>
                  <th className="px-2 py-2 text-left">Variacao</th>
                  <th className="px-2 py-2 text-left">Destinatario</th>
                  <th className="px-2 py-2 text-right">Qtd</th>
                  <th className="px-2 py-2 text-left">Obs.</th>
                  <th className="px-2 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 py-4 text-slate-600">
                      Nenhum item.
                    </td>
                  </tr>
                ) : null}

                {itens.map((it) => {
                  const editando = editandoId === it.id;
                  const produtoLabel = it.produto?.nome ?? it.descricao_livre ?? "-";
                  const variacaoLabel = it.variacao?.label ?? "-";
                  const destinatarioLabel = it.destinatario?.nome ?? "-";
                  const obsLabel = it.observacoes ?? "-";

                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-2">{it.item}</td>
                      <td className="px-2 py-2">
                        <div>{produtoLabel}</div>
                        {editando ? (
                          <input
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Descricao livre"
                            disabled={!podeEditar}
                          />
                        ) : null}
                      </td>
                      <td className="px-2 py-2">{variacaoLabel}</td>
                      <td className="px-2 py-2">{destinatarioLabel}</td>
                      <td className="px-2 py-2 text-right">
                        {editando ? (
                          <input
                            className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-right text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            value={editQtd}
                            onChange={(e) => setEditQtd(e.target.value)}
                            disabled={!podeEditar}
                          />
                        ) : (
                          it.quantidade
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {editando ? (
                          <input
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                            value={editObs}
                            onChange={(e) => setEditObs(e.target.value)}
                            placeholder="Observacoes"
                            disabled={!podeEditar}
                          />
                        ) : (
                          obsLabel
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {editando ? (
                          <div className="flex justify-end gap-2">
                            <button className={pillNeutral} onClick={() => setEditandoId(null)}>
                              Cancelar
                            </button>
                            <button className={pillAccent} onClick={() => void salvarEdicao(it.id)}>
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              className={pillNeutral}
                              onClick={() => {
                                setEditandoId(it.id);
                                setEditQtd(String(it.quantidade));
                                setEditObs(it.observacoes ?? "");
                                setEditDesc(it.descricao_livre ?? "");
                              }}
                              disabled={!podeEditar}
                            >
                              Editar
                            </button>
                            <button
                              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              onClick={() => void removerItem(it.id)}
                              disabled={!podeEditar}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Resumo do pedido" subtitle="Totais agrupados por produto e variacao.">
          {resumo.length === 0 ? (
            <div className="text-sm text-slate-600">Sem itens para resumir.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Produto</th>
                    <th className="px-2 py-2 text-left">Variacao</th>
                    <th className="px-2 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r, idx) => (
                    <tr key={`${r.produto}-${r.variacao}-${idx}`} className="border-t">
                      <td className="px-2 py-2">{r.produto}</td>
                      <td className="px-2 py-2">{r.variacao}</td>
                      <td className="px-2 py-2 text-right">{r.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Total geral de itens"
          subtitle="Fechamento da lista"
          description="Soma de todas as quantidades adicionadas nesta lista de demanda."
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Quantidade total de itens</span>
            <span className="text-3xl font-semibold text-slate-900">{totalItens}</span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
