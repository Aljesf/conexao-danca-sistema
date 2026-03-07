"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

type DocumentoEmitido = {
  id: number;
  matricula_id: number;
  contrato_modelo_id?: number | null;
  documento_modelo_id?: number | null;
  status_assinatura?: string | null;
  created_at: string;
  updated_at?: string | null;
  pdf_url: string | null;
  snapshot_financeiro_json?: {
    tipo_recibo?: string | null;
    recebimento_id?: number | null;
    cobranca_id?: number | null;
  } | null;
};

export default function AdminDocumentosEmitidosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<DocumentoEmitido[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/emitidos");
      const json = (await res.json()) as { data?: DocumentoEmitido[]; error?: string };
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
    <SystemPage>
      <SystemContextCard title="Documentos emitidos" subtitle="Lista simples dos documentos emitidos (MVP).">
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "A lista mostra os ultimos documentos emitidos.",
          "Status indica o andamento de assinatura.",
          "PDF aparece quando estiver disponivel.",
        ]}
      />

      <SystemSectionCard title="Lista de documentos emitidos">
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-600">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhum documento emitido ainda.</p>
        ) : (
          <div className="grid gap-3">
            {itens.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 bg-white/60 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Documento #{c.id}</div>
                  <Link
                    className="text-xs font-medium uppercase tracking-wide text-slate-600 hover:underline"
                    href={`/admin/config/documentos/emitidos/${c.id}`}
                  >
                    Ver detalhe
                  </Link>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Matricula: {c.matricula_id} | Modelo:{" "}
                  {c.documento_modelo_id ?? c.contrato_modelo_id ?? "-"} | Status: {c.status_assinatura ?? "-"}
                </div>
                {c.snapshot_financeiro_json?.tipo_recibo === "PAGAMENTO_CONFIRMADO" ? (
                  <div className="mt-1 text-xs text-emerald-700">
                    Recibo financeiro por recebimento
                    {c.snapshot_financeiro_json?.recebimento_id ? ` #${c.snapshot_financeiro_json.recebimento_id}` : ""}
                    {c.snapshot_financeiro_json?.cobranca_id ? ` | cobranca #${c.snapshot_financeiro_json.cobranca_id}` : ""}
                  </div>
                ) : null}
                <div className="mt-2 text-sm text-slate-600">Criado: {new Date(c.created_at).toLocaleString("pt-BR")}</div>
                <div className="mt-1 text-sm text-slate-600">PDF: {c.pdf_url ? "Disponivel" : "-"}</div>
              </div>
            ))}
          </div>
        )}
      </SystemSectionCard>
    </SystemPage>
  );
}
