import type { SidebarSection } from "./types";

export const financeiroSidebar: SidebarSection[] = [
  {
    id: "fin-inicio",
    title: "🏠 Início",
    items: [{ label: "📊 Dashboard financeiro", href: "/financeiro" }],
  },
  {
    id: "fin-estrutura",
    title: "🏦 Estrutura",
    items: [
      { label: "⚙️ Configurações do financeiro", href: "/financeiro/configuracoes" },
      { label: "🎯 Centros de custo", href: "/financeiro/centros-custo" },
      { label: "📚 Plano de contas", href: "/financeiro/plano-contas" },
      { label: "🏷️ Categorias financeiras", href: "/financeiro/categorias" },
      { label: "🏦 Contas financeiras", href: "/financeiro/contas-financeiras" },
    ],
  },
  {
    id: "fin-operacao",
    title: "🧾 Operação",
    items: [
      { label: "📥 Contas a receber", href: "/financeiro/contas-receber" },
      { label: "📤 Contas a pagar", href: "/financeiro/contas-pagar" },
      { label: "🔄 Movimento", href: "/financeiro/movimento" },
      { label: "✍️ Lançamentos manuais", href: "/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "fin-folha",
    title: "👥 Folha",
    items: [{ label: "🧾 Folha - Colaboradores", href: "/financeiro/folha/colaboradores" }],
  },
  {
    id: "fin-cartoes",
    title: "💳 Cartões",
    items: [
      { label: "⚙️ Configuração de cartões", href: "/financeiro/cartao/configuracoes" },
      { label: "💰 Recebíveis de cartão", href: "/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "fin-credito-conexao",
    title: "💠 Crédito Conexão",
    items: [
      { label: "🏦 Contas", href: "/financeiro/credito-conexao/contas" },
      { label: "🧾 Faturas", href: "/financeiro/credito-conexao/faturas" },
      { label: "💸 Cobranças (ALUNO)", href: "/financeiro/credito-conexao/cobrancas" },
      { label: "⚙️ Configurações", href: "/financeiro/credito-conexao/configuracoes" },
    ],
  },
];
