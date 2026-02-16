"use client";

import { useEffect, useState } from "react";

type ConfigPayload = {
  ok?: boolean;
  dia_fechamento_faturas?: number;
  error?: string;
};

function clampDia(value: number): number {
  const dia = Math.trunc(value || 1);
  if (dia < 1) return 1;
  if (dia > 28) return 28;
  return dia;
}

export default function AdminFinanceiroConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diaFechamentoFaturas, setDiaFechamentoFaturas] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        setLoading(true);
        setMessage(null);
        const response = await fetch("/api/financeiro/config", { method: "GET", cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as ConfigPayload;

        if (!response.ok) {
          throw new Error(payload?.error ?? "erro_ler_config");
        }

        if (active) {
          setDiaFechamentoFaturas(clampDia(Number(payload?.dia_fechamento_faturas ?? 1)));
        }
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? `Falha ao carregar: ${error.message}` : "Falha ao carregar configuracao.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setMessage(null);
      const dia = clampDia(diaFechamentoFaturas);
      const response = await fetch("/api/financeiro/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dia_fechamento_faturas: dia }),
      });
      const payload = (await response.json().catch(() => ({}))) as ConfigPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload?.error ?? "erro_salvar_config");
      }

      setDiaFechamentoFaturas(dia);
      setMessage("Configuracao salva.");
    } catch (error) {
      setMessage(error instanceof Error ? `Falha ao salvar: ${error.message}` : "Falha ao salvar configuracao.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Configuracoes do Financeiro</h1>
          <p className="mt-1 text-sm text-slate-600">
            Defina o dia do mes para iniciar o fechamento automatico das faturas do Credito Conexao.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid max-w-sm gap-3">
            <label className="text-sm font-medium text-slate-800" htmlFor="dia-fechamento-faturas">
              Dia do fechamento mensal (1..28)
            </label>
            <input
              id="dia-fechamento-faturas"
              type="number"
              min={1}
              max={28}
              value={diaFechamentoFaturas}
              onChange={(e) => setDiaFechamentoFaturas(clampDia(Number(e.target.value)))}
              disabled={loading || saving}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void onSave()}
              disabled={loading || saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {message ? <div className="text-sm text-slate-700">{message}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
