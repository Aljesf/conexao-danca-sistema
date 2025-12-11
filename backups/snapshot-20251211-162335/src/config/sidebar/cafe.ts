import type { SidebarSection } from "./types";

export const cafeSidebar: SidebarSection[] = [
  {
    id: "cafe-inicio",
    title: "Início",
    items: [{ label: "Início", href: "/cafe" }],
  },
  {
    id: "cafe-comandas-caixa",
    title: "Comandas & Caixa",
    items: [
      { label: "Comandas", href: "/cafe/comandas" },
      { label: "Pedidos", href: "/cafe/pedidos" },
      { label: "Caixa", href: "/cafe/caixa" },
    ],
  },
  {
    id: "cafe-produtos-estoque",
    title: "Produtos & Estoque",
    items: [
      { label: "Cardápio", href: "/cafe/cardapio" },
      { label: "Estoque da cozinha", href: "/cafe/estoque" },
      { label: "Fornecedores", href: "/cafe/fornecedores" },
    ],
  },
  {
    id: "cafe-pessoal",
    title: "Pessoal do Café",
    items: [{ label: "Colaboradores do Café", href: "/cafe/colaboradores" }],
  },
];
