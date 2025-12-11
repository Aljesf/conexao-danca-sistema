export type SidebarItem = {
  label: string;
  href: string;
  icon?: any;
};

export type SidebarSection = {
  id: string;
  title: string;
  items: SidebarItem[];
};

export type SidebarConfig = {
  escola: SidebarSection[];
  loja: SidebarSection[];
  cafe: SidebarSection[];
  admin: SidebarSection[];
};
