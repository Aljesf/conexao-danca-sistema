import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "Inicio",
    items: [{ label: "📊 Painel de administração", href: "/admin" }],
  },
  {
    id: "admin-config-unidades",
    title: "Configurações das unidades",
    items: [
      { label: "🏫 Configuração da escola", href: "/admin/config/escola" },
      { label: "🛍️ Configuração da loja", href: "/admin/config/loja" },
      { label: "☕ Configuração do Ballet Café", href: "/admin/config/cafe" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "🧾 Centros de custo / centros base", href: "/admin/colaboradores/centros-custo" },
      { label: "👥 Gestão de colaboradores", href: "/admin/colaboradores" },
      { label: "🔗 Tipos de vínculo", href: "/admin/colaboradores/tipos-vinculo" },
      { label: "🧩 Tipos de função", href: "/admin/colaboradores/tipos-funcao" },
      { label: "🕒 Jornadas de trabalho", href: "/admin/colaboradores/jornadas" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "Usuários & Segurança",
    items: [
      { label: "👤 Usuários", href: "/admin/usuarios" },
      { label: "🧬 Perfis", href: "/admin/perfis" },
      { label: "🔐 Permissões", href: "/admin/permissoes" },
      { label: "🕵️ Auditoria do sistema", href: "/admin/relatorios/auditoria" },
    ],
  },
  {
    id: "admin-financeiro",
    title: "Financeiro (Admin)",
    items: [
      { label: "📈 Dashboard financeiro", href: "/admin/financeiro" },
      { label: "🧾 Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo" },
      { label: "📚 Plano de contas", href: "/admin/financeiro/plano-contas" },
      { label: "🗂️ Categorias financeiras", href: "/admin/financeiro/categorias" },
      { label: "💵 Contas a receber", href: "/admin/financeiro/contas-receber" },
      { label: "📤 Contas a pagar", href: "/admin/financeiro/contas-pagar" },
      { label: "🔄 Movimento", href: "/admin/financeiro/movimento" },
      { label: "🏦 Contas financeiras", href: "/admin/financeiro/contas-financeiras" },
      { label: "💳 Crédito Conexão (contas)", href: "/admin/financeiro/credito-conexao/contas" },
      { label: "💳 Faturas Crédito Conexão", href: "/admin/financeiro/credito-conexao/faturas" },
      { label: "💳 Configuração de cartões", href: "/admin/financeiro/cartao/configuracoes" },
      { label: "💳 Recebíveis de cartão", href: "/admin/financeiro/cartao/recebiveis" },
      { label: "✍️ Lançamentos manuais", href: "/admin/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "admin-relatorios-diretor",
    title: "Painel do Diretor - Relatórios",
    items: [
      { label: "📑 Relatórios", href: "/admin/relatorios" },
      { label: "Alunos por turma", href: "/admin/relatorios/alunos/turmas" },
      { label: "Alunos ativos e inativos", href: "/admin/relatorios/alunos/status" },
      { label: "Grupos & Projetos", href: "/admin/relatorios/alunos/grupos" },
      { label: "Conversão de interessados", href: "/admin/relatorios/captacao/conversao" },
      { label: "💹 Resumo financeiro", href: "/admin/relatorios/financeiro/resumo" },
      { label: "🔄 Movimentação financeira", href: "/admin/relatorios/financeiro/movimento" },
      { label: "💵 Contas a receber", href: "/admin/relatorios/financeiro/receber" },
      { label: "📤 Contas a pagar", href: "/admin/relatorios/financeiro/pagar" },
      { label: "🛍️ Vendas por período", href: "/admin/relatorios/comercial/vendas" },
      { label: "📦 Estoque crítico", href: "/admin/relatorios/comercial/estoque" },
      { label: "❤️ Bolsas e ações sociais", href: "/admin/relatorios/social" },
    ],
  },
  {
    id: "admin-loja-admin",
    title: "Loja (Admin)",
    items: [
      { label: "📦 Gestão de estoque", href: "/admin/loja/gestao-estoque" },
      { label: "🛒 Compras", href: "/admin/loja/compras" },
      { label: "🚚 Fornecedores", href: "/admin/loja/fornecedores" },
      { label: "🏷️ Categorias", href: "/admin/loja/categorias" },
      { label: "📦 Estoque", href: "/admin/loja/estoque" },
      { label: "⚙️ Configurações da loja", href: "/admin/loja/configuracoes" },
    ],
  },
  {
    id: "admin-ui",
    title: "UI / IA",
    items: [{ label: "🤖 Painel de IA (GPT interno)", href: "/admin/ia" }],
  },
];
