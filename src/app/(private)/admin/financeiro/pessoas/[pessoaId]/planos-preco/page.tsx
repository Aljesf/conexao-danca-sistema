"use client";

import * as React from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type Plano = { id: number; nome: string; ativo: boolean };

type Vinculo = {
  id: number;
  pessoa_id: number;
  politica_id: number;
  ativo: boolean;
  manual: boolean;
  motivo: string | null;
  justificativa: string | null;
  definida_em: string | null;
};

type ItemCoberto = { tabela_id: number; tabela_item_id: number };

function toInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export default function AdminFinanceiroPessoaPlanosPrecoPage(
  props: { params: Promise<{ pessoaId: string }> },
) {
  const { pessoaId: pessoaIdStr } = React.use(props.params);
  const pessoaId = toInt(pessoaIdStr);

  const [planos, setPlanos] = React.useState<Plano[]>([]);
  const [vinculos, setVinculos] = React.useState<Vinculo[]>([]);
  const [planoSel, setPlanoSel] = React.useState<string>("");
  const [itens, setItens] = React.useState<ItemCoberto[]>([]);

  const [manual, setManual] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");
  const [justificativa, setJustificativa] = React.useState("");

  const [erro, setErro] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const planoMap = React.useMemo(() => new Map(planos.map((p) => [p.id, p])), [planos]);

  const carregar = React.useCallback(async () => {
    if (!pessoaId) {
      setErro("pessoaId invalido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const [rPlanos, rVinc] = await Promise.all([
        fetch("/api/admin/financeiro/politicas-preco?ativo=true"),
        fetch(`/api/admin/financeiro/pessoas/${pessoaId}/planos-preco`),
      ]);

      const jPlanos = (await rPlanos.json()) as { politicas?: Plano[]; error?: string };
      if (!rPlanos.ok) throw new Error(jPlanos.error || "Falha ao carregar planos.");
      setPlanos((jPlanos.politicas ?? []).filter((p) => p.ativo));

      const jVinc = (await rVinc.json()) as { vinculos?: Vinculo[]; error?: string };
      if (!rVinc.ok) throw new Error(jVinc.error || "Falha ao carregar vinculos.");
      setVinculos((jVinc.vinculos ?? []).filter((x) => x.ativo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [pessoaId]);

  const carregarItensCobertos = React.useCallback(async (planoId: number) => {
    setItens([]);
    try {
      const res = await fetch(`/api/admin/financeiro/politicas-preco/${planoId}/itens-cobertos`);
      const json = (await res.json()) as { itens?: ItemCoberto[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao carregar itens cobertos.");
      setItens(json.itens ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }, []);

  async function aplicar() {
    if (!pessoaId) return;
    if (!planoSel) {
      setErro("Selecione um plano.");
      return;
    }
    if (manual && (!motivo.trim() || !justificativa.trim())) {
      setErro("Motivo e justificativa sao obrigatorios quando manual.");
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/financeiro/pessoas/${pessoaId}/planos-preco`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          politica_id: Number(planoSel),
          manual,
          motivo: motivo.trim() || null,
          justificativa: justificativa.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao aplicar plano.");
      setManual(false);
      setMotivo("");
      setJustificativa("");
      setPlanoSel("");
      setItens([]);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    void carregar();
  }, [carregar]);

  React.useEffect(() => {
    if (!planoSel) {
      setItens([]);
      return;
    }
    void carregarItensCobertos(Number(planoSel));
  }, [planoSel, carregarItensCobertos]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Planos de preco do aluno"
        description="Vincule o aluno a um plano. O plano define quais itens/tabelas ele cobre via tiers."
        actions={
          <Link
            href={`/pessoas/${pessoaIdStr}`}
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          >
            Voltar para a pessoa
          </Link>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <SectionCard title="Aplicar plano">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Plano</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={planoSel}
              onChange={(e) => setPlanoSel(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {planos.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome} [#{p.id}]
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm pt-6">
            <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            Aplicacao manual (exige motivo/justificativa)
          </label>

          {manual ? (
            <>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Motivo</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-sm font-medium">Justificativa</label>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        {itens.length > 0 ? (
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium mb-2">Itens cobertos pelo plano</div>
            <ul className="list-disc pl-5 space-y-1">
              {itens.map((x) => (
                <li key={`${x.tabela_id}:${x.tabela_item_id}`}>
                  Tabela #{x.tabela_id} - Item #{x.tabela_item_id}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ToolbarRow>
          <button
            className="rounded-md bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void aplicar()}
          >
            {saving ? "Aplicando..." : "Aplicar ao aluno"}
          </button>
          <button className="rounded-md border px-4 py-2 text-sm" disabled={loading} onClick={() => void carregar()}>
            Recarregar
          </button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Planos ativos"
        actions={<span>{loading ? "Carregando..." : `${vinculos.length} ativo(s)`}</span>}
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3">ID</th>
                <th className="text-left py-2 pr-3">Plano</th>
                <th className="text-left py-2 pr-3">Manual</th>
                <th className="text-left py-2 pr-3">Definida em</th>
              </tr>
            </thead>
            <tbody>
              {vinculos.map((v) => {
                const plano = planoMap.get(v.politica_id);
                return (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 pr-3">{v.id}</td>
                    <td className="py-2 pr-3">{plano ? plano.nome : `Plano #${v.politica_id}`}</td>
                    <td className="py-2 pr-3">{v.manual ? "Sim" : "Nao"}</td>
                    <td className="py-2 pr-3">{v.definida_em ?? "-"}</td>
                  </tr>
                );
              })}
              {!loading && vinculos.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={4}>
                    Nenhum plano ativo para este aluno.
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
