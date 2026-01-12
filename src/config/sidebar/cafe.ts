import type { SidebarSection } from "./types";

export const cafeSidebar: SidebarSection[] = [
  {
    id: "cafe-inicio",
    title: "☕ Início",
    items: [{ label: "🚧 ☕ Início", href: "/comercial/ballet-cafe" }],
  },
  {
    id: "cafe-comandas-caixa",
    title: "🧾 Comandas & Caixa",
    items: [
      { label: "🚧 🧾 Comandas", href: "/cafe/comandas" }, // TODO(migracao): ainda sem rota real
      { label: "🚧 🧺 Pedidos", href: "/comercial/ballet-cafe/vendas" }, // TODO(migracao): equivalência aproximada
      { label: "🚧 💳 Caixa", href: "/comercial/ballet-cafe/vendas" }, // TODO(migracao): equivalência aproximada
    ],
  },
  {
    id: "cafe-produtos-estoque",
    title: "📦 Produtos & Estoque",
    items: [
      { label: "🚧 🍽️ Cardápio", href: "/comercial/ballet-cafe/produtos" }, // TODO(migracao): equivalência aproximada
      { label: "🚧 📦 Estoque da cozinha", href: "/comercial/ballet-cafe/estoque" },
      { label: "🚧 🚚 Fornecedores", href: "/cafe/fornecedores" }, // TODO(migracao): ainda sem rota real
    ],
  },
  {
    id: "cafe-pessoal",
    title: "👥 Pessoal do Café",
    items: [
      { label: "🚧 👥 Colaboradores do Café", href: "/cafe/colaboradores" }, // TODO(migracao): ainda sem rota real
    ],
  },
];
