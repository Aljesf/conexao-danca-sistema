import Link from "next/link";
import { listarTurmas } from "@/lib/academico/turmasServer";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { formatarHorario } from "@/lib/turmas";
import type { Turma } from "@/types/turmas";

export const dynamic = "force-dynamic";

type SearchValue = string | string[] | undefined;
type SearchParams = {
  curso?: SearchValue;
  nivel?: SearchValue;
  status?: SearchValue;
  ano?: SearchValue;
  turno?: SearchValue;
  professor?: SearchValue;
  q?: SearchValue;
  agrupar?: SearchValue;
};

type SituacaoExecucao = "PREVISTA" | "PENDENTE" | "ABERTA" | "VALIDADA" | "NAO_REALIZADA";

type TurmaListItem = {
  turma: Turma;
  turmaId: number;
  professorPrincipal: string | null;
  execucao: ExecucaoTurmaCardSnapshot;
};

type ProximaOcorrencia = {
  data_aula: string;
  situacao: SituacaoExecucao;
};

type ExecucaoTurmaCardSnapshot = {
  total_previstas_periodo: number;
  total_validadas: number;
  total_abertas: number;
  total_pendentes: number;
  total_nao_realizadas: number;
  realizadaHoje: boolean;
  hasPendencia: boolean;
  proximaPrevista: ProximaOcorrencia | null;
  pendenciaMaisProxima: ProximaOcorrencia | null;
  ultimaRegistrada: ProximaOcorrencia | null;
};

type TurmaProfessorLookupRow = {
  turma_id: number;
  principal: boolean | null;
  ativo: boolean | null;
  data_inicio: string | null;
  colaborador?: {
    pessoa?: {
      nome?: string | null;
    } | null;
  } | null;
};

type AulaExecucaoLookupRow = {
  id: number;
  turma_id: number;
  data_aula: string;
  status_execucao: string | null;
  fechada_em: string | null;
};

function getFirstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function optionValues(items: TurmaListItem[], pick: (item: TurmaListItem) => string | null | undefined) {
  return [...new Set(items.map((item) => pick(item)).filter((value): value is string => Boolean(value && value.trim())))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function groupKeyFor(item: TurmaListItem, groupBy: string) {
  if (groupBy === "nivel") return item.turma.nivel ?? "Sem nivel";
  if (groupBy === "turno") return item.turma.turno ?? "Sem turno";
  return item.turma.curso ?? "Sem curso";
}

function badgeTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ATIVA" || normalized === "VALIDADA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "EM_PREPARACAO" || normalized === "PENDENTE" || normalized === "ABERTA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "NAO_REALIZADA" || normalized === "CANCELADA" || normalized === "ENCERRADA") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function padDate(date: Date) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toUtcDate(dateISO: string) {
  return new Date(`${dateISO}T00:00:00Z`);
}

function addDays(dateISO: string, days: number) {
  const date = toUtcDate(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return padDate(date);
}

function getDayOfWeekFromISO(dateISO: string) {
  return toUtcDate(dateISO).getUTCDay();
}

function normalizeWeekdayLabel(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function weekdayToNumber(value: string): number | null {
  const normalized = normalizeWeekdayLabel(value);
  const map = new Map<string, number>([
    ["DOM", 0],
    ["DOMINGO", 0],
    ["SUN", 0],
    ["SEG", 1],
    ["SEGUNDA", 1],
    ["MON", 1],
    ["TER", 2],
    ["TERCA", 2],
    ["TUE", 2],
    ["QUA", 3],
    ["QUARTA", 3],
    ["WED", 3],
    ["QUI", 4],
    ["QUINTA", 4],
    ["THU", 4],
    ["SEX", 5],
    ["SEXTA", 5],
    ["FRI", 5],
    ["SAB", 6],
    ["SABADO", 6],
    ["SAT", 6],
  ]);
  return map.get(normalized) ?? null;
}

function normalizeSituacao(statusExecucao: string | null | undefined, fechadaEm: string | null | undefined): SituacaoExecucao {
  const normalized = (statusExecucao ?? "").trim().toUpperCase();
  if (normalized === "VALIDADA" || normalized === "FECHADA" || Boolean(fechadaEm)) {
    return "VALIDADA";
  }
  if (normalized === "ABERTA") {
    return "ABERTA";
  }
  if (normalized === "NAO_REALIZADA") {
    return "NAO_REALIZADA";
  }
  return "PENDENTE";
}

function createExecucaoSnapshotFallback(): ExecucaoTurmaCardSnapshot {
  return {
    total_previstas_periodo: 0,
    total_validadas: 0,
    total_abertas: 0,
    total_pendentes: 0,
    total_nao_realizadas: 0,
    realizadaHoje: false,
    hasPendencia: false,
    proximaPrevista: null,
    pendenciaMaisProxima: null,
    ultimaRegistrada: null,
  };
}

function buildExpectedDates(turma: Turma, startISO: string, endISO: string) {
  const weekdays = Array.isArray(turma.dias_semana)
    ? turma.dias_semana.map(weekdayToNumber).filter((value): value is number => value != null)
    : [];

  if (weekdays.length === 0) {
    return [] as string[];
  }

  const occurrences: string[] = [];
  let cursor = startISO;
  while (cursor <= endISO) {
    if (weekdays.includes(getDayOfWeekFromISO(cursor))) {
      occurrences.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

async function carregarProfessoresPrincipaisMap(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  turmaIds: number[];
}) {
  if (params.turmaIds.length === 0) {
    return new Map<number, string | null>();
  }

  const { data, error } = await params.supabase
    .from("turma_professores")
    .select(
      `
        turma_id,
        principal,
        ativo,
        data_inicio,
        colaborador:colaboradores!turma_professores_colaborador_id_fkey (
          pessoa:pessoas!colaboradores_pessoa_id_fkey (
            nome
          )
        )
      `,
    )
    .in("turma_id", params.turmaIds)
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    console.error("[TurmasPage] Erro ao carregar professores principais:", error);
    return new Map<number, string | null>();
  }

  const grouped = new Map<number, TurmaProfessorLookupRow[]>();
  for (const row of (data ?? []) as TurmaProfessorLookupRow[]) {
    const turmaId = Number(row.turma_id);
    if (!Number.isFinite(turmaId) || turmaId <= 0) continue;
    const list = grouped.get(turmaId) ?? [];
    list.push(row);
    grouped.set(turmaId, list);
  }

  const result = new Map<number, string | null>();
  for (const turmaId of params.turmaIds) {
    const rows = grouped.get(turmaId) ?? [];
    const preferred =
      rows.find((row) => row.ativo && row.principal && row.colaborador?.pessoa?.nome?.trim()) ??
      rows.find((row) => row.ativo && row.colaborador?.pessoa?.nome?.trim()) ??
      rows.find((row) => row.colaborador?.pessoa?.nome?.trim()) ??
      null;

    result.set(turmaId, preferred?.colaborador?.pessoa?.nome?.trim() ?? null);
  }

  return result;
}

async function carregarExecucaoTurmasMap(params: {
  supabase: Awaited<ReturnType<typeof getSupabaseServer>>;
  turmas: Array<{ turma: Turma; turmaId: number }>;
}) {
  const turmaIds = params.turmas.map((item) => item.turmaId);
  const today = getTodayISO();
  const windowStart = addDays(today, -30);
  const windowEnd = addDays(today, 14);

  if (turmaIds.length === 0) {
    return new Map<number, ExecucaoTurmaCardSnapshot>();
  }

  const { data, error } = await params.supabase
    .from("turma_aulas")
    .select("id,turma_id,data_aula,status_execucao,fechada_em")
    .in("turma_id", turmaIds)
    .gte("data_aula", windowStart)
    .lte("data_aula", windowEnd)
    .order("data_aula", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("[TurmasPage] Erro ao carregar snapshot de execucao:", error);
    return new Map(turmaIds.map((turmaId) => [turmaId, createExecucaoSnapshotFallback()]));
  }

  const aulasPorTurma = new Map<number, AulaExecucaoLookupRow[]>();
  for (const row of (data ?? []) as AulaExecucaoLookupRow[]) {
    const turmaId = Number(row.turma_id);
    if (!Number.isFinite(turmaId) || turmaId <= 0) continue;
    const list = aulasPorTurma.get(turmaId) ?? [];
    list.push(row);
    aulasPorTurma.set(turmaId, list);
  }

  const result = new Map<number, ExecucaoTurmaCardSnapshot>();

  for (const item of params.turmas) {
    const aulas = aulasPorTurma.get(item.turmaId) ?? [];
    const latestByDate = new Map<string, AulaExecucaoLookupRow>();
    for (const aula of aulas) {
      if (!latestByDate.has(aula.data_aula)) {
        latestByDate.set(aula.data_aula, aula);
      }
    }

    const expectedDates = buildExpectedDates(item.turma, windowStart, windowEnd);
    const expectedSet = new Set(expectedDates);
    const ocorrencias = expectedDates.map((dataAula) => {
      const aula = latestByDate.get(dataAula);
      return {
        data_aula: dataAula,
        situacao: aula
          ? normalizeSituacao(aula.status_execucao, aula.fechada_em)
          : dataAula > today
            ? "PREVISTA"
            : dataAula === today
              ? "PENDENTE"
              : "NAO_REALIZADA",
      } satisfies ProximaOcorrencia;
    });

    for (const aula of aulas) {
      if (expectedSet.has(aula.data_aula)) continue;
      ocorrencias.push({
        data_aula: aula.data_aula,
        situacao: normalizeSituacao(aula.status_execucao, aula.fechada_em),
      });
    }

    ocorrencias.sort((a, b) => a.data_aula.localeCompare(b.data_aula));

    const total_validadas = ocorrencias.filter((itemExecucao) => itemExecucao.situacao === "VALIDADA").length;
    const total_abertas = ocorrencias.filter((itemExecucao) => itemExecucao.situacao === "ABERTA").length;
    const total_pendentes = ocorrencias.filter((itemExecucao) => itemExecucao.situacao === "PENDENTE").length;
    const total_nao_realizadas = ocorrencias.filter((itemExecucao) => itemExecucao.situacao === "NAO_REALIZADA").length;
    const pendencias = ocorrencias.filter((itemExecucao) =>
      itemExecucao.situacao === "ABERTA" ||
      itemExecucao.situacao === "PENDENTE" ||
      itemExecucao.situacao === "NAO_REALIZADA",
    );
    const pendenciasPassadas = [...pendencias]
      .filter((itemExecucao) => itemExecucao.data_aula <= today)
      .sort((a, b) => b.data_aula.localeCompare(a.data_aula));
    const pendenciasFuturas = pendencias
      .filter((itemExecucao) => itemExecucao.data_aula > today)
      .sort((a, b) => a.data_aula.localeCompare(b.data_aula));
    const ultimaRegistradaRaw = aulas[0] ?? null;

    result.set(item.turmaId, {
      total_previstas_periodo: ocorrencias.length,
      total_validadas,
      total_abertas,
      total_pendentes,
      total_nao_realizadas,
      realizadaHoje: ocorrencias.some(
        (itemExecucao) => itemExecucao.data_aula === today && itemExecucao.situacao === "VALIDADA",
      ),
      hasPendencia: pendencias.length > 0,
      proximaPrevista:
        ocorrencias.find((itemExecucao) => itemExecucao.data_aula >= today) ?? null,
      pendenciaMaisProxima: pendenciasPassadas[0] ?? pendenciasFuturas[0] ?? null,
      ultimaRegistrada: ultimaRegistradaRaw
        ? {
          data_aula: ultimaRegistradaRaw.data_aula,
          situacao: normalizeSituacao(ultimaRegistradaRaw.status_execucao, ultimaRegistradaRaw.fechada_em),
        }
        : null,
    });
  }

  return result;
}

export default async function TurmasPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = (await props.searchParams) ?? {};
  const [turmas, supabase] = await Promise.all([listarTurmas(), getSupabaseServer()]);

  const turmasBase = turmas
    .map((turma) => ({
      turma,
      turmaId: Number(turma.turma_id ?? turma.id ?? 0),
    }))
    .filter((item) => Number.isFinite(item.turmaId) && item.turmaId > 0);

  const turmaIds = turmasBase.map((item) => item.turmaId);
  const [professoresMap, execucaoMap] = await Promise.all([
    carregarProfessoresPrincipaisMap({
      supabase,
      turmaIds,
    }),
    carregarExecucaoTurmasMap({
      supabase,
      turmas: turmasBase,
    }),
  ]);

  const enriched = turmasBase.map(({ turma, turmaId }) => ({
    turma,
    turmaId,
    professorPrincipal: professoresMap.get(turmaId) ?? null,
    execucao: execucaoMap.get(turmaId) ?? createExecucaoSnapshotFallback(),
  })) satisfies TurmaListItem[];

  const filters = {
    curso: getFirstValue(searchParams.curso),
    nivel: getFirstValue(searchParams.nivel),
    status: getFirstValue(searchParams.status),
    ano: getFirstValue(searchParams.ano),
    turno: getFirstValue(searchParams.turno),
    professor: getFirstValue(searchParams.professor),
    q: getFirstValue(searchParams.q),
    agrupar: getFirstValue(searchParams.agrupar) || "curso",
  };

  const filtered = enriched.filter((item) => {
    const matchesCurso = !filters.curso || (item.turma.curso ?? "") === filters.curso;
    const matchesNivel = !filters.nivel || (item.turma.nivel ?? "") === filters.nivel;
    const matchesStatus = !filters.status || (item.turma.status ?? "") === filters.status;
    const matchesAno = !filters.ano || String(item.turma.ano_referencia ?? "") === filters.ano;
    const matchesTurno = !filters.turno || (item.turma.turno ?? "") === filters.turno;
    const matchesProfessor = !filters.professor || (item.professorPrincipal ?? "") === filters.professor;
    const haystack = normalizeText(
      [
        item.turma.nome,
        item.turma.curso,
        item.turma.nivel,
        item.turma.turno,
        item.professorPrincipal,
        item.turma.espaco?.nome,
        item.turma.espaco?.local?.nome,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const matchesBusca = !filters.q || haystack.includes(normalizeText(filters.q));

    return (
      matchesCurso &&
      matchesNivel &&
      matchesStatus &&
      matchesAno &&
      matchesTurno &&
      matchesProfessor &&
      matchesBusca
    );
  });

  const summary = {
    total: filtered.length,
    ativas: filtered.filter((item) => (item.turma.status ?? "").toUpperCase() === "ATIVA").length,
    preparacao: filtered.filter((item) => (item.turma.status ?? "").toUpperCase() === "EM_PREPARACAO").length,
    pendencia: filtered.filter((item) => item.execucao.hasPendencia).length,
    realizadasHoje: filtered.filter((item) => item.execucao.realizadaHoje).length,
  };

  const groups = new Map<string, TurmaListItem[]>();
  for (const item of filtered) {
    const key = groupKeyFor(item, filters.agrupar);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  const groupedEntries = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

  const cursos = optionValues(enriched, (item) => item.turma.curso);
  const niveis = optionValues(enriched, (item) => item.turma.nivel);
  const statuses = optionValues(enriched, (item) => item.turma.status);
  const anos = optionValues(enriched, (item) =>
    item.turma.ano_referencia != null ? String(item.turma.ano_referencia) : null,
  );
  const turnos = optionValues(enriched, (item) => item.turma.turno);
  const professores = optionValues(enriched, (item) => item.professorPrincipal);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white/95 px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Turmas</h1>
              <p className="mt-1 text-sm text-slate-500">
                Painel operacional com filtros e snapshot recente da execucao das aulas, sem bloquear a navegacao com consolidacao profunda por turma.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/escola/diario-de-classe"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Abrir diario
              </Link>
              <Link
                href="/escola/academico/turmas/nova"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              >
                + Nova turma
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
            <p className="text-xs text-slate-500">turmas no filtro atual</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Ativas</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">{summary.ativas}</p>
            <p className="text-xs text-emerald-700">turmas em operacao</p>
          </div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50/70 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Preparacao</p>
            <p className="mt-2 text-2xl font-semibold text-sky-900">{summary.preparacao}</p>
            <p className="text-xs text-sky-700">em configuracao</p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Pendencias</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">{summary.pendencia}</p>
            <p className="text-xs text-amber-700">com aula/frequencia em aberto</p>
          </div>
          <div className="rounded-3xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Hoje</p>
            <p className="mt-2 text-2xl font-semibold text-violet-900">{summary.realizadasHoje}</p>
            <p className="text-xs text-violet-700">turmas com aula validada hoje</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Buscar turma, curso, sala, professor..."
              className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
            />
            <select name="curso" defaultValue={filters.curso} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Curso</option>
              {cursos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="nivel" defaultValue={filters.nivel} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Nivel</option>
              {niveis.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={filters.status} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Status</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="ano" defaultValue={filters.ano} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Ano letivo</option>
              {anos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="turno" defaultValue={filters.turno} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Turno</option>
              {turnos.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="professor" defaultValue={filters.professor} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="">Professor</option>
              {professores.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="agrupar" defaultValue={filters.agrupar} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900">
              <option value="curso">Agrupar por curso</option>
              <option value="nivel">Agrupar por nivel</option>
              <option value="turno">Agrupar por turno</option>
            </select>
            <div className="xl:col-span-8 flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Aplicar filtros
              </button>
              <Link
                href="/escola/academico/turmas"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Limpar
              </Link>
            </div>
          </form>
        </section>

        {filtered.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
            <p className="text-sm text-slate-500">Nenhuma turma encontrada para os filtros informados.</p>
          </section>
        ) : (
          <div className="space-y-6">
            {groupedEntries.map(([groupLabel, items]) => (
              <section key={groupLabel} className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Agrupamento</p>
                    <h2 className="text-xl font-semibold text-slate-900">{groupLabel}</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {items.length} turma(s)
                  </span>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {items.map((item) => {
                    const turma = item.turma;
                    const diasTexto = Array.isArray(turma.dias_semana)
                      ? turma.dias_semana.join(", ")
                      : turma.dias_semana ?? "Dias nao definidos";
                    const proxima = item.execucao.proximaPrevista;
                    const pendencia = item.execucao.pendenciaMaisProxima;
                    const ultimaRegistrada = item.execucao.ultimaRegistrada;
                    const statusTurma = turma.status ?? "Sem status";

                    return (
                      <article key={item.turmaId} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {turma.nome ?? turma.nome_turma ?? `Turma #${item.turmaId}`}
                              </h3>
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTone(statusTurma)}`}>
                                {statusTurma}
                              </span>
                              {item.execucao.hasPendencia ? (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                  Pendencia operacional
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-500">
                              {[turma.curso, turma.nivel, turma.turno].filter(Boolean).join(" | ") || "Sem classificacao"}
                            </p>
                            <div className="grid gap-1 text-sm text-slate-600">
                              <div>Professor principal: {item.professorPrincipal ?? "Nao vinculado"}</div>
                              <div>Local: {turma.espaco?.local?.nome ?? "--"} | Espaco: {turma.espaco?.nome ?? "--"}</div>
                              <div>Grade: {diasTexto} | {formatarHorario(turma)}</div>
                            </div>
                          </div>

                          <div className="grid gap-2 text-xs text-slate-600 md:min-w-[260px]">
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="font-semibold text-slate-900">Execucao recente</div>
                              <div className="mt-1">
                                {item.execucao.total_validadas} validadas / {item.execucao.total_previstas_periodo} previstas no recorte
                              </div>
                              <div className="mt-1">
                                {item.execucao.total_abertas} abertas | {item.execucao.total_pendentes} pendentes | {item.execucao.total_nao_realizadas} nao realizadas
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="font-semibold text-slate-900">Proxima prevista</div>
                              <div className="mt-1">
                                {proxima ? `${formatDate(proxima.data_aula)} | ${proxima.situacao}` : "Sem previsao no recorte"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="font-semibold text-slate-900">Lacuna mais proxima</div>
                              <div className="mt-1">
                                {pendencia ? `${formatDate(pendencia.data_aula)} | ${pendencia.situacao}` : "Nenhuma pendencia"}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                              <div className="font-semibold text-slate-900">Ultimo registro</div>
                              <div className="mt-1">
                                {ultimaRegistrada ? `${formatDate(ultimaRegistrada.data_aula)} | ${ultimaRegistrada.situacao}` : "Sem aula registrada"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano letivo</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{turma.ano_referencia ?? "--"}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Validadas</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{item.execucao.total_validadas}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Pendencias</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {item.execucao.total_abertas + item.execucao.total_pendentes + item.execucao.total_nao_realizadas}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Inicio / fim</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatDate(turma.data_inicio)} - {formatDate(turma.data_fim)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href="/escola/diario-de-classe"
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                          >
                            Abrir diario
                          </Link>
                          <Link
                            href={`/escola/academico/turmas/${item.turmaId}`}
                            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                          >
                            Ver detalhes
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
