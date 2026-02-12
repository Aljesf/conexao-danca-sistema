import type { SidebarSection } from "./types";

export const bolsasSidebar: SidebarSection[] = [
  {
    id: "bolsas-inicio",
    title: "Bolsas",
    items: [
      { label: "Painel", href: "/bolsas" },
      { label: "Projetos sociais", href: "/bolsas/projetos" },
      { label: "Tipos de bolsa", href: "/bolsas/tipos" },
      { label: "Concessoes", href: "/bolsas/concessoes" },
      { label: "Ledger de investimento", href: "/bolsas/ledger" },
    ],
  },
];
