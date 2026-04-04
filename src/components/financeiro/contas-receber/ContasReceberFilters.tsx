"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ContasReceberOrdenacao,
  ContasReceberTipoPeriodo,
  ContasReceberVisao,
} from "@/lib/financeiro/contas-receber-view-config";
import {
  CONTEXTO_FILTER_OPTIONS,
  ORDENACAO_LABELS,
  TIPO_PERIODO_OPTIONS,
  VISAO_OPTIONS,
} from "@/lib/financeiro/contas-receber-view-config";

type ContextoFilter = "TODOS" | "ESCOLA" | "CAFE" | "LOJA" | "OUTRO";
type SituacaoFilter = "TODAS" | "VENCIDA" | "EM_ABERTO" | "QUITADA";
type StatusFilter = "TODOS" | "PENDENTE" | "RECEBIDO" | "CANCELADA";

type Props = {
  busca: string;
  visao: ContasReceberVisao;
  tipoPeriodo: ContasReceberTipoPeriodo;
  contexto: ContextoFilter;
  situacao: SituacaoFilter;
  status: StatusFilter;
  bucket: string;
  ordenacao: ContasReceberOrdenacao;
  mes: string;
  ano: string;
  vencimentoInicio: string;
  vencimentoFim: string;
  competenciaInicio: string;
  competenciaFim: string;
  ordenacoesDisponiveis: ContasReceberOrdenacao[];
  onBuscaChange: (value: string) => void;
  onVisaoChange: (value: ContasReceberVisao) => void;
  onTipoPeriodoChange: (value: ContasReceberTipoPeriodo) => void;
  onContextoChange: (value: ContextoFilter) => void;
  onSituacaoChange: (value: SituacaoFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
  onBucketChange: (value: string) => void;
  onOrdenacaoChange: (value: ContasReceberOrdenacao) => void;
  onMesChange: (value: string) => void;
  onAnoChange: (value: string) => void;
  onVencimentoInicioChange: (value: string) => void;
  onVencimentoFimChange: (value: string) => void;
  onCompetenciaInicioChange: (value: string) => void;
  onCompetenciaFimChange: (value: string) => void;
};

const SITUACOES = ["TODAS", "VENCIDA", "EM_ABERTO", "QUITADA"] as const;
const STATUS = ["TODOS", "PENDENTE", "RECEBIDO", "CANCELADA"] as const;
const BUCKETS = ["", "VENCIDA", "A_VENCER_7", "A_VENCER_30", "FUTURA", "SEM_VENCIMENTO"] as const;
const FIELD_CLASS =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm shadow-slate-100/50 transition focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950/10";
const SEARCH_CLASS =
  "h-11 rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 shadow-sm shadow-slate-100/60 transition focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950/10";

function humanizeToken(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPeriodoResumo({
  tipoPeriodo,
  mes,
  ano,
  vencimentoInicio,
  vencimentoFim,
  competenciaInicio,
  competenciaFim,
}: Pick<
  Props,
  "tipoPeriodo" | "mes" | "ano" | "vencimentoInicio" | "vencimentoFim" | "competenciaInicio" | "competenciaFim"
>): string {
  if (tipoPeriodo === "SEM_PERIODO") {
    return "Sem recorte de periodo ativo. A leitura considera todo o conjunto compativel com os demais filtros.";
  }

  if (tipoPeriodo === "MES_ANO") {
    if (mes && ano) return `Recorte ativo: mes ${mes}/${ano}.`;
    if (ano) return `Recorte ativo: ano ${ano} com selecao mensal em aberto.`;
    if (mes) return `Recorte ativo: mes ${mes} sem ano definido.`;
    return "Recorte mensal selecionado. Informe mes e ano para fechar o filtro.";
  }

  if (tipoPeriodo === "ANO_INTEIRO") {
    return ano ? `Recorte ativo: ano inteiro de ${ano}.` : "Recorte anual selecionado. Informe o ano para fechar o filtro.";
  }

  if (tipoPeriodo === "ENTRE_DATAS") {
    if (vencimentoInicio && vencimentoFim) {
      return `Recorte ativo: vencimentos entre ${vencimentoInicio} e ${vencimentoFim}.`;
    }
    if (vencimentoInicio) return `Recorte ativo: vencimentos a partir de ${vencimentoInicio}.`;
    if (vencimentoFim) return `Recorte ativo: vencimentos ate ${vencimentoFim}.`;
    return "Recorte por vencimento selecionado. Informe ao menos uma data.";
  }

  if (tipoPeriodo === "COMPETENCIA") {
    if (competenciaInicio && competenciaFim) {
      return `Recorte ativo: competencias entre ${competenciaInicio} e ${competenciaFim}.`;
    }
    if (competenciaInicio) return `Recorte ativo: competencias a partir de ${competenciaInicio}.`;
    if (competenciaFim) return `Recorte ativo: competencias ate ${competenciaFim}.`;
    return "Recorte por competencia selecionado. Informe ao menos uma competencia.";
  }

  return `Recorte ativo: ${humanizeToken(tipoPeriodo)}.`;
}

function Field({
  label,
  emphasis = false,
  helperText,
  children,
}: {
  label: string;
  emphasis?: boolean;
  helperText?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span
        className={
          emphasis
            ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700"
            : "text-[11px] uppercase tracking-[0.16em] text-slate-500"
        }
      >
        {label}
      </span>
      {children}
      {helperText ? <span className="block text-[11px] text-slate-500">{helperText}</span> : null}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select className={FIELD_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  );
}

export function ContasReceberFilters(props: Props) {
  const {
    busca,
    visao,
    tipoPeriodo,
    contexto,
    situacao,
    status,
    bucket,
    ordenacao,
    mes,
    ano,
    vencimentoInicio,
    vencimentoFim,
    competenciaInicio,
    competenciaFim,
    ordenacoesDisponiveis,
    onBuscaChange,
    onVisaoChange,
    onTipoPeriodoChange,
    onContextoChange,
    onSituacaoChange,
    onStatusChange,
    onBucketChange,
    onOrdenacaoChange,
    onMesChange,
    onAnoChange,
    onVencimentoInicioChange,
    onVencimentoFimChange,
    onCompetenciaInicioChange,
    onCompetenciaFimChange,
  } = props;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const statusOptions = visao === "INCONSISTENCIAS" ? STATUS : STATUS.filter((item) => item !== "CANCELADA");
  const periodoResumo = buildPeriodoResumo({
    tipoPeriodo,
    mes,
    ano,
    vencimentoInicio,
    vencimentoFim,
    competenciaInicio,
    competenciaFim,
  });

  // Contar filtros avançados ativos
  const advancedActiveCount = [
    tipoPeriodo !== "SEM_PERIODO",
    situacao !== "TODAS",
    status !== "TODOS",
    bucket !== "",
  ].filter(Boolean).length;

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100 px-5 py-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-slate-900">Filtros</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.9fr)_180px_180px_200px]">
          <div className="md:col-span-2 xl:col-span-1">
            <Field label="Busca" emphasis>
              <Input
                autoFocus
                className={SEARCH_CLASS}
                value={busca}
                onChange={(event) => onBuscaChange(event.target.value)}
                placeholder="Responsavel, aluno, matricula ou origem"
              />
            </Field>
          </div>

          <Field label="Visao" emphasis>
            <Select value={visao} onChange={(value) => onVisaoChange(value as ContasReceberVisao)}>
              {VISAO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Ordenacao" emphasis>
            <Select value={ordenacao} onChange={(value) => onOrdenacaoChange(value as ContasReceberOrdenacao)}>
              {ordenacoesDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {ORDENACAO_LABELS[item]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Contexto" emphasis>
            <Select value={contexto} onChange={(value) => onContextoChange(value as ContextoFilter)}>
              {CONTEXTO_FILTER_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          onClick={() => setShowAdvanced((c) => !c)}
        >
          {showAdvanced ? "Menos filtros" : "Mais filtros"}
          {advancedActiveCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
              {advancedActiveCount}
            </span>
          ) : null}
        </button>

        {showAdvanced ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Field label="Periodo">
              <Select value={tipoPeriodo} onChange={(value) => onTipoPeriodoChange(value as ContasReceberTipoPeriodo)}>
                {TIPO_PERIODO_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Situacao">
              <Select value={situacao} onChange={(value) => onSituacaoChange(value as SituacaoFilter)}>
                {SITUACOES.map((item) => (
                  <option key={item} value={item}>
                    {item === "TODAS" ? "Todas" : humanizeToken(item)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Status">
              <Select value={status} onChange={(value) => onStatusChange(value as StatusFilter)}>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item === "TODOS" ? "Todos" : humanizeToken(item)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Categoria">
              <Select value={bucket} onChange={onBucketChange}>
                {BUCKETS.map((item) => (
                  <option key={item || "TODOS"} value={item}>
                    {item ? humanizeToken(item) : "Todos"}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}

        {showAdvanced && tipoPeriodo === "MES_ANO" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Mes">
              <Select value={mes} onChange={onMesChange}>
                <option value="">Todos</option>
                {Array.from({ length: 12 }).map((_, index) => {
                  const value = String(index + 1).padStart(2, "0");
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Ano">
              <Input
                className={FIELD_CLASS}
                inputMode="numeric"
                placeholder="2026"
                value={ano}
                onChange={(event) => onAnoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          </div>
        ) : null}

        {showAdvanced && tipoPeriodo === "ANO_INTEIRO" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Ano">
              <Input
                className={FIELD_CLASS}
                inputMode="numeric"
                placeholder="2026"
                value={ano}
                onChange={(event) => onAnoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          </div>
        ) : null}

        {showAdvanced && tipoPeriodo === "ENTRE_DATAS" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Vencimento inicial">
              <Input className={FIELD_CLASS} type="date" value={vencimentoInicio} onChange={(event) => onVencimentoInicioChange(event.target.value)} />
            </Field>

            <Field label="Vencimento final">
              <Input className={FIELD_CLASS} type="date" value={vencimentoFim} onChange={(event) => onVencimentoFimChange(event.target.value)} />
            </Field>
          </div>
        ) : null}

        {showAdvanced && tipoPeriodo === "COMPETENCIA" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Competencia inicial">
              <Input className={FIELD_CLASS} type="month" value={competenciaInicio} onChange={(event) => onCompetenciaInicioChange(event.target.value)} />
            </Field>

            <Field label="Competencia final">
              <Input className={FIELD_CLASS} type="month" value={competenciaFim} onChange={(event) => onCompetenciaFimChange(event.target.value)} />
            </Field>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {periodoResumo}
        </div>
      </CardContent>
    </Card>
  );
}
