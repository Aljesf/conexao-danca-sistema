import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  vinculo_id: number | null;
  status: string | null;
  data_matricula: string | null;
};

type TurmaResumo = {
  turma_id: number | null;
  nome: string | null;
  curso: string | null;
};

type MatriculaResumoUi = {
  id: number;
  aluna: PessoaBasica | null;
  turmas: TurmaResumo[];
  status: string | null;
  data_matricula: string | null;
  fallbackMessage: string | null;
};

function isMatriculaOrigem(origemTipo: string | null): boolean {
  const normalized = String(origemTipo ?? "").trim().toUpperCase();
  return normalized === "MATRICULA" || normalized.startsWith("MATRICULA_");
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
  const { data: pessoa } =
    pessoaId > 0
      ? await supabase.from("pessoas").select("id,nome").eq("id", pessoaId).maybeSingle<PessoaBasica>()
      : { data: null };

  let matriculaResumo: MatriculaResumoUi | null = null;
  const origemId = Number(cobranca.origem_id ?? 0);
  if (isMatriculaOrigem(cobranca.origem_tipo) && origemId > 0) {
    const { data: matricula, error: matriculaErr } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,vinculo_id,status,data_matricula")
      .eq("id", origemId)
      .maybeSingle<MatriculaDetalhe>();

    if (matriculaErr) {
      matriculaResumo = {
        id: origemId,
        aluna: null,
        turmas: [],
        status: null,
        data_matricula: null,
        fallbackMessage: "Matricula: dados indisponiveis (schema nao mapeado para leitura atual).",
      };
    } else if (!matricula) {
      matriculaResumo = {
        id: origemId,
        aluna: null,
        turmas: [],
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

      let turmas: TurmaResumo[] = [];
      const { data: turmaAlunoRows, error: turmaAlunoErr } = await supabase
        .from("turma_aluno")
        .select("turma:turmas(turma_id,nome,curso)")
        .eq("matricula_id", matricula.id);

      if (!turmaAlunoErr && Array.isArray(turmaAlunoRows)) {
        turmas = turmaAlunoRows
          .map((row) => {
            const turma = (row as { turma?: { turma_id?: number; nome?: string | null; curso?: string | null } | null })
              .turma;
            if (!turma?.turma_id) return null;
            return {
              turma_id: Number(turma.turma_id),
              nome: turma.nome ?? null,
              curso: turma.curso ?? null,
            } satisfies TurmaResumo;
          })
          .filter((row): row is TurmaResumo => !!row);
      }

      if (turmas.length === 0 && Number(matricula.vinculo_id ?? 0) > 0) {
        const { data: turmaFallback } = await supabase
          .from("turmas")
          .select("turma_id,nome,curso")
          .eq("turma_id", Number(matricula.vinculo_id))
          .maybeSingle<TurmaResumo>();
        if (turmaFallback?.turma_id) {
          turmas = [
            {
              turma_id: Number(turmaFallback.turma_id),
              nome: turmaFallback.nome ?? null,
              curso: turmaFallback.curso ?? null,
            },
          ];
        }
      }

      matriculaResumo = {
        id: matricula.id,
        aluna: aluna ?? null,
        turmas,
        status: matricula.status ?? null,
        data_matricula: matricula.data_matricula ?? null,
        fallbackMessage: turmas.length === 0 ? "Matricula sem turmas/cursos vinculados no momento." : null,
      };
    }
  }

  const pessoaLabel = pessoa?.nome ? `${pessoa.nome} (#${pessoa.id})` : `Pessoa #${cobranca.pessoa_id ?? "-"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Cobranca #{cobranca.id}</h1>
          <div className="text-sm text-slate-600">Detalhe operacional da cobranca e da origem financeira.</div>
        </div>
        <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/contas-receber">
          Voltar
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-500">Pessoa</div>
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
                {(Number(cobranca.valor_centavos ?? 0) / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
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
    </div>
  );
}
