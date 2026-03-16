import type { Supa } from "../diario-de-classe/_lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type RolePermissoes = {
  modules?: Record<string, Record<string, boolean> | undefined> | null;
};

type RoleJoinRow = {
  role: {
    codigo: string | null;
    permissoes: RolePermissoes | null;
    ativo: boolean | null;
  } | null;
};

type ProfileRow = {
  full_name: string | null;
  pessoa_id: number | null;
};

type PessoaRow = {
  email: string | null;
  nome: string | null;
};

type ColaboradorRow = {
  id: number;
};

type AgendaRow = {
  turma_id: number;
  turma_nome: string;
  professor_id: number | null;
  professor_nome: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  sala: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
};

type BirthdayRow = {
  id: string;
  pessoa_id: number;
  nome: string;
  nascimento: string | null;
  tipo: string | null;
  data_aniversario_referencia?: string | null;
};

const EXPANDED_SCOPE_ROLE_CODES = new Set(["ADMIN", "COORDENACAO", "SECRETARIA", "ACADEMICO"]);
const PROFESSOR_TIME_ZONE = "America/Fortaleza";
const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeRoleCode(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function hasAcademicoPermission(permissoes: RolePermissoes | null | undefined): boolean {
  if (!permissoes?.modules || typeof permissoes.modules !== "object") return false;

  const academico = permissoes.modules.academico;
  if (!academico || typeof academico !== "object") return false;

  return Boolean(academico.view || academico.create || academico.update || academico.delete);
}

async function listRoleRowsForUser(userId: string): Promise<RoleJoinRow[]> {
  try {
    const admin = getSupabaseServiceRole();
    const { data, error } = await admin
      .from("usuario_roles")
      .select("role:roles_sistema(codigo, permissoes, ativo)")
      .eq("user_id", userId);

    if (error) return [];
    return (data as unknown as RoleJoinRow[] | null) ?? [];
  } catch {
    return [];
  }
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

export function normalizeProfessorDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const raw = String(value).trim();
  if (!DATE_PARAM_REGEX.test(raw)) return null;

  const [yearStr, monthStr, dayStr] = raw.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!isValidDateParts(year, month, day)) return null;
  return raw;
}

export function getProfessorTodayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROFESSOR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function resolveProfessorDate(value: string | null | undefined): string {
  return normalizeProfessorDate(value) ?? getProfessorTodayISO();
}

export async function getProfessorOperationalAccess(userId: string): Promise<{
  podeVerOutrasTurmas: boolean;
  roleCodes: string[];
}> {
  const rows = await listRoleRowsForUser(userId);

  const activeRoles = rows
    .map((row) => row.role)
    .filter((role): role is NonNullable<RoleJoinRow["role"]> => Boolean(role?.codigo) && (role?.ativo ?? true));

  const roleCodes = Array.from(new Set(activeRoles.map((role) => normalizeRoleCode(role.codigo))));
  const podeVerOutrasTurmas = activeRoles.some(
    (role) => EXPANDED_SCOPE_ROLE_CODES.has(normalizeRoleCode(role.codigo)) || hasAcademicoPermission(role.permissoes),
  );

  return { podeVerOutrasTurmas, roleCodes };
}

export type ProfessorAppUserContext = {
  userId: string;
  nome: string | null;
  email: string | null;
  perfil: string | null;
  pessoaId: number | null;
  colaboradorId: number | null;
  isAdmin: boolean;
  podeVerOutrasTurmas: boolean;
  roleCodes: string[];
};

export async function loadProfessorAppUserContext(params: {
  supabase: Supa;
  userId: string;
  email?: string | null;
  isAdmin: boolean;
}): Promise<ProfessorAppUserContext> {
  const { supabase, userId, email, isAdmin } = params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, pessoa_id")
    .eq("user_id", userId)
    .maybeSingle();

  const profileRow = (profile as ProfileRow | null) ?? null;

  let pessoa: PessoaRow | null = null;
  if (profileRow?.pessoa_id) {
    const { data } = await supabase
      .from("pessoas")
      .select("nome, email")
      .eq("id", profileRow.pessoa_id)
      .maybeSingle();

    pessoa = (data as PessoaRow | null) ?? null;
  }

  let colaboradorId: number | null = null;
  if (profileRow?.pessoa_id) {
    const { data } = await supabase
      .from("colaboradores")
      .select("id")
      .eq("pessoa_id", profileRow.pessoa_id)
      .eq("ativo", true)
      .maybeSingle();

    colaboradorId = ((data as ColaboradorRow | null) ?? null)?.id ?? null;
  }

  const { podeVerOutrasTurmas, roleCodes } = await getProfessorOperationalAccess(userId);
  const perfil = isAdmin ? "ADMIN" : roleCodes[0] ?? (colaboradorId ? "PROFESSOR" : "USUARIO");

  return {
    userId,
    nome: pessoa?.nome ?? profileRow?.full_name ?? null,
    email: email ?? pessoa?.email ?? null,
    perfil,
    pessoaId: profileRow?.pessoa_id ?? null,
    colaboradorId,
    isAdmin,
    podeVerOutrasTurmas: isAdmin || podeVerOutrasTurmas,
    roleCodes,
  };
}

function normalizeHora(value: string | null): string {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export async function fetchProfessorAgendaHoje(params: {
  supabase: Supa;
  colaboradorId: number | null;
  scopeAll: boolean;
  dataReferencia: string;
}) {
  const { supabase, colaboradorId, scopeAll, dataReferencia } = params;

  if (!scopeAll && !colaboradorId) {
    return [];
  }

  const { data, error } = await supabase.rpc("fn_app_professor_agenda", {
    p_data: dataReferencia,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as unknown as AgendaRow[] | null) ?? [])
    .filter((row) => scopeAll || row.professor_id === colaboradorId)
    .sort((a, b) => {
      const horaA = a.hora_inicio ?? "";
      const horaB = b.hora_inicio ?? "";
      return horaA.localeCompare(horaB) || a.turma_nome.localeCompare(b.turma_nome);
    });

  return rows.map((row) => ({
    turma_id: Number(row.turma_id),
    turma_nome: String(row.turma_nome),
    professor_id: row.professor_id ? Number(row.professor_id) : null,
    professor_nome: row.professor_nome ?? null,
    hora_inicio: normalizeHora(row.hora_inicio),
    hora_fim: normalizeHora(row.hora_fim),
    sala: row.sala ?? null,
    curso: row.curso ?? null,
    nivel: row.nivel ?? null,
    turno: row.turno ?? null,
    ano_referencia: row.ano_referencia ?? null,
  }));
}

export async function fetchProfessorAniversariantesDia(params: {
  supabase: Supa;
  dataReferencia: string;
}) {
  const { data, error } = await params.supabase.rpc("fn_app_professor_aniversariantes_dia", {
    p_data: params.dataReferencia,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as unknown as BirthdayRow[] | null) ?? []).map((row) => ({
    id: row.id,
    pessoa_id: Number(row.pessoa_id),
    nome: row.nome,
    nascimento: row.nascimento ?? null,
    tipo: row.tipo ?? null,
  }));
}

export async function fetchProfessorAniversariantesSemana(params: {
  supabase: Supa;
  dataReferencia: string;
}) {
  const { data, error } = await params.supabase.rpc("fn_app_professor_aniversariantes_semana", {
    p_data: params.dataReferencia,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as unknown as BirthdayRow[] | null) ?? []).map((row) => ({
    id: row.id,
    pessoa_id: Number(row.pessoa_id),
    nome: row.nome,
    nascimento: row.nascimento ?? null,
    tipo: row.tipo ?? null,
    data_aniversario_referencia: row.data_aniversario_referencia ?? null,
  }));
}
