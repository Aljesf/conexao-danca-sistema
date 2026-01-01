"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderCard } from "@/components/layout/PageHeaderCard";
import { SectionCard } from "@/components/layout/SectionCard";

export default function AdminConfigContratosHome() {
  return (
    <PageContainer>
      <PageHeaderCard
        title="Configuracao - Contratos"
        subtitle="Central do modulo de contratos: modelos, emissao e acompanhamento."
      />

      <div className="grid gap-4">
        <Link href="/admin/config/contratos/modelos" className="block">
          <SectionCard
            title="Modelos de Contrato"
            description="Crie e edite templates com placeholders (DB/CALC/MANUAL)."
          >
            <p className="text-sm text-muted-foreground">Gerencie versao, tipo, texto e schema do modelo.</p>
          </SectionCard>
        </Link>

        <Link href="/admin/config/contratos/emitir" className="block">
          <SectionCard
            title="Emitir Contrato"
            description="Busque aluno ou responsavel, selecione matricula e emita o contrato."
          >
            <p className="text-sm text-muted-foreground">Emissao guiada com snapshot e variaveis manuais.</p>
          </SectionCard>
        </Link>

        <Link href="/admin/config/contratos/emitidos" className="block">
          <SectionCard title="Contratos Emitidos" description="Visualize contratos emitidos (MVP).">
            <p className="text-sm text-muted-foreground">Lista de emitidos com status e referencia.</p>
          </SectionCard>
        </Link>
      </div>
    </PageContainer>
  );
}
