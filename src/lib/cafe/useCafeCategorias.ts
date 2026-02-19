"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CafeCategoriaComSub } from "@/types/cafeCategorias";

type State = {
  loading: boolean;
  error: string | null;
  categorias: CafeCategoriaComSub[];
};

type UseCafeCategoriasOptions = {
  includeInativas?: boolean;
};

type UseCafeCategoriasResult = State & {
  reload: () => Promise<void>;
};

export function useCafeCategorias(options?: UseCafeCategoriasOptions): UseCafeCategoriasResult {
  const [state, setState] = useState<State>({
    loading: true,
    error: null,
    categorias: [],
  });
  const includeInativas = options?.includeInativas === true;

  const reload = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const query = includeInativas ? "?include_inativas=1" : "";
      const response = await fetch(`/api/cafe/categorias${query}`, { method: "GET" });
      const payload = (await response.json().catch(() => ({}))) as {
        categorias?: CafeCategoriaComSub[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload?.error ?? "falha_ao_carregar");
      }

      setState({
        loading: false,
        error: null,
        categorias: Array.isArray(payload?.categorias) ? payload.categorias : [],
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "erro_desconhecido",
        categorias: [],
      });
    }
  }, [includeInativas]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(() => ({ ...state, reload }), [state, reload]);
}
