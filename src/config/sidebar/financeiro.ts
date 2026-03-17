import type { SidebarSection } from "./types";

export const financeiroSidebar: SidebarSection[] = [
  {
    id: "fin-inicio",
    title: "Inicio",
    items: [{ label: "Dashboard financeiro", href: "/financeiro" }],
  },
  {
    id: "fin-estrutura",
    title: "Estrutura",
    items: [
      { label: "Configuracoes do financeiro", href: "/financeiro/configuracoes" },
      { label: "Centros de custo", href: "/financeiro/centros-custo" },
      { label: "Plano de contas", href: "/financeiro/plano-contas" },
      { label: "Categorias financeiras", href: "/financeiro/categorias" },
      { label: "Contas financeiras", href: "/financeiro/contas-financeiras" },
    ],
  },
  {
    id: "fin-operacao",
    title: "Operacao",
    items: [
      { label: "Contas a receber", href: "/financeiro/contas-receber" },
      { label: "Contas a pagar", href: "/financeiro/contas-pagar" },
      { label: "Movimento", href: "/financeiro/movimento" },
      { label: "Lancamentos manuais", href: "/financeiro/lancamentos-manuais" },
    ],
  },
  {
    id: "fin-colaboradores",
    title: "Colaboradores",
    items: [
      { label: "Colaboradores", href: "/financeiro/colaboradores" },
      { label: "Folha de pagamento", href: "/financeiro/folha/colaboradores" },
    ],
  },
  {
    id: "fin-cartoes",
    title: "Cartoes",
    items: [
      { label: "Configuracao de cartoes", href: "/financeiro/cartao/configuracoes" },
      { label: "Recebiveis de cartao", href: "/financeiro/cartao/recebiveis" },
    ],
  },
  {
    id: "fin-conta-interna",
    title: "Conta interna",
    items: [
      { label: "Contas internas", href: "/financeiro/credito-conexao/contas" },
      { label: "Faturas da conta interna", href: "/financeiro/credito-conexao/faturas" },
      { label: "Cobrancas por competencia", href: "/financeiro/credito-conexao/cobrancas" },
      { label: "Configuracoes da conta interna", href: "/financeiro/credito-conexao/configuracoes" },
    ],
  },
];
