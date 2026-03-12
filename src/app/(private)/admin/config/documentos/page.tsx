"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BookTemplate, Braces, FolderKanban, Layers3, LibraryBig, ReceiptText, Rows3 } from "lucide-react";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

type HubItem = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

type HubSection = {
  eyebrow: string;
  title: string;
  description: string;
  items: HubItem[];
};

const HUB_SECTIONS: HubSection[] = [
  {
    eyebrow: "Autoria documental",
    title: "Onde os documentos sao escritos e estruturados",
    description: "Camada de autoria para criar modelos, placeholders e listas automaticas usadas no texto.",
    items: [
      {
        title: "Modelos",
        description: "Crie, edite e teste os templates principais de contrato, recibo, declaracao e termos.",
        href: "/admin/config/documentos/modelos",
        icon: <BookTemplate className="h-5 w-5" />,
      },
      {
        title: "Variaveis",
        description: "Cadastre os campos individuais que substituem valores dinamicos no documento.",
        href: "/admin/config/documentos/variaveis",
        icon: <Braces className="h-5 w-5" />,
      },
      {
        title: "Colecoes",
        description: "Gerencie listas automaticas usadas para renderizar tabelas e blocos repetitivos.",
        href: "/admin/config/documentos/colecoes",
        icon: <Rows3 className="h-5 w-5" />,
      },
    ],
  },
  {
    eyebrow: "Componentes reutilizaveis",
    title: "Estruturas institucionais compartilhadas entre modelos",
    description: "Componentes visuais que padronizam identidade institucional e reaproveitamento entre documentos.",
    items: [
      {
        title: "Cabecalhos",
        description: "Defina identidade institucional, logo e bloco superior reutilizavel.",
        href: "/admin/config/documentos/cabecalhos",
        icon: <Layers3 className="h-5 w-5" />,
      },
      {
        title: "Rodapes",
        description: "Mantenha assinaturas, local/data e elementos finais em componentes reaproveitaveis.",
        href: "/admin/config/documentos/rodapes",
        icon: <LibraryBig className="h-5 w-5" />,
      },
    ],
  },
  {
    eyebrow: "Fluxos documentais",
    title: "Como os documentos se agrupam dentro de um processo",
    description: "Conjuntos e grupos organizam quais documentos aparecem em cada operacao do sistema.",
    items: [
      {
        title: "Conjuntos documentais",
        description: "Agrupe contratos, recibos e termos dentro de um mesmo processo documental.",
        href: "/admin/config/documentos/conjuntos",
        icon: <FolderKanban className="h-5 w-5" />,
      },
    ],
  },
  {
    eyebrow: "Operacao",
    title: "Onde os documentos passam a existir de forma oficial",
    description: "Acompanhe documentos gerados, PDF, status e cadeia historica das emissoes.",
    items: [
      {
        title: "Documentos emitidos",
        description: "Consulte os documentos oficiais gerados pelo sistema e acompanhe sua cadeia documental.",
        href: "/admin/config/documentos/emitidos",
        icon: <ReceiptText className="h-5 w-5" />,
      },
    ],
  },
];

export default function AdminConfigDocumentosHome() {
  return (
    <SystemPage>
      <SystemContextCard
        title="Hub de documentos"
        subtitle="Navegacao semantica do modulo documental: autoria, componentes, fluxos e operacao."
      />

      <SystemHelpCard
        items={[
          "Use este hub como ponto central do modulo e como base futura para documentacao e tutorial.",
          "Autoria cobre modelos, variaveis e colecoes.",
          "Componentes, fluxos e operacao ficam separados para reduzir carga cognitiva.",
        ]}
      />

      <div className="space-y-6">
        {HUB_SECTIONS.map((section) => (
          <SystemSectionCard
            key={section.eyebrow}
            title={section.title}
            description={section.description}
          >
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{section.eyebrow}</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-5 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 text-slate-900">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">{item.icon}</div>
                    <div className="text-base font-semibold">{item.title}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </SystemSectionCard>
        ))}
      </div>
    </SystemPage>
  );
}
