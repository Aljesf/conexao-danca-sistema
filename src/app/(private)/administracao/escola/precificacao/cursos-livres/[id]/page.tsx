"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Tabela = {
  id: number;
  curso_livre_id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
};

type Item = {
  id: number;
  codigo: string;
  titulo: string;
  descricao: string | null;
  qtd_turmas: number | null;
  qtd_pessoas: number | null;
  valor_centavos: number;
  ordem: number;
  ativo: boolean;
};

function brl(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PrecificacaoCursoLivreDetalhe({ params }: { params: { id: string } }) {
  const tabelaId = Number(params.id);

  const [tabela, setTabela] = useState<Tabela | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [qtdTurmas, setQtdTurmas] = useState("");
  const [qtdPessoas, setQtdPessoas] = useState("");
  const [valor, setValor] = useState("");
  const [ordem, setOrdem] = useState("0");

  const canCreate = useMemo(() => codigo.trim() && titulo.trim() && Number(valor) > 0, [codigo, titulo, valor]);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/admin/escola/precificacao/cursos-livres/${tabelaId}`, { cache: "no-store" }),
          fetch(`/api/admin/escola/precificacao/cursos-livres/${tabelaId}/itens`, { cache: "no-store" }),
        ]);
        const j1 = (await r1.json()) as { tabela?: Tabela; error?: string; message?: string };
        const j2 = (await r2.json()) as { itens?: Item[]; error?: string; message?: string };

        if (!r1.ok) throw new Error(j1.message ?? j1.error ?? "Falha ao carregar tabela.");
        if (!r2.ok) throw new Error(j2.message ?? j2.error ?? "Falha ao listar itens.");

        setTabela(j1.tabela ?? null);
        setItens(j2.itens ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar.");
      }
    }

    if (Number.isFinite(tabelaId)) {
      void load();
    } else {
      setError("ID invalido.");
    }
  }, [tabelaId]);

  async function onCreateItem() {
    if (!canCreate) return;
    setError(null);

    const valorCentavos = Math.round(Number(valor) * 100);
    const body = {
      codigo,
      titulo,
      descricao: null as string | null,
      qtd_turmas: qtdTurmas ? Number(qtdTurmas) : null,
      qtd_pessoas: qtdPessoas ? Number(qtdPessoas) : null,
      valor_centavos: valorCentavos,
      ordem: ordem ? Number(ordem) : 0,
      ativo: true,
    };

    try {
      const res = await fetch(`/api/admin/escola/precificacao/cursos-livres/${tabelaId}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { id?: number; error?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Falha ao criar item.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar item.");
    }
  }

  async function onDeleteItem(itemId: number) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/escola/precificacao/cursos-livres/${tabelaId}/itens/${itemId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Falha ao remover item.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover item.");
    }
  }

  if (!tabela) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-rose-600">{error ?? "Tabela nao encontrada."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{tabela.titulo}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Tabela {tabela.ativo ? "ATIVA" : "inativa"} • Curso livre ID {tabela.curso_livre_id} • Ano{" "}
                {tabela.ano_referencia ?? "-"}
              </p>
            </div>
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href="/administracao/escola/precificacao/cursos-livres"
            >
              Voltar
            </Link>
          </div>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Adicionar tier</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ex.: INDIVIDUAL_1_TURMA (qtd_pessoas=1, qtd_turmas=1), INDIVIDUAL_2_TURMAS, COMBO_DUPLA_1_TURMA
            (qtd_pessoas=2).
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Codigo</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="INDIVIDUAL_1_TURMA"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Titulo</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="1 modalidade"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Qtd. turmas (opcional)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={qtdTurmas}
                onChange={(e) => setQtdTurmas(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Qtd. pessoas (opcional)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={qtdPessoas}
                onChange={(e) => setQtdPessoas(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="150.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Ordem</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={!canCreate}
              onClick={onCreateItem}
            >
              Criar tier
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Tiers cadastrados</h2>
          {itens.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhum tier cadastrado.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {itens.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <div className="font-semibold">
                      {i.titulo} — {brl(i.valor_centavos)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {i.codigo} • pessoas: {i.qtd_pessoas ?? "-"} • turmas: {i.qtd_turmas ?? "-"} • ordem: {i.ordem} •{" "}
                      {i.ativo ? "ativo" : "inativo"}
                    </div>
                  </div>
                  <button className="rounded-md border px-3 py-2 text-sm" onClick={() => onDeleteItem(i.id)}>
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
