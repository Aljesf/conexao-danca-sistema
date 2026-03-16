import type { SidebarSection } from "./types";

export const cafeSidebar: SidebarSection[] = [
  {
    id: "cafe-inicio",
    title: "Início",
    items: [{ label: "Ballet Café", href: "/cafe" }],
  },
  {
    id: "cafe-operacao",
    title: "Operação",
    items: [{ label: "Caixa / Vendas", href: "/cafe/caixa" }],
  },
  {
    id: "cafe-gestao",
    title: "Gestão do Café",
    items: [
      { label: "Gestão do Café", href: "/cafe/admin" },
      { label: "Produtos", href: "/cafe/admin/produtos" },
      { label: "Insumos", href: "/cafe/admin/insumos" },
      { label: "Tabelas de preço", href: "/cafe/admin/tabelas-preco" },
      { label: "Compras de insumos", href: "/cafe/admin/compras" },
    ],
  },
];
