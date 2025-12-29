// Encoding: UTF-8
import type { SidebarSection } from "./types";

export const adminSidebar: SidebarSection[] = [
  {
    id: "admin-inicio",
    title: "Inicio",
    items: [{ label: "Painel de administracao", href: "/admin" }],
  },
  {
    id: "admin-financeiro",
    title: "Financeiro (Admin)",
    items: [
      { label: "Dashboard financeiro", href: "/admin/financeiro" },
      { label: "Planos de preco (aluno)", href: "/admin/financeiro/planos-preco-alunos" },
      { label: "Contas a receber", href: "/admin/financeiro/contas-receber" },
      { label: "Contas a pagar", href: "/admin/financeiro/contas-pagar" },
      { label: "Centros de custo (financeiro)", href: "/admin/financeiro/centros-custo" },
      { label: "Plano de contas", href: "/admin/financeiro/plano-contas" },
      { label: "Categorias financeiras", href: "/admin/financeiro/categorias" },
      { label: "Contas financeiras", href: "/admin/financeiro/contas-financeiras" },
      { label: "Movimento", href: "/admin/financeiro/movimento" },
      { label: "Lancamentos manuais", href: "/admin/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "admin-cartoes",
    title: "Cartoes (Admin)",
    items: [
      { label: "Configuracao de cartoes", href: "/admin/financeiro/cartao/configuracoes" },
      { label: "Recebiveis de cartao", href: "/admin/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "admin-credito-conexao",
    title: "Credito Conexao (Admin)",
    items: [
      { label: "Contas", href: "/admin/financeiro/credito-conexao/contas" },
      { label: "Faturas", href: "/admin/financeiro/credito-conexao/faturas" },
      { label: "Configuracoes", href: "/admin/financeiro/credito-conexao/configuracoes" },
    ],
  },
  {
    id: "admin-loja-admin",
    title: "Loja (Admin)",
    items: [
      { label: "Gestao de estoque", href: "/admin/loja/gestao-estoque" },
      { label: "Compras", href: "/admin/loja/compras" },
      { label: "Fornecedores", href: "/admin/loja/fornecedores" },
      { label: "Categorias", href: "/admin/loja/categorias" },
      { label: "Configuracoes do produto", href: "/admin/loja/cadastros" },
    ],
  },
  {
    id: "admin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "Gestao de colaboradores", href: "/admin/colaboradores" },
      { label: "Tipos de vinculo", href: "/admin/colaboradores/tipos-vinculo" },
      { label: "Tipos de funcao", href: "/admin/colaboradores/tipos-funcao" },
      { label: "Jornadas de trabalho", href: "/admin/colaboradores/jornadas" },
    ],
  },
  {
    id: "admin-config-unidades",
    title: "Configuracoes das unidades",
    items: [
      { label: "Configuracao da escola", href: "/admin/config/escola" },
      { label: "Regras de valor", href: "/admin/config/escola/regras-valor" },
      { label: "Configuracao da loja", href: "/admin/config/loja" },
      { label: "Configuracao do Ballet Cafe", href: "/admin/config/cafe" },
    ],
  },
  {
    id: "admin-config-escola",
    title: "Configuracoes (Escola)",
    items: [
      { label: "Locais", href: "/admin/configuracoes/locais" },
      { label: "Espacos", href: "/admin/configuracoes/espacos" },
      { label: "Tabelas de precos (Escola)", href: "/admin/escola/configuracoes/matriculas/tabelas" },
      { label: "Planos de pagamento (matricula)", href: "/admin/escola/configuracoes/matriculas/planos-pagamento" },
    ],
  },
  {
    id: "admin-auditoria",
    title: "Governanca & Auditoria",
    items: [
      { label: "Construtor de Relatorios", href: "/admin/relatorios/construtor" },
      { label: "Auditoria do sistema", href: "/admin/relatorios/auditoria" },
      { label: "Boletos (NeoFin)", href: "/admin/governanca/boletos-neofin" },
      { label: "Cobrancas", href: "/admin/governanca/cobrancas" },
    ],
  },
  {
    id: "admin-usuarios",
    title: "Usuarios & Seguranca",
    items: [
      { label: "Usuarios", href: "/admin/usuarios" },
      { label: "Perfis", href: "/admin/perfis" },
      { label: "Permissoes", href: "/admin/permissoes" },
    ],
  },
  {
    id: "admin-ui",
    title: "UI / IA",
    items: [{ label: "Painel de IA (GPT interno)", href: "/admin/ia" }],
  },
];
