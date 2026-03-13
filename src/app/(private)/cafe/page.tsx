import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

const operacaoLinks = [
  {
    href: "/cafe/vendas",
    title: "Caixa / Vendas",
    description:
      "Opera\u00e7\u00e3o do PDV, lan\u00e7amento de itens, comprador, pagamento e fechamento da venda.",
  },
];

const gestaoLinks = [
  {
    href: "/cafe/admin",
    title: "Gest\u00e3o do Caf\u00e9",
    description:
      "Acesse o hub de gest\u00e3o para cat\u00e1logo, insumos, pre\u00e7os e compras do Ballet Caf\u00e9.",
    eyebrow: "Hub",
  },
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description: "Card\u00e1pio, receitas e organiza\u00e7\u00e3o dos itens comercializados.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastros, abastecimento manual e acompanhamento de estoque do caf\u00e9.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de pre\u00e7o",
    description: "Defina tabelas por perfil e mantenha a pol\u00edtica comercial do contexto.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Registre compras, abaste\u00e7a o estoque e acompanhe o hist\u00f3rico recente.",
  },
];

export default function CafeHomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Contexto SaaS"
        title="Ballet Caf\u00e9"
        description="Opera\u00e7\u00e3o e gest\u00e3o do Ballet Caf\u00e9."
      />

      <SectionCard
        title="Opera\u00e7\u00e3o"
        description="A opera\u00e7\u00e3o do caf\u00e9 fica concentrada no fluxo de caixa e vendas do dia."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {operacaoLinks.map((item) => (
            <CafeShortcutCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Gest\u00e3o do Caf\u00e9"
        description="Cadastros, tabelas comerciais e abastecimento ficam dentro do pr\u00f3prio contexto Caf\u00e9."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gestaoLinks.map((item) => (
            <CafeShortcutCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
              eyebrow={item.eyebrow}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
