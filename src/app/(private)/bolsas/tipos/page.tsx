"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProjetoSocialAutocomplete } from "@/components/bolsas/ProjetoSocialAutocomplete";
import type { BolsaTipoModo } from "@/lib/bolsas/bolsasTypes";

type BolsaTipo = {
  id: number;
  projeto_social_id: number;
  nome: string;
  modo: BolsaTipoModo;
  percentual_desconto: number | null;
  valor_final_familia_centavos: number | null;
  ativo: boolean;
};

type ApiResp<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string | null };

export default function BolsasTiposPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BolsaTipo[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<{ id: number; nome: string } | null>(null);
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState<BolsaTipoModo>("INTEGRAL");
  const [percentual, setPercentual] = useState<string>("");
  const [valorFinal, setValorFinal] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const projetoIdNum = projetoSelecionado?.id ?? null;
  const canLoad = useMemo(() => Number.isFinite(projetoIdNum ?? NaN) && Number(projetoIdNum) > 0, [projetoIdNum]);
  const canCreate = useMemo(() => canLoad && nome.trim().length >= 2, [canLoad, nome]);

  async function load(forcedProjetoId?: number) {
    const projetoId = forcedProjetoId ?? projetoSelecionado?.id ?? null;
    if (!projetoId || !Number.isFinite(projetoId) || projetoId <= 0) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch(`/api/bolsas/tipos?projeto_social_id=${projetoId}&ativo=true`);
    const json = (await res.json()) as ApiResp<BolsaTipo[]>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else setItems(json.data);
    setLoading(false);
  }

  async function create() {
    if (!canCreate) return;
    setLoading(true);
    setMsg(null);

    const payload: Record<string, unknown> = {
      projeto_social_id: projetoSelecionado?.id,
      nome: nome.trim(),
      modo,
      ativo: true,
    };

    if (modo === "PERCENTUAL") payload.percentual_desconto = Number(percentual);
    if (modo === "VALOR_FINAL_FAMILIA") payload.valor_final_familia_centavos = Number(valorFinal);

    const res = await fetch("/api/bolsas/tipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as ApiResp<BolsaTipo>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else {
      setNome("");
      setPercentual("");
      setValorFinal("");
      await load();
      setMsg("Tipo de bolsa criado.");
    }
    setLoading(false);
  }

  useEffect(() => {
    const projetoQuery = Number(searchParams.get("projeto_social_id"));
    if (Number.isFinite(projetoQuery) && projetoQuery > 0) {
      setProjetoSelecionado((prev) => prev ?? { id: projetoQuery, nome: `Projeto #${projetoQuery}` });
      void load(projetoQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    setItems([]);
  }, [projetoSelecionado?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Tipos de bolsa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre os tipos: Integral, Percentual e Valor final da familia.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Projeto social</h2>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="min-w-[320px] flex-1">
              <ProjetoSocialAutocomplete
                valueId={projetoSelecionado?.id ?? null}
                valueLabel={projetoSelecionado?.nome ?? ""}
                initialQuery={projetoSelecionado?.nome ?? ""}
                onChange={(p) => {
                  setProjetoSelecionado(p ? { id: p.id, nome: p.nome } : null);
                  setItems([]);
                  if (p) void load(p.id);
                }}
              />
            </div>
            <button className="rounded-md border px-4 py-2 text-sm" disabled={!canLoad || loading} onClick={() => void load()}>
              Carregar tipos
            </button>
            {loading ? <span className="text-sm text-muted-foreground">Carregando...</span> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Criar tipo</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Nome</label>
              <input className="w-full rounded-md border px-3 py-2 text-sm" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Modo</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm" value={modo} onChange={(e) => setModo(e.target.value as BolsaTipoModo)}>
                <option value="INTEGRAL">INTEGRAL (familia paga 0)</option>
                <option value="PERCENTUAL">PERCENTUAL (desconto %)</option>
                <option value="VALOR_FINAL_FAMILIA">VALOR FINAL (familia paga valor fixo)</option>
              </select>
            </div>

            {modo === "PERCENTUAL" ? (
              <div className="space-y-1">
                <label className="text-sm">Percentual de desconto (0-100)</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={percentual} onChange={(e) => setPercentual(e.target.value)} />
              </div>
            ) : null}

            {modo === "VALOR_FINAL_FAMILIA" ? (
              <div className="space-y-1">
                <label className="text-sm">Valor final da familia (centavos)</label>
                <input className="w-full rounded-md border px-3 py-2 text-sm" value={valorFinal} onChange={(e) => setValorFinal(e.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!canCreate || loading} onClick={() => void create()}>
              Criar
            </button>
            {msg ? <span className="text-sm">{msg}</span> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Ativos</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Nome</th>
                  <th className="py-2 text-left">Modo</th>
                  <th className="py-2 text-right">%</th>
                  <th className="py-2 text-right">Valor final</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2">{t.id}</td>
                    <td className="py-2 font-medium">{t.nome}</td>
                    <td className="py-2">{t.modo}</td>
                    <td className="py-2 text-right">{t.percentual_desconto ?? "-"}</td>
                    <td className="py-2 text-right">{t.valor_final_familia_centavos ?? "-"}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>
                      Nenhum tipo carregado (selecione um Projeto Social e clique em "Carregar tipos").
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
