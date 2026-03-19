import Link from "next/link";
import { notFound } from "next/navigation";
import { CobrancaOperacionalActions } from "@/components/financeiro/cobrancas/CobrancaOperacionalActions";
import { buildCanonicalOriginDisplay } from "@/lib/financeiro/cobranca-origem-canonica";
import { formatDateISO, formatDateTimeISO } from "@/lib/formatters/date";
import { getCobrancasPgPool, loadCobrancaHistorico, type CobrancaHistoricoEvento } from "@/lib/financeiro/cobrancas-operacionais";
import { createClient } from "@/lib/supabase/server";
import { MatriculaAuditoriaAcoes } from "./_components/MatriculaAuditoriaAcoes";

type PageProps = {
  params: Promise<{ id: string }>;
};

type CobrancaDetalhe = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  status: string | null;
  valor_centavos: number | null;
  vencimento: string | null;
  created_at: string | null;
  updated_at: string | null;
  vencimento_original: string | null;
  vencimento_ajustado_em: string | null;
  vencimento_ajustado_por: string | null;
  vencimento_ajuste_motivo: string | null;
  cancelada_em: string | null;
  cancelada_por: string | null;
  cancelada_por_user_id: string | null;
  cancelamento_motivo: string | null;
  cancelada_motivo: string | null;
  cancelamento_tipo: string | null;
  origem_agrupador_tipo: string | null;
  origem_agrupador_id: number | null;
  origem_item_tipo: string | null;
  origem_item_id: number | null;
  conta_interna_id: number | null;
  origem_label: string | null;
  migracao_conta_interna_status: string | null;
  migracao_conta_interna_observacao: string | null;
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
  cancelamento_tipo: string | null;
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
  cancelamento_tipo: string | null;
  data_matricula: string | null;
  fallbackMessage: string | null;
};

const COBRANCA_SELECT_CANONICAL =
  "id,pessoa_id,descricao,origem_tipo,origem_subtipo,origem_id,status,valor_centavos,vencimento,created_at,updated_at,vencimento_original,vencimento_ajustado_em,vencimento_ajustado_por,vencimento_ajuste_motivo,cancelada_em,cancelada_por,cancelada_por_user_id,cancelamento_motivo,cancelada_motivo,cancelamento_tipo,origem_agrupador_tipo,origem_agrupador_id,origem_item_tipo,origem_item_id,conta_interna_id,origem_label,migracao_conta_interna_status,migracao_conta_interna_observacao";

const COBRANCA_SELECT_LEGACY =
  "id,pessoa_id,descricao,origem_tipo,origem_subtipo,origem_id,status,valor_centavos,vencimento,created_at,updated_at";

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

function textOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function resolveCanceladaPor(cobranca: CobrancaDetalhe): string | null {
  return textOrNull(cobranca.cancelada_por) ?? textOrNull(cobranca.cancelada_por_user_id);
}

function resolveCancelamentoMotivo(cobranca: CobrancaDetalhe): string | null {
  return textOrNull(cobranca.cancelamento_motivo) ?? textOrNull(cobranca.cancelada_motivo);
}

async function carregarCobrancaDetalhe(supabase: Awaited<ReturnType<typeof createClient>>, cobrancaId: number) {
  const primary = await supabase
    .from("cobrancas")
    .select(COBRANCA_SELECT_CANONICAL)
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaDetalhe>();

  if (!primary.error) {
    return primary;
  }

  if (!isMissingColumnError(primary.error)) {
    return primary;
  }

  const fallback = await supabase
    .from("cobrancas")
    .select(COBRANCA_SELECT_LEGACY)
    .eq("id", cobrancaId)
    .maybeSingle<
      Pick<
        CobrancaDetalhe,
        | "id"
        | "pessoa_id"
        | "descricao"
        | "origem_tipo"
        | "origem_subtipo"
        | "origem_id"
        | "status"
        | "valor_centavos"
        | "vencimento"
        | "created_at"
        | "updated_at"
      >
    >();

  if (fallback.error || !fallback.data) {
    return { data: null, error: fallback.error };
  }

  return {
    data: {
      ...fallback.data,
      vencimento_original: null,
      vencimento_ajustado_em: null,
      vencimento_ajustado_por: null,
      vencimento_ajuste_motivo: null,
      cancelada_em: null,
      cancelada_por: null,
      cancelada_por_user_id: null,
      cancelamento_motivo: null,
      cancelada_motivo: null,
      cancelamento_tipo: null,
      origem_agrupador_tipo: null,
      origem_agrupador_id: null,
      origem_item_tipo: null,
      origem_item_id: null,
      conta_interna_id: null,
      origem_label: null,
      migracao_conta_interna_status: null,
      migracao_conta_interna_observacao: null,
    } satisfies CobrancaDetalhe,
    error: null,
  };
}

export default async function CobrancaDetalhePage({ params }: PageProps) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return notFound();

  const supabase = await createClient();
  const { data: cobranca, error } = await carregarCobrancaDetalhe(supabase, idNum);

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

  let historicoEventos: CobrancaHistoricoEvento[] = [];
  try {
    const pool = getCobrancasPgPool();
    const client = await pool.connect();
    try {
      historicoEventos = await loadCobrancaHistorico(client, idNum);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[/financeiro/cobrancas/[id]] historico_eventos", {
      cobrancaId: idNum,
      message: error instanceof Error ? error.message : "erro_desconhecido",
    });
  }

  const pessoaId = Number(cobranca.pessoa_id ?? 0);
  const { data: pessoaDevedora } =
    pessoaId > 0
      ? await supabase.from("pessoas").select("id,nome").eq("id", pessoaId).maybeSingle<PessoaBasica>()
      : { data: null };

  const origemDisplay = buildCanonicalOriginDisplay({
    origemAgrupadorTipo: cobranca.origem_agrupador_tipo,
    origemAgrupadorId: cobranca.origem_agrupador_id,
    origemItemTipo: cobranca.origem_item_tipo,
    origemItemId: cobranca.origem_item_id,
    contaInternaId: cobranca.conta_interna_id,
    origemLabel: cobranca.origem_label,
    migracaoContaInternaStatus: cobranca.migracao_conta_interna_status,
    legacyOrigemTipo: cobranca.origem_tipo,
    legacyOrigemSubtipo: cobranca.origem_subtipo,
    legacyOrigemId: cobranca.origem_id,
    legacyDescricao: cobranca.descricao,
  });

  let matriculaResumo: MatriculaResumoUi | null = null;
  const origemMatriculaId =
    String(cobranca.origem_item_tipo ?? "").trim().toUpperCase() === "MATRICULA"
      ? Number(cobranca.origem_item_id ?? cobranca.origem_id ?? 0)
      : Number(isMatriculaOrigem(cobranca.origem_tipo) ? cobranca.origem_id ?? 0 : 0);

  if (origemMatriculaId > 0) {
    const { data: matricula, error: matriculaErr } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,vinculo_id,ano_referencia,status,cancelamento_tipo,data_matricula")
      .eq("id", origemMatriculaId)
      .maybeSingle<MatriculaDetalhe>();

    if (matriculaErr) {
      matriculaResumo = {
        id: origemMatriculaId,
        aluna: null,
        responsavel_financeiro: null,
        turmas: [],
        ano_referencia: null,
        status: null,
        cancelamento_tipo: null,
        data_matricula: null,
        fallbackMessage: "Matricula: dados indisponiveis (schema nao mapeado para leitura atual).",
      };
    } else if (!matricula) {
      matriculaResumo = {
        id: origemMatriculaId,
        aluna: null,
        responsavel_financeiro: null,
        turmas: [],
        ano_referencia: null,
        status: null,
        cancelamento_tipo: null,
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
        cancelamento_tipo: matricula.cancelamento_tipo ?? null,
        data_matricula: matricula.data_matricula ?? null,
        fallbackMessage: turmas.length === 0 ? "Matricula sem turmas/cursos vinculados no momento." : null,
      };
    }
  }

  const pessoaLabel = pessoaDevedora?.nome
    ? `${pessoaDevedora.nome} (#${pessoaDevedora.id})`
    : `Pessoa #${cobranca.pessoa_id ?? "-"}`;
  const canceladaPor = resolveCanceladaPor(cobranca);
  const cancelamentoMotivo = resolveCancelamentoMotivo(cobranca);

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
                <span className="font-medium">Vencimento:</span> {formatDateISO(cobranca.vencimento)}
              </div>
              <div>
                <span className="font-medium">Valor:</span>{" "}
                {brlFromCentavos(cobranca.valor_centavos)}
              </div>
              <div>
                <span className="font-medium">Conta interna:</span>{" "}
                {cobranca.conta_interna_id ? `#${cobranca.conta_interna_id}` : "Nao associada"}
              </div>
              <div>
                <span className="font-medium">Vencimento original:</span>{" "}
                {formatDateISO(cobranca.vencimento_original)}
              </div>
              <div>
                <span className="font-medium">Ultimo ajuste:</span>{" "}
                {cobranca.vencimento_ajustado_em
                  ? `${formatDateTimeISO(cobranca.vencimento_ajustado_em)}${cobranca.vencimento_ajuste_motivo ? ` | ${cobranca.vencimento_ajuste_motivo}` : ""}`
                  : "Sem ajuste manual"}
              </div>
              <div className="md:col-span-2">
                <span className="font-medium">Cancelamento:</span>{" "}
                {cobranca.cancelada_em || cobranca.cancelamento_tipo || cancelamentoMotivo
                  ? `${formatDateTimeISO(cobranca.cancelada_em)}${cobranca.cancelamento_tipo ? ` | ${cobranca.cancelamento_tipo}` : ""}${cancelamentoMotivo ? ` | ${cancelamentoMotivo}` : ""}${canceladaPor ? ` | por ${canceladaPor}` : ""}`
                  : "Titulo ativo"}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="font-semibold text-slate-900">{origemDisplay.principal}</div>
            {origemDisplay.secondary ? <div className="mt-1 text-xs text-slate-500">{origemDisplay.secondary}</div> : null}
            {origemDisplay.badgeLabel || origemDisplay.technical ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {origemDisplay.badgeLabel ? (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      origemDisplay.badgeTone === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : origemDisplay.badgeTone === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-100 text-slate-700"
                    }`}
                  >
                    {origemDisplay.badgeLabel}
                  </span>
                ) : null}
                {origemDisplay.technical ? <span className="text-[11px] text-slate-400">{origemDisplay.technical}</span> : null}
              </div>
            ) : null}

            {matriculaResumo ? (
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
                    {matriculaResumo.cancelamento_tipo ? ` | ${matriculaResumo.cancelamento_tipo}` : ""}
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
            ) : null}

            <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <div>
                <span className="font-medium">Origem bruta:</span> {cobranca.origem_tipo ?? "-"}
                {cobranca.origem_id ? ` (#${cobranca.origem_id})` : ""}
              </div>
              <div>
                <span className="font-medium">Item canonico:</span> {cobranca.origem_item_tipo ?? "-"}
                {cobranca.origem_item_id ? ` (#${cobranca.origem_item_id})` : ""}
              </div>
              <div>
                <span className="font-medium">Agrupador:</span> {cobranca.origem_agrupador_tipo ?? "-"}
                {cobranca.origem_agrupador_id ? ` (#${cobranca.origem_agrupador_id})` : ""}
              </div>
              <div>
                <span className="font-medium">Descricao legada:</span> {cobranca.descricao ?? "-"}
              </div>
              {cobranca.migracao_conta_interna_observacao ? (
                <div className="md:col-span-2">
                  <span className="font-medium">Observacao da migracao:</span> {cobranca.migracao_conta_interna_observacao}
                </div>
              ) : null}
              {matriculaResumo?.status === "CANCELADA" ? (
                <div className="md:col-span-2">
                  <span className="font-medium">Contexto da matricula:</span> Matricula cancelada. Avalie cancelamento manual do titulo quando aplicavel.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Acoes operacionais da cobranca</div>
            <div className="text-xs text-slate-500">
              Alteracao manual de vencimento e cancelamento logico com historico auditavel.
            </div>
          </div>
          <CobrancaOperacionalActions
            cobrancaId={cobranca.id}
            descricao={cobranca.descricao}
            origemLabel={origemDisplay.principal}
            status={cobranca.status}
            vencimento={cobranca.vencimento}
            vencimentoOriginal={cobranca.vencimento_original}
            vencimentoAjustadoEm={cobranca.vencimento_ajustado_em}
            vencimentoAjusteMotivo={cobranca.vencimento_ajuste_motivo}
            canceladaEm={cobranca.cancelada_em}
            cancelamentoTipo={cobranca.cancelamento_tipo}
            matriculaStatus={matriculaResumo?.status ?? null}
            matriculaCancelamentoTipo={matriculaResumo?.cancelamento_tipo ?? null}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Historico de eventos da cobranca</div>
        <div className="mt-1 text-xs text-slate-500">
          Trilha de ajuste de vencimento, cancelamento e payloads antes/depois quando disponiveis.
        </div>
        {historicoEventos.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Nenhum evento registrado para esta cobranca ainda.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {historicoEventos.map((evento) => (
              <div key={evento.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">{evento.tipo_evento}</div>
                  <div className="text-xs text-slate-500">{formatDateTimeISO(evento.created_at)}</div>
                </div>
                {evento.observacao ? <div className="mt-2 text-slate-700">{evento.observacao}</div> : null}
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Anterior</div>
                    <pre className="mt-1 overflow-auto rounded-md bg-white p-3 text-[11px] text-slate-700">
                      {JSON.stringify(evento.payload_anterior, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Novo</div>
                    <pre className="mt-1 overflow-auto rounded-md bg-white p-3 text-[11px] text-slate-700">
                      {JSON.stringify(evento.payload_novo, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {matriculaResumo?.id ? <MatriculaAuditoriaAcoes matriculaId={matriculaResumo.id} /> : null}
    </div>
  );
}
