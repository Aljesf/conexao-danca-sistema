import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAulaFrequenciaPayload,
  listarAlunosDaTurmaFrequencia,
  mapStatusPresenca,
  type AulaFrequenciaPayload,
  type TurmaAlunoFrequencia,
} from "@/lib/academico/frequencia";
import {
  getAulaExecucaoById,
  resolveAulasExecucao,
  type AulaExecucaoResolved,
  type AulaExecucaoRow,
} from "@/lib/academico/execucao-aula";
import { carregarResumoAlunosTurmas } from "@/lib/academico/turmasResumoServer";
import { listarAvaliacoesDaTurma, type TurmaAvaliacao } from "@/lib/academico/turmaAvaliacoesServer";
import { canManageFrequenciaTurma, getColaboradorIdForUser, isAdmin } from "@/lib/academico/permissoes-frequencia";
import { resolverHorarioTurma } from "@/lib/turmas";

type Supa = SupabaseClient<any, any, any, any, any>;

type TurmaListRow = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  ano_referencia: number | null;
  dias_semana: unknown;
  hora_inicio: string | null;
  hora_fim: string | null;
  horarios?: Array<{ day_of_week?: number | null; inicio?: string | null; fim?: string | null }> | null;
};

type TurmaDetalheRow = TurmaListRow & {
  tipo_turma: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  capacidade: number | null;
  periodo_letivo_id: number | null;
  encerramento_automatico: boolean | null;
  carga_horaria_prevista: number | null;
  frequencia_minima_percentual: number | null;
  observacoes: string | null;
  espaco_id: number | null;
  espaco?: {
    id: number;
    nome: string | null;
    tipo: string | null;
    capacidade: number | null;
    local?: { id: number; nome: string | null; tipo: string | null } | null;
  } | null;
};

type ProfessorRow = {
  turma_id: number;
  principal: boolean | null;
  ativo: boolean | null;
  data_inicio: string | null;
  colaborador?: {
    id?: number | null;
    pessoa?: { id?: number | null; nome?: string | null } | null;
  } | null;
};

type PresencaResumoRow = {
  aula_id: number;
  aluno_pessoa_id: number;
  status: string | null;
};

type PlanoContexto = {
  ciclo: {
    id: number;
    turma_id: number;
    status: string | null;
    aula_inicio_numero: number | null;
    aula_fim_numero: number | null;
  } | null;
  plano: Record<string, unknown> | null;
  instancia: {
    id: number;
    turma_aula_id: number;
    plano_aula_id: number;
    status: string | null;
    notas_pos_aula: string | null;
    concluido_por: string | null;
    concluido_em: string | null;
  } | null;
};

export type FaixaStatusFrequenciaTurma = "OK" | "ATENCAO" | "CRITICO";

export type TurmaListagemLeveItem = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  ano_referencia: number | null;
  dias_semana: string[];
  hora_inicio: string | null;
  hora_fim: string | null;
  grade_horario: string;
  professor_principal: string | null;
  total_alunos: number;
};

export type TurmaAlunoResumoFrequencia = {
  aluno_pessoa_id: number;
  nome: string | null;
  matricula_id: number | null;
  matricula_status: string | null;
  turma_aluno_status: string | null;
  total_aulas_confirmadas: number;
  presencas_confirmadas: number;
  faltas_confirmadas: number;
  percentual_frequencia: number;
  faixa_status: FaixaStatusFrequenciaTurma;
};

export type TurmaAulaConfirmada = {
  aula_id: number;
  data_aula: string;
  aula_numero: number | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  status_execucao: AulaExecucaoResolved["status_execucao"];
  fechada_em: string | null;
  fechada_por_nome: string | null;
  frequencia_salva_em: string | null;
  observacao_execucao: string | null;
};

export type TurmaDetalheOperacional = {
  turma: {
    turma_id: number;
    nome: string | null;
    curso: string | null;
    nivel: string | null;
    turno: string | null;
    status: string | null;
    ano_referencia: number | null;
    tipo_turma: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    capacidade: number | null;
    periodo_letivo_id: number | null;
    encerramento_automatico: boolean | null;
    frequencia_minima_percentual: number | null;
    carga_horaria_prevista: number | null;
    observacoes: string | null;
    professor_principal: string | null;
    grade_horario: string;
    dias_semana: string[];
    hora_inicio: string | null;
    hora_fim: string | null;
    total_alunos: number;
    espaco_nome: string | null;
    local_nome: string | null;
  };
  alunos: TurmaAlunoResumoFrequencia[];
  aulas_confirmadas: TurmaAulaConfirmada[];
};

export type AulaDetalheOperacional = {
  turma: TurmaDetalheOperacional["turma"];
  aula: AulaExecucaoResolved;
  plano_contexto: PlanoContexto;
  avaliacoes_relacionadas: TurmaAvaliacao[];
  frequencia: AulaFrequenciaPayload;
};

function normalizeHora(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 5);
}

function parseDiasSemana(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0);
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function formatGradeHorario(params: {
  dias_semana: string[];
  hora_inicio: string | null;
  hora_fim: string | null;
}) {
  const dias = params.dias_semana.length > 0 ? params.dias_semana.join(", ") : "Dias nao definidos";
  const horario =
    params.hora_inicio && params.hora_fim ? `${params.hora_inicio} - ${params.hora_fim}` : "Horario nao definido";
  return `${dias} • ${horario}`;
}

function compareNomeAsc(a: { nome: string | null }, b: { nome: string | null }) {
  return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
}

function isAulaConfirmada(aula: Pick<AulaExecucaoResolved, "status_execucao" | "fechada_em">) {
  return aula.status_execucao === "VALIDADA" || Boolean(aula.fechada_em);
}

function isAulaDentroDoVinculo(aulaData: string, aluno: Pick<TurmaAlunoFrequencia, "dt_inicio" | "dt_fim">) {
  if (aluno.dt_inicio && aulaData < aluno.dt_inicio) return false;
  if (aluno.dt_fim && aulaData > aluno.dt_fim) return false;
  return true;
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function faixaStatus(percentual: number, totalAulas: number): FaixaStatusFrequenciaTurma {
  if (totalAulas <= 0) return "OK";
  if (percentual >= 70) return "OK";
  if (percentual >= 50) return "ATENCAO";
  return "CRITICO";
}

async function getAccessibleTurmaIds(params: { supabase: Supa; userId: string }) {
  const admin = await isAdmin(params.supabase, params.userId);
  if (admin) {
    return { isAdmin: true, colaboradorId: null, turmaIds: null as number[] | null };
  }

  const colaboradorId = await getColaboradorIdForUser(params.supabase, params.userId);
  if (!colaboradorId) {
    return { isAdmin: false, colaboradorId: null, turmaIds: [] as number[] };
  }

  const { data, error } = await params.supabase
    .from("turma_professores")
    .select("turma_id")
    .eq("colaborador_id", colaboradorId)
    .eq("ativo", true);

  if (error) {
    throw new Error(error.message);
  }

  const turmaIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => Number(row.turma_id))
        .filter((turmaId) => Number.isInteger(turmaId) && turmaId > 0),
    ),
  );

  return { isAdmin: false, colaboradorId, turmaIds };
}

async function loadProfessorPrincipalMap(supabase: Supa, turmaIds: number[]) {
  const result = new Map<number, string | null>();
  if (turmaIds.length === 0) return result;

  const { data, error } = await supabase
    .from("turma_professores")
    .select(
      `
        turma_id,
        principal,
        ativo,
        data_inicio,
        colaborador:colaboradores!turma_professores_colaborador_id_fkey (
          id,
          pessoa:pessoas!colaboradores_pessoa_id_fkey (
            id,
            nome
          )
        )
      `,
    )
    .in("turma_id", turmaIds)
    .order("principal", { ascending: false })
    .order("data_inicio", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const grouped = new Map<number, ProfessorRow[]>();
  for (const row of (data ?? []) as ProfessorRow[]) {
    const turmaId = Number(row.turma_id);
    if (!Number.isInteger(turmaId) || turmaId <= 0) continue;
    const list = grouped.get(turmaId) ?? [];
    list.push(row);
    grouped.set(turmaId, list);
  }

  for (const turmaId of turmaIds) {
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

async function loadTurmaDetalheBase(supabase: Supa, turmaId: number) {
  const { data, error } = await supabase
    .from("turmas")
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        turno,
        status,
        ano_referencia,
        tipo_turma,
        data_inicio,
        data_fim,
        capacidade,
        periodo_letivo_id,
        encerramento_automatico,
        carga_horaria_prevista,
        frequencia_minima_percentual,
        observacoes,
        dias_semana,
        hora_inicio,
        hora_fim,
        espaco_id,
        espaco:espacos (
          id,
          nome,
          tipo,
          capacidade,
          local:locais (
            id,
            nome,
            tipo
          )
        ),
        horarios:turmas_horarios (
          day_of_week,
          inicio,
          fim
        )
      `,
    )
    .eq("turma_id", turmaId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "TURMA_NAO_ENCONTRADA");
  }

  return data as unknown as TurmaDetalheRow;
}

async function loadAulasConfirmadasTurma(supabase: Supa, turmaId: number) {
  const { data, error } = await supabase
    .from("turma_aulas")
    .select(
      "id,turma_id,data_aula,hora_inicio,hora_fim,aula_numero,status_execucao,aberta_em,aberta_por,fechada_em,fechada_por,frequencia_salva_em,frequencia_salva_por,observacao_execucao,created_at,updated_at",
    )
    .eq("turma_id", turmaId)
    .order("data_aula", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const resolved = await resolveAulasExecucao((data ?? []) as AulaExecucaoRow[]);
  return resolved.filter(isAulaConfirmada);
}

function buildResumoFrequenciaAlunos(params: {
  alunos: TurmaAlunoFrequencia[];
  aulasConfirmadas: AulaExecucaoResolved[];
  presencas: PresencaResumoRow[];
}) {
  const presencaPorAlunoEAula = new Map<string, ReturnType<typeof mapStatusPresenca>>();

  for (const presenca of params.presencas) {
    const status = mapStatusPresenca(presenca.status);
    const key = `${presenca.aluno_pessoa_id}:${presenca.aula_id}`;
    presencaPorAlunoEAula.set(key, status);
  }

  return [...params.alunos]
    .sort(compareNomeAsc)
    .map((aluno) => {
      const aulasContextuais = params.aulasConfirmadas.filter((aula) => isAulaDentroDoVinculo(aula.data_aula, aluno));

      let presencasConfirmadas = 0;
      let faltasConfirmadas = 0;

      for (const aula of aulasContextuais) {
        const status = presencaPorAlunoEAula.get(`${aluno.aluno_pessoa_id}:${aula.id}`) ?? null;
        if (status === "PRESENTE" || status === "ATRASO") {
          presencasConfirmadas += 1;
        } else {
          faltasConfirmadas += 1;
        }
      }

      const totalAulasConfirmadas = aulasContextuais.length;
      const percentualFrequencia = toPercent(presencasConfirmadas, totalAulasConfirmadas);

      return {
        aluno_pessoa_id: aluno.aluno_pessoa_id,
        nome: aluno.nome ?? `Aluno ${aluno.aluno_pessoa_id}`,
        matricula_id: aluno.matricula_id ?? null,
        matricula_status: aluno.matricula_status ?? null,
        turma_aluno_status: aluno.turma_aluno_status ?? null,
        total_aulas_confirmadas: totalAulasConfirmadas,
        presencas_confirmadas: presencasConfirmadas,
        faltas_confirmadas: faltasConfirmadas,
        percentual_frequencia: percentualFrequencia,
        faixa_status: faixaStatus(percentualFrequencia, totalAulasConfirmadas),
      } satisfies TurmaAlunoResumoFrequencia;
    });
}

export async function listTurmasLeves(params: { supabase: Supa; userId: string }) {
  const access = await getAccessibleTurmaIds(params);
  if (access.turmaIds && access.turmaIds.length === 0) {
    return [] as TurmaListagemLeveItem[];
  }

  let query = params.supabase
    .from("turmas")
    .select(
      `
        turma_id,
        nome,
        curso,
        nivel,
        turno,
        status,
        ano_referencia,
        dias_semana,
        hora_inicio,
        hora_fim,
        horarios:turmas_horarios (
          day_of_week,
          inicio,
          fim
        )
      `,
    )
    .order("ano_referencia", { ascending: false })
    .order("nome", { ascending: true });

  if (access.turmaIds) {
    query = query.in("turma_id", access.turmaIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as TurmaListRow[];
  const turmaIds = rows.map((row) => Number(row.turma_id)).filter((turmaId) => Number.isInteger(turmaId) && turmaId > 0);

  const [professorPrincipalMap, resumoAlunosMap] = await Promise.all([
    loadProfessorPrincipalMap(params.supabase, turmaIds),
    carregarResumoAlunosTurmas(params.supabase, turmaIds),
  ]);

  return rows.map((row) => {
    const diasSemana = parseDiasSemana(row.dias_semana);
    const horarioResolvido = resolverHorarioTurma({
      turma: {
        hora_inicio: row.hora_inicio ?? null,
        hora_fim: row.hora_fim ?? null,
      },
      horarios: row.horarios ?? [],
    });
    const horaInicio = normalizeHora(horarioResolvido.hora_inicio);
    const horaFim = normalizeHora(horarioResolvido.hora_fim);
    const resumoAlunos = resumoAlunosMap.get(Number(row.turma_id));

    return {
      turma_id: Number(row.turma_id),
      nome: row.nome ?? null,
      curso: row.curso ?? null,
      nivel: row.nivel ?? null,
      turno: row.turno ?? null,
      status: row.status ?? null,
      ano_referencia: row.ano_referencia ?? null,
      dias_semana: diasSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      grade_horario: formatGradeHorario({
        dias_semana: diasSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
      }),
      professor_principal: professorPrincipalMap.get(Number(row.turma_id)) ?? null,
      total_alunos: resumoAlunos?.total_alunos ?? 0,
    } satisfies TurmaListagemLeveItem;
  });
}

export async function getTurmaDetalheOperacional(params: { supabase: Supa; userId: string; turmaId: number }) {
  const acesso = await canManageFrequenciaTurma(params);
  if (!acesso.ok) {
    const error = new Error(acesso.message);
    error.name = acesso.code;
    throw error;
  }

  const [turmaBase, alunosTurma, aulasConfirmadas, professorPrincipalMap, resumoAlunosMap] = await Promise.all([
    loadTurmaDetalheBase(params.supabase, params.turmaId),
    listarAlunosDaTurmaFrequencia({
      supabase: params.supabase,
      turmaId: params.turmaId,
    }),
    loadAulasConfirmadasTurma(params.supabase, params.turmaId),
    loadProfessorPrincipalMap(params.supabase, [params.turmaId]),
    carregarResumoAlunosTurmas(params.supabase, [params.turmaId]),
  ]);

  const aulaIds = aulasConfirmadas.map((aula) => aula.id);
  let presencas: PresencaResumoRow[] = [];

  if (aulaIds.length > 0) {
    const { data, error } = await params.supabase
      .from("turma_aula_presencas")
      .select("aula_id,aluno_pessoa_id,status")
      .in("aula_id", aulaIds);

    if (error) {
      throw new Error(error.message);
    }

    presencas = (data ?? []) as PresencaResumoRow[];
  }

  const diasSemana = parseDiasSemana(turmaBase.dias_semana);
  const horarioResolvido = resolverHorarioTurma({
    turma: {
      hora_inicio: turmaBase.hora_inicio ?? null,
      hora_fim: turmaBase.hora_fim ?? null,
    },
    horarios: turmaBase.horarios ?? [],
  });
  const horaInicio = normalizeHora(horarioResolvido.hora_inicio);
  const horaFim = normalizeHora(horarioResolvido.hora_fim);
  const totalAlunos = resumoAlunosMap.get(params.turmaId)?.total_alunos ?? alunosTurma.ativos.length;

  return {
    turma: {
      turma_id: params.turmaId,
      nome: turmaBase.nome ?? null,
      curso: turmaBase.curso ?? null,
      nivel: turmaBase.nivel ?? null,
      turno: turmaBase.turno ?? null,
      status: turmaBase.status ?? null,
      ano_referencia: turmaBase.ano_referencia ?? null,
      tipo_turma: turmaBase.tipo_turma ?? null,
      data_inicio: turmaBase.data_inicio ?? null,
      data_fim: turmaBase.data_fim ?? null,
      capacidade: turmaBase.capacidade ?? null,
      periodo_letivo_id: turmaBase.periodo_letivo_id ?? null,
      encerramento_automatico: turmaBase.encerramento_automatico ?? null,
      frequencia_minima_percentual: turmaBase.frequencia_minima_percentual ?? null,
      carga_horaria_prevista: turmaBase.carga_horaria_prevista ?? null,
      observacoes: turmaBase.observacoes ?? null,
      professor_principal: professorPrincipalMap.get(params.turmaId) ?? null,
      grade_horario: formatGradeHorario({
        dias_semana: diasSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
      }),
      dias_semana: diasSemana,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      total_alunos: totalAlunos,
      espaco_nome: turmaBase.espaco?.nome ?? null,
      local_nome: turmaBase.espaco?.local?.nome ?? null,
    },
    alunos: buildResumoFrequenciaAlunos({
      alunos: alunosTurma.ativos,
      aulasConfirmadas,
      presencas,
    }),
    aulas_confirmadas: aulasConfirmadas.map((aula) => ({
      aula_id: aula.id,
      data_aula: aula.data_aula,
      aula_numero: aula.aula_numero ?? null,
      hora_inicio: aula.hora_inicio ?? null,
      hora_fim: aula.hora_fim ?? null,
      status_execucao: aula.status_execucao,
      fechada_em: aula.fechada_em ?? null,
      fechada_por_nome: aula.fechada_por_nome ?? null,
      frequencia_salva_em: aula.frequencia_salva_em ?? null,
      observacao_execucao: aula.observacao_execucao ?? null,
    })),
  } satisfies TurmaDetalheOperacional;
}

export async function getPlanoContextoDaAula(params: { supabase: Supa; aulaId: number; aula?: AulaExecucaoResolved | null }) {
  const aula = params.aula ?? (await getAulaExecucaoById(params.supabase, params.aulaId));
  const aulaNumero = aula.aula_numero ?? null;

  if (!aulaNumero) {
    return {
      ciclo: null,
      plano: null,
      instancia: null,
    } satisfies PlanoContexto;
  }

  const { data: ciclo, error: cicloErr } = await params.supabase
    .from("planejamento_ciclos")
    .select("id,turma_id,status,aula_inicio_numero,aula_fim_numero")
    .eq("turma_id", aula.turma_id)
    .in("status", ["APROVADO", "EM_EXECUCAO"])
    .lte("aula_inicio_numero", aulaNumero)
    .gte("aula_fim_numero", aulaNumero)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cicloErr) {
    throw new Error(cicloErr.message);
  }

  let plano: Record<string, unknown> | null = null;
  if (ciclo?.id) {
    const { data: planoRow, error: planoErr } = await params.supabase
      .from("planos_aula")
      .select(
        "id,ciclo_id,aula_numero,intencao_pedagogica,observacoes_gerais,playlist_url,plano_aula_blocos(id,plano_aula_id,ordem,titulo,objetivo,minutos_min,minutos_ideal,minutos_max,musica_sugestao,observacoes,plano_aula_subblocos(id,bloco_id,ordem,titulo,minutos_min,minutos_ideal,minutos_max,habilidade_id,nivel_abordagem,instrucoes,musica_sugestao))",
      )
      .eq("ciclo_id", ciclo.id)
      .eq("aula_numero", aulaNumero)
      .maybeSingle();

    if (planoErr) {
      throw new Error(planoErr.message);
    }

    plano = (planoRow as Record<string, unknown> | null) ?? null;
  }

  const { data: instancia, error: instanciaErr } = await params.supabase
    .from("plano_aula_instancias")
    .select("id,turma_aula_id,plano_aula_id,status,notas_pos_aula,concluido_por,concluido_em")
    .eq("turma_aula_id", aula.id)
    .maybeSingle();

  if (instanciaErr) {
    throw new Error(instanciaErr.message);
  }

  return {
    ciclo: ciclo
      ? {
          id: Number(ciclo.id),
          turma_id: Number(ciclo.turma_id),
          status: ciclo.status ?? null,
          aula_inicio_numero: ciclo.aula_inicio_numero ?? null,
          aula_fim_numero: ciclo.aula_fim_numero ?? null,
        }
      : null,
    plano,
    instancia: instancia
      ? {
          id: Number(instancia.id),
          turma_aula_id: Number(instancia.turma_aula_id),
          plano_aula_id: Number(instancia.plano_aula_id),
          status: instancia.status ?? null,
          notas_pos_aula: instancia.notas_pos_aula ?? null,
          concluido_por: instancia.concluido_por ?? null,
          concluido_em: instancia.concluido_em ?? null,
        }
      : null,
  } satisfies PlanoContexto;
}

export async function getAulaDetalheOperacional(params: {
  supabase: Supa;
  userId: string;
  turmaId: number;
  aulaId: number;
}) {
  const detalheTurma = await getTurmaDetalheOperacional({
    supabase: params.supabase,
    userId: params.userId,
    turmaId: params.turmaId,
  });
  const aula = await getAulaExecucaoById(params.supabase, params.aulaId);

  if (aula.turma_id !== params.turmaId) {
    throw new Error("AULA_FORA_DA_TURMA");
  }

  const [planoContexto, frequencia, avaliacoesTurma] = await Promise.all([
    getPlanoContextoDaAula({ supabase: params.supabase, aulaId: params.aulaId, aula }),
    getAulaFrequenciaPayload({ supabase: params.supabase, aulaId: params.aulaId, aula }),
    listarAvaliacoesDaTurma(params.turmaId),
  ]);

  const avaliacoesRelacionadas = avaliacoesTurma
    .filter((avaliacao) => {
      if (avaliacao.data_realizada) return avaliacao.data_realizada === aula.data_aula;
      if (avaliacao.data_prevista) return avaliacao.data_prevista === aula.data_aula;
      return false;
    })
    .sort((a, b) => (a.data_realizada ?? a.data_prevista ?? "").localeCompare(b.data_realizada ?? b.data_prevista ?? ""));

  return {
    turma: detalheTurma.turma,
    aula,
    plano_contexto: planoContexto,
    avaliacoes_relacionadas: avaliacoesRelacionadas,
    frequencia,
  } satisfies AulaDetalheOperacional;
}
