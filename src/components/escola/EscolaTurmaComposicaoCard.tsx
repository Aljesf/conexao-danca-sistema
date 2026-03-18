import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type DashboardJsonPrimitive = string | number | boolean | null;
export type DashboardJsonValue =
  | DashboardJsonPrimitive
  | { [key: string]: DashboardJsonValue }
  | DashboardJsonValue[];

type DashboardJsonObject = {
  [key: string]: DashboardJsonValue;
};

type DistribuicaoItem = {
  key: string;
  label: string;
  total: number;
};

export type DashboardTurmaComposicao = {
  turma_id: number;
  nome: string;
  tipo_turma: string | null;
  ano_referencia: number | null;
  status: string | null;
  curso: string | null;
  curso_slug_ou_chave_filtro: string | null;
  nivel: string | null;
  turno: string | null;
  capacidade: number | null;
  professor_nome: string | null;
  alunos_ativos_total: number;
  vagas_disponiveis: number | null;
  ocupacao_percentual: number | null;
  pagantes_total: number;
  concessao_total: number;
  concessao_integral_total: number;
  concessao_parcial_total: number;
  outros_vinculos_total: number;
  receita_mensal_estimada_centavos: number | null;
  receita_pagante_estimada_centavos: number | null;
  receita_concessao_absorvida_centavos: number | null;
  distribuicao_niveis_json: DashboardJsonValue | null;
  distribuicao_vinculos_json: DashboardJsonValue | null;
};

type EscolaTurmaComposicaoCardProps = {
  turma: DashboardTurmaComposicao;
  hrefDetalhe: string;
  onClickPagantes?: () => void;
  onClickConcessoes?: () => void;
  onClickConcessoesIntegrais?: () => void;
  onClickConcessoesParciais?: () => void;
};

const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function isJsonObject(value: DashboardJsonValue | null | undefined): value is DashboardJsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: DashboardJsonValue | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function humanizeKey(value: string): string {
  const normalized = value.replace(/_/g, " ").trim();
  if (!normalized) return "Nao informado";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function parseDistribuicaoItem(
  item: DashboardJsonObject,
  labelMap?: Record<string, string>,
): DistribuicaoItem | null {
  const total =
    toNumber(item.total) ??
    toNumber(item.valor) ??
    toNumber(item.count) ??
    toNumber(item.qtd) ??
    toNumber(item.quantidade);

  if (total === null) return null;

  const rawLabel =
    typeof item.label === "string"
      ? item.label
      : typeof item.nivel === "string"
        ? item.nivel
        : typeof item.nome === "string"
          ? item.nome
          : typeof item.chave === "string"
            ? item.chave
            : typeof item.key === "string"
              ? item.key
              : null;

  const rawKey =
    typeof item.key === "string"
      ? item.key
      : typeof item.chave === "string"
        ? item.chave
        : rawLabel;

  const key = rawKey ? slugify(rawKey) : `item-${total}`;
  const label = rawLabel ? rawLabel : labelMap?.[key] ?? humanizeKey(key);

  return { key, label, total };
}

export function normalizarJsonArrayDeDistribuicao(
  value: DashboardJsonValue | null | undefined,
  labelMap?: Record<string, string>,
): DistribuicaoItem[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (!isJsonObject(entry)) return [];
        const item = parseDistribuicaoItem(entry, labelMap);
        return item ? [item] : [];
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.label.localeCompare(b.label, "pt-BR");
      });
  }

  if (isJsonObject(value)) {
    return Object.entries(value)
      .flatMap(([key, raw]) => {
        const total = toNumber(raw);
        if (total === null || total <= 0) return [];
        return [
          {
            key,
            label: labelMap?.[key] ?? humanizeKey(key),
            total,
          },
        ];
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.label.localeCompare(b.label, "pt-BR");
      });
  }

  return [];
}

export function parseDistribuicao(
  value: DashboardJsonValue | null | undefined,
  labelMap?: Record<string, string>,
): DistribuicaoItem[] {
  return normalizarJsonArrayDeDistribuicao(value, labelMap);
}

export function getOcupacaoTone(ocupacaoPercentual: number | null): {
  label: string | null;
  className: string;
} {
  if (typeof ocupacaoPercentual !== "number") {
    return {
      label: null,
      className: "border-slate-200/70 bg-slate-100/80 text-slate-600",
    };
  }

  if (ocupacaoPercentual >= 100) {
    return {
      label: "Lotada",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (ocupacaoPercentual < 50) {
    return {
      label: "Baixa ocupacao",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: null,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export function getDependenciaInstitucionalTone(
  concessaoTotal: number,
  pagantesTotal: number,
): {
  label: string | null;
  className: string;
} {
  if (concessaoTotal > pagantesTotal) {
    return {
      label: "Alta dependencia institucional",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: null,
    className: "border-slate-200/70 bg-slate-100/80 text-slate-600",
  };
}

function getStatusBadgeClass(status: string | null): string {
  const normalized = status?.trim().toUpperCase() ?? "";

  if (normalized === "ATIVA") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "EM_PREPARACAO") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "ENCERRADA" || normalized === "CANCELADA") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-slate-200/70 bg-white text-slate-700";
}

function formatHeaderMeta(turma: DashboardTurmaComposicao): string {
  const partes = [
    turma.curso,
    turma.nivel,
    turma.turno,
    turma.ano_referencia ? String(turma.ano_referencia) : null,
  ].filter((item): item is string => Boolean(item));

  return partes.join(" / ") || "Sem classificacao operacional";
}

function formatCapacity(value: number | null): string {
  if (typeof value !== "number") return "Nao informada";
  return String(value);
}

function formatOcupacao(value: number | null): string {
  if (typeof value !== "number") return "Nao disponivel";
  return `${value}%`;
}

function formatVagas(value: number | null): string {
  if (typeof value !== "number") return "Nao informadas";
  return String(value);
}

function formatCurrency(value: number | null): string {
  if (typeof value !== "number") return "Nao disponivel";
  return moedaFormatter.format(value / 100);
}

function MetaStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50/90 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SoftPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-slate-50/85 px-4 py-4 ring-1 ring-inset ring-slate-200/65">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ActionBadge({
  label,
  value,
  toneClassName,
  onClick,
}: {
  label: string;
  value: number;
  toneClassName: string;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1.5 font-medium ring-1 ring-inset ${toneClassName}`}
      >
        {label}: {value}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1.5 font-medium ring-1 ring-inset transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${toneClassName} cursor-pointer`}
    >
      {label}: {value}
    </button>
  );
}

export function EscolaTurmaComposicaoCard({
  turma,
  hrefDetalhe,
  onClickPagantes,
  onClickConcessoes,
  onClickConcessoesIntegrais,
  onClickConcessoesParciais,
}: EscolaTurmaComposicaoCardProps) {
  const ocupacaoTone = getOcupacaoTone(turma.ocupacao_percentual);
  const dependenciaTone = getDependenciaInstitucionalTone(
    turma.concessao_total,
    turma.pagantes_total,
  );

  const distribuicaoNiveis = parseDistribuicao(turma.distribuicao_niveis_json);
  const distribuicaoVinculos = parseDistribuicao(turma.distribuicao_vinculos_json, {
    pagantes: "Pagantes",
    concessao: "Concessao total",
    concessao_integral: "Concessao integral",
    concessao_parcial: "Concessao parcial",
    concessao_generica: "Concessao sem detalhe",
    outros_vinculos: "Outros vinculos",
  });

  return (
    <Card className="overflow-hidden rounded-[28px] border border-slate-200/75 bg-white/95 shadow-[0_22px_48px_-34px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200/70 px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">{turma.nome}</h3>
            <p className="text-sm text-slate-500">{formatHeaderMeta(turma)}</p>
            <p className="text-sm text-slate-600">
              Professor: {turma.professor_nome?.trim() ? turma.professor_nome : "Nao definido"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                turma.status,
              )}`}
            >
              {turma.status ?? "Sem status"}
            </span>

            {ocupacaoTone.label ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${ocupacaoTone.className}`}
              >
                {ocupacaoTone.label}
              </span>
            ) : null}

            {dependenciaTone.label ? (
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${dependenciaTone.className}`}
              >
                {dependenciaTone.label}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 px-5 py-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetaStat label="Alunos ativos" value={turma.alunos_ativos_total} />
          <MetaStat label="Capacidade" value={formatCapacity(turma.capacidade)} />
          <MetaStat label="Ocupacao" value={formatOcupacao(turma.ocupacao_percentual)} />
          <MetaStat label="Vagas disponiveis" value={formatVagas(turma.vagas_disponiveis)} />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <ActionBadge
            label="Pagantes"
            value={turma.pagantes_total}
            toneClassName="bg-slate-100 text-slate-700 ring-slate-200/80"
            onClick={onClickPagantes}
          />
          <ActionBadge
            label="Concessao total"
            value={turma.concessao_total}
            toneClassName="bg-sky-50 text-sky-700 ring-sky-200/80"
            onClick={onClickConcessoes}
          />
          <ActionBadge
            label="Concessao integral"
            value={turma.concessao_integral_total}
            toneClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/80"
            onClick={onClickConcessoesIntegrais}
          />
          <ActionBadge
            label="Concessao parcial"
            value={turma.concessao_parcial_total}
            toneClassName="bg-amber-50 text-amber-700 ring-amber-200/80"
            onClick={onClickConcessoesParciais}
          />
          {turma.outros_vinculos_total > 0 ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 ring-1 ring-inset ring-slate-200/80">
              Outros vinculos: {turma.outros_vinculos_total}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <MetaStat
            label="Receita mensal estimada"
            value={formatCurrency(turma.receita_mensal_estimada_centavos)}
          />
          <MetaStat
            label="Pagantes sustentam"
            value={formatCurrency(turma.receita_pagante_estimada_centavos)}
          />
          <MetaStat
            label="Absorcao institucional"
            value={formatCurrency(turma.receita_concessao_absorvida_centavos)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SoftPanel title="Composicao por nivel">
            {distribuicaoNiveis.length > 0 ? (
              <ul className="space-y-2.5 text-sm text-slate-700">
                {distribuicaoNiveis.map((item) => (
                  <li key={`nivel-${item.key}`} className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sem distribuicao por nivel.</p>
            )}
          </SoftPanel>

          <SoftPanel title="Composicao institucional">
            {distribuicaoVinculos.length > 0 ? (
              <ul className="space-y-2.5 text-sm text-slate-700">
                {distribuicaoVinculos.map((item) => (
                  <li
                    key={`vinculo-${item.key}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Sem distribuicao institucional.</p>
            )}
          </SoftPanel>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start justify-between gap-3 border-t border-slate-200/70 bg-slate-50/70 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>
          Tipo: {turma.tipo_turma ?? "REGULAR"} | Ano ref.: {turma.ano_referencia ?? "-"}
        </span>
        <Link
          href={hrefDetalhe}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Ver turma
        </Link>
      </CardFooter>
    </Card>
  );
}

export default EscolaTurmaComposicaoCard;
