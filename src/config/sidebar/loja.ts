import type { SidebarSection } from "./types";

export const lojaSidebar: SidebarSection[] = [
  {
    id: "loja-inicio",
    title: "Início",
    items: [{ label: "Início", href: "/loja" }],
  },
  {
    id: "loja-caixa-vendas",
    title: "Caixa & Vendas",
    items: [
      { label: "Frente de caixa", href: "/loja/caixa" },
      { label: "Pedidos da escola", href: "/loja/pedidos/escola" },
      { label: "Pedidos externos", href: "/loja/pedidos/externos" },
      { label: "Trocas & devoluções", href: "/loja/trocas" },
    ],
  },
  {
    id: "loja-produtos-estoque",
    title: "Produtos & Estoque",
    items: [
      { label: "Produtos", href: "/loja/produtos" },
      { label: "Estoque", href: "/loja/estoque" },
      { label: "Fornecedores", href: "/loja/fornecedores" },
    ],
  },
  {
    id: "loja-pessoal",
    title: "Pessoal da Loja",
    items: [{ label: "Colaboradores da loja", href: "/loja/colaboradores" }],
  },
];
