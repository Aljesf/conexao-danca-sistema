"use client";

import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

export default function AdminConfigDocumentosHome() {
  return (
    <SystemPage>
      <SystemContextCard
        title="Configuracao - Documentos"
        subtitle="Central do modulo de documentos: modelos, emissao e acompanhamento."
      />

      <SystemHelpCard
        items={[
          "Crie e edite modelos com placeholders.",
          "Emita documentos a partir de matriculas existentes.",
          "Acompanhe documentos emitidos e seus status.",
        ]}
      />

      <div className="grid gap-4">
        <Link href="/admin/config/documentos/modelos" className="block">
          <SystemSectionCard
            title="Modelos de documento"
            description="Crie e edite templates com placeholders (DB/CALC/MANUAL)."
          >
            <p className="text-sm text-slate-600">Gerencie versao, tipo, texto e schema do modelo.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/emitir" className="block">
          <SystemSectionCard
            title="Emitir documento"
            description="Busque aluno ou responsavel, selecione matricula e emita o documento."
          >
            <p className="text-sm text-slate-600">Emissao guiada com snapshot e variaveis manuais.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/emitidos" className="block">
          <SystemSectionCard title="Documentos emitidos" description="Visualize documentos emitidos (MVP).">
            <p className="text-sm text-slate-600">Lista de emitidos com status e referencia.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/novo-recibo" className="block">
          <SystemSectionCard
            title="Novo recibo de mensalidade"
            description="Emita recibo por cobranca ou recebimento com texto pronto."
          >
            <p className="text-sm text-slate-600">Fluxo rapido para comprovante de mensalidade no financeiro.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/variaveis" className="block">
          <SystemSectionCard
            title="Variaveis de documento"
            description="Cadastre variaveis reutilizaveis para gerar placeholders."
          >
            <p className="text-sm text-slate-600">Use codigos padronizados e path tecnico.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/layouts" className="block">
          <SystemSectionCard
            title="Layouts reutilizaveis"
            description="Cabecalho e rodape padronizados para modelos."
          >
            <p className="text-sm text-slate-600">Defina layout e reutilize em varios modelos.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/layout-templates" className="block">
          <SystemSectionCard
            title="Layout templates (header/footer)"
            description="Templates fisicos de cabecalho e rodape com altura."
          >
            <p className="text-sm text-slate-600">Defina HTML e altura fisica para impressao.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/documentos/imagens" className="block">
          <SystemSectionCard
            title="Banco de imagens"
            description="Gerencie imagens publicas para usar em cabecalhos e modelos."
          >
            <p className="text-sm text-slate-600">Upload de logos e imagens institucionais.</p>
          </SystemSectionCard>
        </Link>
      </div>
    </SystemPage>
  );
}
