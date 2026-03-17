"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeaderCard } from "@/components/layout/PageHeaderCard";
import SectionCard from "@/components/layout/SectionCard";
import { listContextoRouteConfigs, type SupportedContexto } from "@/lib/contexto-home";

type PreferenceItem = {
  contexto: string;
  rota_principal: string;
};

type ApiListResponse = {
  itens: PreferenceItem[];
};

type SaveState = {
  saving: boolean;
  message: string | null;
  error: string | null;
};

const CONTEXTOS = listContextoRouteConfigs();

export default function ContextosConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<SupportedContexto, string>>(() =>
    CONTEXTOS.reduce(
      (acc, item) => ({ ...acc, [item.contexto]: item.fallback }),
      {} as Record<SupportedContexto, string>,
    ),
  );
  const [saveState, setSaveState] = useState<Record<SupportedContexto, SaveState>>(() =>
    CONTEXTOS.reduce(
      (acc, item) => ({
        ...acc,
        [item.contexto]: { saving: false, message: null, error: null },
      }),
      {} as Record<SupportedContexto, SaveState>,
    ),
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/me/contexto-home", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as ApiListResponse | { detalhe?: string } | null;

        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "detalhe" in payload && payload.detalhe
              ? String(payload.detalhe)
              : "Falha ao carregar preferencias.",
          );
        }

        const incoming = new Map(
          ((payload as ApiListResponse | null)?.itens ?? []).map((item) => [item.contexto, item.rota_principal]),
        );

        setValues(
          CONTEXTOS.reduce(
            (acc, item) => ({
              ...acc,
              [item.contexto]: incoming.get(item.contexto) ?? item.fallback,
            }),
            {} as Record<SupportedContexto, string>,
          ),
        );
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Falha ao carregar preferencias.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  const contextsWithState = useMemo(
    () =>
      CONTEXTOS.map((contexto) => ({
        ...contexto,
        value: values[contexto.contexto] ?? contexto.fallback,
        state: saveState[contexto.contexto],
      })),
    [saveState, values],
  );

  async function handleSave(contexto: SupportedContexto) {
    const rotaPrincipal = values[contexto];
    setSaveState((current) => ({
      ...current,
      [contexto]: { saving: true, message: null, error: null },
    }));

    try {
      const response = await fetch("/api/me/contexto-home", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contexto,
          rota_principal: rotaPrincipal,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detalhe?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.detalhe || "Falha ao salvar preferencia.");
      }

      setSaveState((current) => ({
        ...current,
        [contexto]: { saving: false, message: "Preferencia salva.", error: null },
      }));
    } catch (saveError) {
      setSaveState((current) => ({
        ...current,
        [contexto]: {
          saving: false,
          message: null,
          error: saveError instanceof Error ? saveError.message : "Falha ao salvar preferencia.",
        },
      }));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeaderCard
        title="Contextos e paginas principais"
        subtitle="Defina para qual tela o sistema deve levar voce ao trocar o contexto superior. Essa preferencia e individual por usuario."
      />

      <SectionCard
        title="Preferencias por contexto"
        description="Cada contexto possui um conjunto de rotas validas. Ao trocar no seletor superior, o sistema resolve a home configurada para o seu usuario."
      >
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {CONTEXTOS.map((item) => (
              <div key={item.contexto} className="h-40 animate-pulse rounded-xl border bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contextsWithState.map((item) => (
              <div key={item.contexto} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.contexto}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">{item.label}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Rota atual configurada: <span className="font-medium">{item.value}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <label className="block text-sm font-medium text-slate-700" htmlFor={`rota-${item.contexto}`}>
                    Pagina principal
                  </label>
                  <select
                    id={`rota-${item.contexto}`}
                    value={item.value}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [item.contexto]: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300"
                  >
                    {item.routes.map((route) => (
                      <option key={route.rota} value={route.rota}>
                        {route.label} ({route.rota})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSave(item.contexto)}
                    disabled={item.state.saving}
                    className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {item.state.saving ? "Salvando..." : "Salvar"}
                  </button>
                  <div className="min-h-5 text-right text-xs">
                    {item.state.message ? <span className="text-emerald-600">{item.state.message}</span> : null}
                    {item.state.error ? <span className="text-rose-600">{item.state.error}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
