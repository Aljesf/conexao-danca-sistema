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
}) {
  const { supabase, colaboradorId, scopeAll } = params;

  if (!scopeAll && !colaboradorId) {
    return [];
  }

  let query = supabase
    .from("vw_app_professor_agenda_hoje")
    .select("turma_id, turma_nome, professor_id, professor_nome, hora_inicio, hora_fim, sala, curso, nivel, turno, ano_referencia")
    .order("hora_inicio", { ascending: true })
    .order("turma_nome", { ascending: true });

  if (!scopeAll && colaboradorId) {
    query = query.eq("professor_id", colaboradorId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data as AgendaRow[] | null) ?? []).map((row) => ({
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

export async function fetchProfessorAniversariantesDia(supabase: Supa) {
  const { data, error } = await supabase
    .from("vw_app_professor_aniversariantes_dia")
    .select("id, pessoa_id, nome, nascimento, tipo")
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as BirthdayRow[] | null) ?? []).map((row) => ({
    id: row.id,
    pessoa_id: Number(row.pessoa_id),
    nome: row.nome,
    nascimento: row.nascimento ?? null,
    tipo: row.tipo ?? null,
  }));
}

export async function fetchProfessorAniversariantesSemana(supabase: Supa) {
  const { data, error } = await supabase
    .from("vw_app_professor_aniversariantes_semana")
    .select("id, pessoa_id, nome, nascimento, tipo, data_aniversario_referencia")
    .order("data_aniversario_referencia", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data as BirthdayRow[] | null) ?? []).map((row) => ({
    id: row.id,
    pessoa_id: Number(row.pessoa_id),
    nome: row.nome,
    nascimento: row.nascimento ?? null,
    tipo: row.tipo ?? null,
    data_aniversario_referencia: row.data_aniversario_referencia ?? null,
  }));
}
