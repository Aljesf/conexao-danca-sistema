import CafePageShell from "@/components/cafe/CafePageShell";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import SectionCard from "@/components/layout/SectionCard";

const gestaoLinks = [
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description: "Cardápio, receitas, preços por tabela e classificação dos itens vendidos.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastros, saldo atual, abastecimento manual e histórico operacional.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de preço",
    description: "Estruture preços por perfil e mantenha a política comercial aplicada ao PDV.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Registre abastecimentos e acompanhe as compras recentes do café.",
  },
];

export default function CafeAdminHomePage() {
  return (
    <CafePageShell
      eyebrow="Gestão do Café"
      title="Gestão do Ballet Café"
      description="Cadastros, preços, insumos e abastecimento do café em uma área administrativa própria do módulo."
      summary={
        <>
          <CafeStatCard
            label="Catálogo"
            value="Produtos"
            description="Cardápio, receitas, categorias e composição comercial do café."
          />
          <CafeStatCard
            label="Insumos e estoque"
            value="Controle operacional"
            description="Acompanhamento de saldo, validade e abastecimento manual."
          />
          <CafeStatCard
            label="Política comercial"
            value="Tabelas de preço"
            description="Preço principal e tabelas auxiliares centralizados no mesmo contexto."
          />
          <CafeStatCard
            label="Abastecimento"
            value="Compras"
            description="Registro de compras operacionais com impacto direto no estoque."
          />
        </>
      }
    >
      <SectionCard
        title="Hub administrativo do módulo"
        description="Escolha a área de gestão que precisa ajustar. O módulo foi reorganizado para concentrar o trabalho operacional e comercial dentro do próprio contexto Café."
      >
        <CafeSectionIntro
          title="Atalhos principais"
          description="Acesse diretamente os cadastros que sustentam a operação do caixa, o abastecimento e a política comercial."
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
      </SectionCard>

      <SectionCard
        title="Configuração institucional do café"
        description="Branding, vínculo institucional e definições globais do contexto permanecem na Administração do Sistema."
      >
        <CafeSectionIntro
          title="Administração institucional"
          description="Use a configuração institucional apenas para identidade, vínculos e parâmetros globais do Ballet Café."
          actions={
            <a
              href="/admin/config/cafe"
              className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Abrir configuração institucional
            </a>
          }
        />
      </SectionCard>
    </CafePageShell>
  );
}
