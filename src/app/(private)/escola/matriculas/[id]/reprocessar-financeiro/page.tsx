"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type MensalidadeRow = {
  competencia: string;
  valor: string;
};

function brlToCentavos(v: string): number {
  const cleaned = v.replace(/[^\d,]/g, "").replace(",", ".");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export default function ReprocessarFinanceiroMatriculaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matriculaId = params?.id;

  const [motivo, setMotivo] = useState("");
  const [forcarRebuild, setForcarRebuild] = useState(true);

  const [entradaValor, setEntradaValor] = useState("0,00");
  const [entradaPago, setEntradaPago] = useState(true);
  const [entradaMetodo, setEntradaMetodo] = useState("PIX");
  const [entradaData, setEntradaData] = useState(() => new Date().toISOString().slice(0, 10));
  const [entradaObs, setEntradaObs] = useState("Reprocessamento manual.");

  const [mensalidades, setMensalidades] = useState<MensalidadeRow[]>([
    { competencia: new Date().toISOString().slice(0, 7), valor: "0,00" },
  ]);

  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!motivo.trim()) return false;
    if (!matriculaId) return false;
    if (!mensalidades.length) return false;
    for (const m of mensalidades) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.competencia)) return false;
      if (brlToCentavos(m.valor) <= 0) return false;
    }
    return true;
  }, [motivo, matriculaId, mensalidades]);

  function updateMensalidade(idx: number, patch: Partial<MensalidadeRow>) {
    setMensalidades((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addMensalidade() {
    setMensalidades((prev) => [...prev, { competencia: new Date().toISOString().slice(0, 7), valor: "0,00" }]);
  }

  function removeMensalidade(idx: number) {
    setMensalidades((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    setLoading(true);
    setErr(null);
    setResp(null);

    try {
      const payload = {
        motivo,
        forcar_rebuild_fatura: forcarRebuild,
        entrada: {
          valor_centavos: brlToCentavos(entradaValor),
          pago_no_ato: entradaPago,
          metodo_pagamento: entradaMetodo || null,
          data_pagamento: entradaData || null,
          observacoes: entradaObs || null,
        },
        mensalidades: mensalidades.map((m) => ({
          competencia: m.competencia,
          valor_centavos: brlToCentavos(m.valor),
          descricao: "Mensalidade (reprocessada)",
        })),
      };

      const res = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar-financeiro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || "Falha ao reprocessar financeiro.");
      }

      setResp(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Reprocessar financeiro da matricula</h1>
          <p className="text-sm text-muted-foreground">
            Corrige matriculas que ficaram sem cobrancas/lancamentos/faturas no Cartao Conexao.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="text-sm font-medium">Motivo do reprocessamento (obrigatorio)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Matricula criada sem gerar lancamentos do Cartao Conexao."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Campo usado para auditoria humana e rastreabilidade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="forcar"
              type="checkbox"
              checked={forcarRebuild}
              onChange={(e) => setForcarRebuild(e.target.checked)}
            />
            <label htmlFor="forcar" className="text-sm">
              Forcar rebuild/atualizacao imediata das faturas do Cartao Conexao
            </label>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Entrada (fora do Cartao Conexao)</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Valor da entrada (R$)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaValor}
                onChange={(e) => setEntradaValor(e.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="pago"
                type="checkbox"
                checked={entradaPago}
                onChange={(e) => setEntradaPago(e.target.checked)}
              />
              <label htmlFor="pago" className="text-sm">
                Entrada paga no ato
              </label>
            </div>

            <div>
              <label className="text-sm font-medium">Metodo de pagamento</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaMetodo}
                onChange={(e) => setEntradaMetodo(e.target.value)}
                placeholder="PIX"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Data do pagamento</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaData}
                onChange={(e) => setEntradaData(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Observacoes</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaObs}
                onChange={(e) => setEntradaObs(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Mensalidades (Cartao Conexao)</h2>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={addMensalidade} type="button">
              Adicionar competencia
            </button>
          </div>

          <div className="space-y-3">
            {mensalidades.map((m, idx) => (
              <div key={idx} className="grid gap-3 md:grid-cols-3 items-end">
                <div>
                  <label className="text-sm font-medium">Competencia (YYYY-MM)</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={m.competencia}
                    onChange={(e) => updateMensalidade(idx, { competencia: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Valor (R$)</label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2"
                    value={m.valor}
                    onChange={(e) => updateMensalidade(idx, { valor: e.target.value })}
                    placeholder="408,00"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-md border px-3 py-2 text-sm"
                    onClick={() => removeMensalidade(idx)}
                    type="button"
                    disabled={mensalidades.length === 1}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Cada competencia vira uma cobranca elegivel ao Cartao Conexao e um lancamento canonico por cobranca_id.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          {err ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">{err}</div> : null}
          {resp ? (
            <pre className="overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
              {JSON.stringify(resp, null, 2)}
            </pre>
          ) : null}

          <div className="flex gap-2">
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={onSubmit}
              disabled={!canSubmit || loading}
              type="button"
            >
              {loading ? "Processando..." : "Reprocessar financeiro"}
            </button>

            <button className="rounded-md border px-4 py-2 text-sm" onClick={() => router.back()} type="button">
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
