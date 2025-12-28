"use client";

import * as React from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type MatriculaTabela = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
  referencia_id: number | null;
  produto_tipo: string;
};

type TabelaItem = {
  id: number;
  tabela_id: number;
  codigo_item: string;
  descricao: string | null;
  tipo_item: string;
  valor_centavos: number;
  ativo: boolean;
  ordem: number;
};

type PoliticaPreco = {
  id: number;
  nome: string;
  ativo: boolean;
};

type PoliticaPadrao = {
  id: number;
  tabela_id: number;
  tabela_item_id: number;
  politica_id: number;
  tabela?: MatriculaTabela | null;
  item?: TabelaItem | null;
  politica?: PoliticaPreco | null;
};

function formatTabela(tabela: MatriculaTabela | null | undefined): string {
  if (!tabela) return "Tabela nao encontrada";
  const ano = tabela.ano_referencia ? ` (${tabela.ano_referencia})` : "";
  return `${tabela.titulo}${ano}`;
}

function formatItem(item: TabelaItem | null | undefined): string {
  if (!item) return "Item nao encontrado";
  const desc = item.descricao ? ` - ${item.descricao}` : "";
  return `${item.codigo_item}${desc}`;
}

export default function AdminConfigEscolaPoliticaPadraoPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const [tabelas, setTabelas] = React.useState<MatriculaTabela[]>([]);
  const [itens, setItens] = React.useState<TabelaItem[]>([]);
  const [politicas, setPoliticas] = React.useState<PoliticaPreco[]>([]);
  const [padroes, setPadroes] = React.useState<PoliticaPadrao[]>([]);

  const [tabelaId, setTabelaId] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [politicaId, setPoliticaId] = React.useState("");

  const carregarBase = React.useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [resTabelas, resPoliticas, resPadroes] = await Promise.all([
        fetch("/api/admin/financeiro/politicas-preco/tabelas", { method: "GET" }),
        fetch("/api/admin/financeiro/politicas-preco", { method: "GET" }),
        fetch("/api/admin/financeiro/politicas-preco-padroes", { method: "GET" }),
      ]);

      const jsonTabelas = (await resTabelas.json()) as { tabelas?: MatriculaTabela[]; error?: string };
      if (!resTabelas.ok) throw new Error(jsonTabelas.error || "Falha ao carregar tabelas.");
      setTabelas(jsonTabelas.tabelas ?? []);

      const jsonPoliticas = (await resPoliticas.json()) as { politicas?: PoliticaPreco[]; error?: string };
      if (!resPoliticas.ok) throw new Error(jsonPoliticas.error || "Falha ao carregar politicas.");
      setPoliticas(jsonPoliticas.politicas ?? []);

      const jsonPadroes = (await resPadroes.json()) as { padroes?: PoliticaPadrao[]; error?: string };
      if (!resPadroes.ok) throw new Error(jsonPadroes.error || "Falha ao carregar politicas padrao.");
      setPadroes(jsonPadroes.padroes ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  const carregarItens = React.useCallback(async (id: string) => {
    if (!id) {
      setItens([]);
      setItemId("");
      return;
    }

    try {
      const res = await fetch(`/api/admin/financeiro/politicas-preco/tabelas/${id}/itens`, { method: "GET" });
      const json = (await res.json()) as { itens?: TabelaItem[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao carregar itens da tabela.");
      setItens(json.itens ?? []);
      setItemId("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }, []);

  async function salvarPadrao() {
    if (!tabelaId || !itemId || !politicaId) {
      setErro("Selecione tabela, item e politica.");
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/financeiro/politicas-preco-padroes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabela_id: Number(tabelaId),
          tabela_item_id: Number(itemId),
          politica_id: Number(politicaId),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao definir politica padrao.");
      await carregarBase();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    void carregarBase();
  }, [carregarBase]);

  React.useEffect(() => {
    void carregarItens(tabelaId);
  }, [tabelaId, carregarItens]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Politica padrao por tabela/item"
        description="Defina qual politica deve ser usada por padrao para cada item de tabela."
        actions={
          <>
            <Link
              href="/admin/config/escola/regras-valor"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            >
              Voltar
            </Link>
            <Link
              href="/admin/config/escola/regras-valor/politicas"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            >
              Politicas
            </Link>
          </>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <SectionCard title="Definir politica padrao">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Tabela</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={tabelaId}
              onChange={(e) => setTabelaId(e.target.value)}
            >
              <option value="">Selecione</option>
              {tabelas.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.titulo} {t.ano_referencia ? `(${t.ano_referencia})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Item</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={!tabelaId}
            >
              <option value="">Selecione</option>
              {itens.map((i) => (
                <option key={i.id} value={String(i.id)}>
                  {i.codigo_item}
                  {i.descricao ? ` - ${i.descricao}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Politica</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={politicaId}
              onChange={(e) => setPoliticaId(e.target.value)}
            >
              <option value="">Selecione</option>
              {politicas.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void salvarPadrao()}
          >
            {saving ? "Salvando..." : "Definir politica padrao"}
          </button>
          <button
            className="rounded-md border px-4 py-2 text-sm"
            disabled={loading}
            onClick={() => void carregarBase()}
          >
            Recarregar
          </button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard title="Politicas padrao cadastradas" actions={<span>{loading ? "Carregando..." : `${padroes.length} padrao(s)`}</span>}>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">Tabela</th>
                <th className="py-2 pr-3 text-left">Item</th>
                <th className="py-2 pr-3 text-left">Politica</th>
              </tr>
            </thead>
            <tbody>
              {padroes.map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className="py-2 pr-3">{formatTabela(p.tabela)}</td>
                  <td className="py-2 pr-3">{formatItem(p.item)}</td>
                  <td className="py-2 pr-3">{p.politica?.nome ?? "Politica nao encontrada"}</td>
                </tr>
              ))}
              {!loading && padroes.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={3}>
                    Nenhuma politica padrao cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
