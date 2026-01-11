"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StatusResp = {
  ok: boolean;
  error?: string;
  data?: {
    pessoa_id: number;
    is_aluno: boolean;
    curriculo_institucional_habilitado: boolean;
  };
};

export function PessoaCurriculoToggle({
  pessoaId,
  curriculoHref,
}: {
  pessoaId: number;
  curriculoHref: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAluno, setIsAluno] = useState(false);
  const [habilitado, setHabilitado] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escola/alunos/curriculos/status?pessoa_id=${pessoaId}`);
      const json = (await res.json()) as StatusResp;
      if (!json.ok) throw new Error(json.error ?? "Falha ao ler status do curriculo.");
      setIsAluno(Boolean(json.data?.is_aluno));
      setHabilitado(Boolean(json.data?.curriculo_institucional_habilitado));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao ler status do curriculo.");
    } finally {
      setLoading(false);
    }
  }

  async function habilitarEIr() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/escola/alunos/curriculos/habilitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          tipo_curriculo: "INSTITUCIONAL",
          habilitado: true,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Falha ao habilitar curriculo.");
      await load();
      window.location.href = curriculoHref;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao habilitar curriculo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, [pessoaId]);

  if (loading) {
    return (
      <button className="rounded-xl border px-3 py-2 text-sm opacity-60" disabled>
        Curriculo...
      </button>
    );
  }

  const podeAbrir = isAluno || habilitado;

  return (
    <div className="flex items-center gap-2">
      {podeAbrir ? (
        <Link href={curriculoHref} className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50">
          Abrir curriculo
        </Link>
      ) : (
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={() => void habilitarEIr()}
          disabled={saving}
          title="Habilita o curriculo institucional e abre a pagina de curriculo."
        >
          {saving ? "Habilitando..." : "Habilitar curriculo"}
        </button>
      )}

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
