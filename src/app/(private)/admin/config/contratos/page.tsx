"use client";

import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

export default function AdminConfigContratosHome() {
  return (
    <SystemPage>
      <SystemContextCard
        title="Configuracao - Contratos"
        subtitle="Central do modulo de contratos: modelos, emissao e acompanhamento."
      />

      <SystemHelpCard
        items={[
          "Crie e edite modelos com placeholders.",
          "Emita contratos a partir de matriculas existentes.",
          "Acompanhe contratos emitidos e seus status.",
        ]}
      />

      <div className="grid gap-4">
        <Link href="/admin/config/contratos/modelos" className="block">
          <SystemSectionCard
            title="Modelos de contrato"
            description="Crie e edite templates com placeholders (DB/CALC/MANUAL)."
          >
            <p className="text-sm text-slate-600">Gerencie versao, tipo, texto e schema do modelo.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/contratos/emitir" className="block">
          <SystemSectionCard
            title="Emitir contrato"
            description="Busque aluno ou responsavel, selecione matricula e emita o contrato."
          >
            <p className="text-sm text-slate-600">Emissao guiada com snapshot e variaveis manuais.</p>
          </SystemSectionCard>
        </Link>

        <Link href="/admin/config/contratos/emitidos" className="block">
          <SystemSectionCard title="Contratos emitidos" description="Visualize contratos emitidos (MVP).">
            <p className="text-sm text-slate-600">Lista de emitidos com status e referencia.</p>
          </SystemSectionCard>
        </Link>
      </div>
    </SystemPage>
  );
}
