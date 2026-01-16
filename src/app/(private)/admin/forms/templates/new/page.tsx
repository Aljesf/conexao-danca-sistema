"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

export default function AdminFormsTemplatesNewPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/forms/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao: descricao ? descricao : null }),
      });
      const json = (await res.json()) as { data?: { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar template.");
      if (!json.data?.id) throw new Error("Template criado sem id.");
      router.push(`/admin/forms/templates/${json.data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Novo template"
        description="Cadastre um template base para organizar as perguntas."
        actions={
          <Link
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
            href="/admin/forms/templates"
          >
            Voltar
          </Link>
        }
      />

      {err ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <SectionCard title="Dados do template">
        <div className="grid grid-cols-1 gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Descricao</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
        </div>

        <ToolbarRow>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            onClick={onCreate}
            disabled={loading || !nome.trim()}
          >
            {loading ? "Criando..." : "Criar template"}
          </button>
        </ToolbarRow>
      </SectionCard>
    </div>
  );
}
