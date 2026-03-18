"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import type { CobrancaListaItem, ContextoPrincipal } from "@/lib/financeiro/contas-receber-auditoria";
import type { ContasReceberVisao } from "@/lib/financeiro/contas-receber-view-config";
import { getContextoLabel } from "@/lib/financeiro/contas-receber-view-config";

type Props = {
  items: CobrancaListaItem[];
  page: number;
  totalPages: number;
  total: number;
  visao: ContasReceberVisao;
  title: string;
  subtitle: string;
  onPageChange: (page: number) => void;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
};

const CONTEXTO_STYLES: Record<ContextoPrincipal, string> = {
  ESCOLA: "bg-sky-50 text-sky-800 ring-sky-200",
  CAFE: "bg-amber-50 text-amber-800 ring-amber-200",
  LOJA: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  OUTRO: "bg-slate-100 text-slate-700 ring-slate-200",
};

function referenceLabel(item: CobrancaListaItem) {
  if (item.competencia_ano_mes && item.bucket) return `${item.competencia_ano_mes} · ${item.bucket}`;
  if (item.competencia_ano_mes) return item.competencia_ano_mes;
  if (item.bucket) return item.bucket;
  return "Sem recorte";
}

function situacaoBadge(item: CobrancaListaItem) {
  const interno = item.status_interno ?? "EM_REVISAO";
  if (interno === "VENCIDA") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (interno === "EM_ABERTO") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (interno === "QUITADA") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function situacaoSecundaria(item: CobrancaListaItem) {
  if (item.tipo_inconsistencia) return item.tipo_inconsistencia;
  if (item.status_interno === "QUITADA") {
    return item.ultima_data_recebimento ? `Recebida em ${formatDateISO(item.ultima_data_recebimento)}` : "Quitada";
  }
  if (item.atraso_dias > 0) return `${item.atraso_dias} dias de atraso`;
  return item.status_cobranca ?? "Sem status bruto";
}

function origemSecundaria(item: CobrancaListaItem) {
  const base = item.origem_tipo ?? "COBRANCA";
  const complemento = item.origem_id ? `#${item.origem_id}` : null;
  return complemento ? `${base} ${complemento}` : base;
}

function TableHeader({ visao }: { visao: ContasReceberVisao }) {
  if (visao === "RECEBIDAS") {
    return (
      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
        <th className="px-3 py-3 font-medium">Pessoa</th>
        <th className="px-3 py-3 font-medium">Contexto</th>
        <th className="px-3 py-3 font-medium">Origem detalhada</th>
        <th className="px-3 py-3 font-medium">Recebida em</th>
        <th className="px-3 py-3 font-medium">Valor recebido</th>
        <th className="px-3 py-3 font-medium">Situacao</th>
        <th className="px-3 py-3 font-medium">Referencia</th>
        <th className="px-3 py-3 font-medium text-right">Acoes</th>
      </tr>
    );
  }

  if (visao === "INCONSISTENCIAS") {
    return (
      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
        <th className="px-3 py-3 font-medium">Pessoa</th>
        <th className="px-3 py-3 font-medium">Problema</th>
        <th className="px-3 py-3 font-medium">Contexto</th>
        <th className="px-3 py-3 font-medium">Origem detalhada</th>
        <th className="px-3 py-3 font-medium">Valor</th>
        <th className="px-3 py-3 font-medium">Situacao</th>
        <th className="px-3 py-3 font-medium">Vencimento</th>
        <th className="px-3 py-3 font-medium text-right">Acoes</th>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
      <th className="px-3 py-3 font-medium">Pessoa</th>
      <th className="px-3 py-3 font-medium">Contexto</th>
      <th className="px-3 py-3 font-medium">Origem detalhada</th>
      <th className="px-3 py-3 font-medium">Vencimento</th>
      <th className="px-3 py-3 font-medium">Valor</th>
      <th className="px-3 py-3 font-medium">Situacao</th>
      <th className="px-3 py-3 font-medium">Competencia / bucket</th>
      <th className="px-3 py-3 font-medium text-right">Acoes</th>
    </tr>
  );
}

function Row({
  item,
  visao,
  onAuditar,
  onReceber,
}: {
  item: CobrancaListaItem;
  visao: ContasReceberVisao;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
}) {
  const contextoLabel = getContextoLabel(item.contexto_principal);
  const showReceber = visao !== "RECEBIDAS" && item.valor_aberto_centavos > 0 && item.status_interno !== "QUITADA";

  if (visao === "RECEBIDAS") {
    return (
      <tr className="border-b border-slate-100 align-top last:border-b-0">
        <td className="px-3 py-3">
          <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
          <div className="text-xs text-slate-500">#{item.cobranca_id}</div>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
            {contextoLabel}
          </span>
          <div className="mt-1 text-xs text-slate-500">{item.centro_custo_nome ?? "Sem centro definido"}</div>
        </td>
        <td className="px-3 py-3">
          <div className="text-slate-800">{item.origem_label}</div>
          <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {origemSecundaria(item)}
          </div>
        </td>
        <td className="px-3 py-3 text-slate-700">{formatDateISO(item.ultima_data_recebimento)}</td>
        <td className="px-3 py-3 text-slate-700">
          <div>{formatBRLFromCents(Math.max(item.valor_recebido_centavos, item.valor_centavos))}</div>
          <div className="text-xs text-slate-500">total original {formatBRLFromCents(item.valor_centavos)}</div>
        </td>
        <td className="px-3 py-3 text-slate-700">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${situacaoBadge(item)}`}>
            {item.status_interno ?? "Quitada"}
          </span>
          <div className="mt-1 text-xs text-slate-500">{situacaoSecundaria(item)}</div>
        </td>
        <td className="px-3 py-3 text-slate-700">{referenceLabel(item)}</td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onAuditar(item)}>
              Auditar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (visao === "INCONSISTENCIAS") {
    return (
      <tr className="border-b border-slate-100 align-top last:border-b-0">
        <td className="px-3 py-3">
          <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
          <div className="text-xs text-slate-500">#{item.cobranca_id}</div>
        </td>
        <td className="px-3 py-3 text-slate-700">
          <div>{item.tipo_inconsistencia ?? "Revisar trilha financeira"}</div>
          <div className="text-xs text-slate-500">Criticidade {item.criticidade_inconsistencia}</div>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
            {contextoLabel}
          </span>
          <div className="mt-1 text-xs text-slate-500">{item.centro_custo_nome ?? "Sem centro definido"}</div>
        </td>
        <td className="px-3 py-3">
          <div className="text-slate-800">{item.origem_label}</div>
          <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {origemSecundaria(item)}
          </div>
        </td>
        <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(Math.max(item.valor_aberto_centavos, item.valor_centavos))}</td>
        <td className="px-3 py-3 text-slate-700">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${situacaoBadge(item)}`}>
            {item.status_interno ?? "Em revisao"}
          </span>
          <div className="mt-1 text-xs text-slate-500">{item.status_cobranca ?? "Sem status bruto"}</div>
        </td>
        <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onAuditar(item)}>
              Auditar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 align-top last:border-b-0">
      <td className="px-3 py-3">
        <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
        <div className="text-xs text-slate-500">#{item.cobranca_id}</div>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
          {contextoLabel}
        </span>
        <div className="mt-1 text-xs text-slate-500">{item.centro_custo_nome ?? "Sem centro definido"}</div>
      </td>
      <td className="px-3 py-3">
        <div className="text-slate-800">{item.origem_label}</div>
        <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
          {origemSecundaria(item)}
        </div>
      </td>
      <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
      <td className="px-3 py-3 text-slate-700">
        <div>{formatBRLFromCents(item.valor_aberto_centavos)}</div>
        <div className="text-xs text-slate-500">total {formatBRLFromCents(item.valor_centavos)}</div>
      </td>
      <td className="px-3 py-3 text-slate-700">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${situacaoBadge(item)}`}>
          {item.status_interno ?? "Em revisao"}
        </span>
        <div className="mt-1 text-xs text-slate-500">{situacaoSecundaria(item)}</div>
      </td>
      <td className="px-3 py-3 text-slate-700">{referenceLabel(item)}</td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onAuditar(item)}>
            Auditar
          </Button>
          {showReceber ? (
            <Button type="button" onClick={() => onReceber(item)}>
              Receber
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function CobrancasTable({
  items,
  page,
  totalPages,
  total,
  visao,
  title,
  subtitle,
  onPageChange,
  onAuditar,
  onReceber,
}: Props) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="border-slate-100">
        <CardTitle className="text-slate-900">{title}</CardTitle>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <TableHeader visao={visao} />
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                    Nenhum registro encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <Row
                    key={item.cobranca_id}
                    item={item}
                    visao={visao}
                    onAuditar={onAuditar}
                    onReceber={onReceber}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Pagina {page} de {totalPages} · {total} registro(s)
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              Anterior
            </Button>
            <Button type="button" variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              Proxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
