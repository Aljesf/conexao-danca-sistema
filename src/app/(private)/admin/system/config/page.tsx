"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type ConfigResponse = {
  data?: { public_base_url: string | null };
  error?: string;
};

export default function AdminSystemConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/system/config", { method: "GET" });
        const json = (await res.json()) as ConfigResponse;
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar configuracao.");
        setPublicBaseUrl(json.data?.public_base_url ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const canSave = useMemo(() => publicBaseUrl.trim().length > 0, [publicBaseUrl]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_base_url: publicBaseUrl }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar configuracao.");
      setMessage("Configuracao salva.");
      setPublicBaseUrl((prev) => prev.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Configuracoes do sistema"
        description="Defina parametros institucionais para links publicos."
      />

      <SectionCard
        title="Dominio publico (links)"
        description="Links de formularios publicos sempre usarao este dominio."
      >
        <div className="grid gap-3 max-w-xl">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">public_base_url</span>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={publicBaseUrl}
              onChange={(e) => setPublicBaseUrl(e.target.value)}
              placeholder="https://conexaodanca.art.br"
            />
          </label>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

          <div>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canSave || saving}
              onClick={onSave}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
