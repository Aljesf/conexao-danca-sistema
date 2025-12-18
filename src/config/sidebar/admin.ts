import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "Inicio",
    items: [{ label: "ðŸ“Š Painel de administraÃ§Ã£o", href: "/admin" }],
  },
  {
    id: "admin-financeiro",
    title: "Financeiro (Admin)",
    items: [
      { label: "ðŸ“ˆ Dashboard financeiro", href: "/admin/financeiro" },
      { label: "ðŸ’µ Contas a receber", href: "/admin/financeiro/contas-receber" },
      { label: "ðŸ“¤ Contas a pagar", href: "/admin/financeiro/contas-pagar" },
      { label: "ðŸ§¾ Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo" },
      { label: "ðŸ“š Plano de contas", href: "/admin/financeiro/plano-contas" },
      { label: "ðŸ—‚ï¸ Categorias financeiras", href: "/admin/financeiro/categorias" },
      { label: "ðŸ¦ Contas financeiras", href: "/admin/financeiro/contas-financeiras" },
      { label: "ðŸ“Š Movimento", href: "/admin/financeiro/movimento" },
      { label: "âœï¸ LanÃ§amentos manuais", href: "/admin/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "admin-cartoes",
    title: "CartÃµes (Admin)",
    items: [
      { label: "ðŸ’³ ConfiguraÃ§Ã£o de cartÃµes", href: "/admin/financeiro/cartao/configuracoes" },
      { label: "ðŸ’³ RecebÃ­veis de cartÃ£o", href: "/admin/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "admin-credito-conexao",
    title: "CrÃ©dito ConexÃ£o (Admin)",
    items: [
      { label: "ðŸªª Contas", href: "/admin/financeiro/credito-conexao/contas" },
      { label: "ðŸ§¾ Faturas", href: "/admin/financeiro/credito-conexao/faturas" },
      { label: "âš™ï¸ ConfiguraÃ§Ãµes", href: "/admin/financeiro/credito-conexao/configuracoes" },
    ],
  },
  {
    id: "admin-loja-admin",
    title: "Loja (Admin)",
    items: [
      { label: "ðŸ“¦ GestÃ£o de estoque", href: "/admin/loja/gestao-estoque" },
      { label: "ðŸ›’ Compras", href: "/admin/loja/compras" },
      { label: "ðŸšš Fornecedores", href: "/admin/loja/fornecedores" },
      { label: "ðŸ·ï¸ Categorias", href: "/admin/loja/categorias" },
      { label: "ðŸ“¦ Estoque", href: "/admin/loja/estoque" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "ðŸ‘¥ GestÃ£o de colaboradores", href: "/admin/colaboradores" },
      { label: "ðŸ”— Tipos de vÃ­nculo", href: "/admin/colaboradores/tipos-vinculo" },
      { label: "ðŸ§© Tipos de funÃ§Ã£o", href: "/admin/colaboradores/tipos-funcao" },
      { label: "ðŸ•’ Jornadas de trabalho", href: "/admin/colaboradores/jornadas" },
    ],
  },
  {
    id: "admin-config-unidades",
    title: "ConfiguraÃ§Ãµes das unidades",
    items: [
      { label: "ðŸ« ConfiguraÃ§Ã£o da escola", href: "/admin/config/escola" },
      { label: "ðŸ›ï¸ ConfiguraÃ§Ã£o da loja", href: "/admin/config/loja" },
      { label: "â˜• ConfiguraÃ§Ã£o do Ballet CafÃ©", href: "/admin/config/cafe" },
    ],
  },
  {
    id: "admin-auditoria",
    title: "GovernanÃ§a & Auditoria",
    items: [
      { label: "ðŸ“˜ Construtor de RelatÃ³rios", href: "/admin/relatorios/construtor" },
      { label: "ðŸ•µï¸ Auditoria do sistema", href: "/admin/relatorios/auditoria" },
      { label: "Boletos (NeoFin)", href: "/admin/governanca/boletos-neofin" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "UsuÃ¡rios & SeguranÃ§a",
    items: [
      { label: "ðŸ‘¤ UsuÃ¡rios", href: "/admin/usuarios" },
      { label: "ðŸ§¬ Perfis", href: "/admin/perfis" },
      { label: "ðŸ” PermissÃµes", href: "/admin/permissoes" },
    ],
  },
  {
    id: "admin-ui",
    title: "UI / IA",
    items: [{ label: "ðŸ¤– Painel de IA (GPT interno)", href: "/admin/ia" }],
  },
];
