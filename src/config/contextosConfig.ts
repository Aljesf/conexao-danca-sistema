import type { ContextKey } from "@/context/BrandingContext";

export type AppContextKey =
  | "ESCOLA"
  | "LOJA"
  | "CAFE"
  | "ADMIN"
  | "BOLSAS"
  | "FINANCEIRO";

export type AppContextItem = {
  key: AppContextKey;
  brandingKey: ContextKey;
  label: string;
  emoji: string;
  description: string;
  href: string;
};

export const CONTEXTOS_CONFIG: AppContextItem[] = [
  {
    key: "ESCOLA",
    brandingKey: "escola",
    label: "Escola",
    emoji: "🏫",
    description: "Operacao academica e matriculas",
    href: "/escola",
  },
  {
    key: "LOJA",
    brandingKey: "loja",
    label: "AJ Dance Store",
    emoji: "🛍️",
    description: "Vendas e estoque da loja",
    href: "/loja",
  },
  {
    key: "CAFE",
    brandingKey: "lanchonete",
    label: "Ballet Cafe",
    emoji: "☕",
    description: "Operacao e vendas do cafe",
    href: "/cafe",
  },
  {
    key: "FINANCEIRO",
    brandingKey: "financeiro",
    label: "Financeiro",
    emoji: "💰",
    description: "Contabil, fluxo de caixa, cartoes e Credito Conexao",
    href: "/financeiro",
  },
  {
    key: "ADMIN",
    brandingKey: "administracao",
    label: "Administracao do Sistema",
    emoji: "🛠️",
    description: "Configuracoes e governanca",
    href: "/admin",
  },
  {
    key: "BOLSAS",
    brandingKey: "bolsas",
    label: "Bolsas & Projetos Sociais",
    emoji: "🎓",
    description: "Gestao de bolsas e projetos sociais",
    href: "/bolsas",
  },
];

export const CONTEXTOS_BY_HREF_PREFIX = [...CONTEXTOS_CONFIG].sort(
  (a, b) => b.href.length - a.href.length,
);

export function detectContextByPathname(pathname: string): AppContextItem | null {
  for (const ctx of CONTEXTOS_BY_HREF_PREFIX) {
    if (pathname === ctx.href || pathname.startsWith(`${ctx.href}/`)) return ctx;
  }
  return null;
}
