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
  created_at?: string | null;
  updated_at?: string | null;
};

type PlanosResponse = { planos?: Plano[]; error?: string };

export default function AdminConfigEscolaPlanosPrecoPage() {
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [planos, setPlanos] = React.useState<Plano[]>([]);

  const [nome, setNome] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const carregar = React.useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/escola/regras-valor/planos", { method: "GET" });
      const json = (await res.json()) as PlanosResponse;
      if (!res.ok) throw new Error(json.error || "Falha ao carregar planos.");
      setPlanos(json.planos ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function criarPlano() {
    if (!nome.trim()) {
      setErro("Informe o nome do plano.");
      return;
    }

    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/escola/regras-valor/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() ? descricao.trim() : null,
          ativo,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Falha ao criar plano.");
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
        title="Planos de preco"
        description="Crie planos de preco e gerencie os degraus vinculados."
        actions={
          <Link href="/admin/config/escola/regras-valor" className="inline-flex items-center rounded-md border px-3 py-2 text-sm">
            Voltar
          </Link>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <SectionCard title="Novo plano">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Padrao 2026"
            />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <label className="text-sm font-medium">Descricao</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Uso interno"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Ativo
          </label>
        </div>

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving}
            onClick={() => void criarPlano()}
          >
            {saving ? "Salvando..." : "Criar plano"}
          </button>
          <button className="rounded-md border px-4 py-2 text-sm" disabled={loading} onClick={() => void carregar()}>
            Recarregar
          </button>
        </ToolbarRow>
      </SectionCard>

      <SectionCard title="Planos cadastrados" actions={<span>{loading ? "Carregando..." : `${planos.length} plano(s)`}</span>}>
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
              {planos.map((p) => (
                <tr key={String(p.id)} className="border-b">
                  <td className="py-2 pr-3">{String(p.id)}</td>
                  <td className="py-2 pr-3">{p.nome}</td>
                  <td className="py-2 pr-3">{p.ativo ? "Sim" : "Nao"}</td>
                  <td className="py-2 pr-3">
                    <Link className="underline" href={`/admin/config/escola/regras-valor/planos/${p.id}/tiers`}>
                      Editar degraus
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && planos.length === 0 ? (
                <tr>
                  <td className="py-4 text-muted-foreground" colSpan={4}>
                    Nenhum plano cadastrado.
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
