"use client";

import * as React from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type TierGrupo = {
  tier_grupo_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
};

type GrupoResponse = { grupos?: TierGrupo[]; error?: string };

function isString(v: unknown): v is string {
  return typeof v === "string";
}

export default function AdminConfigEscolaRegrasValorPage() {
  const [loading, setLoading] = React.useState(true);
  const [grupos, setGrupos] = React.useState<TierGrupo[]>([]);
  const [erro, setErro] = React.useState<string | null>(null);

  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const carregar = React.useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/escola/regras-valor/grupos", { method: "GET" });
      const json = (await res.json()) as GrupoResponse;
      if (!res.ok) throw new Error(json.error || "Falha ao carregar grupos.");
      setGrupos(json.grupos ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function criarGrupo() {
    if (!nome.trim()) {
      setErro("Informe o nome do grupo.");
      return;
    }
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/escola/regras-valor/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() ? descricao.trim() : null,
          ativo,
        }),
      });
      const json = (await res.json()) as { grupo?: TierGrupo; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao criar grupo.");
      setNome("");
      setDescricao("");
      setAtivo(true);
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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Regras de valor"
        description="Configure regras automaticas de precificacao (tiers) aplicadas no resolver."
        actions={
          <>
            <Link
              href="/admin/config/escola/regras-valor/politicas"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            >
              Politicas
            </Link>
            <Link
              href="/admin/config/escola/regras-valor/politicas-padrao"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            >
              Politica padrao
            </Link>
          </>
        }
      />

      <SectionCard title="Novo grupo" description="Ex.: Multiplas modalidades 2026.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do grupo"
            />
          </div>

          <div className="grid gap-1 md:col-span-2">
            <label className="text-sm font-medium">Descricao (opcional)</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Uso interno"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              id="ativo"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Ativo
          </label>
        </div>

        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        ) : null}

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => void criarGrupo()}
          >
            {saving ? "Salvando..." : "Criar grupo"}
          </button>
          <button
            className="rounded-md border px-4 py-2 text-sm"
            disabled={loading}
            onClick={() => void carregar()}
          >
            Recarregar
          </button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard
        title="Grupos cadastrados"
        actions={<span>{loading ? "Carregando..." : `${grupos.length} grupo(s)`}</span>}
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 text-left">ID</th>
                <th className="py-2 pr-3 text-left">Nome</th>
                <th className="py-2 pr-3 text-left">Ativo</th>
                <th className="py-2 pr-3 text-left">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const id = g.tier_grupo_id;
                return (
                  <tr key={String(id)} className="border-b">
                    <td className="py-2 pr-3">{String(id)}</td>
                    <td className="py-2 pr-3">{isString(g.nome) ? g.nome : "-"}</td>
                    <td className="py-2 pr-3">{g.ativo ? "Sim" : "Nao"}</td>
                    <td className="py-2 pr-3">
                      <Link className="underline" href={`/admin/config/escola/regras-valor/${String(id)}`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && grupos.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={4}>
                    Nenhum grupo cadastrado.
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
