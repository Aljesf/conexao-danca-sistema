"use client";

import { useEffect, useMemo, useState } from "react";

type FeedItemKind = "PERIODO_LETIVO" | "INSTITUCIONAL" | "EVENTO_INTERNO";

type FeedItem = {
  kind: FeedItemKind;
  id: string;
  titulo: string;
  descricao?: string | null;
  dominio?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  inicio: string;
  fim: string | null;
  sem_aula?: boolean;
  ponto_facultativo?: boolean;
  em_avaliacao?: boolean;
  origem: { tipo: string; id: string };
};

type BirthdayItem = { id: number; nome: string; nascimento: string | null; foto_url: string | null };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function monthTitle(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

function dayTitle(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function isDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toDateOnly(s: string): string {
  return s.slice(0, 10);
}

function sameDay(a: string, dateISO: string): boolean {
  return toDateOnly(a) === dateISO;
}

export default function EscolaCalendarioDashboard() {
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [items, setItems] = useState<FeedItem[]>([]);
  const [birthdays, setBirthdays] = useState<BirthdayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = isoDate(firstDayOfMonth(cursor));
    const end = isoDate(lastDayOfMonth(cursor));
    return { start, end };
  }, [cursor]);

  const selectedISO = useMemo(() => isoDate(selectedDay), [selectedDay]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/calendario/feed?start=${range.start}&end=${range.end}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar feed do calendario");
        if (active) setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : "Erro inesperado");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [range.start, range.end]);

  useEffect(() => {
    let active = true;
    async function loadBirthdays() {
      try {
        const res = await fetch(`/api/calendario/aniversariantes?date=${selectedISO}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar aniversariantes");
        if (active) setBirthdays(Array.isArray(json.items) ? json.items : []);
      } catch {
        if (active) setBirthdays([]);
      }
    }
    void loadBirthdays();
    return () => {
      active = false;
    };
  }, [selectedISO]);

  const daysInMonth = useMemo(() => {
    const start = firstDayOfMonth(cursor);
    const end = lastDayOfMonth(cursor);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      days.push(d);
    }
    return days;
  }, [cursor]);

  const startWeekday = useMemo(() => {
    const d = firstDayOfMonth(cursor);
    return d.getDay();
  }, [cursor]);

  const itemsForSelectedDay = useMemo(() => {
    const dayISO = selectedISO;
    return items.filter((it) => sameDay(it.inicio, dayISO) || (isDateOnly(it.inicio) && it.inicio === dayISO));
  }, [items, selectedISO]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium capitalize">{monthTitle(cursor)}</h2>
            <p className="text-xs text-muted-foreground">
              {range.start}{" -> "}{range.end}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-md border text-sm"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              Mes anterior
            </button>
            <button
              className="px-3 py-2 rounded-md border text-sm"
              onClick={() => {
                const t = new Date();
                setCursor(t);
                setSelectedDay(t);
              }}
            >
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

        {loading && <p className="text-sm mt-3">Carregando...</p>}
        {err && <p className="text-sm mt-3 text-red-600">{err}</p>}

        {!loading && !err && (
          <div className="mt-4">
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((w) => (
                <div key={w} className="text-center">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {daysInMonth.map((d) => {
                const dayISO = isoDate(d);
                const hasItems = items.some((it) => sameDay(it.inicio, dayISO));
                const isSelected = dayISO === selectedISO;

                return (
                  <button
                    key={dayISO}
                    onClick={() => setSelectedDay(d)}
                    className={["rounded-md border p-2 text-left", isSelected ? "ring-2 ring-primary" : ""].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{d.getDate()}</div>
                      {hasItems ? <div className="text-[10px] text-muted-foreground">*</div> : null}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground truncate">
                      {hasItems ? "Com itens" : "-"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="text-base font-medium capitalize">Dia selecionado</h3>
          <p className="text-sm text-muted-foreground capitalize">{dayTitle(selectedDay)}</p>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-base font-medium">Aniversariantes do dia</h3>
          <div className="mt-3 space-y-2">
            {birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante hoje.</p>
            ) : (
              birthdays.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full border overflow-hidden bg-muted" />
                  <div className="text-sm">{p.nome}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-base font-medium">Eventos / Itens do dia</h3>
          <div className="mt-3 space-y-2">
            {itemsForSelectedDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item para este dia.</p>
            ) : (
              itemsForSelectedDay.map((it) => (
                <div key={`${it.kind}-${it.id}`} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{it.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.kind}
                    {it.dominio ? ` • ${it.dominio}/${it.categoria ?? "-"}/${it.subcategoria ?? "-"}` : ""}
                  </div>
                  {it.sem_aula ? <div className="mt-1 text-xs text-muted-foreground">Sem aula</div> : null}
                  {it.descricao ? <div className="mt-2 text-sm">{it.descricao}</div> : null}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <a className="px-3 py-2 rounded-md border text-sm" href="/escola/calendario/eventos-internos">
              Gerenciar eventos internos
            </a>
            <a className="px-3 py-2 rounded-md border text-sm" href="/escola/calendario/feriados">
              Gerenciar feriados
            </a>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="text-base font-medium">Grade (proximo passo)</h3>
          <p className="text-sm text-muted-foreground">
            A grade do dia sera exibida aqui na proxima iteracao, consumindo <code>/api/calendario/grade</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
