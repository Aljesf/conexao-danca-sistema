import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import CafeStatCard from "@/components/cafe/CafeStatCard";

const gestaoLinks = [
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description: "Cardapio, receitas, precos por tabela e classificacao dos itens vendidos.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastros, saldo atual, abastecimento manual e historico operacional.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de preco",
    description: "Estruture precos por perfil e mantenha a politica comercial aplicada ao PDV.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Registre abastecimentos e acompanhe as compras recentes do cafe.",
  },
];

export default function CafeAdminHomePage() {
  return (
    <CafePageShell
      eyebrow="Gestao do Cafe"
      title="Gestao do Ballet Cafe"
      description="Cadastros, precos, insumos e abastecimento do cafe em uma area administrativa propria do modulo."
      summary={
        <>
          <CafeStatCard
            label="Catalogo"
            value="Produtos"
            description="Cardapio, receitas, categorias e composicao comercial do cafe."
          />
          <CafeStatCard
            label="Insumos e estoque"
            value="Controle operacional"
            description="Acompanhamento de saldo, abastecimento e leitura do custo medio."
          />
          <CafeStatCard
            label="Politica comercial"
            value="Tabelas de preco"
            description="Preco principal e tabelas auxiliares centralizados no mesmo contexto."
          />
          <CafeStatCard
            label="Abastecimento"
            value="Compras"
            description="Registro de compras operacionais com impacto direto no estoque."
          />
        </>
      }
    >
      <CafeCard
        title="Visoes do modulo"
        description="O contexto Cafe agora separa claramente a operacao inteligente da governanca do modulo."
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CafeShortcutCard
            href="/cafe"
            title="Dashboard do Ballet Cafe"
            description="Use /cafe como home operacional inteligente para vendas, consumo, horarios e alertas de reposicao."
            eyebrow="Dashboard"
            featured
          />
          <CafePanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Separacao de escopo
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <strong>/cafe</strong> concentra leitura operacional e tomada de decisao.{" "}
              <strong>/cafe/admin</strong> permanece como area de governanca, cadastros, tabelas e
              abastecimento do modulo.
            </p>
          </CafePanel>
        </div>
      </CafeCard>

      <CafeCard
        title="Hub administrativo do modulo"
        description="Escolha a area de gestao que precisa ajustar. O modulo foi reorganizado para concentrar o trabalho operacional e comercial dentro do proprio contexto Cafe."
      >
        <CafeSectionIntro
          title="Atalhos principais"
          description="Acesse diretamente os cadastros que sustentam a operacao do caixa, o abastecimento e a politica comercial."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {gestaoLinks.map((item) => (
            <CafeShortcutCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </CafeCard>

      <CafeCard
        title="Configuracao institucional do cafe"
        description="Branding, vinculo institucional e definicoes globais do contexto permanecem na Administracao do Sistema."
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <CafeSectionIntro
            title="Administracao institucional"
            description="Use a configuracao institucional apenas para identidade, vinculos e parametros globais do Ballet Cafe."
            actions={
              <a
                href="/admin/config/cafe"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Abrir configuracao institucional
              </a>
            }
          />
          <CafePanel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Escopo institucional
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esse espaco nao mistura produtos, insumos, tabelas de preco ou compras. Ele existe
              apenas para a configuracao global do contexto.
            </p>
          </CafePanel>
        </div>
      </CafeCard>
    </CafePageShell>
  );
}
