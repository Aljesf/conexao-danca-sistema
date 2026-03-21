import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import { listTurmasLeves, type TurmaListagemLeveItem } from "@/lib/academico/turmas-operacional";

export const dynamic = "force-dynamic";

type SearchValue = string | string[] | undefined;
type SearchParams = {
  q?: SearchValue;
  status?: SearchValue;
  turno?: SearchValue;
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

function badgeTone(status: string | null | undefined) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "ATIVA" || normalized === "VALIDADA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "EM_PREPARACAO" || normalized === "PENDENTE" || normalized === "ABERTA") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "ENCERRADA" || normalized === "CANCELADA" || normalized === "NAO_REALIZADA") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function filterTurmas(items: TurmaListagemLeveItem[], search: { q: string; status: string; turno: string }) {
  return items.filter((item) => {
    const matchesQ =
      !search.q ||
      [
        item.nome,
        item.curso,
        item.nivel,
        item.turno,
        item.professor_principal,
        item.grade_horario,
      ]
        .map(normalizeText)
        .some((value) => value.includes(normalizeText(search.q)));

    const matchesStatus = !search.status || normalizeText(item.status) === normalizeText(search.status);
    const matchesTurno = !search.turno || normalizeText(item.turno) === normalizeText(search.turno);
    return matchesQ && matchesStatus && matchesTurno;
  });
}

export default async function EscolaTurmasPage(props: { searchParams?: Promise<SearchParams> }) {
  const user = await requireUser();
  const supabase = await getSupabaseServerAuth();
  const searchParams = (await props.searchParams) ?? {};

  const filtros = {
    q: getFirstValue(searchParams.q),
    status: getFirstValue(searchParams.status),
    turno: getFirstValue(searchParams.turno),
  };

  const turmas = await listTurmasLeves({
    supabase,
    userId: user.id,
  });

  const turmasFiltradas = filterTurmas(turmas, filtros);
  const statusOptions = [...new Set(turmas.map((item) => item.status).filter((value): value is string => Boolean(value)))];
  const turnoOptions = [...new Set(turmas.map((item) => item.turno).filter((value): value is string => Boolean(value)))];

  const totalAtivas = turmasFiltradas.filter((item) => (item.status ?? "").toUpperCase() === "ATIVA").length;
  const totalPreparacao = turmasFiltradas.filter((item) => (item.status ?? "").toUpperCase() === "EM_PREPARACAO").length;
  const totalAlunos = turmasFiltradas.reduce((acc, item) => acc + item.total_alunos, 0);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Escola / Turmas</p>
              <h1 className="text-3xl font-semibold text-slate-900">Turmas</h1>
              <p className="max-w-3xl text-sm text-slate-600">
                Listagem leve com o minimo operacional: dados da turma, professor principal, grade/horario e total de
                alunos. O detalhe de frequencia fica na turma e a chamada completa fica na aula confirmada.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/escola/diario-de-classe"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Diario de classe
              </Link>
              <Link
                href="/escola/academico/turmas/nova"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Nova turma
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Turmas visiveis</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{turmasFiltradas.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ativas</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalAtivas}</p>
              <p className="text-xs text-slate-500">Em preparacao: {totalPreparacao}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Alunos no recorte</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{totalAlunos}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid gap-3 md:grid-cols-[minmax(0,2fr),repeat(2,minmax(0,1fr)),auto,auto]">
            <input
              type="text"
              name="q"
              defaultValue={filtros.q}
              placeholder="Buscar turma, curso, nivel ou professor"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300"
            />
            <select
              name="status"
              defaultValue={filtros.status}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              name="turno"
              defaultValue={filtros.turno}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300"
            >
              <option value="">Todos os turnos</option>
              {turnoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Filtrar
            </button>
            <Link
              href="/escola/turmas"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Limpar
            </Link>
          </form>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {turmasFiltradas.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
              Nenhuma turma encontrada para os filtros informados.
            </div>
          ) : (
            turmasFiltradas.map((turma) => (
              <Link
                key={turma.turma_id}
                href={`/escola/turmas/${turma.turma_id}`}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Turma #{turma.turma_id}
                    </p>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {turma.nome ?? `Turma ${turma.turma_id}`}
                    </h2>
                    <p className="text-sm text-slate-600">
                      {[turma.curso, turma.nivel, turma.turno].filter(Boolean).join(" • ") || "Sem classificacao"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${badgeTone(turma.status)}`}
                  >
                    {turma.status ?? "Sem status"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Grade / horario</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{turma.grade_horario}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Professor principal</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {turma.professor_principal ?? "Nao vinculado"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Alunos</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{turma.total_alunos}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ano</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{turma.ano_referencia ?? "Sem ano"}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Abrir detalhe da turma</span>
                  <span className="font-medium text-slate-900 transition group-hover:translate-x-0.5">Ver turma</span>
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
