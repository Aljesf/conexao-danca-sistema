import type { SidebarConfig, SidebarItem, SidebarSection } from "./sidebar/types";
import { escolaSidebar } from "./sidebar/escola";
import { lojaSidebar } from "./sidebar/loja";
import { cafeSidebar } from "./sidebar/cafe";
import { adminSidebar } from "./sidebar/admin";
import { bolsasSidebar } from "./sidebar/bolsas";
import { financeiroSidebar } from "./sidebar/financeiro";
import { suporteSidebar } from "./sidebar/suporte";

export const sidebarConfig: SidebarConfig = {
  escola: escolaSidebar,
  loja: lojaSidebar,
  cafe: cafeSidebar,
  admin: adminSidebar,
  bolsas: bolsasSidebar,
  financeiro: financeiroSidebar,
  suporte: suporteSidebar,
};

export type { SidebarConfig, SidebarItem, SidebarSection };

export default sidebarConfig;
