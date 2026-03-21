import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type Supa = SupabaseClient<any, any, any, any, any>;

export type StatusExecucaoAula = "PENDENTE" | "ABERTA" | "VALIDADA" | "NAO_REALIZADA";
export type SituacaoExecucaoAula = StatusExecucaoAula | "PREVISTA";

export type AulaExecucaoRow = {
  id: number;
  turma_id: number;
  data_aula: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  aula_numero: number | null;
  status_execucao: string | null;
  aberta_em: string | null;
  aberta_por: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  frequencia_salva_em: string | null;
  frequencia_salva_por: string | null;
  observacao_execucao: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AulaExecucaoResolved = AulaExecucaoRow & {
  status_execucao: StatusExecucaoAula;
  aberta_por_nome: string | null;
  fechada_por_nome: string | null;
  frequencia_salva_por_nome: string | null;
};

type TurmaExecucaoBase = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  status: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  dias_semana: string[] | null;
  hora_inicio: string | null;
  hora_fim: string | null;
};

type TurmaHorarioRow = {
  day_of_week: number;
  inicio: string | null;
  fim: string | null;
};

type TurmaEncontroRow = {
  id: number;
  turma_id: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  observacao: string | null;
};

export type AulaPrevistaItem = {
  aula_id: number | null;
  turma_id: number;
  data_aula: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  origem: "GRADE" | "ENCONTRO" | "AULA";
  situacao: SituacaoExecucaoAula;
  aula: AulaExecucaoResolved | null;
};

export type ResumoExecucaoTurma = {
  total_previstas_periodo: number;
  total_abertas: number;
  total_validadas: number;
  total_pendentes: number;
  total_nao_realizadas: number;
  aulas_previstas: AulaPrevistaItem[];
  ultimas_registradas: AulaPrevistaItem[];
  proximas_previstas: AulaPrevistaItem[];
  alertas: string[];
  pendencias: AulaPrevistaItem[];
};

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 5);
}

function normalizeStatus(raw: string | null | undefined): StatusExecucaoAula {
  switch ((raw ?? "").trim().toUpperCase()) {
    case "ABERTA":
      return "ABERTA";
    case "VALIDADA":
    case "FECHADA":
      return "VALIDADA";
    case "NAO_REALIZADA":
      return "NAO_REALIZADA";
    default:
      return "PENDENTE";
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function compareByDateAsc(a: { data_aula: string }, b: { data_aula: string }) {
  return a.data_aula.localeCompare(b.data_aula);
}

function compareByDateDesc(a: { data_aula: string }, b: { data_aula: string }) {
  return b.data_aula.localeCompare(a.data_aula);
}

function padDate(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
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
    ["TUESDAY", 2],
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

function isDateInRange(dateISO: string, startISO: string | null, endISO: string | null) {
  if (startISO && dateISO < startISO) return false;
  if (endISO && dateISO > endISO) return false;
  return true;
}

function getSituacaoPlanejada(aula: AulaExecucaoResolved | null, dateISO: string, today: string): SituacaoExecucaoAula {
  if (aula) {
    return aula.status_execucao;
  }
  if (dateISO > today) return "PREVISTA";
  if (dateISO === today) return "PENDENTE";
  return "NAO_REALIZADA";
}

async function resolveDisplayNames(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter((value) => typeof value === "string" && value.trim().length > 0))];
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const service = getSupabaseServiceRole();
  const names = new Map<string, string>();

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select("user_id,full_name,pessoa_id")
    .in("user_id", uniqueIds);

  if (!profilesError) {
    const pessoaIds = [...new Set((profiles ?? []).map((profile) => Number(profile.pessoa_id)).filter((value) => value > 0))];
    const pessoasMap = new Map<number, string>();

    if (pessoaIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await service
        .from("pessoas")
        .select("id,nome")
        .in("id", pessoaIds);

      if (!pessoasError) {
        for (const pessoa of pessoas ?? []) {
          const pessoaId = Number(pessoa.id);
          const nome = typeof pessoa.nome === "string" && pessoa.nome.trim().length > 0 ? pessoa.nome.trim() : null;
          if (pessoaId > 0 && nome) {
            pessoasMap.set(pessoaId, nome);
          }
        }
      }
    }

    for (const profile of profiles ?? []) {
      const userId = typeof profile.user_id === "string" ? profile.user_id : null;
      const pessoaId = Number(profile.pessoa_id ?? 0);
      const profileName =
        typeof profile.full_name === "string" && profile.full_name.trim().length > 0
          ? profile.full_name.trim()
          : pessoasMap.get(pessoaId) ?? null;

      if (userId && profileName) {
        names.set(userId, profileName);
      }
    }
  }

  const pendingIds = uniqueIds.filter((userId) => !names.has(userId));
  if (pendingIds.length > 0) {
    await Promise.all(
      pendingIds.map(async (userId) => {
        try {
          const { data, error } = await service.auth.admin.getUserById(userId);
          if (error) return;
          const email = data.user?.email?.trim();
          if (email) {
            names.set(userId, email);
          }
        } catch {
          // Fallback silencioso para nao expor UUID bruto na UI.
        }
      }),
    );
  }

  return names;
}

export async function resolveAulasExecucao(
  aulas: Array<AulaExecucaoRow | null | undefined>,
): Promise<AulaExecucaoResolved[]> {
  const validAulas = aulas.filter((item): item is AulaExecucaoRow => Boolean(item));
  const userIds = validAulas.flatMap((item) =>
    [item.aberta_por, item.fechada_por, item.frequencia_salva_por].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    ),
  );
  const displayNames = await resolveDisplayNames(userIds);

  return validAulas.map((item) => ({
    ...item,
    hora_inicio: normalizeTime(item.hora_inicio),
    hora_fim: normalizeTime(item.hora_fim),
    status_execucao: normalizeStatus(item.status_execucao),
    aberta_em: item.aberta_em ?? null,
    aberta_por: item.aberta_por ?? null,
    fechada_em: item.fechada_em ?? null,
    fechada_por: item.fechada_por ?? null,
    frequencia_salva_em: item.frequencia_salva_em ?? null,
    frequencia_salva_por: item.frequencia_salva_por ?? null,
    observacao_execucao: item.observacao_execucao ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    aberta_por_nome: item.aberta_por ? displayNames.get(item.aberta_por) ?? "Usuario sem identificacao" : null,
    fechada_por_nome: item.fechada_por ? displayNames.get(item.fechada_por) ?? "Usuario sem identificacao" : null,
    frequencia_salva_por_nome: item.frequencia_salva_por
      ? displayNames.get(item.frequencia_salva_por) ?? "Usuario sem identificacao"
      : null,
  }));
}

export async function getAulaExecucaoById(supabase: Supa, aulaId: number) {
  const { data, error } = await supabase
    .from("turma_aulas")
    .select(
      "id,turma_id,data_aula,hora_inicio,hora_fim,aula_numero,status_execucao,aberta_em,aberta_por,fechada_em,fechada_por,frequencia_salva_em,frequencia_salva_por,observacao_execucao,created_at,updated_at",
    )
    .eq("id", aulaId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "AULA_NAO_ENCONTRADA");
  }

  const [resolved] = await resolveAulasExecucao([data as AulaExecucaoRow]);
  if (!resolved) {
    throw new Error("AULA_NAO_ENCONTRADA");
  }
  return resolved;
}

export async function abrirOuCriarAula(params: {
  supabase: Supa;
  turmaId: number;
  dataAula: string;
  userId: string;
  horaInicio?: string | null;
  horaFim?: string | null;
}) {
  const payload = {
    turma_id: params.turmaId,
    data_aula: params.dataAula,
    hora_inicio: normalizeTime(params.horaInicio),
    hora_fim: normalizeTime(params.horaFim),
    criado_por: params.userId,
  };

  const { data: upserted, error: upsertError } = await params.supabase
    .from("turma_aulas")
    .upsert(payload, { onConflict: "turma_id,data_aula" })
    .select("id")
    .single();

  if (upsertError || !upserted?.id) {
    throw new Error(upsertError?.message ?? "ERRO_ABRIR_AULA");
  }

  await abrirAula({
    supabase: params.supabase,
    aulaId: Number(upserted.id),
    userId: params.userId,
    horaInicio: params.horaInicio ?? null,
    horaFim: params.horaFim ?? null,
  });

  return getAulaExecucaoById(params.supabase, Number(upserted.id));
}

export async function abrirAula(params: {
  supabase: Supa;
  aulaId: number;
  userId: string;
  horaInicio?: string | null;
  horaFim?: string | null;
}) {
  const patch: Record<string, unknown> = {
    aberta_em: new Date().toISOString(),
    aberta_por: params.userId,
    status_execucao: "ABERTA",
  };

  const horaInicio = normalizeTime(params.horaInicio);
  const horaFim = normalizeTime(params.horaFim);
  if (horaInicio) patch.hora_inicio = horaInicio;
  if (horaFim) patch.hora_fim = horaFim;

  const { error } = await params.supabase.from("turma_aulas").update(patch).eq("id", params.aulaId);
  if (error) {
    throw new Error(error.message);
  }

  return getAulaExecucaoById(params.supabase, params.aulaId);
}

export async function registrarFrequenciaSalvaNaAula(params: {
  supabase: Supa;
  aulaId: number;
  userId: string;
}) {
  const current = await getAulaExecucaoById(params.supabase, params.aulaId);
  const nextStatus: StatusExecucaoAula = current.fechada_em ? "VALIDADA" : "ABERTA";

  const { error } = await params.supabase
    .from("turma_aulas")
    .update({
      frequencia_salva_em: new Date().toISOString(),
      frequencia_salva_por: params.userId,
      status_execucao: nextStatus,
    })
    .eq("id", params.aulaId);

  if (error) {
    throw new Error(error.message);
  }

  return getAulaExecucaoById(params.supabase, params.aulaId);
}

export async function fecharAula(params: {
  supabase: Supa;
  aulaId: number;
  userId: string;
  aulaNumero?: number | null;
}) {
  const patch: Record<string, unknown> = {
    fechada_em: new Date().toISOString(),
    fechada_por: params.userId,
    frequencia_salva_em: new Date().toISOString(),
    frequencia_salva_por: params.userId,
    status_execucao: "VALIDADA",
  };

  if (typeof params.aulaNumero === "number" && Number.isFinite(params.aulaNumero)) {
    patch.aula_numero = params.aulaNumero;
  }

  const { error } = await params.supabase.from("turma_aulas").update(patch).eq("id", params.aulaId);
  if (error) {
    throw new Error(error.message);
  }

  return getAulaExecucaoById(params.supabase, params.aulaId);
}

export async function reabrirAulaExecucao(params: {
  supabase: Supa;
  aulaId: number;
}) {
  const { count, error: presencasError } = await params.supabase
    .from("turma_aula_presencas")
    .select("id", { count: "exact", head: true })
    .eq("aula_id", params.aulaId);

  if (presencasError) {
    throw new Error(presencasError.message);
  }

  const statusExecucao: StatusExecucaoAula =
    Number(count ?? 0) > 0 ? "ABERTA" : "PENDENTE";

  const { error } = await params.supabase
    .from("turma_aulas")
    .update({
      fechada_em: null,
      fechada_por: null,
      status_execucao: statusExecucao,
    })
    .eq("id", params.aulaId);

  if (error) {
    throw new Error(error.message);
  }

  return getAulaExecucaoById(params.supabase, params.aulaId);
}

async function getTurmaExecucaoBase(params: { supabase: Supa; turmaId: number }) {
  const { data: turma, error: turmaError } = await params.supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,status,data_inicio,data_fim,dias_semana,hora_inicio,hora_fim")
    .eq("turma_id", params.turmaId)
    .single();

  if (turmaError || !turma) {
    throw new Error(turmaError?.message ?? "TURMA_NAO_ENCONTRADA");
  }

  const [{ data: horarios, error: horariosError }, { data: encontros, error: encontrosError }] = await Promise.all([
    params.supabase
      .from("turmas_horarios")
      .select("day_of_week,inicio,fim")
      .eq("turma_id", params.turmaId)
      .order("day_of_week", { ascending: true })
      .order("inicio", { ascending: true }),
    params.supabase
      .from("turma_encontros")
      .select("id,turma_id,data,hora_inicio,hora_fim,observacao")
      .eq("turma_id", params.turmaId)
      .order("data", { ascending: true })
      .order("ordem", { ascending: true }),
  ]);

  if (horariosError) {
    throw new Error(horariosError.message);
  }
  if (encontrosError) {
    throw new Error(encontrosError.message);
  }

  return {
    turma: turma as TurmaExecucaoBase,
    horarios: (horarios ?? []) as TurmaHorarioRow[],
    encontros: (encontros ?? []) as TurmaEncontroRow[],
  };
}

function buildGradeOccurrences(params: {
  turma: TurmaExecucaoBase;
  horarios: TurmaHorarioRow[];
  dataInicio: string;
  dataFim: string;
}) {
  const explicitWeekdays = Array.isArray(params.turma.dias_semana)
    ? params.turma.dias_semana.map(weekdayToNumber).filter((value): value is number => value != null)
    : [];
  const scheduleRows =
    params.horarios.length > 0
      ? params.horarios.map((item) => ({
          day_of_week: Number(item.day_of_week),
          inicio: normalizeTime(item.inicio) ?? normalizeTime(params.turma.hora_inicio),
          fim: normalizeTime(item.fim) ?? normalizeTime(params.turma.hora_fim),
        }))
      : explicitWeekdays.map((day) => ({
          day_of_week: day,
          inicio: normalizeTime(params.turma.hora_inicio),
          fim: normalizeTime(params.turma.hora_fim),
        }));

  const occurrences = new Map<string, AulaPrevistaItem>();
  let cursor = params.dataInicio;
  while (cursor <= params.dataFim) {
    const dayOfWeek = getDayOfWeekFromISO(cursor);
    for (const row of scheduleRows) {
      if (row.day_of_week !== dayOfWeek) continue;
      occurrences.set(cursor, {
        aula_id: null,
        turma_id: params.turma.turma_id,
        data_aula: cursor,
        hora_inicio: row.inicio,
        hora_fim: row.fim,
        origem: "GRADE",
        situacao: "PREVISTA",
        aula: null,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return occurrences;
}

export async function listarAulasPrevistasNaoRealizadas(params: {
  supabase: Supa;
  turmaId: number;
  dataInicio?: string | null;
  dataFim?: string | null;
}) {
  const resumo = await calcularResumoExecucaoTurma(params);
  return resumo.pendencias.filter((item) => item.situacao === "NAO_REALIZADA");
}

export async function calcularResumoExecucaoTurma(params: {
  supabase: Supa;
  turmaId: number;
  dataInicio?: string | null;
  dataFim?: string | null;
}) {
  const today = todayISO();
  const { turma, horarios, encontros } = await getTurmaExecucaoBase(params);
  const start =
    normalizeDate(params.dataInicio) ??
    normalizeDate(turma.data_inicio) ??
    addDays(today, -30);
  const end =
    normalizeDate(params.dataFim) ??
    normalizeDate(turma.data_fim) ??
    addDays(today, 21);

  const boundedStart = start > end ? end : start;
  const boundedEnd = end < boundedStart ? boundedStart : end;

  const gradeOccurrences = buildGradeOccurrences({
    turma,
    horarios,
    dataInicio: boundedStart,
    dataFim: boundedEnd,
  });

  for (const encontro of encontros) {
    const data = normalizeDate(encontro.data);
    if (!data || !isDateInRange(data, boundedStart, boundedEnd)) continue;
    gradeOccurrences.set(data, {
      aula_id: null,
      turma_id: turma.turma_id,
      data_aula: data,
      hora_inicio: normalizeTime(encontro.hora_inicio) ?? normalizeTime(turma.hora_inicio),
      hora_fim: normalizeTime(encontro.hora_fim) ?? normalizeTime(turma.hora_fim),
      origem: "ENCONTRO",
      situacao: "PREVISTA",
      aula: null,
    });
  }

  const { data: aulasRaw, error: aulasError } = await params.supabase
    .from("turma_aulas")
    .select(
      "id,turma_id,data_aula,hora_inicio,hora_fim,aula_numero,status_execucao,aberta_em,aberta_por,fechada_em,fechada_por,frequencia_salva_em,frequencia_salva_por,observacao_execucao,created_at,updated_at",
    )
    .eq("turma_id", params.turmaId)
    .gte("data_aula", boundedStart)
    .lte("data_aula", boundedEnd)
    .order("data_aula", { ascending: false })
    .order("id", { ascending: false });

  if (aulasError) {
    throw new Error(aulasError.message);
  }

  const aulas = await resolveAulasExecucao((aulasRaw ?? []) as AulaExecucaoRow[]);
  const aulasByDate = new Map<string, AulaExecucaoResolved>();
  for (const aula of aulas) {
    const current = aulasByDate.get(aula.data_aula);
    if (!current || aula.id > current.id) {
      aulasByDate.set(aula.data_aula, aula);
    }
  }

  for (const aula of aulas) {
    const existing = gradeOccurrences.get(aula.data_aula);
    gradeOccurrences.set(aula.data_aula, {
      aula_id: aula.id,
      turma_id: aula.turma_id,
      data_aula: aula.data_aula,
      hora_inicio: normalizeTime(aula.hora_inicio) ?? existing?.hora_inicio ?? normalizeTime(turma.hora_inicio),
      hora_fim: normalizeTime(aula.hora_fim) ?? existing?.hora_fim ?? normalizeTime(turma.hora_fim),
      origem: existing?.origem ?? "AULA",
      situacao: getSituacaoPlanejada(aula, aula.data_aula, today),
      aula,
    });
  }

  const aulasPrevistas = [...gradeOccurrences.values()]
    .map((item) => ({
      ...item,
      situacao: getSituacaoPlanejada(item.aula, item.data_aula, today),
    }))
    .sort(compareByDateAsc);

  const total_validadas = aulasPrevistas.filter((item) => item.situacao === "VALIDADA").length;
  const total_abertas = aulasPrevistas.filter((item) => item.situacao === "ABERTA").length;
  const total_nao_realizadas = aulasPrevistas.filter((item) => item.situacao === "NAO_REALIZADA").length;
  const total_pendentes = aulasPrevistas.filter((item) => item.situacao === "PENDENTE").length;

  const pendencias = aulasPrevistas.filter(
    (item) => item.situacao === "ABERTA" || item.situacao === "PENDENTE" || item.situacao === "NAO_REALIZADA",
  );

  const alertas: string[] = [];
  if (total_nao_realizadas > 0) {
    alertas.push(`${total_nao_realizadas} aula(s) prevista(s) ja passaram sem validacao.`);
  }
  if (total_abertas > 0) {
    alertas.push(`${total_abertas} aula(s) continuam abertas e pendentes de fechamento.`);
  }
  if (total_pendentes > 0) {
    alertas.push(`${total_pendentes} aula(s) permanecem pendentes de execucao.`);
  }

  return {
    total_previstas_periodo: aulasPrevistas.length,
    total_abertas,
    total_validadas,
    total_pendentes,
    total_nao_realizadas,
    aulas_previstas: aulasPrevistas,
    ultimas_registradas: aulasPrevistas
      .filter((item) => item.aula != null)
      .sort(compareByDateDesc)
      .slice(0, 6),
    proximas_previstas: aulasPrevistas.filter((item) => item.data_aula >= today).slice(0, 6),
    alertas,
    pendencias,
  } satisfies ResumoExecucaoTurma;
}
