"use client";

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-sm text-slate-700">
      <span>{label}</span>
      {children}
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
    <select
      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
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
  const statusOptions = visao === "INCONSISTENCIAS" ? STATUS : STATUS.filter((item) => item !== "CANCELADA");

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-slate-900">Filtros inteligentes</CardTitle>
          <p className="text-sm text-slate-600">
            Ajuste a leitura da tela por visao, contexto e periodo sem expor controles desnecessarios ao mesmo tempo.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <Field label="Busca">
            <Input value={busca} onChange={(event) => onBuscaChange(event.target.value)} placeholder="Pessoa, origem, documento..." />
          </Field>
          <Field label="Visao">
            <Select value={visao} onChange={(value) => onVisaoChange(value as ContasReceberVisao)}>
              {VISAO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de periodo">
            <Select value={tipoPeriodo} onChange={(value) => onTipoPeriodoChange(value as ContasReceberTipoPeriodo)}>
              {TIPO_PERIODO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <Field label="Contexto">
            <Select value={contexto} onChange={(value) => onContextoChange(value as ContextoFilter)}>
              {CONTEXTO_FILTER_OPTIONS.map((item) => (
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
                  {item === "TODAS" ? "Todas" : item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bucket">
            <Select value={bucket} onChange={onBucketChange}>
              {BUCKETS.map((item) => (
                <option key={item || "TODOS"} value={item}>
                  {item || "Todos"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status bruto">
            <Select value={status} onChange={(value) => onStatusChange(value as StatusFilter)}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "TODOS" ? "Todos" : item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordenacao">
            <Select value={ordenacao} onChange={(value) => onOrdenacaoChange(value as ContasReceberOrdenacao)}>
              {ordenacoesDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {ORDENACAO_LABELS[item]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {tipoPeriodo === "MES_ANO" ? (
          <div className="grid gap-3 md:grid-cols-2">
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
                inputMode="numeric"
                placeholder="2026"
                value={ano}
                onChange={(event) => onAnoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          </div>
        ) : null}

        {tipoPeriodo === "ANO_INTEIRO" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Ano">
              <Input
                inputMode="numeric"
                placeholder="2026"
                value={ano}
                onChange={(event) => onAnoChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              A tela vai considerar todo o ano informado na leitura atual.
            </div>
          </div>
        ) : null}

        {tipoPeriodo === "ENTRE_DATAS" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Vencimento inicial">
              <Input type="date" value={vencimentoInicio} onChange={(event) => onVencimentoInicioChange(event.target.value)} />
            </Field>
            <Field label="Vencimento final">
              <Input type="date" value={vencimentoFim} onChange={(event) => onVencimentoFimChange(event.target.value)} />
            </Field>
          </div>
        ) : null}

        {tipoPeriodo === "COMPETENCIA" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Competencia inicial">
              <Input type="month" value={competenciaInicio} onChange={(event) => onCompetenciaInicioChange(event.target.value)} />
            </Field>
            <Field label="Competencia final">
              <Input type="month" value={competenciaFim} onChange={(event) => onCompetenciaFimChange(event.target.value)} />
            </Field>
          </div>
        ) : null}

        {tipoPeriodo === "SEM_PERIODO" ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Nenhum recorte de periodo ativo. A leitura considera todo o conjunto compatível com os demais filtros.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
