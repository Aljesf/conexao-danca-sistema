import type { SidebarSection } from "./types";

export const lojaSidebar: SidebarSection[] = [
  {
    id: "loja-inicio",
    title: "Início",
    items: [{ label: "🏠 Início", href: "/loja" }],
  },
  {
    id: "loja-caixa-vendas",
    title: "Caixa & Vendas",
    items: [{ label: "💳 Frente de caixa", href: "/loja/caixa" }],
  },
  {
    id: "loja-produtos-estoque",
    title: "Produtos & Estoque",
    items: [
      { label: "🏷️ Produtos", href: "/loja/produtos" },
      { label: "📦 Estoque", href: "/loja/estoque" },
      { label: "🚚 Fornecedores", href: "/loja/fornecedores" },
    ],
  },
];
