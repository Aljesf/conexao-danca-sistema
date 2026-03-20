"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { formatarDataLabel, type CobrancaOperacionalItem } from "@/lib/financeiro/creditoConexao/cobrancas";

type SugestaoFatura = {
  fatura_id: number;
  competencia: string;
  competencia_label: string;
  status: string | null;
  data_vencimento: string | null;
  mesma_competencia: boolean;
  competencia_diferente: boolean;
  conta_label: string | null;
  neofin_invoice_id: string | null;
  cobranca_vinculada_id: number | null;
  ja_vinculada_nesta_fatura: boolean;
  pode_vincular: boolean;
  motivo_bloqueio: string | null;
};

type SugestoesResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  sugestoes?: SugestaoFatura[];
};

type VinculoResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

type Props = {
  item: CobrancaOperacionalItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function mensagemErroSugestoes(): string {
  return "Nao foi possivel carregar as faturas sugeridas agora. Tente novamente em instantes.";
}

function mensagemErroVinculo(): string {
  return "Nao foi possivel registrar o vinculo manual agora. Revise os dados e tente novamente.";
}

export function VincularCobrancaFaturaDialog({ item, open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sugestoes, setSugestoes] = useState<SugestaoFatura[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [confirmarCompetenciaDiferente, setConfirmarCompetenciaDiferente] = useState(false);

  useEffect(() => {
    if (!open || !item) return;

    const controller = new AbortController();
    setLoading(true);
    setErro(null);
    setSugestoes([]);
    setSelecionadaId(null);
    setConfirmarCompetenciaDiferente(false);

    async function carregarSugestoes() {
      try {
        const params = new URLSearchParams();
        params.set("cobranca_id", String(item.cobranca_id));
        params.set("cobranca_fonte", item.cobranca_fonte);

        const response = await fetch(`/api/financeiro/credito-conexao/faturas/sugestoes?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as SugestoesResponse | null;

        if (!response.ok || !json?.ok) {
          setErro(json?.message ?? mensagemErroSugestoes());
          setSugestoes([]);
          return;
        }

        const lista = json.sugestoes ?? [];
        setSugestoes(lista);
        setSelecionadaId(lista[0]?.fatura_id ?? null);
      } catch (error: unknown) {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        setErro(mensagemErroSugestoes());
        setSugestoes([]);
      } finally {
        setLoading(false);
      }
    }

    void carregarSugestoes();

    return () => controller.abort();
  }, [item, open]);

  const sugestaoSelecionada = sugestoes.find((sugestao) => sugestao.fatura_id === selecionadaId) ?? null;
  const bloqueadoPorCompetencia =
    sugestaoSelecionada?.competencia_diferente === true && !confirmarCompetenciaDiferente;
  const podeSalvar = Boolean(sugestaoSelecionada?.pode_vincular) && !bloqueadoPorCompetencia && !saving;

  async function confirmarVinculo() {
    if (!item || !sugestaoSelecionada) return;

    setSaving(true);
    setErro(null);

    try {
      const response = await fetch("/api/financeiro/credito-conexao/cobrancas/vincular-fatura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_id: item.cobranca_id,
          cobranca_fonte: item.cobranca_fonte,
          fatura_id: sugestaoSelecionada.fatura_id,
          confirmar_competencia_diferente: confirmarCompetenciaDiferente,
        }),
      });

      const json = (await response.json().catch(() => null)) as VinculoResponse | null;
      if (!response.ok || !json?.ok) {
        setErro(json?.message ?? mensagemErroVinculo());
        return;
      }

      onSuccess(json.message ?? "Vinculo manual registrado com sucesso.");
      onClose();
    } catch {
      setErro(mensagemErroVinculo());
    } finally {
      setSaving(false);
    }
  }

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Vincular cobranca a fatura</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use o vinculo manual apenas para corrigir a relacao entre cobranca oficial e fatura da conta interna.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Fechar
          </button>
        </div>

        <div className="grid gap-5 overflow-y-auto px-5 py-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cobranca selecionada</p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{item.pessoa_label}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.origem_referencia_label}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Competencia</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.competencia_label}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Valor</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatBRLFromCents(item.valor_centavos)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Vencimento</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatarDataLabel(item.data_vencimento)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Situacao NeoFin</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.neofin_situacao_label}</p>
                </div>
              </div>
            </div>

            {sugestaoSelecionada ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Fatura em foco</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">
                  {sugestaoSelecionada.competencia_label} - Fatura #{sugestaoSelecionada.fatura_id}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {sugestaoSelecionada.conta_label ?? "Conta interna do aluno"} | Status {sugestaoSelecionada.status ?? "-"}
                </p>

                {sugestaoSelecionada.competencia_diferente ? (
                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-amber-300"
                      checked={confirmarCompetenciaDiferente}
                      onChange={(event) => setConfirmarCompetenciaDiferente(event.target.checked)}
                    />
                    <span>
                      Confirmo o vinculo em competencia diferente. A cobranca e da competencia {item.competencia_label} e a
                      fatura escolhida e {sugestaoSelecionada.competencia_label}.
                    </span>
                  </label>
                ) : null}

                {sugestaoSelecionada.motivo_bloqueio ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {sugestaoSelecionada.motivo_bloqueio}
                  </div>
                ) : null}

                {erro ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {erro}
                  </div>
                ) : null}

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={() => void confirmarVinculo()} disabled={!podeSalvar}>
                    {saving ? "Vinculando..." : "Confirmar vinculo"}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Sugestoes de fatura</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">Prioridade por pessoa e competencia</h3>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Carregando faturas sugeridas...
              </div>
            ) : null}

            {!loading && sugestoes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                Nenhuma fatura encontrada para esta pessoa no recorte operacional.
              </div>
            ) : null}

            {sugestoes.map((sugestao) => {
              const selecionada = sugestao.fatura_id === selecionadaId;
              return (
                <button
                  key={sugestao.fatura_id}
                  type="button"
                  onClick={() => {
                    setSelecionadaId(sugestao.fatura_id);
                    if (!sugestao.competencia_diferente) {
                      setConfirmarCompetenciaDiferente(false);
                    }
                  }}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    selecionada
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {sugestao.competencia_label} - Fatura #{sugestao.fatura_id}
                      </p>
                      <p className={`mt-1 text-sm ${selecionada ? "text-white/80" : "text-slate-600"}`}>
                        {sugestao.conta_label ?? "Conta interna do aluno"} | Vencimento {formatarDataLabel(sugestao.data_vencimento)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          selecionada ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {sugestao.status ?? "Sem status"}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          sugestao.mesma_competencia
                            ? selecionada
                              ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : selecionada
                              ? "border-amber-300/30 bg-amber-400/15 text-amber-100"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {sugestao.mesma_competencia ? "Mesma competencia" : "Competencia diferente"}
                      </span>
                    </div>
                  </div>

                  {sugestao.cobranca_vinculada_id ? (
                    <p className={`mt-3 text-sm ${selecionada ? "text-white/80" : "text-slate-600"}`}>
                      Fatura ja possui cobranca vinculada: #{sugestao.cobranca_vinculada_id}
                    </p>
                  ) : null}

                  {sugestao.neofin_invoice_id ? (
                    <p className={`mt-2 text-xs ${selecionada ? "text-white/70" : "text-slate-500"}`}>
                      NeoFin invoice: {sugestao.neofin_invoice_id}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}
