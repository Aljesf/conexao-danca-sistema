"use client";

import Link from "next/link";
import { useState } from "react";
import { CobrancaOperacionalActions } from "@/components/financeiro/cobrancas/CobrancaOperacionalActions";
import { ActionDropdown, type ActionDropdownItem } from "@/components/ui/ActionDropdown";
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
  ESCOLA: "bg-sky-50 text-sky-700 ring-sky-200",
  CAFE: "bg-amber-50 text-amber-700 ring-amber-200",
  LOJA: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OUTRO: "bg-slate-100 text-slate-600 ring-slate-200",
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  MATRICULA: "Matricula",
  MENSALIDADE: "Mensalidade",
  CURSO: "Curso",
  CAFE: "Cafe",
  LOJA: "Loja",
  AJUSTE: "Ajuste",
  PRO_RATA: "Entrada / Pro-rata",
  OUTRO: "Outro",
};

function humanizeToken(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function miniBadgeClass(tone: "neutral" | "warning" | "danger" | "success" = "neutral") {
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (tone === "danger") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function referenceLabel(item: CobrancaListaItem) {
  if (item.competencia_ano_mes && item.bucket) return `${item.competencia_ano_mes} / ${item.bucket}`;
  if (item.competencia_ano_mes) return item.competencia_ano_mes;
  if (item.bucket) return item.bucket;
  return "Sem recorte";
}

function statusLabel(item: CobrancaListaItem) {
  if (item.status_cobranca === "CANCELADA") return "Cancelada";
  if (item.status_interno) return humanizeToken(item.status_interno) ?? "Em revisao";
  if (item.status_cobranca) return humanizeToken(item.status_cobranca) ?? "Em revisao";
  return "Em revisao";
}

function situacaoBadge(item: CobrancaListaItem) {
  const bruto = (item.status_cobranca ?? "").toUpperCase();
  const interno = (item.status_interno ?? "EM_REVISAO").toUpperCase();
  if (bruto === "CANCELADA") return "bg-orange-50 text-orange-700 ring-orange-200";
  if (interno === "VENCIDA") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (interno === "QUITADA") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (interno === "EM_ABERTO") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function situacaoSecundaria(item: CobrancaListaItem) {
  if (item.status_cobranca === "CANCELADA") return "Fora da lista ativa, mas auditavel.";
  if (item.tipo_inconsistencia) return item.tipo_inconsistencia;
  if (item.status_interno === "QUITADA") {
    return item.ultima_data_recebimento ? `Recebida em ${formatDateISO(item.ultima_data_recebimento)}` : "Quitada";
  }
  if (item.atraso_dias > 0) return `${item.atraso_dias} dias em atraso`;
  return item.status_cobranca ? humanizeToken(item.status_cobranca) ?? item.status_cobranca : "Sem status bruto";
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

function origemLancamento(item: CobrancaListaItem) {
  const itemTipo = item.origemItemTipo ?? item.origem_item_tipo;
  if (itemTipo) {
    return ITEM_TYPE_LABELS[itemTipo] ?? humanizeToken(itemTipo) ?? "Origem em revisao";
  }
  if (item.origem_secundaria) {
    return item.origem_secundaria.replace(/^Lancamento:\s*/i, "").trim() || "Origem em revisao";
  }
  if (item.origem_subtipo) {
    return humanizeToken(item.origem_subtipo) ?? "Origem em revisao";
  }
  return "Origem em revisao";
}

function centroCustoLancamento(item: CobrancaListaItem) {
  return item.centro_custo_lancamento_nome ?? item.centro_custo_nome ?? "Centro em revisao";
}

function MetaItem({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={strong ? "mt-1 text-sm font-semibold text-slate-900" : "mt-1 text-sm text-slate-700"}>{value}</div>
    </div>
  );
}

function IdentityCell({ item }: { item: CobrancaListaItem }) {
  const alunoNome = item.alunoNome ?? "Aluno em revisao";
  const matriculaLabel = item.matriculaId ? `Matricula #${item.matriculaId}` : "Matricula em revisao";

  return (
    <td className="px-4 py-4 align-top">
      <div className="space-y-2">
        {item.pessoa_id ? (
          <Link
            href={`/pessoas/${item.pessoa_id}?aba=financeiro`}
            className="block text-base font-semibold text-slate-950 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            {item.pessoa_nome}
          </Link>
        ) : (
          <div className="text-base font-semibold text-slate-950">{item.pessoa_nome}</div>
        )}
        <div className="text-xs text-slate-500">{item.pessoa_id ? `Responsavel #${item.pessoa_id}` : "Responsavel sem ID"}</div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-100/60">
          <div className="text-sm font-medium text-slate-900">{alunoNome}</div>
          <div className="mt-1 text-xs text-slate-500">{matriculaLabel}</div>
        </div>
      </div>
    </td>
  );
}

function FinanceiroCell({ item, visao }: { item: CobrancaListaItem; visao: ContasReceberVisao }) {
  const valorPrincipal =
    visao === "RECEBIDAS"
      ? Math.max(item.valor_recebido_centavos, item.valor_centavos)
      : item.valor_aberto_centavos > 0
        ? item.valor_aberto_centavos
        : item.valor_centavos;
  const valorDescricao = visao === "RECEBIDAS" ? "Valor recebido" : "Saldo em aberto";
  const atrasoLabel = visao === "RECEBIDAS" ? "Historico" : item.atraso_dias > 0 ? `${item.atraso_dias} dias` : "No prazo";
  const vencimentoLabel = visao === "RECEBIDAS" ? formatDateISO(item.ultima_data_recebimento) : formatDateISO(item.vencimento);

  return (
    <td className="px-4 py-4 align-top">
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{valorDescricao}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatBRLFromCents(valorPrincipal)}</div>
          <div className="mt-1 text-xs text-slate-500">Valor original {formatBRLFromCents(item.valor_centavos)}</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <MetaItem label={visao === "RECEBIDAS" ? "Recebida em" : "Vencimento"} value={vencimentoLabel} />
          <MetaItem label={visao === "RECEBIDAS" ? "Referencia" : "Dias em atraso"} value={visao === "RECEBIDAS" ? referenceLabel(item) : atrasoLabel} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${situacaoBadge(item)}`}>
            {statusLabel(item)}
          </span>
          {item.tipo_inconsistencia ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${miniBadgeClass("warning")}`}>
              Em revisao
            </span>
          ) : null}
        </div>

        <div className="space-y-1 text-xs text-slate-500">
          <div>{situacaoSecundaria(item)}</div>
          <div>Competencia: {referenceLabel(item)}</div>
        </div>
      </div>
    </td>
  );
}

function OrigemCell({ item }: { item: CobrancaListaItem }) {
  const technical = item.origem_tecnica ?? origemBruta(item);
  const technicalVisible = technical && technical !== item.origem_label && technical !== item.origem_secundaria;
  const matriculaCancelada = item.matriculaStatus === "CANCELADA";

  return (
    <td className="px-4 py-4 align-top">
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-sm font-semibold text-slate-900">{origemPrincipalVisivel(item)}</div>
          <div className="mt-1 text-xs text-slate-500">Lancamento: {origemLancamento(item)}</div>
          <div className="mt-1 text-xs text-slate-500">Centro de custo: {centroCustoLancamento(item)}</div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${CONTEXTO_STYLES[item.contexto_principal]}`}>
            {getContextoLabel(item.contexto_principal)}
          </span>
          {item.origem_badge_label ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${miniBadgeClass(item.origem_badge_tone === "warning" ? "warning" : item.origem_badge_tone === "success" ? "success" : "neutral")}`}>
              {item.origem_badge_label}
            </span>
          ) : null}
          {matriculaCancelada ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${miniBadgeClass("danger")}`}>
              Matricula cancelada
            </span>
          ) : null}
        </div>

        <div className="space-y-1 text-xs text-slate-500">
          <div>{item.origem_secundaria ?? "Origem consolidada em revisao."}</div>
          {technicalVisible ? <div>{technical}</div> : null}
        </div>
      </div>
    </td>
  );
}

function ActionsCell({
  item,
  visao,
  onAuditar,
  onReceber,
  onAbrirExpurgo,
  onRefresh,
}: {
  item: CobrancaListaItem;
  visao: ContasReceberVisao;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
  onAbrirExpurgo: (item: CobrancaListaItem) => void;
  onRefresh: () => void;
}) {
  const showReceber =
    visao !== "RECEBIDAS" && item.valor_aberto_centavos > 0 && item.status_interno !== "QUITADA" && item.status_cobranca !== "CANCELADA";
  const showExpurgar = item.status_cobranca === "CANCELADA";
  const menuItems: ActionDropdownItem[] = [
    {
      key: "auditar",
      label: "Auditar",
      onSelect: () => onAuditar(item),
    },
  ];

  if (showExpurgar) {
    menuItems.push({
      key: "expurgar",
      label: "Expurgar",
      tone: "danger",
      onSelect: () => onAbrirExpurgo(item),
    });
  }

  if (visao === "RECEBIDAS") {
    return (
      <td className="px-4 py-4 align-top">
        <div className="flex flex-col items-end gap-2">
          <ActionDropdown items={menuItems} compact />
          <div className="text-[11px] text-slate-400">Titulo #{item.cobranca_id}</div>
        </div>
      </td>
    );
  }

  return (
    <td className="px-4 py-4 align-top">
      <div className="flex flex-col items-end gap-2">
        {showReceber ? (
          <Button type="button" className="h-9 min-w-28" onClick={() => onReceber(item)}>
            Receber
          </Button>
        ) : null}
        <CobrancaOperacionalActions
          cobrancaId={item.cobranca_id}
          descricao={item.origem_label}
          origemLabel={item.origemLabel}
          status={item.status_cobranca}
          vencimento={item.vencimento}
          vencimentoOriginal={item.vencimentoOriginal}
          vencimentoAjustadoEm={item.vencimentoAjustadoEm}
          vencimentoAjusteMotivo={item.vencimentoAjusteMotivo}
          canceladaEm={item.canceladaEm}
          cancelamentoTipo={item.cancelamentoTipo}
          matriculaStatus={item.matriculaStatus}
          matriculaCancelamentoTipo={item.matriculaCancelamentoTipo}
          compact
          mode="dropdown"
          extraDropdownItems={menuItems}
          showStatusHints={false}
          onSuccess={onRefresh}
        />
        <div className="text-[11px] text-slate-400">Titulo #{item.cobranca_id}</div>
      </div>
    </td>
  );
}

function TableHeader() {
  return (
    <tr className="border-b border-slate-100 text-left text-[10px] uppercase tracking-[0.22em] text-slate-500">
      <th className="px-4 py-3 font-medium">Identidade</th>
      <th className="px-4 py-3 font-medium">Financeiro</th>
      <th className="px-4 py-3 font-medium">Origem</th>
      <th className="px-4 py-3 font-medium text-right">Acoes</th>
    </tr>
  );
}

function Row({
  item,
  visao,
  onAuditar,
  onReceber,
  onAbrirExpurgo,
  onRefresh,
}: {
  item: CobrancaListaItem;
  visao: ContasReceberVisao;
  onAuditar: (item: CobrancaListaItem) => void;
  onReceber: (item: CobrancaListaItem) => void;
  onAbrirExpurgo: (item: CobrancaListaItem) => void;
  onRefresh: () => void;
}) {
  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/70 last:border-b-0">
      <IdentityCell item={item} />
      <FinanceiroCell item={item} visao={visao} />
      <OrigemCell item={item} />
      <ActionsCell
        item={item}
        visao={visao}
        onAuditar={onAuditar}
        onReceber={onReceber}
        onAbrirExpurgo={onAbrirExpurgo}
        onRefresh={onRefresh}
      />
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
                <TableHeader />
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
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
                      onRefresh={onExpurgoConcluido}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Pagina {page} de {totalPages} / {total} registro(s)
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
                {expurgoItem ? `#${expurgoItem.cobranca_id} - ${expurgoItem.pessoa_nome}` : "--"}
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
