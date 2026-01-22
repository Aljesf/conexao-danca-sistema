"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import ContextConfigForm from "@/components/ContextConfigForm";

type CentroCusto = {
  id: number;
  nome: string | null;
};

export default function ConfigEscolaPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [centrosPadrao, setCentrosPadrao] = useState<CentroCusto[]>([]);
  const [centrosIntermediacao, setCentrosIntermediacao] = useState<CentroCusto[]>([]);
  const [centroPadraoEscolaId, setCentroPadraoEscolaId] = useState<number | "">("");
  const [centroIntermediacaoId, setCentroIntermediacaoId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      setLoading(true);
      setErro(null);
      setSucesso(null);

      try {
        const { data: centrosPadraoData, error: centrosPadraoErr } = await supabase
          .from("centros_custo")
          .select("id, nome")
          .eq("ativo", true)
          .or("contextos_aplicaveis.cs.{ESCOLA},contextos_aplicaveis.cs.{ADMIN}")
          .order("nome", { ascending: true });

        if (centrosPadraoErr) {
          throw new Error("Falha ao carregar centros de custo.");
        }

        const { data: centrosInterData, error: centrosInterErr } = await supabase
          .from("centros_custo")
          .select("id, nome")
          .eq("ativo", true)
          .contains("contextos_aplicaveis", ["ADMIN"])
          .order("nome", { ascending: true });

        if (centrosInterErr) {
          throw new Error("Falha ao carregar centros de custo.");
        }

        const { data: config, error: configErr } = await supabase
          .from("escola_config_financeira")
          .select("centro_custo_padrao_escola_id, centro_custo_intermediacao_financeira_id")
          .eq("id", 1)
          .maybeSingle();

        if (configErr) {
          if (!ativo) return;
          setErro("Falha ao carregar configuracao financeira.");
          return;
        }

        if (!ativo) return;

        setCentrosPadrao((centrosPadraoData ?? []) as CentroCusto[]);
        setCentrosIntermediacao((centrosInterData ?? []) as CentroCusto[]);
        setCentroPadraoEscolaId(config?.centro_custo_padrao_escola_id ?? "");
        setCentroIntermediacaoId(config?.centro_custo_intermediacao_financeira_id ?? "");
      } catch (e) {
        if (!ativo) return;
        setErro(e instanceof Error ? e.message : "Falha ao carregar configuracao financeira.");
      } finally {
        if (ativo) setLoading(false);
      }
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, [supabase]);

  const onSalvar = async () => {
    setErro(null);
    setSucesso(null);
    setSaving(true);

    const payload = {
      centro_custo_padrao_escola_id: centroPadraoEscolaId === "" ? null : centroPadraoEscolaId,
      centro_custo_intermediacao_financeira_id: centroIntermediacaoId === "" ? null : centroIntermediacaoId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("escola_config_financeira").update(payload).eq("id", 1);

    if (error) {
      setErro("Falha ao salvar configuracao financeira.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setSucesso("Configuracao financeira salva.");
  };

  return (
    <div className="space-y-8">
      <ContextConfigForm
        contextKey="escola"
        title="Configuracoes da Escola"
        description="Defina identidade visual e dados institucionais da escola."
      />

      <section className="rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Financeiro da escola (defaults)</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina os centros de custo padrao usados nos lancamentos financeiros da escola.
        </p>

        {erro ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        ) : null}

        {sucesso ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {sucesso}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Centro de custo padrao da escola</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={centroPadraoEscolaId}
              onChange={(e) => setCentroPadraoEscolaId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={loading || saving}
            >
              <option value="">Selecione...</option>
              {centrosPadrao.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.nome ?? `Centro #${centro.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Centro de custo de intermediacao financeira</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={centroIntermediacaoId}
              onChange={(e) => setCentroIntermediacaoId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={loading || saving}
            >
              <option value="">Selecione...</option>
              {centrosIntermediacao.map((centro) => (
                <option key={centro.id} value={centro.id}>
                  {centro.nome ?? `Centro #${centro.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={onSalvar}
            disabled={loading || saving}
          >
            {saving ? "Salvando..." : "Salvar configuracao"}
          </button>
          {loading ? <span className="text-sm text-muted-foreground">Carregando...</span> : null}
        </div>
      </section>
    </div>
  );
}
