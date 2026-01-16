"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="p-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Novo template</h1>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Nome</span>
          <input
            className="border rounded-lg px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Descricao</span>
          <textarea
            className="border rounded-lg px-3 py-2"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </label>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button
          className="px-3 py-2 rounded-lg border w-fit"
          onClick={onCreate}
          disabled={loading || !nome.trim()}
        >
          {loading ? "Criando..." : "Criar"}
        </button>
      </div>
    </div>
  );
}
