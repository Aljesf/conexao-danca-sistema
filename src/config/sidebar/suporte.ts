import type { SidebarSection } from "./types";

export const suporteSidebar: SidebarSection[] = [
  {
    id: "suporte-inicio",
    title: "Suporte",
    items: [
      { label: "Painel de tickets", href: "/suporte-usuario", matchPrefix: "/suporte-usuario" },
      { label: "Voltar para Admin", href: "/admin", matchPrefix: "/admin" },
    ],
  },
];
