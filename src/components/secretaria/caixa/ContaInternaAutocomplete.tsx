"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { SecretariaContaInternaResumo } from "./types";

type Props = {
  value: string;
  loading: boolean;
  error: string | null;
  resultados: SecretariaContaInternaResumo[];
  contaSelecionadaId: number | null;
  onValueChange: (value: string) => void;
  onSelect: (item: SecretariaContaInternaResumo) => void;
  onSubmit: () => void;
};

function getNomePrincipal(item: SecretariaContaInternaResumo): string {
  return item.pessoa?.nome ?? item.descricao_exibicao ?? `Conta interna #${item.conta_conexao_id}`;
}

function getResponsavelLabel(item: SecretariaContaInternaResumo): string {
  return item.responsavel_financeiro?.nome ?? "Responsavel financeiro nao informado";
}

function getApoio(item: SecretariaContaInternaResumo): string {
  if (item.alunos_relacionados.length > 0) {
    return item.alunos_relacionados
      .map((aluno) => aluno.nome ?? `Aluno #${aluno.id}`)
      .slice(0, 2)
      .join(", ");
  }

  if (item.proxima_fatura?.data_vencimento) {
    return `Proxima fatura em ${item.proxima_fatura.data_vencimento}`;
  }

  return item.descricao_exibicao ?? "Conta interna pronta para atendimento";
}

export function ContaInternaAutocomplete({
  value,
  loading,
  error,
  resultados,
  contaSelecionadaId,
  onValueChange,
  onSelect,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const termo = value.trim();
  const shouldShowDropdown = open && termo.length > 0;
  const showEmptyState = !loading && !error && termo.length >= 2 && resultados.length === 0;

  useEffect(() => {
    setHighlightedIndex(resultados.length > 0 ? 0 : -1);
  }, [resultados]);

  function selectItem(item: SecretariaContaInternaResumo) {
    onSelect(item);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder="Busque por nome do aluno, responsavel, matricula ou pessoa_id"
        className="h-14 rounded-2xl border-slate-200 bg-white pl-4 pr-4 text-base shadow-sm transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (!shouldShowDropdown) {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((current) => {
              const next = current + 1;
              return next >= resultados.length ? 0 : next;
            });
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((current) => {
              const next = current - 1;
              return next < 0 ? resultados.length - 1 : next;
            });
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            const highlighted = resultados[highlightedIndex];
            if (highlighted) {
              selectItem(highlighted);
            } else {
              onSubmit();
            }
            return;
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {shouldShowDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]">
          {loading ? (
            <div className="px-4 py-4 text-sm text-slate-500">Buscando contas internas...</div>
          ) : null}

          {error ? (
            <div className="px-4 py-4 text-sm text-rose-700">{error}</div>
          ) : null}

          {showEmptyState ? (
            <div className="px-4 py-4 text-sm text-slate-500">Nenhuma conta encontrada para esse termo.</div>
          ) : null}

          {!loading && !error && resultados.length > 0 ? (
            <div className="max-h-[22rem] overflow-y-auto p-2">
              {resultados.map((item, index) => {
                const selecionado = item.conta_conexao_id === contaSelecionadaId;
                const destacado = index === highlightedIndex;

                return (
                  <button
                    key={item.conta_conexao_id}
                    type="button"
                    className={`flex w-full flex-col gap-3 rounded-2xl px-4 py-3 text-left transition ${
                      selecionado
                        ? "bg-sky-50 ring-1 ring-sky-200"
                        : destacado
                          ? "bg-slate-50 ring-1 ring-slate-200"
                          : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectItem(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-1">
                        <div className="text-base font-semibold text-slate-950">{getNomePrincipal(item)}</div>
                        <div className="text-sm text-slate-600">Responsavel: {getResponsavelLabel(item)}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Conta #{item.conta_conexao_id} - {item.tipo_conta}
                          {item.tipo_titular ? ` - ${item.tipo_titular}` : ""}
                        </div>
                        <div className="text-sm text-slate-500">{getApoio(item)}</div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-right">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Saldo em aberto</div>
                        <div className="mt-1 text-sm font-semibold text-slate-950">
                          {formatBRLFromCents(item.saldo_total_em_aberto_centavos)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ContaInternaAutocomplete;
