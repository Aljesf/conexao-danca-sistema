import type { SidebarSection } from "./types";

export const cafeSidebar: SidebarSection[] = [
  {
    id: "cafe-inicio",
    title: "Inicio",
    items: [{ label: "Ballet Caf\u00e9", href: "/cafe" }],
  },
  {
    id: "cafe-operacao",
    title: "Operacao",
    items: [
      { label: "Caixa", href: "/cafe/vendas" },
      { label: "Produtos", href: "/cafe/produtos" },
    ],
  },
];
