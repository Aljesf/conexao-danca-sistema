import type { ReactNode } from "react";

export type SidebarItem = {
  label: string;
  href: string;
  matchPrefix?: string;
  icon?: ReactNode;
};

export type SidebarSection = {
  id: string;
  title: string;
  items: SidebarItem[];
  defaultOpen?: boolean;
};

export type SidebarConfig = {
  escola: SidebarSection[];
  secretaria: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
  bolsas: SidebarSection[];
  financeiro: SidebarSection[];
  suporte: SidebarSection[];
};
