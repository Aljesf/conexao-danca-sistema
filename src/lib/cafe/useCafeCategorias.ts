"use client";

import { useEffect, useMemo, useState } from "react";
import type { CafeCategoriaComSub } from "@/types/cafeCategorias";

type State = {
  loading: boolean;
  error: string | null;
  categorias: CafeCategoriaComSub[];
};

export function useCafeCategorias() {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    categorias: [],
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch("/api/cafe/categorias", { method: "GET" });
        const payload = (await response.json().catch(() => ({}))) as {
          categorias?: CafeCategoriaComSub[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload?.error ?? "falha_ao_carregar");
        }

        if (!alive) return;
        setState({
          loading: false,
          error: null,
          categorias: Array.isArray(payload?.categorias) ? payload.categorias : [],
        });
      } catch (error) {
        if (!alive) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "erro_desconhecido",
          categorias: [],
        });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => state, [state]);
}
