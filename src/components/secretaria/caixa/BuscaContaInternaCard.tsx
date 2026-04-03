"use client";

import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import ContaInternaAutocomplete from "./ContaInternaAutocomplete";
import type { SecretariaContaInternaResumo } from "./types";

type Props = {
  termo: string;
  loading: boolean;
  error: string | null;
  resultados: SecretariaContaInternaResumo[];
  contaSelecionadaId: number | null;
  contaSelecionada: SecretariaContaInternaResumo | null;
  onTermoChange: (value: string) => void;
  onBuscar: () => void;
  onSelecionarConta: (item: SecretariaContaInternaResumo) => void;
};

function pessoaLabel(item: SecretariaContaInternaResumo | null): string {
  if (!item) return "";
  return item.pessoa?.nome ?? item.descricao_exibicao ?? `Conta interna #${item.conta_conexao_id}`;
}

export function BuscaContaInternaCard({
  termo,
  loading,
  error,
  resultados,
  contaSelecionadaId,
  contaSelecionada,
  onTermoChange,
  onBuscar,
  onSelecionarConta,
}: Props) {
  return (
    <SectionCard
      title="1. Selecione o aluno ou responsavel"
      description="A busca principal ja sugere contas conforme voce digita. O botao fica apenas como apoio."
      className="rounded-[28px] border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
    >
      <div className="space-y-4">
        <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff6eb_0%,#ffffff_48%,#eff8f8_100%)] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
              Autocomplete
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
              Fluxo de balcao
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex-1">
              <ContaInternaAutocomplete
                value={termo}
                loading={loading}
                error={error}
                resultados={resultados}
                contaSelecionadaId={contaSelecionadaId}
                onValueChange={onTermoChange}
                onSelect={onSelecionarConta}
                onSubmit={onBuscar}
              />
            </div>

            <Button className="h-14 rounded-2xl px-5" onClick={onBuscar} disabled={loading}>
              {loading ? "Buscando..." : "Buscar agora"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">Digite pelo menos 2 caracteres para ver sugestoes.</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">Voce tambem pode buscar por matricula ou pessoa_id.</span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {!error && !loading && termo.trim().length >= 2 && resultados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Nenhuma conta encontrada para esse termo.
          </div>
        ) : null}

        {contaSelecionada ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Conta selecionada: <strong>{pessoaLabel(contaSelecionada)}</strong> - Conta #
            {contaSelecionada.conta_conexao_id}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export default BuscaContaInternaCard;
