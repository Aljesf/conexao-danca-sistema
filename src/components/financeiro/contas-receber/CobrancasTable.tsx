"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDateISO } from "@/lib/formatters/date";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { EXPURGO_TIPO_LABELS, type ExpurgoTipo } from "@/lib/financeiro/expurgo-types";
import type { CobrancaListaItem, ContextoPrincipal } from "@/lib/financeiro/contas-receber-auditoria";
import type { ContasReceberVisao } from "@/lib/financeiro/contas-receber-view-config";
import { getContextoLabel } from "@/lib/financeiro/contas-receber-view-config";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shadcn/ui";

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
  onExpurgoConcluido: () => void;
};

type ExpurgoResponse = {
  ok?: boolean;
  error?: string;
  details?: unknown;
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
  const bruto = item.status_cobranca ?? "";
  const interno = item.status_interno ?? "EM_REVISAO";
  if (bruto === "CANCELADA") return "bg-slate-200 text-slate-800 ring-slate-300";
  if (interno === "VENCIDA") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (interno === "EM_ABERTO") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (interno === "QUITADA") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function situacaoSecundaria(item: CobrancaListaItem) {
  if (item.status_cobranca === "CANCELADA") return "Cancelada e elegivel a expurgo tecnico";
  if (item.tipo_inconsistencia) return item.tipo_inconsistencia;
  if (item.status_interno === "QUITADA") {
    return item.ultima_data_recebimento ? `Recebida em ${formatDateISO(item.ultima_data_recebimento)}` : "Quitada";
  }
  if (item.atraso_dias > 0) return `${item.atraso_dias} dias de atraso`;
  return item.status_cobranca ?? "Sem status bruto";
}

function origemBruta(item: CobrancaListaItem) {
  const base = item.origem_tipo ?? "COBRANCA";
  const complemento = item.origem_id ? `#${item.origem_id}` : null;
  return complemento ? `${base} ${complemento}` : base;
}

function origemPrincipal(item: CobrancaListaItem) {
  return item.origem_label || item.origemLabel || item.origem_tecnica || origemBruta(item) || "Origem em revisao";
}

function origemPrincipalVisivel(item: CobrancaListaItem) {
  if (item.contaInternaId) return `Conta interna #${item.contaInternaId}`;
  return origemPrincipal(item);
}

function origemContextoLinhas(item: CobrancaListaItem) {
  const linhas: string[] = [];
  if (item.alunoNome) linhas.push(`Aluno: ${item.alunoNome}`);
  if (item.matriculaId) linhas.push(`Matricula #${item.matriculaId}`);
  if (item.origem_secundaria) linhas.push(item.origem_secundaria);
  return linhas;
}

function origemBadgeClass(tone: CobrancaListaItem["origem_badge_tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function origemTecnica(item: CobrancaListaItem) {
  const technical = item.origem_tecnica ?? origemBruta(item);
  if (!technical) return null;
  if (technical === item.origem_label || technical === item.origem_secundaria) return null;
  return technical;
}

function OrigemCell({ item }: { item: CobrancaListaItem }) {
  const technical = origemTecnica(item);
  const contextoLinhas = origemContextoLinhas(item);

  return (
    <td className="px-3 py-3">
      <div className="space-y-1">
        <div className="font-medium text-slate-800">{origemPrincipalVisivel(item)}</div>
        {contextoLinhas.map((linha) => (
          <div key={linha} className="text-xs text-slate-500">
            {linha}
          </div>
        ))}
        {item.origem_badge_label || technical ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {item.origem_badge_label ? (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${origemBadgeClass(item.origem_badge_tone)}`}>
                {item.origem_badge_label}
              </span>
            ) : null}
            {technical ? <span className="text-[11px] text-slate-400">{technical}</span> : null}
          </div>
        ) : null}
      </div>
    </td>
  );
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
  onAbrirExpurgo,
}: {
  item: CobrancaListaItem;
  visao: ContasReceberVisao;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
  onAbrirExpurgo: (item: CobrancaListaItem) => void;
}) {
  const contextoLabel = getContextoLabel(item.contexto_principal);
  const showReceber =
    visao !== "RECEBIDAS" && item.valor_aberto_centavos > 0 && item.status_interno !== "QUITADA" && item.status_cobranca !== "CANCELADA";
  const showExpurgar = item.status_cobranca === "CANCELADA";

  if (visao === "RECEBIDAS") {
    return (
      <tr className="border-b border-slate-100 align-top last:border-b-0">
        <td className="px-3 py-3">
          {item.pessoa_id ? (
            <Link href={`/pessoas/${item.pessoa_id}?aba=financeiro`} className="font-medium text-slate-900 underline-offset-2 hover:text-slate-700 hover:underline">
              {item.pessoa_nome}
            </Link>
          ) : (
            <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
          )}
          <div className="text-xs text-slate-500">#{item.cobranca_id}</div>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
            {contextoLabel}
          </span>
          <div className="mt-1 text-xs text-slate-500">{item.centro_custo_nome ?? "Sem centro definido"}</div>
        </td>
        <OrigemCell item={item} />
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
          {item.pessoa_id ? (
            <Link href={`/pessoas/${item.pessoa_id}?aba=financeiro`} className="font-medium text-slate-900 underline-offset-2 hover:text-slate-700 hover:underline">
              {item.pessoa_nome}
            </Link>
          ) : (
            <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
          )}
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
        <OrigemCell item={item} />
        <td className="px-3 py-3 text-slate-700">{formatBRLFromCents(Math.max(item.valor_aberto_centavos, item.valor_centavos))}</td>
        <td className="px-3 py-3 text-slate-700">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${situacaoBadge(item)}`}>
            {item.status_cobranca ?? item.status_interno ?? "Em revisao"}
          </span>
          <div className="mt-1 text-xs text-slate-500">{situacaoSecundaria(item)}</div>
        </td>
        <td className="px-3 py-3 text-slate-700">{formatDateISO(item.vencimento)}</td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => onAuditar(item)}>
              Auditar
            </Button>
            {showExpurgar ? (
              <Button type="button" variant="secondary" onClick={() => onAbrirExpurgo(item)}>
                Expurgar
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 align-top last:border-b-0">
      <td className="px-3 py-3">
        {item.pessoa_id ? (
          <Link href={`/pessoas/${item.pessoa_id}?aba=financeiro`} className="font-medium text-slate-900 underline-offset-2 hover:text-slate-700 hover:underline">
            {item.pessoa_nome}
          </Link>
        ) : (
          <div className="font-medium text-slate-900">{item.pessoa_nome}</div>
        )}
        <div className="text-xs text-slate-500">#{item.cobranca_id}</div>
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
          {contextoLabel}
        </span>
        <div className="mt-1 text-xs text-slate-500">{item.centro_custo_nome ?? "Sem centro definido"}</div>
      </td>
      <OrigemCell item={item} />
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
          {showExpurgar ? (
            <Button type="button" variant="secondary" onClick={() => onAbrirExpurgo(item)}>
              Expurgar
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
  onExpurgoConcluido,
}: Props) {
  const [expurgoOpen, setExpurgoOpen] = useState(false);
  const [expurgoItem, setExpurgoItem] = useState<CobrancaListaItem | null>(null);
  const [expurgoMotivo, setExpurgoMotivo] = useState("");
  const [expurgoTipo, setExpurgoTipo] = useState<ExpurgoTipo>("ERRO_TECNICO");
  const [expurgoLoading, setExpurgoLoading] = useState(false);
  const [expurgoError, setExpurgoError] = useState<string | null>(null);

  function abrirExpurgo(item: CobrancaListaItem) {
    setExpurgoItem(item);
    setExpurgoMotivo("");
    setExpurgoTipo("ERRO_TECNICO");
    setExpurgoError(null);
    setExpurgoOpen(true);
  }

  async function confirmarExpurgo() {
    if (!expurgoItem) return;
    const motivo = expurgoMotivo.trim();
    if (!motivo) {
      setExpurgoError("Informe o motivo do expurgo.");
      return;
    }

    setExpurgoLoading(true);
    setExpurgoError(null);
    try {
      const response = await fetch("/api/financeiro/cobrancas/expurgar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_id: expurgoItem.cobranca_id,
          motivo,
          tipo: expurgoTipo,
        }),
      });
      const json = (await response.json().catch(() => null)) as ExpurgoResponse | null;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error ?? "erro_expurgar_cobranca");
      }
      setExpurgoOpen(false);
      setExpurgoItem(null);
      setExpurgoMotivo("");
      setExpurgoTipo("ERRO_TECNICO");
      onExpurgoConcluido();
    } catch (error) {
      setExpurgoError(error instanceof Error ? error.message : "erro_expurgar_cobranca");
    } finally {
      setExpurgoLoading(false);
    }
  }

  return (
    <>
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
                      onAbrirExpurgo={abrirExpurgo}
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

      <Dialog open={expurgoOpen} onOpenChange={setExpurgoOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader>
            <div className="border-b border-slate-100 px-6 py-5">
              <DialogTitle>Expurgar cobranca cancelada</DialogTitle>
              <DialogDescription>
                O expurgo remove a cobranca da leitura financeira principal e exige motivo auditavel.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Cobranca selecionada</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {expurgoItem ? `#${expurgoItem.cobranca_id} · ${expurgoItem.pessoa_nome}` : "--"}
              </div>
            </div>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Tipo do expurgo</span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                value={expurgoTipo}
                onChange={(event) => setExpurgoTipo(event.target.value as ExpurgoTipo)}
              >
                {Object.entries(EXPURGO_TIPO_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span>Motivo do expurgo</span>
              <Textarea
                className="min-h-28 border-slate-200 bg-white text-slate-900"
                value={expurgoMotivo}
                onChange={(event) => setExpurgoMotivo(event.target.value)}
                placeholder="Explique por que esta cobranca cancelada deve sair da leitura financeira."
              />
            </label>
            {expurgoError ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{expurgoError}</div> : null}
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={expurgoLoading}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" variant="secondary" onClick={() => void confirmarExpurgo()} disabled={expurgoLoading || !expurgoItem}>
                {expurgoLoading ? "Expurgando..." : "Confirmar expurgo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
