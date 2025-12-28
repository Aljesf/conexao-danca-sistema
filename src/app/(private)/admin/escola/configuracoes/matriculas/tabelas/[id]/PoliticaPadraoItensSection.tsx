"use client";

import * as React from "react";
import SectionCard from "@/components/layout/SectionCard";

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
  tabela_item_id: number;
  politica_id: number;
  politica?: PoliticaPreco | null;
};

type Props = {
  tabelaId: number;
  itens: TabelaItem[];
};

function formatItemLabel(item: TabelaItem): string {
  const desc = item.descricao ? ` - ${item.descricao}` : "";
  return `${item.codigo_item}${desc}`;
}

function formatPoliticaLabel(politica: PoliticaPreco | null | undefined): string {
  if (!politica) return "Sem politica";
  return politica.ativo ? politica.nome : `${politica.nome} (inativa)`;
}

export default function PoliticaPadraoItensSection({ tabelaId, itens }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<number | null>(null);

  const [politicas, setPoliticas] = React.useState<PoliticaPreco[]>([]);
  const [padroes, setPadroes] = React.useState<PoliticaPadrao[]>([]);
  const [selecao, setSelecao] = React.useState<Record<number, string>>({});

  const carregar = React.useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);
    try {
      const [resPoliticas, resPadroes] = await Promise.all([
        fetch("/api/admin/financeiro/politicas-preco", { method: "GET" }),
        fetch(`/api/admin/financeiro/politicas-preco-padroes?tabela_id=${tabelaId}`, { method: "GET" }),
      ]);

      const jsonPoliticas = (await resPoliticas.json()) as { politicas?: PoliticaPreco[]; error?: string };
      if (!resPoliticas.ok) throw new Error(jsonPoliticas.error || "Falha ao carregar politicas.");
      setPoliticas(jsonPoliticas.politicas ?? []);

      const jsonPadroes = (await resPadroes.json()) as { padroes?: PoliticaPadrao[]; error?: string };
      if (!resPadroes.ok) throw new Error(jsonPadroes.error || "Falha ao carregar politicas padrao.");
      const padroesData = jsonPadroes.padroes ?? [];
      setPadroes(padroesData);

      const padroesMap = new Map(padroesData.map((p) => [p.tabela_item_id, p]));
      const selecaoInicial: Record<number, string> = {};
      itens.forEach((item) => {
        const padrao = padroesMap.get(item.id);
        selecaoInicial[item.id] = padrao ? String(padrao.politica_id) : "";
      });
      setSelecao(selecaoInicial);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [tabelaId, itens]);

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar(itemId: number) {
    const politicaSelecionada = selecao[itemId];
    if (!politicaSelecionada) {
      setErro("Selecione uma politica valida.");
      return;
    }
    const politica = politicasMap.get(Number(politicaSelecionada));
    if (!politica || !politica.ativo) {
      setErro("Nao e permitido definir politica inativa como padrao.");
      return;
    }

    setSavingId(itemId);
    setErro(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/admin/financeiro/politicas-preco-padroes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tabela_id: tabelaId,
          tabela_item_id: itemId,
          politica_id: Number(politicaSelecionada),
        }),
      });
      const json = (await res.json()) as { padrao?: PoliticaPadrao; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao salvar politica padrao.");
      await carregar();
      setOkMsg("Politica padrao atualizada.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSavingId(null);
    }
  }

  const politicasMap = React.useMemo(() => new Map(politicas.map((p) => [p.id, p])), [politicas]);
  const padroesMap = React.useMemo(() => new Map(padroes.map((p) => [p.tabela_item_id, p])), [padroes]);

  return (
    <SectionCard
      title="Politica padrao por item"
      description="Defina a politica padrao aplicada a cada item desta tabela."
      actions={
        <button
          className="rounded-md border px-3 py-1 text-xs"
          type="button"
          disabled={loading}
          onClick={() => void carregar()}
        >
          Recarregar
        </button>
      }
    >
      {erro ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}
      {okMsg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {okMsg}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando politicas...</div>
      ) : itens.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum item cadastrado para esta tabela.</div>
      ) : politicas.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhuma politica cadastrada.</div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="hidden md:grid grid-cols-12 bg-muted px-3 py-2 text-xs font-medium">
            <div className="col-span-4">Item</div>
            <div className="col-span-3">Politica atual</div>
            <div className="col-span-3">Nova politica</div>
            <div className="col-span-2 text-right">Acao</div>
          </div>
          <div className="divide-y">
            {itens.map((item) => {
              const padrao = padroesMap.get(item.id);
              const politicaAtual = padrao?.politica ?? politicasMap.get(padrao?.politica_id ?? 0);
              const selecaoAtual = selecao[item.id] ?? "";

              return (
                <div key={item.id} className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-12 md:items-center">
                  <div className="md:col-span-4">
                    <div className="text-sm font-medium text-slate-900">{formatItemLabel(item)}</div>
                    <div className="text-xs text-muted-foreground">
                      ID {item.id} - {item.tipo_item} - {item.ativo ? "Ativo" : "Inativo"}
                    </div>
                  </div>

                  <div className="md:col-span-3 text-sm text-slate-700">{formatPoliticaLabel(politicaAtual)}</div>

                  <div className="md:col-span-3">
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      value={selecaoAtual}
                      onChange={(e) =>
                        setSelecao((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {politicas.map((politica) => (
                        <option key={politica.id} value={String(politica.id)} disabled={!politica.ativo}>
                          {politica.nome} {politica.ativo ? "" : "(inativa)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex justify-end">
                    <button
                      className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                      type="button"
                      disabled={savingId === item.id || !selecaoAtual}
                      onClick={() => void salvar(item.id)}
                    >
                      {savingId === item.id ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
