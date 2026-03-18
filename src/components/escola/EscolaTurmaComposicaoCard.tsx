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
  distribuicao_niveis_json: DashboardJsonValue | null;
  distribuicao_vinculos_json: DashboardJsonValue | null;
};

type EscolaTurmaComposicaoCardProps = {
  turma: DashboardTurmaComposicao;
  hrefDetalhe: string;
};

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
      .filter((item) => item.total > 0);
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
      className: "border-slate-200 bg-slate-50 text-slate-600",
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
    className: "border-slate-200 bg-slate-50 text-slate-600",
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

  return "border-slate-200 bg-white text-slate-700";
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

function formatKpiValue(value: number | null): string {
  if (typeof value !== "number") return "-";
  return String(value);
}

export function EscolaTurmaComposicaoCard({
  turma,
  hrefDetalhe,
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
    <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">{turma.nome}</h3>
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

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Alunos ativos
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {turma.alunos_ativos_total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Capacidade
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatKpiValue(turma.capacidade)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Ocupacao %
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {typeof turma.ocupacao_percentual === "number"
                ? `${turma.ocupacao_percentual}%`
                : "-"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Vagas disponiveis
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatKpiValue(turma.vagas_disponiveis)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
            Pagantes: {turma.pagantes_total}
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-medium text-sky-700">
            Concessao total: {turma.concessao_total}
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            Concessao integral: {turma.concessao_integral_total}
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700">
            Concessao parcial: {turma.concessao_parcial_total}
          </span>
          {turma.outros_vinculos_total > 0 ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-medium text-slate-700">
              Outros vinculos: {turma.outros_vinculos_total}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Composicao por nivel
            </p>
            {distribuicaoNiveis.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {distribuicaoNiveis.map((item) => (
                  <li key={`nivel-${item.key}`} className="flex items-center justify-between gap-3">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-900">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Sem distribuicao por nivel.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Composicao institucional
            </p>
            {distribuicaoVinculos.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
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
              <p className="mt-3 text-sm text-slate-500">Sem distribuicao institucional.</p>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between border-slate-100 bg-slate-50/70">
        <span className="text-xs text-slate-500">
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
