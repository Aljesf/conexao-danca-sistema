import CafeShortcutCard from "@/components/cafe/CafeShortcutCard";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

const gestaoLinks = [
  {
    href: "/cafe/admin/produtos",
    title: "Produtos",
    description:
      "Card\u00e1pio, receitas, pre\u00e7os por tabela e classifica\u00e7\u00e3o dos itens vendidos.",
  },
  {
    href: "/cafe/admin/insumos",
    title: "Insumos",
    description: "Cadastros, saldo atual, abastecimento manual e hist\u00f3rico operacional.",
  },
  {
    href: "/cafe/admin/tabelas-preco",
    title: "Tabelas de pre\u00e7o",
    description:
      "Estruture pre\u00e7os por perfil, defina a tabela principal e mantenha governan\u00e7a comercial.",
  },
  {
    href: "/cafe/admin/compras",
    title: "Compras de insumos",
    description: "Registre abastecimentos e acompanhe compras recentes do caf\u00e9.",
  },
];

export default function CafeAdminHomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        eyebrow="Gest\u00e3o do Caf\u00e9"
        title="Gest\u00e3o do Ballet Caf\u00e9"
        description="Cadastros, pre\u00e7os, insumos e abastecimento do caf\u00e9."
      />

      <SectionCard
        title="Gest\u00e3o operacional do contexto"
        description="Use esta \u00e1rea para manter o cat\u00e1logo, os insumos e a sustenta\u00e7\u00e3o di\u00e1ria do Ballet Caf\u00e9."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {gestaoLinks.map((item) => (
            <CafeShortcutCard
              key={item.href}
              href={item.href}
              title={item.title}
              description={item.description}
            />
          ))}
          <div className="flex h-full flex-col justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {"Administra\u00e7\u00e3o institucional"}
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                {"Configura\u00e7\u00e3o institucional do caf\u00e9"}
              </h3>
              <p>
                {"A configura\u00e7\u00e3o institucional do caf\u00e9 permanece em Administra\u00e7\u00e3o do Sistema."}
              </p>
            </div>
            <a
              href="/admin/config/cafe"
              className="mt-4 inline-flex items-center gap-2 font-medium text-slate-700 hover:text-slate-900"
            >
              {"Abrir configura\u00e7\u00e3o institucional"}
              <span aria-hidden="true">-&gt;</span>
            </a>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
