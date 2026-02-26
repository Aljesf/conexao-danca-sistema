"use client";

import * as React from "react";
import Link from "next/link";
import { ReciboBusca } from "@/components/documentos/ReciboBusca";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiRespOk = {
  documento_emitido_id: number;
  texto_renderizado: string;
};

type ApiRespErr = {
  error: string;
  details?: string | null;
};

function isPositiveIntegerLike(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

export default function AdminDocumentosNovoReciboPage() {
  const [cobrancaId, setCobrancaId] = React.useState("");
  const [recebimentoId, setRecebimentoId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [resp, setResp] = React.useState<ApiRespOk | null>(null);

  const canSubmit = React.useMemo(() => {
    return isPositiveIntegerLike(cobrancaId) || isPositiveIntegerLike(recebimentoId);
  }, [cobrancaId, recebimentoId]);

  function handleSelect(sel: { tipo: "COBRANCA" | "RECEBIMENTO"; id: number }) {
    setErro(null);
    if (sel.tipo === "COBRANCA") {
      setCobrancaId(String(sel.id));
      setRecebimentoId("");
      return;
    }
    setRecebimentoId(String(sel.id));
    setCobrancaId("");
  }

  async function gerarRecibo() {
    setLoading(true);
    setErro(null);
    setResp(null);

    try {
      const payload: Record<string, unknown> = {};
      if (isPositiveIntegerLike(cobrancaId)) payload.cobranca_id = Number(cobrancaId.trim());
      if (isPositiveIntegerLike(recebimentoId)) payload.recebimento_id = Number(recebimentoId.trim());

      const res = await fetch("/api/documentos/recibos/mensalidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as ApiRespOk | ApiRespErr;
      if (!res.ok) {
        const err = json as ApiRespErr;
        setErro(err.details ? `${err.error}: ${err.details}` : err.error);
        return;
      }

      setResp(json as ApiRespOk);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Novo recibo de mensalidade"
        subtitle="Emite recibo por cobranca ou recebimento e salva em Documentos Emitidos."
      >
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de Documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Busque por nome, CPF, telefone, competencia ou ID.",
          "Selecione uma cobranca ou recebimento para preencher automaticamente.",
          "A API gera texto renderizado e salva em Documentos Emitidos.",
        ]}
      />

      <SystemSectionCard
        title="Dados para emissao"
        description="Informe pelo menos um identificador valido."
        footer={
          <Button onClick={() => void gerarRecibo()} disabled={!canSubmit || loading}>
            {loading ? "Gerando..." : "Gerar recibo"}
          </Button>
        }
      >
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {resp ? (
          <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            Recibo gerado com sucesso. Documento #{resp.documento_emitido_id}
          </div>
        ) : null}

        <div className="space-y-4">
          <ReciboBusca onSelect={(sel) => handleSelect(sel)} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Cobranca ID (auto)</label>
              <div className="mt-1">
                <Input
                  value={cobrancaId}
                  onChange={(e) => setCobrancaId(e.target.value)}
                  placeholder="Selecionado pela busca"
                  inputMode="numeric"
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">Recomendado para emitir recibo por cobranca.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Recebimento ID (auto)</label>
              <div className="mt-1">
                <Input
                  value={recebimentoId}
                  onChange={(e) => setRecebimentoId(e.target.value)}
                  placeholder="Selecionado pela busca"
                  inputMode="numeric"
                />
              </div>
              <p className="mt-1 text-xs text-slate-600">Use para emitir recibo de um pagamento especifico.</p>
            </div>
          </div>
        </div>
      </SystemSectionCard>

      {resp ? (
        <SystemSectionCard title="Pre-visualizacao" description="Texto final salvo no documento emitido.">
          <pre className="whitespace-pre-wrap rounded-lg border bg-slate-50 p-4 text-sm">{resp.texto_renderizado}</pre>
        </SystemSectionCard>
      ) : null}
    </SystemPage>
  );
}
