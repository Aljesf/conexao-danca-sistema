import type { SidebarConfig, SidebarItem, SidebarSection } from "./sidebar/types";
import { escolaSidebar } from "./sidebar/escola";
import { lojaSidebar } from "./sidebar/loja";
import { cafeSidebar } from "./sidebar/cafe";
import { adminSidebar } from "./sidebar/admin";
import { bolsasSidebar } from "./sidebar/bolsas";

export const sidebarConfig: SidebarConfig = {
  escola: escolaSidebar,
  loja: lojaSidebar,
  cafe: cafeSidebar,
  admin: adminSidebar,
  bolsas: bolsasSidebar,
};

export type { SidebarConfig, SidebarItem, SidebarSection };

export default sidebarConfig;
