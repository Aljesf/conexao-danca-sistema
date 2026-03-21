import Link from "next/link";
import { listarProfessoresDaTurma } from "@/lib/academico/turmaProfessoresServer";
import { listarTurmas } from "@/lib/academico/turmasServer";
import { calcularResumoExecucaoTurma } from "@/lib/academico/execucao-aula";
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

type TurmaListItem = {
  turma: Turma;
  turmaId: number;
  professorPrincipal: string | null;
  execucao: Awaited<ReturnType<typeof calcularResumoExecucaoTurma>>;
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

export default async function TurmasPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = (await props.searchParams) ?? {};
  const [turmas, supabase] = await Promise.all([listarTurmas(), getSupabaseServer()]);
  const today = getTodayISO();

  const turmasBase = turmas
    .map((turma) => ({
      turma,
      turmaId: Number(turma.turma_id ?? turma.id ?? 0),
    }))
    .filter((item) => Number.isFinite(item.turmaId) && item.turmaId > 0);

  const enriched = await Promise.all(
    turmasBase.map(async ({ turma, turmaId }) => {
      const [professores, execucao] = await Promise.all([
        listarProfessoresDaTurma(turmaId),
        calcularResumoExecucaoTurma({
          supabase,
          turmaId,
        }),
      ]);

      const professorPrincipal = professores.find((prof) => prof.principal)?.nome_pessoa ?? professores[0]?.nome_pessoa ?? null;

      return {
        turma,
        turmaId,
        professorPrincipal,
        execucao,
      } satisfies TurmaListItem;
    }),
  );

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
    pendencia: filtered.filter(
      (item) =>
        item.execucao.total_abertas + item.execucao.total_pendentes + item.execucao.total_nao_realizadas > 0,
    ).length,
    realizadasHoje: filtered.filter((item) =>
      item.execucao.aulas_previstas.some(
        (aula) => aula.data_aula === today && aula.situacao === "VALIDADA",
      ),
    ).length,
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
                Painel operacional com filtros, status da execucao das aulas e acoes rapidas do modulo.
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
                    const proxima = item.execucao.proximas_previstas[0] ?? null;
                    const pendencia = item.execucao.pendencias[0] ?? null;
                    const statusTurma = turma.status ?? "Sem status";
                    const hasPendencia =
                      item.execucao.total_abertas + item.execucao.total_pendentes + item.execucao.total_nao_realizadas > 0;

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
                              {hasPendencia ? (
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
                              <div className="font-semibold text-slate-900">Execucao</div>
                              <div className="mt-1">
                                {item.execucao.total_validadas} validadas / {item.execucao.total_previstas_periodo} previstas
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
