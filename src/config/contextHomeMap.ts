// Mapa de home institucional por contexto.
// Usado no redirect pos-login e na troca de contexto.
// Futuramente sera sobrescrito pela preferencia individual do colaborador.

export const CONTEXT_HOME_MAP: Record<string, string> = {
  escola: "/escola/calendario",
  loja: "/loja",
  cafe: "/cafe",
  admin: "/admin/financeiro",
  administracao: "/admin/financeiro",
  bolsas: "/bolsas",
};

export const DEFAULT_HOME = "/escola/calendario";

const CONTEXT_HOME_ALIASES: Record<string, string> = {
  ADMIN: "admin",
  ADMINISTRACAO: "administracao",
  BOLSAS: "bolsas",
  CAFE: "cafe",
  ESCOLA: "escola",
  LANCHONETE: "cafe",
  LOJA: "loja",
};

const EXTRA_CONTEXT_HOME_MAP: Record<string, string> = {
  financeiro: "/financeiro",
  secretaria: "/escola/secretaria",
  suporte: "/suporte-usuario",
};

export function resolveContextHome(context: string | null | undefined): string {
  const value = context?.trim();
  if (!value) return DEFAULT_HOME;

  const alias = CONTEXT_HOME_ALIASES[value.toUpperCase()];
  const normalized = alias ?? value.toLowerCase();

  return CONTEXT_HOME_MAP[normalized] ?? EXTRA_CONTEXT_HOME_MAP[normalized] ?? DEFAULT_HOME;
}
