"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Blocks, Braces, FileStack, FolderKanban, LibraryBig, ListTree, Settings2 } from "lucide-react";
import { ComponenteReutilizavelPage } from "@/components/documentos/ComponenteReutilizavelPage";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentosColecoesContent } from "../colecoes/page";
import { DocumentosConjuntosContent } from "../conjuntos/page";
import { DocumentosTiposContent } from "../tipos/page";
import { DocumentosVariaveisContent } from "../variaveis/page";

type ConfigTab = {
  value: string;
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const CONFIG_TABS: ConfigTab[] = [
  {
    value: "variaveis",
    label: "Variáveis",
    description: "Campos individuais do documento, como nome, data, valor ou CPF.",
    href: "/admin/config/documentos/variaveis",
    icon: <Braces className="h-4 w-4" />,
  },
  {
    value: "colecoes",
    label: "Coleções",
    description: "Listas automáticas usadas para tabelas e blocos repetitivos.",
    href: "/admin/config/documentos/colecoes",
    icon: <ListTree className="h-4 w-4" />,
  },
  {
    value: "cabecalhos",
    label: "Cabeçalhos",
    description: "Blocos institucionais reutilizáveis para o topo dos documentos.",
    href: "/admin/config/documentos/cabecalhos",
    icon: <Blocks className="h-4 w-4" />,
  },
  {
    value: "rodapes",
    label: "Rodapés",
    description: "Assinaturas, local/data e elementos finais reutilizáveis.",
    href: "/admin/config/documentos/rodapes",
    icon: <LibraryBig className="h-4 w-4" />,
  },
  {
    value: "tipos",
    label: "Tipos de documento",
    description: "Classificação usada pelos modelos e pela operação documental.",
    href: "/admin/config/documentos/tipos",
    icon: <FileStack className="h-4 w-4" />,
  },
  {
    value: "conjuntos",
    label: "Conjuntos",
    description: "Agrupadores de documentos dentro de um processo documental.",
    href: "/admin/config/documentos/conjuntos",
    icon: <FolderKanban className="h-4 w-4" />,
  },
];

export default function DocumentosConfiguracaoPage() {
  return (
    <SystemPage maxWidthClassName="max-w-[92rem]" pageClassName="2xl:px-10">
      <SystemContextCard
        title="Configuração de documentos"
        subtitle="Área técnica unificada para manter variáveis, coleções, componentes reutilizáveis, tipos e conjuntos."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Use esta página como base da configuração técnica do módulo documental.",
          "Variáveis e coleções definem quais dados entram no documento.",
          "Cabeçalhos, rodapés, tipos e conjuntos ficam aqui para reduzir navegação solta entre telas técnicas.",
        ]}
      />

      <SystemSectionCard
        title="Configuração central"
        description="Escolha a área técnica que deseja manter. Cada seção continua com link para abrir a tela dedicada quando você precisar de mais espaço."
      >
        <Tabs defaultValue="variaveis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-2 rounded-[28px] border border-slate-200 bg-slate-100/80 p-2 md:grid-cols-3 xl:grid-cols-6">
            {CONFIG_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex min-h-[72px] items-center justify-start gap-3 rounded-2xl border border-transparent px-4 py-3 text-left shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-900 data-[active=true]:border-slate-900"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                  {tab.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{tab.label}</span>
                  <span className="text-xs text-slate-500">Abrir configuração</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {CONFIG_TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Configuração técnica</div>
                  <div className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Settings2 className="h-4 w-4" />
                    {tab.label}
                  </div>
                  <p className="mt-2 max-w-4xl text-sm text-slate-600">{tab.description}</p>
                </div>
                <Link className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white" href={tab.href}>
                  Abrir tela dedicada
                </Link>
              </div>

              {tab.value === "variaveis" ? <DocumentosVariaveisContent embedded /> : null}
              {tab.value === "colecoes" ? <DocumentosColecoesContent embedded /> : null}
              {tab.value === "cabecalhos" ? (
                <ComponenteReutilizavelPage
                  embedded
                  tipo="HEADER"
                  title="Cabeçalhos reutilizáveis"
                  subtitle="Cadastre e mantenha os cabeçalhos institucionais usados pelos modelos documentais."
                  shortDescription="Crie o cabeçalho institucional que será reaproveitado em contratos, recibos, declarações e outros documentos."
                  hintItems={[
                    "Cabeçalhos concentram identidade institucional, logo e dados superiores do documento.",
                    "Use componentes reutilizáveis para evitar HTML duplicado entre modelos.",
                    "A edição fina continua disponível na tela técnica de layout templates.",
                  ]}
                  defaultHeightPx={120}
                />
              ) : null}
              {tab.value === "rodapes" ? (
                <ComponenteReutilizavelPage
                  embedded
                  tipo="FOOTER"
                  title="Rodapés reutilizáveis"
                  subtitle="Cadastre e mantenha os rodapés institucionais usados pelos modelos documentais."
                  shortDescription="Crie o rodapé institucional com assinatura, local, data e blocos finais reutilizáveis."
                  hintItems={[
                    "Rodapés concentram assinatura, local, data, validação e observações finais.",
                    "Um rodapé reutilizável reduz manutenção e padroniza a base visual dos documentos.",
                    "A tela técnica de layout templates continua disponível para ajustes detalhados.",
                  ]}
                  defaultHeightPx={80}
                />
              ) : null}
              {tab.value === "tipos" ? <DocumentosTiposContent embedded /> : null}
              {tab.value === "conjuntos" ? <DocumentosConjuntosContent embedded /> : null}
            </TabsContent>
          ))}
        </Tabs>
      </SystemSectionCard>
    </SystemPage>
  );
}
