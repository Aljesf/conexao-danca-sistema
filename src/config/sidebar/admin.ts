import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "Início",
    items: [{ label: "Painel de administração", href: "/admin", icon: "🏠" }],
  },
  {
    id: "admin-config-unidades",
    title: "Configurações das unidades",
    items: [
      { label: "Configuração da escola", href: "/admin/config/escola", icon: "🏫" },
      { label: "Configuração da loja", href: "/admin/config/loja", icon: "🛍️" },
      { label: "Configuração do Ballet Café", href: "/admin/config/cafe", icon: "☕" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "Centros de custo / centros base", href: "/admin/colaboradores/centros-custo", icon: "🏷️" },
      { label: "Gestão de colaboradores", href: "/admin/colaboradores", icon: "🤝" },
      { label: "Tipos de vínculo", href: "/admin/colaboradores/tipos-vinculo", icon: "🔗" },
      { label: "Tipos de função", href: "/admin/colaboradores/tipos-funcao", icon: "🧩" },
      { label: "Jornadas de trabalho", href: "/admin/colaboradores/jornadas", icon: "⏰" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "Usuários & Segurança",
    items: [
      { label: "Usuários", href: "/admin/usuarios", icon: "👤" },
      { label: "Perfis", href: "/admin/perfis", icon: "👥" },
      { label: "Permissões", href: "/admin/permissoes", icon: "🔐" },
      { label: "Auditoria do sistema", href: "/admin/relatorios/auditoria", icon: "📝" },
    ],
  },
  {
    id: "admin-financeiro",
    title: "Financeiro (Admin)",
    items: [
      { label: "Dashboard financeiro", href: "/admin/financeiro", icon: "📊" },
      { label: "Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo", icon: "🏷️" },
      { label: "Plano de contas", href: "/admin/financeiro/plano-contas", icon: "📚" },
      { label: "Categorias financeiras", href: "/admin/financeiro/categorias", icon: "🧾" },
      { label: "Contas a receber (Admin)", href: "/admin/financeiro/contas-receber", icon: "📥" },
      { label: "Contas a pagar (Admin)", href: "/admin/financeiro/contas-pagar", icon: "📤" },
      { label: "Caixa geral / Movimentação", href: "/admin/financeiro/caixa-geral", icon: "💰" },
      { label: "Lançamentos manuais", href: "/admin/financeiro/lancamentos-manuais", icon: "✏️" },
    ],
  },
  {
    id: "admin-relatorios-diretor",
    title: "Painel do Diretor — Relatórios",
    items: [
      { label: "Painel do Diretor", href: "/admin/relatorios", icon: "📊" },
      { label: "Alunos por turma", href: "/admin/relatorios/alunos/turmas", icon: "👨‍👩‍👧‍👦" },
      { label: "Alunos ativos e inativos", href: "/admin/relatorios/alunos/status", icon: "📋" },
      { label: "Grupos & Projetos", href: "/admin/relatorios/alunos/grupos", icon: "🧑‍🤝‍🧑" },
      { label: "Conversão de interessados", href: "/admin/relatorios/captacao/conversao", icon: "📈" },
      { label: "Resumo financeiro", href: "/admin/relatorios/financeiro/resumo", icon: "💰" },
      { label: "Movimentação", href: "/admin/relatorios/financeiro/movimento", icon: "🔁" },
      { label: "Contas a receber", href: "/admin/relatorios/financeiro/receber", icon: "📥" },
      { label: "Contas a pagar", href: "/admin/relatorios/financeiro/pagar", icon: "📤" },
      { label: "Vendas por período", href: "/admin/relatorios/comercial/vendas", icon: "🛍️" },
      { label: "Estoque crítico", href: "/admin/relatorios/comercial/estoque", icon: "⚠️" },
      { label: "Bolsas e ações sociais", href: "/admin/relatorios/social", icon: "❤️" },
    ],
  },
  {
    id: "admin-loja-admin",
    title: "Loja (Admin)",
    items: [
      { label: "Gestão de estoque", href: "/administracao/loja/estoque", icon: "📦" },
      { label: "Compras", href: "/administracao/loja/compras", icon: "🧾" },
      { label: "Fornecedores", href: "/administracao/loja/fornecedores", icon: "🤝" },
      { label: "Categorias", href: "/administracao/loja/categorias", icon: "🏷️" },
      { label: "Configurações da loja", href: "/administracao/loja/configuracoes", icon: "⚙️" },
    ],
  },
  {
    id: "admin-ui",
    title: "UI / IA",
    items: [{ label: "Painel de IA (GPT interno)", href: "/admin/ia", icon: "🤖" }],
  },
];
