"use client";

import { useEffect, useMemo, useState } from "react";

type WordmarkColor = "blue" | "red" | "orange" | "green" | "pink" | "violet";
type WordmarkSegment = { text: string; color: WordmarkColor };

type Settings = {
  id: number;
  system_name: string;
  logo_color_url: string | null;
  logo_white_url: string | null;
  logo_transparent_url: string | null;
  wordmark_segments: WordmarkSegment[];
};

const COLOR_OPTIONS: WordmarkColor[] = ["blue", "red", "orange", "green", "pink", "violet"];

export default function AdminSistemaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [systemName, setSystemName] = useState("Conectarte");
  const [segments, setSegments] = useState<WordmarkSegment[]>([
    { text: "Conect", color: "blue" },
    { text: "ar", color: "red" },
    { text: "t", color: "orange" },
    { text: "e", color: "green" },
  ]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/system-settings", { method: "GET" });
        const json = (await res.json()) as { settings?: Settings; error?: string };
        if (!res.ok || !json.settings) throw new Error(json.error ?? "Falha ao carregar.");

        setSettings(json.settings);
        setSystemName(json.settings.system_name);
        setSegments(json.settings.wordmark_segments);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const canSave = useMemo(() => {
    return systemName.trim().length > 0 && segments.length > 0 && segments.every((s) => s.text.trim().length > 0);
  }, [systemName, segments]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_name: systemName.trim(), wordmark_segments: segments }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar.");

      const reload = await fetch("/api/admin/system-settings", { method: "GET" });
      const rjson = (await reload.json()) as { settings?: Settings; error?: string };
      if (reload.ok && rjson.settings) setSettings(rjson.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (variant: "color" | "white" | "transparent", file: File) => {
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/admin/system-settings/logo?variant=${variant}`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { ok?: boolean; publicUrl?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha no upload.");

      const reload = await fetch("/api/admin/system-settings", { method: "GET" });
      const rjson = (await reload.json()) as { settings?: Settings; error?: string };
      if (reload.ok && rjson.settings) setSettings(rjson.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    }
  };

  const updateSeg = (idx: number, patch: Partial<WordmarkSegment>) => {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSeg = () => setSegments((p) => [...p, { text: "", color: "blue" }]);
  const removeSeg = (idx: number) => setSegments((p) => p.filter((_, i) => i !== idx));

  if (loading) return <div className="p-6">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Configuracao do Sistema</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aqui ficam os dados canonicos da marca do sistema: nome, logo (imagem) e logo escrita (wordmark).
          </p>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Nome oficial</h2>
          <div className="grid gap-2">
            <label className="text-sm text-slate-700">system_name (canonico)</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Conectarte"
            />
          </div>

          <h2 className="text-lg font-semibold mt-4">Logo escrita (wordmark)</h2>
          <p className="text-sm text-slate-600">
            Defina segmentos + cor para manter o padrao institucional da escrita.
          </p>

          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-7">
                  <label className="text-sm text-slate-700">Texto</label>
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    value={seg.text}
                    onChange={(e) => updateSeg(idx, { text: e.target.value })}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-sm text-slate-700">Cor</label>
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={seg.color}
                    onChange={(e) => updateSeg(idx, { color: e.target.value as WordmarkColor })}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <button className="w-full rounded-md border px-3 py-2" onClick={() => removeSeg(idx)}>
                    X
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-2" onClick={addSeg}>
              Adicionar segmento
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={!canSave || saving}
              onClick={onSave}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Logo imagem (upload/download)</h2>
          <p className="text-sm text-slate-600">
            Envie as variantes da logo para o Supabase Storage (bucket: system-branding). Se nao houver URL, usa
            fallback do repositorio.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {(["color", "white", "transparent"] as const).map((variant) => {
              const currentUrl =
                variant === "transparent"
                  ? settings?.logo_transparent_url
                  : variant === "white"
                  ? settings?.logo_white_url
                  : settings?.logo_color_url;

              return (
                <div key={variant} className="rounded-xl border p-4 space-y-2">
                  <div className="text-sm font-semibold">Variante: {variant}</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadLogo(variant, f);
                    }}
                  />
                  <div className="text-xs text-slate-600 break-all">
                    URL atual:{" "}
                    {currentUrl ? (
                      <a className="underline" href={currentUrl} target="_blank" rel="noreferrer">
                        abrir
                      </a>
                    ) : (
                      "— (usando fallback local)"
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

