import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MatriculaAuditoriaAcoes } from "./_components/MatriculaAuditoriaAcoes";

type PageProps = {
  params: Promise<{ id: string }>;
};

type CobrancaDetalhe = {
  id: number;
  pessoa_id: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
  status: string | null;
  valor_centavos: number | null;
  vencimento: string | null;
  created_at: string | null;
};

type PessoaBasica = {
  id: number;
  nome: string | null;
};

type MatriculaDetalhe = {
  id: number;
  pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
  vinculo_id: number | null;
  ano_referencia: number | null;
  status: string | null;
  data_matricula: string | null;
};

type TurmaResumo = {
  turma_id: number | null;
  nome: string | null;
  curso: string | null;
  curso_id?: number | null;
};

type MatriculaResumoUi = {
  id: number;
  aluna: PessoaBasica | null;
  responsavel_financeiro: PessoaBasica | null;
  turmas: TurmaResumo[];
  ano_referencia: number | null;
  status: string | null;
  data_matricula: string | null;
  fallbackMessage: string | null;
};

function isMatriculaOrigem(origemTipo: string | null): boolean {
  const normalized = String(origemTipo ?? "").trim().toUpperCase();
  return normalized === "MATRICULA" || normalized.startsWith("MATRICULA_");
}

function isMissingColumnError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "42703";
}

function brlFromCentavos(value: number | null | undefined): string {
  return (Number(value ?? 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function CobrancaDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  const supabase = await createClient();
  const { data: cobranca, error } = await supabase
    .from("cobrancas")
    .select("id,pessoa_id,origem_tipo,origem_id,status,valor_centavos,vencimento,created_at")
    .eq("id", idNum)
    .maybeSingle<CobrancaDetalhe>();

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Cobranca #{idNum}</h1>
        <p className="mt-2 text-sm text-rose-600">Erro ao carregar cobranca: {error.message}</p>
        <Link className="mt-4 inline-block underline" href="/admin/financeiro/contas-receber">
          Voltar
        </Link>
      </div>
    );
  }

  if (!cobranca) return notFound();

  const pessoaId = Number(cobranca.pessoa_id ?? 0);
  const { data: pessoaDevedora } =
    pessoaId > 0
      ? await supabase.from("pessoas").select("id,nome").eq("id", pessoaId).maybeSingle<PessoaBasica>()
      : { data: null };

  let matriculaResumo: MatriculaResumoUi | null = null;
  const origemId = Number(cobranca.origem_id ?? 0);
  if (isMatriculaOrigem(cobranca.origem_tipo) && origemId > 0) {
    const { data: matricula, error: matriculaErr } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,vinculo_id,ano_referencia,status,data_matricula")
      .eq("id", origemId)
      .maybeSingle<MatriculaDetalhe>();

    if (matriculaErr) {
      matriculaResumo = {
        id: origemId,
        aluna: null,
        responsavel_financeiro: null,
        turmas: [],
        ano_referencia: null,
        status: null,
        data_matricula: null,
        fallbackMessage: "Matricula: dados indisponiveis (schema nao mapeado para leitura atual).",
      };
    } else if (!matricula) {
      matriculaResumo = {
        id: origemId,
        aluna: null,
        responsavel_financeiro: null,
        turmas: [],
        ano_referencia: null,
        status: null,
        data_matricula: null,
        fallbackMessage: "Matricula nao encontrada para esta origem.",
      };
    } else {
      const alunaId = Number(matricula.pessoa_id ?? 0);
      const { data: aluna } =
        alunaId > 0
          ? await supabase.from("pessoas").select("id,nome").eq("id", alunaId).maybeSingle<PessoaBasica>()
          : { data: null };

      const responsavelId = Number(matricula.responsavel_financeiro_id ?? 0);
      const { data: responsavelFinanceiro } =
        responsavelId > 0
          ? await supabase.from("pessoas").select("id,nome").eq("id", responsavelId).maybeSingle<PessoaBasica>()
          : { data: null };

      let turmas: TurmaResumo[] = [];

      const turmaIds = new Set<number>();
      const { data: execRows, error: execErr } = await supabase
        .from("matricula_execucao_valores")
        .select("turma_id,ativo")
        .eq("matricula_id", matricula.id)
        .eq("ativo", true);

      if (!execErr && Array.isArray(execRows)) {
        for (const row of execRows) {
          const turmaId = Number((row as { turma_id?: unknown }).turma_id ?? 0);
          if (Number.isFinite(turmaId) && turmaId > 0) turmaIds.add(turmaId);
        }
      }

      if (turmaIds.size === 0 && Number(matricula.vinculo_id ?? 0) > 0) {
        turmaIds.add(Number(matricula.vinculo_id));
      }

      const turmaIdList = Array.from(turmaIds);
      if (turmaIdList.length > 0) {
        let turmasRows:
          | Array<{ turma_id?: number; nome?: string | null; curso?: string | null; curso_id?: number | null }>
          | null = null;

        const withCursoId = await supabase
          .from("turmas")
          .select("turma_id,nome,curso,curso_id")
          .in("turma_id", turmaIdList);

        if (!withCursoId.error) {
          turmasRows = withCursoId.data as Array<{
            turma_id?: number;
            nome?: string | null;
            curso?: string | null;
            curso_id?: number | null;
          }>;
        } else if (isMissingColumnError(withCursoId.error)) {
          const withoutCursoId = await supabase
            .from("turmas")
            .select("turma_id,nome,curso")
            .in("turma_id", turmaIdList);
          if (!withoutCursoId.error) {
            turmasRows = withoutCursoId.data as Array<{
              turma_id?: number;
              nome?: string | null;
              curso?: string | null;
            }>;
          }
        }

        if (Array.isArray(turmasRows) && turmasRows.length > 0) {
          const cursoIds = Array.from(
            new Set(
              turmasRows
                .map((t) => Number(t.curso_id ?? 0))
                .filter((cursoId) => Number.isFinite(cursoId) && cursoId > 0)
            )
          );
          let cursosMap: Record<string, string> = {};
          if (cursoIds.length > 0) {
            const { data: cursosRows } = await supabase.from("cursos").select("id,nome").in("id", cursoIds);
            if (Array.isArray(cursosRows)) {
              cursosMap = cursosRows.reduce(
                (acc, c) => {
                  acc[String((c as { id: number }).id)] = String((c as { nome?: string | null }).nome ?? "");
                  return acc;
                },
                {} as Record<string, string>
              );
            }
          }

          turmas = turmasRows
            .map((t) => {
              const turmaId = Number(t.turma_id ?? 0);
              if (!Number.isFinite(turmaId) || turmaId <= 0) return null;
              const cursoNome =
                Number(t.curso_id ?? 0) > 0 ? cursosMap[String(Number(t.curso_id))] ?? null : (t.curso ?? null);
              return {
                turma_id: turmaId,
                nome: t.nome ?? null,
                curso: cursoNome,
                curso_id: Number(t.curso_id ?? 0) || null,
              } satisfies TurmaResumo;
            })
            .filter((t): t is TurmaResumo => !!t);
        }
      }

      matriculaResumo = {
        id: matricula.id,
        aluna: aluna ?? null,
        responsavel_financeiro: responsavelFinanceiro ?? null,
        turmas,
        ano_referencia: Number(matricula.ano_referencia ?? 0) || null,
        status: matricula.status ?? null,
        data_matricula: matricula.data_matricula ?? null,
        fallbackMessage: turmas.length === 0 ? "Matricula sem turmas/cursos vinculados no momento." : null,
      };
    }
  }

  const pessoaLabel = pessoaDevedora?.nome
    ? `${pessoaDevedora.nome} (#${pessoaDevedora.id})`
    : `Pessoa #${cobranca.pessoa_id ?? "-"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Cobranca #{cobranca.id}</h1>
          <div className="text-sm text-slate-600">
            Auditoria da origem da cobranca (devedor, origem e acoes de diagnostico/reprocessamento).
          </div>
        </div>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/contas-receber">
          Voltar
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-500">Pessoa devedora</div>
              <div className="text-base font-semibold text-slate-900">{pessoaLabel}</div>
              {pessoaId > 0 ? (
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  <Link className="underline text-slate-600 hover:text-slate-900" href={`/pessoas/${pessoaId}`}>
                    Abrir pessoa
                  </Link>
                  <Link
                    className="underline text-slate-600 hover:text-slate-900"
                    href={`/pessoas/${pessoaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir resumo financeiro
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="font-medium">Status:</span> {cobranca.status ?? "-"}
              </div>
              <div>
                <span className="font-medium">Vencimento:</span> {cobranca.vencimento ?? "-"}
              </div>
              <div>
                <span className="font-medium">Valor:</span>{" "}
                {brlFromCentavos(cobranca.valor_centavos)}
              </div>
              <div>
                <span className="font-medium">Origem:</span> {cobranca.origem_tipo ?? "-"}{" "}
                {cobranca.origem_id ? `(#${cobranca.origem_id})` : ""}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-semibold text-slate-900">Origem detalhada</div>

            {!matriculaResumo ? (
              <div className="mt-2 text-slate-700">
                {cobranca.origem_tipo ?? "SEM_ORIGEM"} {cobranca.origem_id ? `(#${cobranca.origem_id})` : ""}
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <span className="font-medium">Matricula:</span> #{matriculaResumo.id}
                </div>
                <div>
                  <span className="font-medium">Aluna:</span>{" "}
                  {matriculaResumo.aluna?.nome
                    ? `${matriculaResumo.aluna.nome} (#${matriculaResumo.aluna.id})`
                    : "Nao identificada"}
                </div>
                <div>
                  <span className="font-medium">Responsavel financeiro:</span>{" "}
                  {matriculaResumo.responsavel_financeiro?.nome
                    ? `${matriculaResumo.responsavel_financeiro.nome} (#${matriculaResumo.responsavel_financeiro.id})`
                    : "Nao identificado"}
                </div>
                <div>
                  <span className="font-medium">Ano ref.:</span> {matriculaResumo.ano_referencia ?? "-"}
                </div>
                <div>
                  <span className="font-medium">Turmas/Cursos:</span>
                  {matriculaResumo.turmas.length === 0 ? (
                    <div className="text-slate-600">{matriculaResumo.fallbackMessage ?? "Sem informacoes."}</div>
                  ) : (
                    <ul className="mt-1 list-disc pl-5 text-slate-700">
                      {matriculaResumo.turmas.map((t) => (
                        <li key={String(t.turma_id)}>
                          {t.nome ?? `Turma #${t.turma_id}`} {t.curso ? `- ${t.curso}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {matriculaResumo.status ? (
                  <div>
                    <span className="font-medium">Status da matricula:</span> {matriculaResumo.status}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3 text-xs">
                  <Link className="underline text-slate-600 hover:text-slate-900" href={`/escola/matriculas/${matriculaResumo.id}`}>
                    Abrir matricula
                  </Link>
                  {matriculaResumo.aluna?.id ? (
                    <Link
                      className="underline text-slate-600 hover:text-slate-900"
                      href={`/pessoas/${matriculaResumo.aluna.id}`}
                    >
                      Abrir aluna
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {matriculaResumo?.id ? <MatriculaAuditoriaAcoes matriculaId={matriculaResumo.id} /> : null}
    </div>
  );
}
