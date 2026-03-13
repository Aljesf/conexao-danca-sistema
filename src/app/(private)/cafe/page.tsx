import CafePageShell from "@/components/cafe/CafePageShell";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import SectionCard from "@/components/layout/SectionCard";

const operacaoLinks = [
  {
    href: "/cafe/vendas",
    title: "Caixa / Vendas",
    description:
      "Operação do PDV, lançamento de itens, comprador, pagamento e fechamento da venda.",
  },
];

const gestaoLinks = [
  {
    href: "/cafe/admin",
    title: "Gestão do Café",
    description: "Hub de gestão para catálogo, insumos, preços e compras do Ballet Café.",
    eyebrow: "Hub",
  },
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description: "Cardápio, receitas e organização dos itens comercializados.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastros, abastecimento manual e acompanhamento do estoque do café.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de preço",
    description: "Política comercial aplicada ao catálogo e ao caixa.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Abastecimento operacional, histórico de compras e atualização do estoque.",
  },
];

export default function CafeHomePage() {
  return (
    <CafePageShell
      eyebrow="Contexto SaaS"
      title="Ballet Café"
      description="Operação e gestão do Ballet Café organizadas no próprio contexto, com navegação rápida para caixa, catálogo, insumos e abastecimento."
      summary={
        <>
          <CafeStatCard
            label="Operação do dia"
            value="Caixa pronto"
            description="A frente de caixa concentra comprador, itens, pagamento e fechamento da venda."
          />
          <CafeStatCard
            label="Gestão comercial"
            value="Catálogo e preços"
            description="Produtos, tabelas de preço e organização comercial ficam dentro do módulo Café."
          />
          <CafeStatCard
            label="Abastecimento"
            value="Insumos e compras"
            description="Gestão de insumos e compras operacionais separada da administração institucional."
          />
        </>
      }
    >
      <SectionCard
        title="Operação"
        description="A operação do café precisa de acesso rápido. O Caixa / Vendas continua como o ponto principal do contexto."
      >
        <CafeSectionIntro
          title="Fluxo principal do dia"
          description="Use o caixa para registrar vendas, selecionar comprador, aplicar a forma de pagamento e concluir a operação."
        />
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          {operacaoLinks.map((item) => (
            <CafeShortcutCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
              featured
              eyebrow="Operação"
              footer="Acesso principal do módulo para registrar vendas no dia."
            />
          ))}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Navegação do contexto
            </p>
            <h3 className="mt-2 text-base font-semibold text-slate-900">
              Gestão e abastecimento sem sair do Café
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              O contexto já separa a operação do dia da gestão comercial e do abastecimento, sem
              misturar essas tarefas com a administração global do sistema.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Gestão do Café"
        description="Cadastros, tabelas comerciais e abastecimento ficam dentro do próprio contexto Café."
      >
        <CafeSectionIntro
          title="Acessos de gestão"
          description="Entre no hub administrativo do módulo ou vá direto para o cadastro que precisa ajustar."
        />
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
    </CafePageShell>
  );
}
