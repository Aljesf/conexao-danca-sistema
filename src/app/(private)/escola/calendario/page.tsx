"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type FeedItemKind = "PERIODO_LETIVO" | "FAIXA_LETIVA" | "INSTITUCIONAL" | "EVENTO_INTERNO";

type FeedItem = {
  kind: FeedItemKind;
  id: string;
  titulo: string;
  descricao?: string | null;
  dominio?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;
  inicio: string; // YYYY-MM-DD ou ISO datetime
  fim: string | null;
  sem_aula?: boolean;
  ponto_facultativo?: boolean;
  em_avaliacao?: boolean;
  origem: { tipo: string; id: string };
};

type BirthdayItem = { id: number; nome: string; nascimento: string | null; foto_url: string | null };

type SectionCardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

type StatCardTone = "slate" | "violet" | "amber" | "rose";

type StatCardProps = {
  label: string;
  value: ReactNode;
  description?: string;
  tone?: StatCardTone;
};

const WEEK_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const pillBase =
  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition md:text-xs";
const pillNeutral = `${pillBase} border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50`;
const pillAccent = `${pillBase} border-violet-100 bg-white/70 text-violet-700 hover:bg-violet-50`;

function SectionCard({
  title,
  subtitle,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {subtitle ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {subtitle}
            </p>
          ) : null}
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value, description, tone = "slate" }: StatCardProps) {
  const toneClass = {
    slate: "text-slate-900",
    violet: "text-violet-700",
    amber: "text-amber-700",
    rose: "text-rose-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
    </div>
  );
}

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
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d);
}

function toDateOnly(s: string): string {
  return s.slice(0, 10);
}

function isDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatItemTime(it: FeedItem): string {
  if (isDateOnly(it.inicio)) return it.inicio;
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const ini = fmt.format(new Date(it.inicio));
  const fim = it.fim ? fmt.format(new Date(it.fim)) : null;
  return fim ? `${ini} → ${fim}` : ini;
}

function groupCounts(items: FeedItem[]) {
  let institucionais = 0;
  let internos = 0;
  let semAula = 0;

  for (const it of items) {
    if (it.kind === "INSTITUCIONAL" || it.kind === "FAIXA_LETIVA") {
      institucionais += 1;
      if (it.sem_aula) semAula += 1;
    }
    if (it.kind === "EVENTO_INTERNO") internos += 1;
  }

  return { institucionais, internos, semAula };
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

  // carregar feed do mês
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/calendario/feed?start=${range.start}&end=${range.end}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar feed do calendário");
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

  // aniversariantes do dia selecionado
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

  const startWeekday = useMemo(() => firstDayOfMonth(cursor).getDay(), [cursor]);

  // index por dia (YYYY-MM-DD) -> itens
  const itemsByDay = useMemo(() => {
    const m = new Map<string, FeedItem[]>();
    for (const it of items) {
      const day = toDateOnly(it.inicio);
      const prev = m.get(day) ?? [];
      m.set(day, [...prev, it]);
    }
    return m;
  }, [items]);

  const itemsForSelectedDay = useMemo(() => itemsByDay.get(selectedISO) ?? [], [itemsByDay, selectedISO]);

  const monthCounts = useMemo(() => groupCounts(items), [items]);

  const todayISO = useMemo(() => isoDate(new Date()), []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Dashboard</p>
            <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">Calendário</h2>
            <p className="mt-1 text-sm text-slate-600">
              Um painel único para período letivo, eventos internos, feriados e organização do dia.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur">
              <span>Período</span>
              <span className="text-slate-400">•</span>
              <span>{range.start} → {range.end}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className={pillNeutral}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              Mês anterior
            </button>
            <button
              className={pillAccent}
              onClick={() => {
                const t = new Date();
                setCursor(t);
                setSelectedDay(t);
              }}
            >
              Hoje
            </button>
            <button
              className={pillNeutral}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              Próximo mês
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          label="Mês"
          value={<span className="capitalize">{monthTitle(cursor)}</span>}
          description={`${range.start} → ${range.end}`}
        />
        <StatCard
          label="Itens institucionais"
          value={monthCounts.institucionais}
          description="Feriados / regras / faixas"
          tone="amber"
        />
        <StatCard
          label="Eventos internos"
          value={monthCounts.internos}
          description="Reuniões, plantões, acolhimento"
          tone="violet"
        />
        <StatCard
          label="Dias sem aula"
          value={monthCounts.semAula}
          description="Marcados como sem aula"
          tone="rose"
        />
      </div>

      {loading ? (
        <SectionCard title="Carregando calendário" subtitle="Status" description="Buscando itens do mês selecionado.">
          <div className="text-sm text-muted-foreground">Carregando…</div>
        </SectionCard>
      ) : null}

      {err ? (
        <SectionCard
          title="Falha ao carregar"
          subtitle="Status"
          description="Não foi possível recuperar o feed do calendário."
          className="border-rose-200 bg-rose-50/70"
        >
          <div className="text-sm text-rose-700">{err}</div>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          title="Calendário mensal"
          subtitle={monthTitle(cursor)}
          description="Clique em um dia para ver o resumo e os eventos."
          actions={<div className="text-xs text-muted-foreground">Hoje: {todayISO}</div>}
          className="xl:col-span-2"
        >
          <div>
            <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground mb-2">
              {WEEK_LABELS.map((w, i) => (
                <div key={`${w}-${i}`} className="text-center">
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
                const its = itemsByDay.get(dayISO) ?? [];
                const has = its.length > 0;
                const isSelected = dayISO === selectedISO;

                const hasInterno = its.some((x) => x.kind === "EVENTO_INTERNO");
                const hasInstitucional = its.some((x) => x.kind === "INSTITUCIONAL" || x.kind === "FAIXA_LETIVA");
                const hasSemAula = its.some(
                  (x) => (x.kind === "INSTITUCIONAL" || x.kind === "FAIXA_LETIVA") && x.sem_aula
                );

                return (
                  <button
                    key={dayISO}
                    onClick={() => setSelectedDay(d)}
                    className={[
                      "rounded-2xl border border-slate-200/80 bg-white/90 p-2 text-left shadow-sm transition",
                      "hover:-translate-y-0.5 hover:bg-slate-50/80 hover:shadow",
                      isSelected ? "ring-2 ring-violet-400/70 bg-violet-50/60" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold text-slate-900">{d.getDate()}</div>
                      {has ? <div className="text-[10px] text-slate-400">{its.length}</div> : null}
                    </div>

                    <div className="mt-2 flex gap-1">
                      {hasSemAula ? <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> : null}
                      {!hasSemAula && hasInstitucional ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      ) : null}
                      {hasInterno ? <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> : null}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500 truncate">
                      {has ? its[0].titulo : "—"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> eventos internos
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> institucional
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> sem aula
              </span>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Dia selecionado" subtitle="Resumo">
            <div className="text-base font-semibold capitalize text-slate-900">{dayTitle(selectedDay)}</div>
            <div className="mt-2 text-xs text-slate-500">{itemsForSelectedDay.length} item(ns)</div>
          </SectionCard>

          <SectionCard
            title="Aniversariantes"
            subtitle="Do dia"
            actions={<span className="text-xs text-slate-400">{birthdays.length}</span>}
          >
            <div className="space-y-2">
              {birthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aniversariante hoje.</p>
              ) : (
                birthdays.map((p) => (
                  <div key={`birthday-${p.id}`} className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100/70" />
                    <div className="text-sm text-slate-700">{p.nome}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Eventos e itens do dia"
            subtitle="Agenda"
            actions={<span className="text-xs text-slate-400">{itemsForSelectedDay.length}</span>}
          >
            <div className="space-y-2">
              {itemsForSelectedDay.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item para este dia.</p>
              ) : (
                itemsForSelectedDay.map((it, idx) => (
                  <div key={`${it.kind}-${it.id}-${idx}`} className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">{it.titulo}</div>
                    <div className="text-xs text-slate-500">
                      {it.kind} • {formatItemTime(it)}
                    </div>
                    {it.dominio || it.categoria || it.subcategoria ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {it.dominio ?? "—"} / {it.categoria ?? "—"} / {it.subcategoria ?? "—"}
                      </div>
                    ) : null}
                    {it.sem_aula ? <div className="mt-1 text-xs text-rose-600">Sem aula</div> : null}
                    {it.descricao ? <div className="mt-2 text-sm text-slate-700">{it.descricao}</div> : null}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <a className={pillNeutral} href="/escola/calendario/eventos-internos">
                Gerenciar eventos internos
              </a>
              <a className={pillNeutral} href="/escola/calendario/feriados">
                Gerenciar feriados
              </a>
            </div>
          </SectionCard>

          <SectionCard title="Grade do dia" subtitle="Proxima iteracao">
            <p className="text-sm text-slate-600">
              Vamos integrar a grade do dia a partir da Grade de horarios (REGULAR).
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
