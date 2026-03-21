import type { SupabaseClient } from "@supabase/supabase-js";
import { carregarResumoAlunosTurmas } from "@/lib/academico/turmasResumoServer";
import {
  calcularResumoExecucaoTurma,
  resolveAulasExecucao,
  type AulaExecucaoResolved,
  type AulaExecucaoRow,
  type SituacaoExecucaoAula,
  type StatusExecucaoAula,
} from "@/lib/academico/execucao-aula";
import { getResumoAlunosTurma, type ResumoAlunosTurma } from "@/lib/turmas";

type Supa = SupabaseClient<any, any, any, any, any>;

export type StatusPresenca = "PRESENTE" | "FALTA" | "JUSTIFICADA" | "ATRASO";

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  capacidade: number | null;
  frequencia_minima_percentual: number | null;
};

type TurmaAlunoRow = {
  turma_aluno_id: number;
  aluno_pessoa_id: number;
  matricula_id: number | null;
  status: string | null;
  dt_inicio: string | null;
  dt_fim: string | null;
  matricula: { status: string | null } | null;
  pessoa: { id: number; nome: string | null; nascimento: string | null } | null;
};

type AulaRow = AulaExecucaoResolved;

type PresencaRow = {
  id: number;
  aula_id: number;
  aluno_pessoa_id: number;
  status: string | null;
  minutos_atraso: number | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string | null;
  updated_at: string | null;
  pessoa?: { id: number; nome: string | null } | null;
};

export type TurmaAlunoFrequencia = {
  turma_aluno_id: number;
  aluno_pessoa_id: number;
  nome: string | null;
  data_nascimento: string | null;
  matricula_id: number | null;
  matricula_status: string | null;
  turma_aluno_status: string | null;
  dt_inicio: string | null;
  dt_fim: string | null;
};

export type FrequenciaTurmaInfo = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  capacidade: number | null;
  frequencia_minima_percentual: number | null;
  resumo_alunos: ResumoAlunosTurma;
};

export type FrequenciaAulaResumo = {
  id: number;
  turma_id: number;
  data_aula: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  aula_numero: number | null;
  status_execucao: StatusExecucaoAula;
  situacao_execucao: SituacaoExecucaoAula;
  aberta_em: string | null;
  aberta_por: string | null;
  aberta_por_nome: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  fechada_por_nome: string | null;
  frequencia_salva_em: string | null;
  frequencia_salva_por: string | null;
  frequencia_salva_por_nome: string | null;
  observacao_execucao: string | null;
  created_at: string | null;
  updated_at: string | null;
  status_chamada: "FECHADA" | "PENDENTE";
  total_registros: number;
  presentes: number;
  faltas: number;
  atrasos: number;
  justificadas: number;
  percentual_presenca: number;
};

export type FrequenciaAlunoResumo = {
  aluno_pessoa_id: number;
  nome: string | null;
  data_nascimento: string | null;
  matricula_id: number | null;
  matricula_status: string | null;
  turma_aluno_status: string | null;
  total_registros: number;
  presentes: number;
  faltas: number;
  atrasos: number;
  justificadas: number;
  percentual_frequencia: number;
  ultima_presenca: {
    aula_id: number;
    data_aula: string;
    aula_numero: number | null;
    status: StatusPresenca;
    minutos_atraso: number | null;
    observacao: string | null;
    fechada_em: string | null;
  } | null;
};

export type HistoricoFrequenciaTurmaResult = {
  turma: FrequenciaTurmaInfo;
  filtros: {
    data_inicio: string | null;
    data_fim: string | null;
    status_presenca: StatusPresenca | null;
    aluno_id: number | null;
  };
  resumo: {
    total_alunos: number;
    total_alunos_com_registro: number;
    aulas_total: number;
    aulas_previstas_periodo: number;
    aulas_abertas: number;
    aulas_fechadas: number;
    aulas_pendentes: number;
    aulas_nao_realizadas: number;
    presentes: number;
    faltas: number;
    atrasos: number;
    justificadas: number;
    percentual_medio_turma: number;
    pagantes: number;
    concessao_integral: number;
    concessao_parcial: number;
    capacidade: number | null;
    vagas: number | null;
    ocupacao_percentual: number | null;
    alertas_operacionais: string[];
  };
  aulas: FrequenciaAulaResumo[];
  alunos: FrequenciaAlunoResumo[];
  execucao: {
    ultimas_aulas_registradas: FrequenciaAulaResumo[];
    proximas_aulas_previstas: Array<{
      data_aula: string;
      hora_inicio: string | null;
      hora_fim: string | null;
      situacao_execucao: SituacaoExecucaoAula;
      origem: "GRADE" | "ENCONTRO" | "AULA";
    }>;
    pendencias_operacionais: Array<{
      data_aula: string;
      hora_inicio: string | null;
      hora_fim: string | null;
      situacao_execucao: SituacaoExecucaoAula;
      origem: "GRADE" | "ENCONTRO" | "AULA";
    }>;
  };
};

export type HistoricoFrequenciaAlunoTurma = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status_turma: string | null;
  matricula_status: string | null;
  turma_aluno_status: string | null;
  dt_inicio: string | null;
  dt_fim: string | null;
  frequencia_minima_percentual: number | null;
  total_aulas: number;
  presencas: number;
  faltas: number;
  atrasos: number;
  justificadas: number;
  percentual_frequencia: number;
  ultima_presenca: {
    aula_id: number;
    data_aula: string;
    aula_numero: number | null;
    status: StatusPresenca;
    minutos_atraso: number | null;
    observacao: string | null;
    fechada_em: string | null;
  } | null;
};

export type HistoricoFrequenciaAlunoResult = {
  aluno_pessoa_id: number;
  resumo: {
    turmas_total: number;
    total_aulas: number;
    presencas: number;
    faltas: number;
    atrasos: number;
    justificadas: number;
    percentual_frequencia: number;
  };
  turmas: HistoricoFrequenciaAlunoTurma[];
  ultimas_presencas: Array<{
    aula_id: number;
    turma_id: number;
    turma_nome: string | null;
    data_aula: string;
    aula_numero: number | null;
    status: StatusPresenca;
    minutos_atraso: number | null;
    observacao: string | null;
    fechada_em: string | null;
  }>;
};

export type AulaFrequenciaPayload = {
  turma: FrequenciaTurmaInfo;
  aula: AulaRow;
  alunos: Array<
    TurmaAlunoFrequencia & {
      status_presenca: StatusPresenca | null;
      minutos_atraso: number | null;
      observacao: string | null;
    }
  >;
  presencas: Array<{
    id: number;
    aula_id: number;
    aluno_pessoa_id: number;
    status: StatusPresenca;
    minutos_atraso: number | null;
    observacao: string | null;
    registrado_por: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>;
  resumo: {
    total_alunos: number;
    presentes: number;
    faltas: number;
    atrasos: number;
    justificadas: number;
    pagantes: number;
    concessao_integral: number;
    concessao_parcial: number;
    capacidade: number | null;
    vagas: number | null;
    ocupacao_percentual: number | null;
    status_chamada: "FECHADA" | "PENDENTE";
  };
};

type StatusCounter = {
  presentes: number;
  faltas: number;
  atrasos: number;
  justificadas: number;
};

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function createCounter(): StatusCounter {
  return {
    presentes: 0,
    faltas: 0,
    atrasos: 0,
    justificadas: 0,
  };
}

function addStatus(counter: StatusCounter, status: StatusPresenca | null) {
  if (!status) return;

  switch (status) {
    case "PRESENTE":
      counter.presentes += 1;
      return;
    case "FALTA":
      counter.faltas += 1;
      return;
    case "ATRASO":
      counter.atrasos += 1;
      return;
    case "JUSTIFICADA":
      counter.justificadas += 1;
      return;
  }
}

function compareByNome(a: { nome: string | null }, b: { nome: string | null }) {
  const nomeA = (a.nome ?? "").trim();
  const nomeB = (b.nome ?? "").trim();
  if (nomeA && nomeB) return nomeA.localeCompare(nomeB, "pt-BR");
  if (nomeA) return -1;
  if (nomeB) return 1;
  return 0;
}

function compareByDateDesc(a: { data_aula: string }, b: { data_aula: string }) {
  return b.data_aula.localeCompare(a.data_aula);
}

function isVinculoAtivo(item: TurmaAlunoFrequencia, refDate?: string | null) {
  const dataRef = normalizeDate(refDate);
  const inicio = normalizeDate(item.dt_inicio);
  const fim = normalizeDate(item.dt_fim);
  const dentroJanela =
    (!dataRef || !inicio || inicio <= dataRef) &&
    (!dataRef || !fim || fim >= dataRef);

  const matriculaStatus = normalizeStatus(item.matricula_status);
  const turmaStatus = normalizeStatus(item.turma_aluno_status);
  const matriculaAtiva = matriculaStatus === "ATIVA" || matriculaStatus === "ATIVO";
  const turmaInativa =
    turmaStatus === "ENCERRADO" ||
    turmaStatus === "INATIVA" ||
    turmaStatus === "INATIVO" ||
    turmaStatus === "CANCELADA" ||
    turmaStatus === "CANCELADO";
  const turmaAtiva = !turmaInativa && (!turmaStatus || turmaStatus === "ATIVA" || turmaStatus === "ATIVO");

  return dentroJanela && (matriculaAtiva || turmaAtiva);
}

function shouldReplaceTurmaAluno(
  existing: TurmaAlunoFrequencia,
  candidate: TurmaAlunoFrequencia,
  refDate?: string | null,
) {
  const existingActive = isVinculoAtivo(existing, refDate);
  const candidateActive = isVinculoAtivo(candidate, refDate);
  if (existingActive !== candidateActive) {
    return candidateActive;
  }

  const existingInicio = existing.dt_inicio ?? "";
  const candidateInicio = candidate.dt_inicio ?? "";
  if (existingInicio !== candidateInicio) {
    return candidateInicio > existingInicio;
  }

  const existingFim = existing.dt_fim ?? "";
  const candidateFim = candidate.dt_fim ?? "";
  if (existingFim !== candidateFim) {
    return candidateFim > existingFim;
  }

  return candidate.turma_aluno_id > existing.turma_aluno_id;
}

function buildTurmaInfo(turma: TurmaRow, resumoAlunos: ResumoAlunosTurma): FrequenciaTurmaInfo {
  return {
    turma_id: turma.turma_id,
    nome: turma.nome ?? null,
    curso: turma.curso ?? null,
    nivel: turma.nivel ?? null,
    turno: turma.turno ?? null,
    status: turma.status ?? null,
    capacidade: turma.capacidade ?? resumoAlunos.capacidade ?? null,
    frequencia_minima_percentual: turma.frequencia_minima_percentual ?? null,
    resumo_alunos: getResumoAlunosTurma({
      ...resumoAlunos,
      capacidade: resumoAlunos.capacidade ?? turma.capacidade ?? null,
    }),
  };
}

async function getTurmaInfo(params: { supabase: Supa; turmaId: number }) {
  const { data, error } = await params.supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,status,capacidade,frequencia_minima_percentual")
    .eq("turma_id", params.turmaId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "TURMA_NAO_ENCONTRADA");
  }

  const resumoByTurmaId = await carregarResumoAlunosTurmas(params.supabase, [params.turmaId]);
  const resumoAlunos = resumoByTurmaId.get(params.turmaId) ?? getResumoAlunosTurma();

  return buildTurmaInfo(data as TurmaRow, resumoAlunos);
}

async function getAulasDaTurma(params: {
  supabase: Supa;
  turmaId: number;
  dataInicio?: string | null;
  dataFim?: string | null;
}) {
  let query = params.supabase
    .from("turma_aulas")
    .select(
      "id,turma_id,data_aula,hora_inicio,hora_fim,aula_numero,status_execucao,aberta_em,aberta_por,fechada_em,fechada_por,frequencia_salva_em,frequencia_salva_por,observacao_execucao,created_at,updated_at",
    )
    .eq("turma_id", params.turmaId)
    .order("data_aula", { ascending: false })
    .order("id", { ascending: false });

  if (params.dataInicio) {
    query = query.gte("data_aula", params.dataInicio);
  }
  if (params.dataFim) {
    query = query.lte("data_aula", params.dataFim);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return resolveAulasExecucao((data ?? []) as AulaExecucaoRow[]);
}

async function getPresencasPorAulas(params: {
  supabase: Supa;
  aulaIds: number[];
  alunoId?: number | null;
  statusPresenca?: StatusPresenca | null;
}) {
  if (params.aulaIds.length === 0) {
    return [] as PresencaRow[];
  }

  let query = params.supabase
    .from("turma_aula_presencas")
    .select("id,aula_id,aluno_pessoa_id,status,minutos_atraso,observacao,registrado_por,created_at,updated_at,pessoa:pessoas(id,nome)")
    .in("aula_id", params.aulaIds)
    .order("aula_id", { ascending: false })
    .order("aluno_pessoa_id", { ascending: true })
    .order("created_at", { ascending: false });

  if (params.alunoId) {
    query = query.eq("aluno_pessoa_id", params.alunoId);
  }
  if (params.statusPresenca) {
    query = query.eq("status", params.statusPresenca);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PresencaRow[]).map((item) => ({
    ...item,
    status: item.status ?? null,
    minutos_atraso: item.minutos_atraso ?? null,
    observacao: item.observacao ?? null,
    registrado_por: item.registrado_por ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    pessoa: item.pessoa ?? null,
  }));
}

export function mapStatusPresenca(status: unknown): StatusPresenca | null {
  const normalized = normalizeStatus(status);
  if (
    normalized === "PRESENTE" ||
    normalized === "FALTA" ||
    normalized === "JUSTIFICADA" ||
    normalized === "ATRASO"
  ) {
    return normalized;
  }

  return null;
}

function isAulaValidada(aula: Pick<AulaRow, "status_execucao" | "fechada_em"> | null | undefined) {
  if (!aula) return false;
  return aula.status_execucao === "VALIDADA" || Boolean(aula.fechada_em);
}

export async function listarAlunosDaTurmaFrequencia(params: {
  supabase: Supa;
  turmaId: number;
  refDate?: string | null;
  alunoId?: number | null;
}) {
  let query = params.supabase
    .from("turma_aluno")
    .select(
      "turma_aluno_id,aluno_pessoa_id,matricula_id,status,dt_inicio,dt_fim,matricula:matriculas(status),pessoa:pessoas(id,nome,nascimento)",
    )
    .eq("turma_id", params.turmaId)
    .order("dt_inicio", { ascending: false })
    .order("turma_aluno_id", { ascending: false });

  if (params.alunoId) {
    query = query.eq("aluno_pessoa_id", params.alunoId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const deduped = new Map<number, TurmaAlunoFrequencia>();
  for (const row of (data ?? []) as TurmaAlunoRow[]) {
    const item: TurmaAlunoFrequencia = {
      turma_aluno_id: row.turma_aluno_id,
      aluno_pessoa_id: row.aluno_pessoa_id,
      nome: row.pessoa?.nome ?? null,
      data_nascimento: row.pessoa?.nascimento ?? null,
      matricula_id: row.matricula_id ?? null,
      matricula_status: row.matricula?.status ?? null,
      turma_aluno_status: row.status ?? null,
      dt_inicio: row.dt_inicio ?? null,
      dt_fim: row.dt_fim ?? null,
    };

    const existing = deduped.get(item.aluno_pessoa_id);
    if (!existing || shouldReplaceTurmaAluno(existing, item, params.refDate)) {
      deduped.set(item.aluno_pessoa_id, item);
    }
  }

  const todos = [...deduped.values()].sort(compareByNome);
  const ativos = todos.filter((item) => isVinculoAtivo(item, params.refDate));
  const ativosSet = new Set(ativos.map((item) => item.aluno_pessoa_id));

  return {
    todos,
    ativos,
    historico: todos.filter((item) => !ativosSet.has(item.aluno_pessoa_id)),
  };
}

export async function getAulaFrequenciaPayload(params: {
  supabase: Supa;
  aulaId: number;
  aula?: AulaRow | null;
}) {
  let aula = params.aula ?? null;
  if (!aula) {
    const { data, error } = await params.supabase
      .from("turma_aulas")
      .select(
        "id,turma_id,data_aula,hora_inicio,hora_fim,aula_numero,status_execucao,aberta_em,aberta_por,fechada_em,fechada_por,frequencia_salva_em,frequencia_salva_por,observacao_execucao,created_at,updated_at",
      )
      .eq("id", params.aulaId)
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "AULA_NAO_ENCONTRADA");
    }

    const [resolved] = await resolveAulasExecucao([data as AulaExecucaoRow]);
    aula = resolved ?? null;
  }

  if (!aula) {
    throw new Error("AULA_NAO_ENCONTRADA");
  }

  const [turma, alunosTurma, presencasRaw] = await Promise.all([
    getTurmaInfo({ supabase: params.supabase, turmaId: aula.turma_id }),
    listarAlunosDaTurmaFrequencia({
      supabase: params.supabase,
      turmaId: aula.turma_id,
      refDate: aula.data_aula,
    }),
    getPresencasPorAulas({
      supabase: params.supabase,
      aulaIds: [aula.id],
    }),
  ]);

  const presencas = presencasRaw
    .map((item) => {
      const status = mapStatusPresenca(item.status);
      if (!status) return null;

      return {
        id: item.id,
        aula_id: item.aula_id,
        aluno_pessoa_id: item.aluno_pessoa_id,
        status,
        minutos_atraso: item.minutos_atraso ?? null,
        observacao: item.observacao ?? null,
        registrado_por: item.registrado_por ?? null,
        created_at: item.created_at ?? null,
        updated_at: item.updated_at ?? null,
      };
    })
    .filter((item): item is AulaFrequenciaPayload["presencas"][number] => Boolean(item));

  const counter = createCounter();
  const presencaByAluno = new Map<number, AulaFrequenciaPayload["presencas"][number]>();
  for (const presenca of presencas) {
    addStatus(counter, presenca.status);
    presencaByAluno.set(presenca.aluno_pessoa_id, presenca);
  }

  const alunosMap = new Map<number, TurmaAlunoFrequencia>();
  for (const aluno of alunosTurma.ativos) {
    alunosMap.set(aluno.aluno_pessoa_id, aluno);
  }
  for (const presenca of presencasRaw) {
    if (alunosMap.has(presenca.aluno_pessoa_id)) continue;
    alunosMap.set(presenca.aluno_pessoa_id, {
      turma_aluno_id: 0,
      aluno_pessoa_id: presenca.aluno_pessoa_id,
      nome: presenca.pessoa?.nome ?? `Aluno ${presenca.aluno_pessoa_id}`,
      data_nascimento: null,
      matricula_id: null,
      matricula_status: null,
      turma_aluno_status: null,
      dt_inicio: null,
      dt_fim: null,
    });
  }

  const alunos = [...alunosMap.values()]
    .sort(compareByNome)
    .map((aluno) => {
      const presenca = presencaByAluno.get(aluno.aluno_pessoa_id);
      return {
        ...aluno,
        status_presenca: presenca?.status ?? null,
        minutos_atraso: presenca?.minutos_atraso ?? null,
        observacao: presenca?.observacao ?? null,
      };
    });

  const capacidade = turma.resumo_alunos.capacidade ?? turma.capacidade ?? null;
  const vagas = turma.resumo_alunos.vagas_disponiveis ?? null;
  const ocupacaoPercentual =
    capacidade && capacidade > 0
      ? toPercent(turma.resumo_alunos.total_alunos, capacidade)
      : null;

  return {
    turma,
    aula,
    alunos,
    presencas,
    resumo: {
      total_alunos: alunos.length,
      presentes: counter.presentes,
      faltas: counter.faltas,
      atrasos: counter.atrasos,
      justificadas: counter.justificadas,
      pagantes: turma.resumo_alunos.pagantes,
      concessao_integral: turma.resumo_alunos.concessao_integral,
      concessao_parcial: turma.resumo_alunos.concessao_parcial,
      capacidade,
      vagas,
      ocupacao_percentual: ocupacaoPercentual,
      status_chamada: isAulaValidada(aula) ? "FECHADA" : "PENDENTE",
    },
  } satisfies AulaFrequenciaPayload;
}

export async function getHistoricoFrequenciaTurma(params: {
  supabase: Supa;
  turmaId: number;
  dataInicio?: string | null;
  dataFim?: string | null;
  statusPresenca?: StatusPresenca | null;
  alunoId?: number | null;
}) {
  const dataInicio = normalizeDate(params.dataInicio);
  const dataFim = normalizeDate(params.dataFim);

  const [turma, alunosTurma, aulas, execucao] = await Promise.all([
    getTurmaInfo({ supabase: params.supabase, turmaId: params.turmaId }),
    listarAlunosDaTurmaFrequencia({
      supabase: params.supabase,
      turmaId: params.turmaId,
      alunoId: params.alunoId ?? null,
      refDate: dataFim ?? dataInicio ?? null,
    }),
    getAulasDaTurma({
      supabase: params.supabase,
      turmaId: params.turmaId,
      dataInicio,
      dataFim,
    }),
    calcularResumoExecucaoTurma({
      supabase: params.supabase,
      turmaId: params.turmaId,
      dataInicio,
      dataFim,
    }),
  ]);

  const presencasRaw = await getPresencasPorAulas({
    supabase: params.supabase,
    aulaIds: aulas.map((item) => item.id),
    alunoId: params.alunoId ?? null,
    statusPresenca: params.statusPresenca ?? null,
  });

  const aulasMap = new Map<number, FrequenciaAulaResumo>();
  for (const aula of aulas) {
    aulasMap.set(aula.id, {
      id: aula.id,
      turma_id: aula.turma_id,
      data_aula: aula.data_aula,
      hora_inicio: aula.hora_inicio ?? null,
      hora_fim: aula.hora_fim ?? null,
      aula_numero: aula.aula_numero ?? null,
      status_execucao: aula.status_execucao,
      situacao_execucao: aula.status_execucao,
      aberta_em: aula.aberta_em ?? null,
      aberta_por: aula.aberta_por ?? null,
      aberta_por_nome: aula.aberta_por_nome ?? null,
      fechada_em: aula.fechada_em ?? null,
      fechada_por: aula.fechada_por ?? null,
      fechada_por_nome: aula.fechada_por_nome ?? null,
      frequencia_salva_em: aula.frequencia_salva_em ?? null,
      frequencia_salva_por: aula.frequencia_salva_por ?? null,
      frequencia_salva_por_nome: aula.frequencia_salva_por_nome ?? null,
      observacao_execucao: aula.observacao_execucao ?? null,
      created_at: aula.created_at ?? null,
      updated_at: aula.updated_at ?? null,
      status_chamada: isAulaValidada(aula) ? "FECHADA" : "PENDENTE",
      total_registros: 0,
      presentes: 0,
      faltas: 0,
      atrasos: 0,
      justificadas: 0,
      percentual_presenca: 0,
    });
  }

  const alunoMap = new Map<number, FrequenciaAlunoResumo>();
  const ensureAluno = (alunoId: number, fallbackNome?: string | null) => {
    const existing = alunoMap.get(alunoId);
    if (existing) return existing;

    const vinculo = alunosTurma.todos.find((item) => item.aluno_pessoa_id === alunoId) ?? null;
    const created: FrequenciaAlunoResumo = {
      aluno_pessoa_id: alunoId,
      nome: vinculo?.nome ?? fallbackNome ?? `Aluno ${alunoId}`,
      data_nascimento: vinculo?.data_nascimento ?? null,
      matricula_id: vinculo?.matricula_id ?? null,
      matricula_status: vinculo?.matricula_status ?? null,
      turma_aluno_status: vinculo?.turma_aluno_status ?? null,
      total_registros: 0,
      presentes: 0,
      faltas: 0,
      atrasos: 0,
      justificadas: 0,
      percentual_frequencia: 0,
      ultima_presenca: null,
    };
    alunoMap.set(alunoId, created);
    return created;
  };

  for (const aluno of alunosTurma.todos) {
    ensureAluno(aluno.aluno_pessoa_id, aluno.nome);
  }

  const totais = createCounter();
  for (const presenca of presencasRaw) {
    const status = mapStatusPresenca(presenca.status);
    if (!status) continue;

    const aula = aulasMap.get(presenca.aula_id);
    if (!aula) continue;

    const aluno = ensureAluno(presenca.aluno_pessoa_id, presenca.pessoa?.nome ?? null);
    aula.total_registros += 1;
    addStatus(aula, status);
    aula.percentual_presenca = toPercent(aula.presentes + aula.atrasos, aula.total_registros);

    if (!isAulaValidada(aula)) {
      continue;
    }

    aluno.total_registros += 1;
    addStatus(aluno, status);
    aluno.percentual_frequencia = toPercent(aluno.presentes + aluno.atrasos, aluno.total_registros);
    if (
      !aluno.ultima_presenca ||
      aula.data_aula > aluno.ultima_presenca.data_aula ||
      (aula.data_aula === aluno.ultima_presenca.data_aula && presenca.aula_id > aluno.ultima_presenca.aula_id)
    ) {
      aluno.ultima_presenca = {
        aula_id: presenca.aula_id,
        data_aula: aula.data_aula,
        aula_numero: aula.aula_numero,
        status,
        minutos_atraso: presenca.minutos_atraso ?? null,
        observacao: presenca.observacao ?? null,
        fechada_em: aula.fechada_em,
      };
    }

    addStatus(totais, status);
  }

  const alunos = [...alunoMap.values()]
    .sort(compareByNome)
    .filter((item) => (params.alunoId ? item.aluno_pessoa_id === params.alunoId : true));

  const aulasList = [...aulasMap.values()].sort(compareByDateDesc);
  const alunosComRegistro = alunos.filter((item) => item.total_registros > 0).length;
  const percentualMedioTurma =
    alunosComRegistro > 0
      ? Math.round(
        (alunos
          .filter((item) => item.total_registros > 0)
          .reduce((acc, item) => acc + item.percentual_frequencia, 0) / alunosComRegistro) * 10,
      ) / 10
      : 0;

  const capacidade = turma.resumo_alunos.capacidade ?? turma.capacidade ?? null;
  const vagas = turma.resumo_alunos.vagas_disponiveis ?? null;
  const ocupacaoPercentual =
    capacidade && capacidade > 0
      ? toPercent(turma.resumo_alunos.total_alunos, capacidade)
      : null;

  return {
    turma,
    filtros: {
      data_inicio: dataInicio,
      data_fim: dataFim,
      status_presenca: params.statusPresenca ?? null,
      aluno_id: params.alunoId ?? null,
    },
    resumo: {
      total_alunos: turma.resumo_alunos.total_alunos,
      total_alunos_com_registro: alunosComRegistro,
      aulas_total: aulasList.length,
      aulas_previstas_periodo: execucao.total_previstas_periodo,
      aulas_abertas: execucao.total_abertas,
      aulas_fechadas: execucao.total_validadas,
      aulas_pendentes: execucao.total_pendentes,
      aulas_nao_realizadas: execucao.total_nao_realizadas,
      presentes: totais.presentes,
      faltas: totais.faltas,
      atrasos: totais.atrasos,
      justificadas: totais.justificadas,
      percentual_medio_turma: percentualMedioTurma,
      pagantes: turma.resumo_alunos.pagantes,
      concessao_integral: turma.resumo_alunos.concessao_integral,
      concessao_parcial: turma.resumo_alunos.concessao_parcial,
      capacidade,
      vagas,
      ocupacao_percentual: ocupacaoPercentual,
      alertas_operacionais: execucao.alertas,
    },
    aulas: aulasList,
    alunos,
    execucao: {
      ultimas_aulas_registradas: execucao.ultimas_registradas
        .map((item) => (item.aula_id ? aulasMap.get(item.aula_id) ?? null : null))
        .filter((item): item is FrequenciaAulaResumo => Boolean(item)),
      proximas_aulas_previstas: execucao.proximas_previstas.map((item) => ({
        data_aula: item.data_aula,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        situacao_execucao: item.situacao,
        origem: item.origem,
      })),
      pendencias_operacionais: execucao.pendencias.map((item) => ({
        data_aula: item.data_aula,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        situacao_execucao: item.situacao,
        origem: item.origem,
      })),
    },
  } satisfies HistoricoFrequenciaTurmaResult;
}

export async function getResumoFrequenciaTurma(params: {
  supabase: Supa;
  turmaId: number;
  dataInicio?: string | null;
  dataFim?: string | null;
  statusPresenca?: StatusPresenca | null;
  alunoId?: number | null;
}) {
  const historico = await getHistoricoFrequenciaTurma(params);
  return historico.resumo;
}

export async function getHistoricoFrequenciaAluno(params: {
  supabase: Supa;
  alunoId: number;
}) {
  const { data: vinculosRaw, error: vinculosError } = await params.supabase
    .from("turma_aluno")
    .select(
      "turma_aluno_id,turma_id,aluno_pessoa_id,matricula_id,status,dt_inicio,dt_fim,matricula:matriculas(status),pessoa:pessoas(id,nome),turma:turmas(turma_id,nome,curso,nivel,turno,status,capacidade,frequencia_minima_percentual)",
    )
    .eq("aluno_pessoa_id", params.alunoId)
    .order("dt_inicio", { ascending: false })
    .order("turma_aluno_id", { ascending: false });

  if (vinculosError) {
    throw new Error(vinculosError.message);
  }

  const vinculos = (vinculosRaw ?? []) as Array<
    TurmaAlunoRow & {
      turma_id: number;
      turma: TurmaRow | null;
      pessoa: { id: number; nome: string | null } | null;
    }
  >;

  const turmaIds = Array.from(new Set(vinculos.map((item) => item.turma_id).filter((item) => item > 0)));
  const aulasTodas = (
    await Promise.all(
      turmaIds.map((turmaId) =>
        getAulasDaTurma({
          supabase: params.supabase,
          turmaId,
        }),
      ),
    )
  ).flat();

  const presencas = await getPresencasPorAulas({
    supabase: params.supabase,
    aulaIds: aulasTodas.map((item) => item.id),
    alunoId: params.alunoId,
  });

  const aulasPorTurmaId = new Map<number, AulaRow[]>();
  for (const aula of aulasTodas) {
    const list = aulasPorTurmaId.get(aula.turma_id) ?? [];
    list.push(aula);
    aulasPorTurmaId.set(aula.turma_id, list);
  }

  const turmasMap = new Map<number, HistoricoFrequenciaAlunoTurma>();
  for (const vinculo of vinculos) {
    const turmaBase = vinculo.turma;
    const turmaId = vinculo.turma_id;
    if (!turmaId || !turmaBase) continue;

    const aulasFechadasElegiveis = (aulasPorTurmaId.get(turmaId) ?? []).filter((aula) => {
      if (!isAulaValidada(aula)) return false;
      const data = normalizeDate(aula.data_aula);
      const inicio = normalizeDate(vinculo.dt_inicio);
      const fim = normalizeDate(vinculo.dt_fim);
      return (!inicio || !data || data >= inicio) && (!fim || !data || data <= fim);
    }).length;

    const existing = turmasMap.get(turmaId);
    if (existing) {
      if (
        shouldReplaceTurmaAluno(
          {
            turma_aluno_id: existing.turma_id,
            aluno_pessoa_id: params.alunoId,
            nome: null,
            data_nascimento: null,
            matricula_id: null,
            matricula_status: existing.matricula_status,
            turma_aluno_status: existing.turma_aluno_status,
            dt_inicio: existing.dt_inicio,
            dt_fim: existing.dt_fim,
          },
          {
            turma_aluno_id: vinculo.turma_aluno_id,
            aluno_pessoa_id: params.alunoId,
            nome: null,
            data_nascimento: null,
            matricula_id: vinculo.matricula_id ?? null,
            matricula_status: vinculo.matricula?.status ?? null,
            turma_aluno_status: vinculo.status ?? null,
            dt_inicio: vinculo.dt_inicio ?? null,
            dt_fim: vinculo.dt_fim ?? null,
          },
        )
      ) {
        existing.matricula_status = vinculo.matricula?.status ?? null;
        existing.turma_aluno_status = vinculo.status ?? null;
        existing.dt_inicio = vinculo.dt_inicio ?? null;
        existing.dt_fim = vinculo.dt_fim ?? null;
      }
      existing.total_aulas = Math.max(existing.total_aulas, aulasFechadasElegiveis);
      continue;
    }

    turmasMap.set(turmaId, {
      turma_id: turmaId,
      nome: turmaBase.nome ?? null,
      curso: turmaBase.curso ?? null,
      nivel: turmaBase.nivel ?? null,
      turno: turmaBase.turno ?? null,
      status_turma: turmaBase.status ?? null,
      matricula_status: vinculo.matricula?.status ?? null,
      turma_aluno_status: vinculo.status ?? null,
      dt_inicio: vinculo.dt_inicio ?? null,
      dt_fim: vinculo.dt_fim ?? null,
      frequencia_minima_percentual: turmaBase.frequencia_minima_percentual ?? null,
      total_aulas: aulasFechadasElegiveis,
      presencas: 0,
      faltas: 0,
      atrasos: 0,
      justificadas: 0,
      percentual_frequencia: 0,
      ultima_presenca: null,
    });

  }

  const aulasById = new Map<number, AulaRow>();
  for (const aula of aulasTodas) {
    aulasById.set(aula.id, aula);
  }

  const ultimasPresencas: HistoricoFrequenciaAlunoResult["ultimas_presencas"] = [];
  for (const presenca of presencas) {
    const status = mapStatusPresenca(presenca.status);
    if (!status) continue;

    const aula = aulasById.get(presenca.aula_id);
    if (!aula) continue;
    if (!isAulaValidada(aula)) continue;

    const turma = turmasMap.get(aula.turma_id);
    if (!turma) continue;

    switch (status) {
      case "PRESENTE":
        turma.presencas += 1;
        break;
      case "FALTA":
        turma.faltas += 1;
        break;
      case "ATRASO":
        turma.atrasos += 1;
        break;
      case "JUSTIFICADA":
        turma.justificadas += 1;
        break;
    }

    const totalRegistrosTurma = turma.presencas + turma.atrasos + turma.faltas + turma.justificadas;
    turma.total_aulas = Math.max(turma.total_aulas, totalRegistrosTurma);
    turma.percentual_frequencia = toPercent(turma.presencas + turma.atrasos, turma.total_aulas);

    if (
      !turma.ultima_presenca ||
      aula.data_aula > turma.ultima_presenca.data_aula ||
      (aula.data_aula === turma.ultima_presenca.data_aula && aula.id > turma.ultima_presenca.aula_id)
    ) {
      turma.ultima_presenca = {
        aula_id: aula.id,
        data_aula: aula.data_aula,
        aula_numero: aula.aula_numero ?? null,
        status,
        minutos_atraso: presenca.minutos_atraso ?? null,
        observacao: presenca.observacao ?? null,
        fechada_em: aula.fechada_em ?? null,
      };
    }

    ultimasPresencas.push({
      aula_id: aula.id,
      turma_id: aula.turma_id,
      turma_nome: turma.nome,
      data_aula: aula.data_aula,
      aula_numero: aula.aula_numero ?? null,
      status,
      minutos_atraso: presenca.minutos_atraso ?? null,
      observacao: presenca.observacao ?? null,
      fechada_em: aula.fechada_em ?? null,
    });
  }

  const turmas = [...turmasMap.values()].sort((a, b) => {
    const dateA = a.dt_inicio ?? "";
    const dateB = b.dt_inicio ?? "";
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return compareByNome(a, b);
  });

  const resumo = turmas.reduce(
    (acc, turma) => {
      acc.turmas_total += 1;
      acc.total_aulas += turma.total_aulas;
      acc.presencas += turma.presencas;
      acc.faltas += turma.faltas;
      acc.atrasos += turma.atrasos;
      acc.justificadas += turma.justificadas;
      return acc;
    },
    {
      turmas_total: 0,
      total_aulas: 0,
      presencas: 0,
      faltas: 0,
      atrasos: 0,
      justificadas: 0,
      percentual_frequencia: 0,
    },
  );

  resumo.percentual_frequencia = toPercent(resumo.presencas + resumo.atrasos, resumo.total_aulas);

  return {
    aluno_pessoa_id: params.alunoId,
    resumo,
    turmas,
    ultimas_presencas: ultimasPresencas
      .sort((a, b) => b.data_aula.localeCompare(a.data_aula))
      .slice(0, 12),
  } satisfies HistoricoFrequenciaAlunoResult;
}
