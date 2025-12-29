"use client";

import * as React from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type Plano = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type TierGrupo = {
  tier_grupo_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
};

type Tier = {
  tier_id: number;
  tier_grupo_id: number;
  politica_id: number | null;
  tabela_id: number | null;
  tabela_item_id: number | null;
  ajuste_tipo: "override" | "percentual" | "fixo" | null;
  ajuste_valor_centavos: number | null;
  ordem: number;
  valor_centavos: number | null;
  ativo: boolean;
  created_at: string | null;
};

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

type AjusteTipo = "override" | "percentual" | "fixo";

function toInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parsePositiveInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function parseInteger(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function formatReais(valorCentavos: number | null): string {
  if (valorCentavos === null) return "-";
  const valor = Number(valorCentavos);
  if (!Number.isFinite(valor)) return "-";
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  return `${sinal}R$ ${(abs / 100).toFixed(2)}`;
}

function formatTabelaLabel(tabela: MatriculaTabela | undefined, fallbackId?: number): string {
  if (!tabela) return fallbackId ? `Tabela #${fallbackId}` : "Tabela nao encontrada";
  const ano = tabela.ano_referencia ? ` (${tabela.ano_referencia})` : "";
  return `${tabela.titulo}${ano}`;
}

function formatItemLabel(item: TabelaItem | undefined, fallbackId?: number): string {
  if (!item) return fallbackId ? `Item #${fallbackId}` : "Item nao encontrado";
  const desc = item.descricao ? ` - ${item.descricao}` : "";
  return `${item.codigo_item}${desc}`;
}

function formatAjusteLabel(tipo: AjusteTipo | null, valor: number | null): string {
  if (!tipo || valor === null) return "-";
  if (tipo === "percentual") return `${valor}%`;
  return formatReais(valor);
}

export default function AdminConfigEscolaPlanoTiersPage(props: { params: Promise<{ id: string }> }) {
  const { id: idStr } = React.use(props.params);
  const planoId = toInt(idStr);

  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [plano, setPlano] = React.useState<Plano | null>(null);
  const [grupos, setGrupos] = React.useState<TierGrupo[]>([]);
  const [tabelas, setTabelas] = React.useState<MatriculaTabela[]>([]);
  const [tiers, setTiers] = React.useState<Tier[]>([]);
  const [saving, setSaving] = React.useState(false);

  const [grupoId, setGrupoId] = React.useState("");
  const [ordem, setOrdem] = React.useState("");
  const [tabelaId, setTabelaId] = React.useState("");
  const [itemId, setItemId] = React.useState("");
  const [ajusteTipo, setAjusteTipo] = React.useState<AjusteTipo>("override");
  const [ajusteValor, setAjusteValor] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);

  const [itens, setItens] = React.useState<TabelaItem[]>([]);
  const [itensLoading, setItensLoading] = React.useState(false);
  const [itensErro, setItensErro] = React.useState<string | null>(null);

  const carregarBase = React.useCallback(async () => {
    if (!planoId) {
      setErro("ID invalido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const [resPlanos, resGrupos, resTabelas] = await Promise.all([
        fetch("/api/admin/escola/regras-valor/planos", { method: "GET" }),
        fetch("/api/admin/escola/regras-valor/grupos", { method: "GET" }),
        fetch("/api/admin/financeiro/politicas-preco/tabelas", { method: "GET" }),
      ]);

      const jsonPlanos = (await resPlanos.json()) as { planos?: Plano[]; error?: string };
      if (!resPlanos.ok) throw new Error(jsonPlanos.error || "Falha ao carregar planos.");
      const found = (jsonPlanos.planos ?? []).find((p) => Number(p.id) === planoId) ?? null;
      setPlano(found);

      const jsonGrupos = (await resGrupos.json()) as { grupos?: TierGrupo[]; error?: string };
      if (!resGrupos.ok) throw new Error(jsonGrupos.error || "Falha ao carregar grupos.");
      const gruposList = jsonGrupos.grupos ?? [];
      setGrupos(gruposList);
      if (gruposList.length > 0) {
        setGrupoId((current) => (current ? current : String(gruposList[0].tier_grupo_id)));
      }

      const jsonTabelas = (await resTabelas.json()) as { tabelas?: MatriculaTabela[]; error?: string };
      if (!resTabelas.ok) throw new Error(jsonTabelas.error || "Falha ao carregar tabelas.");
      setTabelas(jsonTabelas.tabelas ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [planoId]);

  const carregarTiers = React.useCallback(async () => {
    if (!planoId) return;
    if (!grupoId) {
      setTiers([]);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(
        `/api/admin/escola/regras-valor/tiers?grupo_id=${grupoId}&politica_id=${planoId}`,
        { method: "GET" },
      );
      const json = (await res.json()) as { tiers?: Tier[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao carregar tiers.");
      setTiers(json.tiers ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [planoId, grupoId]);

  async function criarTier() {
    if (!planoId) return;

    const grupoNum = parsePositiveInt(grupoId);
    const ordemNum = parsePositiveInt(ordem);
    const tabelaNum = parsePositiveInt(tabelaId);
    const itemNum = parsePositiveInt(itemId);
    const ajusteNum = parseInteger(ajusteValor);

    if (!grupoNum) {
      setErro("Selecione o grupo.");
      return;
    }
    if (!ordemNum) {
      setErro("Informe a ordem do tier.");
      return;
    }
    if (!tabelaNum) {
      setErro("Selecione a tabela.");
      return;
    }
    if (!itemNum) {
      setErro("Selecione o item.");
      return;
    }
    if (ajusteNum === null) {
      setErro("Informe o ajuste (numero inteiro).");
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/escola/regras-valor/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_grupo_id: grupoNum,
          ordem: ordemNum,
          tabela_id: tabelaNum,
          tabela_item_id: itemNum,
          politica_id: planoId,
          ajuste_tipo: ajusteTipo,
          ajuste_valor_centavos: ajusteNum,
          ativo,
        }),
      });

      const json = (await res.json()) as { tier?: Tier; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao criar tier.");

      setOrdem("");
      setAjusteValor("");
      setAtivo(true);
      await carregarTiers();
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
    void carregarTiers();
  }, [carregarTiers]);

  React.useEffect(() => {
    let ativoFlag = true;

    async function loadItens() {
      if (!tabelaId) {
        setItens([]);
        setItemId("");
        setItensErro(null);
        setItensLoading(false);
        return;
      }

      try {
        setItensLoading(true);
        setItensErro(null);
        const res = await fetch(`/api/admin/financeiro/politicas-preco/tabelas/${tabelaId}/itens`, { method: "GET" });
        const json = (await res.json()) as { itens?: TabelaItem[]; error?: string };
        if (!res.ok) throw new Error(json.error || "Falha ao carregar itens da tabela.");
        if (!ativoFlag) return;
        setItens(json.itens ?? []);
        setItemId("");
      } catch (e) {
        if (ativoFlag) setItensErro(e instanceof Error ? e.message : "Erro inesperado.");
      } finally {
        if (ativoFlag) setItensLoading(false);
      }
    }

    void loadItens();
    return () => {
      ativoFlag = false;
    };
  }, [tabelaId]);

  const tabelaMap = React.useMemo(() => new Map(tabelas.map((t) => [t.id, t])), [tabelas]);
  const itemMap = React.useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  const selectedItemId = parsePositiveInt(itemId);
  const selectedItem = selectedItemId ? itemMap.get(selectedItemId) : undefined;
  const ajusteNum = parseInteger(ajusteValor);
  let previewFinal: number | null = null;
  if (selectedItem && ajusteNum !== null) {
    if (ajusteTipo === "override") previewFinal = ajusteNum;
    if (ajusteTipo === "fixo") previewFinal = selectedItem.valor_centavos + ajusteNum;
    if (ajusteTipo === "percentual") {
      previewFinal = Math.round(selectedItem.valor_centavos + (selectedItem.valor_centavos * ajusteNum) / 100);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Tiers do plano ${planoId ? `#${planoId}` : ""}`}
        description="Cadastre degraus por grupo, tabela e item para este plano."
        actions={
          <Link href="/admin/config/escola/regras-valor/planos" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">
            Voltar
          </Link>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <SectionCard title="Plano selecionado">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : plano ? (
          <div className="space-y-1 text-sm text-slate-700">
            <div>
              <span className="font-medium text-slate-900">Nome:</span> {plano.nome || "(sem nome)"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Descricao:</span> {plano.descricao || "-"}
            </div>
            <div>
              <span className="font-medium text-slate-900">Ativo:</span> {plano.ativo ? "Sim" : "Nao"}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Plano nao encontrado.</div>
        )}
      </SectionCard>

      <SectionCard title="Grupo de tiers">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Grupo</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione</option>
              {grupos.map((g) => (
                <option key={g.tier_grupo_id} value={String(g.tier_grupo_id)}>
                  {g.nome} {g.ativo ? "" : "(inativo)"}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-muted-foreground flex items-end">
            {grupoId ? "Tiers listados para o grupo selecionado." : "Selecione um grupo para listar os tiers."}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Novo tier" description="Informe escopo (tabela + item) e ajuste.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Ordem</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={ordem}
              onChange={(e) => setOrdem(e.target.value)}
              placeholder="1"
            />
          </div>

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
            {itensLoading ? <span className="text-xs text-muted-foreground">Carregando itens...</span> : null}
            {itensErro ? <span className="text-xs text-red-600">{itensErro}</span> : null}
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Tipo de ajuste</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={ajusteTipo}
              onChange={(e) => setAjusteTipo(e.target.value as AjusteTipo)}
            >
              <option value="override">Override</option>
              <option value="percentual">Percentual</option>
              <option value="fixo">Fixo</option>
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Ajuste</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={ajusteValor}
              onChange={(e) => setAjusteValor(e.target.value)}
              placeholder={ajusteTipo === "percentual" ? "-10" : "15000"}
            />
            <span className="text-xs text-muted-foreground">
              {ajusteTipo === "percentual" ? "Use inteiro (%)." : "Use centavos (inteiro)."}
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo
          </label>
        </div>

        <div className="text-xs text-muted-foreground">
          {selectedItem ? (
            <>
              Base: {formatReais(selectedItem.valor_centavos)} {"->"}{" "}
              {previewFinal === null ? "Informe o ajuste." : `Final: ${formatReais(previewFinal)}`}
            </>
          ) : (
            <>Selecione um item para ver o preview do ajuste.</>
          )}
        </div>

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void criarTier()}
          >
            {saving ? "Salvando..." : "Criar tier"}
          </button>
          <button className="rounded-md border px-4 py-2 text-sm" disabled={loading} onClick={() => void carregarTiers()}>
            Recarregar
          </button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard title="Tiers cadastrados" actions={<span>{loading ? "Carregando..." : `${tiers.length} tier(s)`}</span>}>
        {tiers.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum tier cadastrado.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left">ID</th>
                  <th className="py-2 pr-3 text-left">Ordem</th>
                  <th className="py-2 pr-3 text-left">Tabela</th>
                  <th className="py-2 pr-3 text-left">Item</th>
                  <th className="py-2 pr-3 text-left">Ajuste</th>
                  <th className="py-2 pr-3 text-left">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={String(t.tier_id)} className="border-b">
                    <td className="py-2 pr-3">{String(t.tier_id)}</td>
                    <td className="py-2 pr-3">{String(t.ordem)}</td>
                    <td className="py-2 pr-3">
                      {t.tabela_id ? formatTabelaLabel(tabelaMap.get(t.tabela_id), t.tabela_id) : "-"}
                    </td>
                    <td className="py-2 pr-3">
                      {t.tabela_item_id ? formatItemLabel(itemMap.get(t.tabela_item_id), t.tabela_item_id) : "-"}
                    </td>
                    <td className="py-2 pr-3">{formatAjusteLabel(t.ajuste_tipo, t.ajuste_valor_centavos)}</td>
                    <td className="py-2 pr-3">{t.ativo ? "Sim" : "Nao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
