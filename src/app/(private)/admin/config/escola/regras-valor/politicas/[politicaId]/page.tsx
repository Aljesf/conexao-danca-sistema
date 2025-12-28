"use client";

import * as React from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type PoliticaPreco = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function toInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export default function AdminConfigEscolaPoliticaPrecoPage(props: { params: { politicaId: string } }) {
  const politicaId = toInt(props.params.politicaId);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [politica, setPolitica] = React.useState<PoliticaPreco | null>(null);

  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);

  const carregar = React.useCallback(async () => {
    if (!politicaId) {
      setErro("ID invalido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/financeiro/politicas-preco", { method: "GET" });
      const json = (await res.json()) as { politicas?: PoliticaPreco[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao carregar politicas.");
      const found = (json.politicas ?? []).find((p) => Number(p.id) === politicaId) ?? null;
      setPolitica(found);
      setNome(found?.nome ?? "");
      setDescricao(found?.descricao ?? "");
      setAtivo(found?.ativo ?? true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [politicaId]);

  async function salvar() {
    if (!politicaId) return;
    if (!nome.trim()) {
      setErro("Informe o nome da politica.");
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/financeiro/politicas-preco/${politicaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() ? descricao.trim() : null,
          ativo,
        }),
      });
      const json = (await res.json()) as { politica?: PoliticaPreco; error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao atualizar politica.");
      setPolitica(json.politica ?? null);
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
        title={`Politica de preco ${politicaId ? `#${politicaId}` : ""}`}
        description="Edite o nome e status da politica."
        actions={
          <Link
            href="/admin/config/escola/regras-valor/politicas"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
          >
            Voltar
          </Link>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <SectionCard title="Dados da politica">
        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : politica ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Nome</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="grid gap-1 md:col-span-2">
              <label className="text-sm font-medium">Descricao</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Ativo
            </label>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Politica nao encontrada.</div>
        )}

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving || loading}
            onClick={() => void salvar()}
          >
            {saving ? "Salvando..." : "Salvar politica"}
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
    </div>
  );
}
