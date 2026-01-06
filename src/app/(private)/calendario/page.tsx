"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarItemKind = "PERIODO_LETIVO" | "INSTITUCIONAL" | "EVENTO_INTERNO";

type CalendarItem = {
  kind: CalendarItemKind;
  id: string;
  titulo: string;
  descricao?: string | null;

  dominio?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;

  // PERIODO_LETIVO/INSTITUCIONAL: YYYY-MM-DD
  // EVENTO_INTERNO: ISO datetime
  inicio: string;
  fim: string | null;

  sem_aula?: boolean;
  ponto_facultativo?: boolean;
  em_avaliacao?: boolean;

  origem: { tipo: string; id: string };
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatInicioFim(item: CalendarItem): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(item.inicio);

  if (isDateOnly) {
    const inicio = item.inicio;
    const fim = item.fim ? item.fim : null;
    return fim ? `${inicio} -> ${fim}` : inicio;
  }

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const ini = fmt.format(new Date(item.inicio));
  const fim = item.fim ? fmt.format(new Date(item.fim)) : null;
  return fim ? `${ini} -> ${fim}` : ini;
}

export default function CalendarioPage() {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = firstDayOfMonth(cursor);
    const end = lastDayOfMonth(cursor);
    return { start: toISODate(start), end: toISODate(end) };
  }, [cursor]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/calendario/feed?start=${range.start}&end=${range.end}`);
        const json = (await res.json()) as { items?: CalendarItem[]; error?: string };
        if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar calendario");
        if (active) setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [range.start, range.end]);

  const title = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    return fmt.format(cursor);
  }, [cursor]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            MVP: Periodo letivo, itens institucionais e eventos internos (com data/hora).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            Mes anterior
          </button>
          <button className="px-3 py-2 rounded-md border text-sm" onClick={() => setCursor(new Date())}>
            Hoje
          </button>
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Proximo mes
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium capitalize">{title}</h2>
          <div className="text-xs text-muted-foreground">
            {range.start}{" -> "}{range.end}
          </div>
        </div>

        {loading && <p className="text-sm mt-3">Carregando...</p>}
        {error && <p className="text-sm mt-3 text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-4 space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item no periodo.</p>
            )}

            {items.map((it) => (
              <div key={`${it.kind}-${it.id}`} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {it.titulo}{" "}
                      {it.em_avaliacao ? (
                        <span className="text-xs text-muted-foreground">(em avaliacao)</span>
                      ) : null}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {formatInicioFim(it)}
                      {it.sem_aula ? " • sem aula" : ""}
                      {it.ponto_facultativo ? " • ponto facultativo" : ""}
                    </div>

                    {(it.dominio || it.categoria || it.subcategoria) && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {it.dominio ?? "--"} / {it.categoria ?? "--"} / {it.subcategoria ?? "--"}
                      </div>
                    )}

                    {it.descricao ? <div className="mt-2 text-sm break-words">{it.descricao}</div> : null}
                  </div>

                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {it.kind}
                    <div className="mt-1">
                      origem: {it.origem.tipo}#{it.origem.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
