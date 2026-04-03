import type { SidebarSection } from "./types";

export const secretariaSidebar: SidebarSection[] = [
  {
    id: "secretaria-inicio",
    title: "Inicio",
    items: [{ label: "Visao geral", href: "/secretaria" }],
  },
  {
    id: "secretaria-caixa",
    title: "Caixa da Secretaria",
    items: [{ label: "Conta interna", href: "/secretaria/caixa", matchPrefix: "/secretaria/caixa" }],
  },
];
