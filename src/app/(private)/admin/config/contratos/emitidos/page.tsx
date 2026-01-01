"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderCard } from "@/components/layout/PageHeaderCard";
import { SectionCard } from "@/components/layout/SectionCard";

type Emitido = {
  id: number;
  matricula_id: number;
  contrato_modelo_id: number;
  status_assinatura: string;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
};

export default function AdminContratosEmitidosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<Emitido[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/emitidos");
      const json = (await res.json()) as { data?: Emitido[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar emitidos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <PageContainer>
      <PageHeaderCard title="Contratos emitidos" subtitle="Lista simples dos contratos emitidos (MVP).">
        <Link className="text-sm underline text-muted-foreground" href="/admin/config/contratos">
          Voltar ao hub de Contratos
        </Link>
      </PageHeaderCard>

      <SectionCard title="Lista de contratos emitidos">
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contrato emitido ainda.</p>
        ) : (
          <div className="grid gap-3">
            {itens.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="text-sm font-semibold">Contrato #{c.id}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Matricula: {c.matricula_id} | Modelo: {c.contrato_modelo_id} | Status: {c.status_assinatura}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Criado: {new Date(c.created_at).toLocaleString("pt-BR")}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">PDF: {c.pdf_url ? "Disponivel" : "-"}</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
