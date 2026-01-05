"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ApiOk = { ok: true; data: unknown };
type ApiErr = { ok: false; error: string; hint?: string | null };
type ApiResp = ApiOk | ApiErr;

export default function AdminDiagnosticoSchemaPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [resp, setResp] = useState<ApiResp | null>(null);

  const jsonText = useMemo(() => {
    if (!resp) return "";
    return JSON.stringify(resp, null, 2);
  }, [resp]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/internal/schema", { method: "GET" });
      const j = (await r.json()) as ApiResp;
      setResp(j);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      setResp({ ok: false, error: message });
    } finally {
      setLoading(false);
    }
  }, []);

  const copy = useCallback(async () => {
    if (!jsonText) return;
    await navigator.clipboard.writeText(jsonText);
  }, [jsonText]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Diagnostico — Schema (Documentos)</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot do schema e amostras (somente admin / server-side).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Recarregar
          </button>
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => void copy()}
            disabled={!jsonText}
          >
            Copiar JSON
          </button>
        </div>
      </div>
      <div className="rounded-md border bg-black text-white p-4 overflow-auto">
        {loading ? (
          <pre className="text-xs whitespace-pre-wrap">Carregando...</pre>
        ) : (
          <pre className="text-xs whitespace-pre-wrap">{jsonText}</pre>
        )}
      </div>
    </div>
  );
}
