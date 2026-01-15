"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Diagnostico = {
  ok: boolean;
  checks?: {
    turma_aluno_ok?: boolean;
    conta_cartao_existe?: boolean;
    cobrancas_cartao_existentes?: number;
    cobrancas_cartao_esperadas?: number;
    competencias_faltantes?: string[];
  };
  fontes?: { entrada?: string; mensalidades?: string };
  sugestoes?: { entrada_pactuada_centavos?: number };
  acoes_planejadas?: Array<{ code?: string; detail?: string }>;
};

type ExecResponse = Record<string, unknown>;

function centavosToBrlInput(c: number): string {
  const cent = Number.isFinite(c) ? Math.round(c) : 0;
  const reais = Math.floor(cent / 100);
  const cents = String(Math.abs(cent % 100)).padStart(2, "0");
  return `${reais},${cents}`;
}

function brlToCentavos(v: string): number {
  const digits = (v || "").replace(/\D/g, "");
  if (!digits) return 0;
  const padded = digits.padStart(3, "0");
  const reais = padded.slice(0, -2);
  const cents = padded.slice(-2);
  const n = Number(`${reais}.${cents}`);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function ReprocessarMatriculaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matriculaId = params?.id;

  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [loadingExec, setLoadingExec] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState<ExecResponse | null>(null);

  const [motivo, setMotivo] = useState("");
  const [forcarRebuild, setForcarRebuild] = useState(true);

  const [entradaValor, setEntradaValor] = useState("0,00");
  const [entradaPago, setEntradaPago] = useState(true);
  const [entradaMetodo, setEntradaMetodo] = useState("PIX");
  const [entradaData, setEntradaData] = useState(() => new Date().toISOString().slice(0, 10));
  const [entradaObs, setEntradaObs] = useState("Correcao de matricula (reprocessamento total).");

  useEffect(() => {
    if (!matriculaId) return;
    setLoadingDiag(true);
    setErr(null);
    setResp(null);

    (async () => {
      try {
        const res = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar`, {
          method: "GET",
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.detail || json?.error || "Falha ao diagnosticar matricula.");
        }
        setDiag(json);
        const v = Number(json?.sugestoes?.entrada_pactuada_centavos ?? 0);
        if (v > 0) setEntradaValor(centavosToBrlInput(v));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido.";
        setErr(msg);
      } finally {
        setLoadingDiag(false);
      }
    })();
  }, [matriculaId]);

  const canExec = useMemo(() => {
    if (!motivo.trim()) return false;
    if (!diag?.ok) return false;
    return true;
  }, [motivo, diag]);

  async function executar() {
    if (!matriculaId) return;
    setLoadingExec(true);
    setErr(null);
    setResp(null);

    try {
      const payload = {
        motivo,
        forcar_rebuild_faturas: forcarRebuild,
        entrada: {
          valor_centavos: brlToCentavos(entradaValor),
          pago_no_ato: entradaPago,
          metodo_pagamento: entradaMetodo || null,
          data_pagamento: entradaData || null,
          observacoes: entradaObs || null,
        },
      };

      const res = await fetch(`/api/escola/matriculas/${matriculaId}/reprocessar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.detail || json?.error || "Falha ao aplicar correcoes.");
      }
      setResp(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido.";
      setErr(msg);
    } finally {
      setLoadingExec(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Reprocessar matricula (correcao total)</h1>
          <p className="text-sm text-muted-foreground">
            Diagnostica e corrige: aluno na turma, Cartao Conexao, cobrancas por competencia e
            entrada.
          </p>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm whitespace-pre-wrap">
            {err}
          </div>
        ) : null}

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <label className="text-sm font-medium">Motivo do reprocessamento (obrigatorio)</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forcarRebuild}
              onChange={(e) => setForcarRebuild(e.target.checked)}
            />
            <span className="text-sm">
              Forcar rebuild/atualizacao imediata das faturas do Cartao Conexao
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Diagnostico</h2>
          {loadingDiag ? (
            <p className="text-sm text-muted-foreground mt-2">Carregando diagnostico...</p>
          ) : null}

          {diag?.ok ? (
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <b>Turma/Aluno:</b> {diag.checks.turma_aluno_ok ? "OK" : "FALTA (sera corrigido)"}
              </div>
              <div>
                <b>Cartao Conexao:</b> {diag.checks.conta_cartao_existe ? "OK" : "NAO EXISTE (sera criado)"}
              </div>
              <div>
                <b>Mensalidades:</b> {diag.checks.cobrancas_cartao_existentes} existentes /{" "}
                {diag.checks.cobrancas_cartao_esperadas} esperadas
              </div>
              {diag.checks.competencias_faltantes?.length ? (
                <div className="text-muted-foreground">
                  Faltantes: {diag.checks.competencias_faltantes.join(", ")}
                </div>
              ) : null}
              <div className="text-xs text-muted-foreground mt-2">
                Fonte entrada: {diag.fontes?.entrada} | Fonte mensalidades: {diag.fontes?.mensalidades}
              </div>
              {Array.isArray(diag.acoes_planejadas) && diag.acoes_planejadas.length > 0 ? (
                <div className="mt-2 rounded-md border bg-slate-50 p-2 text-xs">
                  <div className="font-medium">Acoes planejadas</div>
                  <ul className="mt-1 list-disc pl-4">
                    {diag.acoes_planejadas.map((a) => (
                      <li key={a.code ?? a.detail}>{a.detail ?? ""}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Liquidacao da entrada (fora do Cartao Conexao)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Valor da entrada (R$)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaValor}
                onChange={(e) => setEntradaValor(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={entradaPago}
                onChange={(e) => setEntradaPago(e.target.checked)}
              />
              <span className="text-sm">Entrada paga no ato</span>
            </div>
            <div>
              <label className="text-sm font-medium">Metodo</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={entradaMetodo}
                onChange={(e) => setEntradaMetodo(e.target.value)}
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO">Cartao</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="BOLETO">Boleto</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
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

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex gap-2">
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canExec || loadingExec}
              onClick={executar}
            >
              {loadingExec ? "Aplicando..." : "Aplicar correcoes"}
            </button>
            <button className="rounded-md border px-4 py-2 text-sm" onClick={() => router.back()}>
              Voltar
            </button>
          </div>

          {resp ? (
            <pre className="mt-4 overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
              {JSON.stringify(resp, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
