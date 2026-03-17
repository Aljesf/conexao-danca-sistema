import type { SidebarSection } from "./types";

export const cafeSidebar: SidebarSection[] = [
  {
    id: "cafe-inicio",
    title: "Inicio",
    items: [{ label: "Ballet Cafe", href: "/cafe" }],
  },
  {
    id: "cafe-operacao",
    title: "Operacao",
    items: [
      { label: "Vendas", href: "/cafe/vendas" },
      { label: "Caixa / Lancamentos", href: "/cafe/caixa" },
    ],
  },
  {
    id: "cafe-gestao",
    title: "Gestao do Cafe",
    items: [
      { label: "Gestao do Cafe", href: "/cafe/admin" },
      { label: "Produtos", href: "/cafe/admin/produtos" },
      { label: "Insumos", href: "/cafe/admin/insumos" },
      { label: "Tabelas de preco", href: "/cafe/admin/tabelas-preco" },
      { label: "Compras de insumos", href: "/cafe/admin/compras" },
    ],
  },
];
