"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  const [cobrancaId, setCobrancaId] = useState("");
  const [recebimentoId, setRecebimentoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resp, setResp] = useState<ApiRespOk | null>(null);

  const canSubmit = useMemo(() => {
    return isPositiveIntegerLike(cobrancaId) || isPositiveIntegerLike(recebimentoId);
  }, [cobrancaId, recebimentoId]);

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
          "Use Cobranca ID como caminho principal.",
          "Use Recebimento ID quando quiser emitir pelo pagamento especifico.",
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Cobranca ID (recomendado)</label>
            <div className="mt-1">
              <Input
                value={cobrancaId}
                onChange={(e) => setCobrancaId(e.target.value)}
                placeholder="Ex.: 1234"
                inputMode="numeric"
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">Usa a cobranca para resolver pagador, competencia e referencia.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Recebimento ID (alternativo)</label>
            <div className="mt-1">
              <Input
                value={recebimentoId}
                onChange={(e) => setRecebimentoId(e.target.value)}
                placeholder="Ex.: 9876"
                inputMode="numeric"
              />
            </div>
            <p className="mt-1 text-xs text-slate-600">Usa um pagamento especifico para preencher data e forma de pagamento.</p>
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
