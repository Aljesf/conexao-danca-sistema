import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import CafeStatCard from "@/components/cafe/CafeStatCard";

const operacaoLinks = [
  {
    href: "/cafe/vendas",
    title: "Vendas",
    description:
      "PDV do Ballet Cafe com categorias, cards de produto, carrinho rapido e fechamento imediato.",
    eyebrow: "Principal",
    featured: true,
  },
  {
    href: "/cafe/caixa",
    title: "Caixa / Lancamentos",
    description:
      "Tela administrativa para registro retroativo, baixa parcial, revisao de comandas e envio para conta interna.",
    eyebrow: "Regularizacao",
    featured: false,
  },
];

const gestaoLinks = [
  {
    href: "/cafe/admin",
    title: "Gestao do Cafe",
    description: "Hub do modulo para catalogo, estoque, precos e abastecimento.",
    eyebrow: "Hub",
  },
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description: "Cardapio, receitas e organizacao dos itens comercializados.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastro, saldo e abastecimento do estoque operacional do cafe.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de preco",
    description: "Politica comercial aplicada ao PDV e aos lancamentos do caixa.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Compras operacionais e historico de abastecimento.",
  },
];

export default function CafeHomePage() {
  return (
    <CafePageShell
      eyebrow="Modulo operacional"
      title="Ballet Cafe"
      description="O modulo agora separa claramente a frente de vendas do caixa administrativo. Use o PDV para a operacao rapida e o caixa para regularizacoes."
      summary={
        <>
          <CafeStatCard
            label="PDV"
            value="Vendas rapidas"
            description="A experiencia principal do dia fica em /cafe/vendas, com clique rapido por categoria e fechamento imediato."
          />
          <CafeStatCard
            label="Caixa"
            value="Lancamentos e revisao"
            description="Comandas em papel, retroatividade, baixa parcial e envio para conta interna ficam em /cafe/caixa."
          />
          <CafeStatCard
            label="Conta interna"
            value="Financeiro unificado"
            description="As vendas administrativas do cafe seguem a cobranca canonica por competencia sem criar financeiro paralelo."
          />
        </>
      }
    >
      <CafeCard
        title="Operacao do dia"
        description="A entrada principal do Ballet Cafe volta a ser o PDV. O caixa administrativo segue separado para regularizacao operacional."
      >
        <CafeSectionIntro
          title="Escolha a experiencia certa"
          description="Vendas e caixa nao competem pela mesma tela: o PDV atende o balcao e o caixa atende o administrativo."
        />
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {operacaoLinks.map((item) => (
              <CafeShortcutCard
                key={item.href}
                href={item.href}
                title={item.title}
                description={item.description}
                eyebrow={item.eyebrow}
                featured={item.featured}
              />
            ))}
          </div>
          <CafePanel className="flex h-full flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Regra de uso
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                O caixa nao substitui o PDV
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                O PDV atende a venda do balcao. O caixa administrativo serve para comandas em papel,
                lancamentos retroativos, baixas parciais e envio de saldo para conta interna.
              </p>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              A navegacao do modulo foi reorganizada para refletir essa separacao operacional.
            </p>
          </CafePanel>
        </div>
      </CafeCard>

      <CafeCard
        title="Gestao do Cafe"
        description="Cadastros, tabelas comerciais e abastecimento permanecem no contexto de gestao do modulo."
      >
        <CafeSectionIntro
          title="Acessos de apoio"
          description="Entre no hub administrativo do modulo ou va direto para o cadastro que precisa ajustar."
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
