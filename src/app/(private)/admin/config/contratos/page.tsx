"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminConfigContratosHome() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Configuracao - Contratos</h1>
        <p className="text-sm opacity-80">Central do modulo: modelos, emissao e acompanhamento.</p>
      </div>

      <div className="grid gap-4">
        <Link href="/admin/config/contratos/modelos" className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>Modelos de Contrato</CardTitle>
              <CardDescription>Crie e edite templates com placeholders (DB/CALC/MANUAL).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm opacity-80">Gerencie versao, tipo, texto e schema do modelo.</CardContent>
          </Card>
        </Link>

        <Link href="/admin/config/contratos/emitir" className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>Emitir Contrato</CardTitle>
              <CardDescription>Busque aluno/responsavel, selecione matricula e emita o contrato.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm opacity-80">Emissao guiada com snapshot e variaveis manuais.</CardContent>
          </Card>
        </Link>

        <Link href="/admin/config/contratos/emitidos" className="no-underline">
          <Card>
            <CardHeader>
              <CardTitle>Contratos Emitidos</CardTitle>
              <CardDescription>Visualize contratos emitidos (MVP).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm opacity-80">Lista de emitidos com status e referencia.</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
