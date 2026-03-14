import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import CafeStatCard from "@/components/cafe/CafeStatCard";

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
      description="Operação e gestão do Ballet Café em um contexto dedicado, com navegação rápida para caixa, catálogo, preços, insumos e abastecimento."
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
            description="Produtos, preços e receitas ficam organizados dentro do próprio módulo."
          />
          <CafeStatCard
            label="Abastecimento"
            value="Insumos e compras"
            description="Gestão de insumos e compras operacionais separada da administração institucional."
          />
        </>
      }
    >
      <CafeCard
        title="Operação"
        description="A operação do café precisa de acesso rápido. Caixa / Vendas continua como o principal ponto de entrada do contexto."
      >
        <CafeSectionIntro
          title="Fluxo principal do dia"
          description="Use o caixa para registrar vendas, selecionar comprador, definir a forma de pagamento e concluir a operação com rapidez."
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
          <CafePanel className="flex h-full flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Navegação do contexto
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                Gestão e abastecimento sem sair do Café
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                O contexto já separa a operação do dia da gestão comercial e do abastecimento, sem
                misturar essas tarefas com a administração global do sistema.
              </p>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              O mesmo padrão visual e de navegação se repete em todas as páginas do módulo.
            </p>
          </CafePanel>
        </div>
      </CafeCard>

      <CafeCard
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
      </CafeCard>
    </CafePageShell>
  );
}
