export type SupportedContexto =
  | "CAFE"
  | "LOJA"
  | "ESCOLA"
  | "SECRETARIA"
  | "ADMIN"
  | "FINANCEIRO"
  | "BOLSAS"
  | "SUPORTE";

export type ContextoRouteOption = {
  rota: string;
  label: string;
};

export type ContextoRouteConfig = {
  contexto: SupportedContexto;
  label: string;
  fallback: string;
  routes: ContextoRouteOption[];
};

const CONTEXTO_ALIASES: Record<string, SupportedContexto> = {
  ADMIN: "ADMIN",
  ADMINISTRACAO: "ADMIN",
  BOLSAS: "BOLSAS",
  CAFE: "CAFE",
  ESCOLA: "ESCOLA",
  FINANCEIRO: "FINANCEIRO",
  LANCHONETE: "CAFE",
  LOJA: "LOJA",
  SECRETARIA: "SECRETARIA",
  SECRETARIA_DA_ESCOLA: "SECRETARIA",
  SUPORTE: "SUPORTE",
};

const CONTEXTO_ROUTE_CONFIGS: Record<SupportedContexto, ContextoRouteConfig> = {
  CAFE: {
    contexto: "CAFE",
    label: "Ballet Cafe",
    fallback: "/cafe",
    routes: [
      { rota: "/cafe", label: "Dashboard do Cafe" },
      { rota: "/cafe/vendas", label: "PDV / Vendas" },
      { rota: "/cafe/caixa", label: "Caixa / Lancamentos" },
      { rota: "/cafe/admin", label: "Gestao do Cafe" },
    ],
  },
  LOJA: {
    contexto: "LOJA",
    label: "Loja",
    fallback: "/loja",
    routes: [
      { rota: "/loja", label: "Home da Loja" },
      { rota: "/loja/caixa", label: "Caixa" },
      { rota: "/loja/vendas", label: "Vendas" },
      { rota: "/admin/loja/gestao-estoque", label: "Gestao de estoque" },
    ],
  },
  ESCOLA: {
    contexto: "ESCOLA",
    label: "Escola",
    fallback: "/escola",
    routes: [
      { rota: "/escola", label: "Home da Escola" },
      { rota: "/matriculas", label: "Matriculas" },
      { rota: "/turmas", label: "Turmas" },
      { rota: "/pessoas", label: "Pessoas" },
    ],
  },
  SECRETARIA: {
    contexto: "SECRETARIA",
    label: "Secretaria da Escola",
    fallback: "/secretaria/caixa",
    routes: [
      { rota: "/secretaria", label: "Home da Secretaria" },
      { rota: "/secretaria/caixa", label: "Caixa da Secretaria" },
    ],
  },
  ADMIN: {
    contexto: "ADMIN",
    label: "Administracao do Sistema",
    fallback: "/admin",
    routes: [
      { rota: "/admin", label: "Painel administrativo" },
      { rota: "/admin/financeiro", label: "Financeiro (Admin)" },
      { rota: "/admin/config/cafe", label: "Configuracao institucional do Cafe" },
      { rota: "/admin/config/loja", label: "Configuracao institucional da Loja" },
    ],
  },
  FINANCEIRO: {
    contexto: "FINANCEIRO",
    label: "Financeiro",
    fallback: "/financeiro",
    routes: [
      { rota: "/financeiro", label: "Dashboard financeiro" },
      { rota: "/financeiro/colaboradores", label: "Colaboradores" },
      { rota: "/financeiro/folha/colaboradores", label: "Folha de pagamento" },
      { rota: "/financeiro/credito-conexao/faturas", label: "Faturas da conta interna" },
    ],
  },
  BOLSAS: {
    contexto: "BOLSAS",
    label: "Bolsas e Projetos Sociais",
    fallback: "/bolsas",
    routes: [
      { rota: "/bolsas", label: "Home de Bolsas" },
      { rota: "/bolsas/beneficiarios", label: "Beneficiarios" },
      { rota: "/bolsas/concessoes", label: "Concessoes" },
      { rota: "/bolsas/projetos", label: "Projetos" },
    ],
  },
  SUPORTE: {
    contexto: "SUPORTE",
    label: "Suporte ao Usuario",
    fallback: "/suporte-usuario",
    routes: [
      { rota: "/suporte-usuario", label: "Chamados" },
      { rota: "/admin/relatorios/auditoria", label: "Auditoria" },
    ],
  },
};

export function normalizeContextoKey(value: string | null | undefined): SupportedContexto | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return null;
  return CONTEXTO_ALIASES[normalized] ?? null;
}

export function getContextoRouteConfig(contexto: SupportedContexto): ContextoRouteConfig {
  return CONTEXTO_ROUTE_CONFIGS[contexto];
}

export function listContextoRouteConfigs(): ContextoRouteConfig[] {
  return Object.values(CONTEXTO_ROUTE_CONFIGS);
}

export function getFallbackRouteForContext(value: string | null | undefined): string {
  const contexto = normalizeContextoKey(value);
  if (!contexto) return "/admin";
  return CONTEXTO_ROUTE_CONFIGS[contexto].fallback;
}

export function isRouteAllowedForContext(contexto: SupportedContexto, rota: string): boolean {
  return CONTEXTO_ROUTE_CONFIGS[contexto].routes.some((item) => item.rota === rota);
}
