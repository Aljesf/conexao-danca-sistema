// Encoding: UTF-8
import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "Inicio",
    items: [{ label: "📊 Painel de administração", href: "/admin" }],
  },
  {
    id: "admin-financeiro",
    title: "Financeiro (Admin)",
    items: [
      { label: "📈 Dashboard financeiro", href: "/admin/financeiro" },
      { label: "💵 Contas a receber", href: "/admin/financeiro/contas-receber" },
      { label: "📤 Contas a pagar", href: "/admin/financeiro/contas-pagar" },
      { label: "🧾 Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo" },
      { label: "📚 Plano de contas", href: "/admin/financeiro/plano-contas" },
      { label: "🗂️ Categorias financeiras", href: "/admin/financeiro/categorias" },
      { label: "🏦 Contas financeiras", href: "/admin/financeiro/contas-financeiras" },
      { label: "📊 Movimento", href: "/admin/financeiro/movimento" },
      { label: "✍️ Lançamentos manuais", href: "/admin/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "admin-cartoes",
    title: "Cartões (Admin)",
    items: [
      { label: "💳 Configuração de cartões", href: "/admin/financeiro/cartao/configuracoes" },
      { label: "💳 Recebíveis de cartão", href: "/admin/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "admin-credito-conexao",
    title: "Crédito Conexão (Admin)",
    items: [
      { label: "🪪 Contas", href: "/admin/financeiro/credito-conexao/contas" },
      { label: "🧾 Faturas", href: "/admin/financeiro/credito-conexao/faturas" },
      { label: "⚙️ Configurações", href: "/admin/financeiro/credito-conexao/configuracoes" },
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
      { label: "⚙️ Configurações do produto", href: "/admin/loja/cadastros" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "👥 Gestão de colaboradores", href: "/admin/colaboradores" },
      { label: "🔗 Tipos de vínculo", href: "/admin/colaboradores/tipos-vinculo" },
      { label: "🧩 Tipos de função", href: "/admin/colaboradores/tipos-funcao" },
      { label: "🕒 Jornadas de trabalho", href: "/admin/colaboradores/jornadas" },
    ],
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
    id: "admin-config-escola",
    title: "Configurações (Escola)",
    items: [
      { label: "📍 Locais", href: "/admin/configuracoes/locais" },
      { label: "🏷️ Espaços", href: "/admin/configuracoes/espacos" },
      { label: "🧾 Tabelas de matrícula", href: "/admin/escola/configuracoes/matriculas/tabelas" },
    ],
  },
  {
    id: "admin-auditoria",
    title: "Governança & Auditoria",
    items: [
      { label: "📘 Construtor de Relatórios", href: "/admin/relatorios/construtor" },
      { label: "🕵️ Auditoria do sistema", href: "/admin/relatorios/auditoria" },
      { label: "Boletos (NeoFin)", href: "/admin/governanca/boletos-neofin" },
      { label: "Cobranças", href: "/admin/governanca/cobrancas" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "Usuários & Segurança",
    items: [
      { label: "👤 Usuários", href: "/admin/usuarios" },
      { label: "🧬 Perfis", href: "/admin/perfis" },
      { label: "🔐 Permissões", href: "/admin/permissoes" },
    ],
  },
  {
    id: "admin-ui",
    title: "UI / IA",
    items: [{ label: "🤖 Painel de IA (GPT interno)", href: "/admin/ia" }],
  },
];
