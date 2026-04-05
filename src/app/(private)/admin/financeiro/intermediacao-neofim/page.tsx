"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CaretDown,
  CaretRight,
  Link as LinkIcon,
  Copy,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { formatBRLFromCentavos } from "@/lib/formatters";

// ── Types ──

type Lancamento = {
  id: number;
  descricao: string;
  origem_sistema: string;
  valor_centavos: number;
  data_lancamento: string;
};

type Fatura = {
  periodo_referencia: string;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
};

type Cobranca = {
  id: number;
  descricao: string;
  valor_centavos: number;
  vencimento: string;
  status: string;
  neofin_charge_id: string;
  link_pagamento: string | null;
  origem_id: number | null;
  responsavel: { nome: string; cpf: string };
  fatura: Fatura | null;
  lancamentos: Lancamento[];
  alunos_vinculados: { id: string; nome: string }[];
};

// ── Helpers ──

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").padStart(11, "0");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatPeriodo(ref: string | null | undefined): string {
  if (!ref) return "—";
  const [y, m] = ref.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = parseInt(m, 10) - 1;
  return `${meses[idx] ?? m}/${y}`;
}

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PAGO: "bg-emerald-100 text-emerald-800 border-emerald-300",
  RECEBIDO: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELADO: "bg-gray-100 text-gray-600 border-gray-300",
  VENCIDO: "bg-orange-100 text-orange-800 border-orange-300",
};

const ORIGEM_BADGE: Record<string, string> = {
  LOJA: "bg-blue-100 text-blue-800",
  CAFE: "bg-amber-100 text-amber-800",
  ESCOLA: "bg-purple-100 text-purple-800",
  MATRICULA: "bg-emerald-100 text-emerald-800",
};

// ── Toast component ──

type ToastData = { message: string; type: "success" | "error" };

function Toast({ data, onClose }: { data: ToastData; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg = data.type === "success" ? "bg-emerald-600" : "bg-rose-600";

  return (
    <div className={`fixed top-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${bg}`}>
      {data.message}
    </div>
  );
}

// ── Main page ──

export default function IntermediacacoNeofimPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<ToastData | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const buscaTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const [buscaDebounced, setBuscaDebounced] = useState("");

  // Modal de cancelamento
  const [cancelTarget, setCancelTarget] = useState<Cobranca | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Debounce da busca
  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => setBuscaDebounced(busca), 400);
    return () => { if (buscaTimer.current) clearTimeout(buscaTimer.current); };
  }, [busca]);

  // ── Fetch data ──

  const fetchData = useCallback(async (params?: {
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    busca?: string;
  }) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      const s = params?.status || statusFilter;
      const di = params?.data_inicio ?? dataInicio;
      const df = params?.data_fim ?? dataFim;
      const b = params?.busca ?? buscaDebounced;

      if (s) qs.set("status", s);
      if (di) qs.set("data_inicio", di);
      if (df) qs.set("data_fim", df);
      if (b) qs.set("busca", b);

      const res = await fetch(`/api/financeiro/intermediacao-neofim/listar?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Erro ao carregar cobranças.");
        setCobrancas([]);
      } else {
        setCobrancas(json.cobrancas ?? []);
      }
    } catch {
      setError("Falha de rede ao carregar cobranças.");
      setCobrancas([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dataInicio, dataFim, buscaDebounced]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Sync ──

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/financeiro/intermediacao-neofim/poll-manual", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        setToast({ message: `Sincronização concluída — ${json.atualizadas} atualizada(s), ${json.erros} erro(s).`, type: "success" });
        fetchData();
      } else {
        setToast({ message: json.error || "Erro na sincronização.", type: "error" });
      }
    } catch {
      setToast({ message: "Falha de rede na sincronização.", type: "error" });
    } finally {
      setSyncing(false);
    }
  }

  // ── Cancel ──

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/financeiro/intermediacao-neofim/cancelar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_identifier: cancelTarget.neofin_charge_id,
          cobranca_id: cancelTarget.id,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setToast({ message: "Cobrança cancelada com sucesso.", type: "success" });
        setCancelTarget(null);
        fetchData();
      } else {
        setToast({ message: json.error || "Erro ao cancelar cobrança.", type: "error" });
      }
    } catch {
      setToast({ message: "Falha de rede ao cancelar.", type: "error" });
    } finally {
      setCancelling(false);
    }
  }

  // ── Copy link ──

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setToast({ message: "Link copiado!", type: "success" });
    });
  }

  // ── Toggle row ──

  function toggleRow(id: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">

        {/* ── Toast ── */}
        {toast && <Toast data={toast} onClose={() => setToast(null)} />}

        {/* ── 1. Card de contexto ── */}
        <Card>
          <CardContent className="flex flex-col gap-2 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Intermediação Neofim</h1>
              <p className="mt-1 text-sm text-slate-600">
                Gerencie as cobranças enviadas à Neofim — visualize responsáveis, alunos vinculados e a composição de cada fatura.
              </p>
              <span className="mt-2 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-0.5 text-xs font-medium text-violet-700">
                Conta Interna Aluno · Boletos e PIX
              </span>
            </div>
            <Button
              className="mt-3 shrink-0 md:mt-0"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? "Sincronizando…" : "🔄 Sincronizar agora"}
            </Button>
          </CardContent>
        </Card>

        {/* ── 2. Card "Entenda esta tela" ── */}
        <FinanceHelpCard
          items={[
            "Cada linha representa uma cobrança enviada à Neofim para um responsável financeiro.",
            "Expanda a linha para ver os alunos vinculados e os lançamentos que compõem a fatura.",
            "Use Cancelar para encerrar uma cobrança pendente diretamente daqui, sem acessar o painel Neofim.",
            "Sincronizar agora força a atualização dos links de pagamento sem esperar o ciclo automático de 6 horas.",
          ]}
        />

        {/* ── 3. Card de filtros ── */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Status</label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="PAGO">PAGO</option>
                  <option value="CANCELADO">CANCELADO</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Vencimento de</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Vencimento até</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-500">Buscar por responsável ou aluno</label>
                <Input
                  type="text"
                  placeholder="Nome..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => fetchData()}>Filtrar</Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. Card de listagem ── */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                Carregando cobranças…
              </div>
            ) : error ? (
              <div className="m-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : cobrancas.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500">
                Nenhuma cobrança encontrada para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="w-8 px-4 py-3" />
                      <th className="px-4 py-3">Responsável</th>
                      <th className="px-4 py-3">CPF</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-center">Vencimento</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrancas.map((c) => {
                      const expanded = expandedRows.has(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          cobranca={c}
                          expanded={expanded}
                          onToggle={() => toggleRow(c.id)}
                          onCopy={copyLink}
                          onCancel={() => setCancelTarget(c)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 5. Modal de cancelamento ── */}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-900">Cancelar cobrança</h2>
              <p className="mt-2 text-sm text-slate-600">
                Tem certeza que deseja cancelar a cobrança de{" "}
                <strong>{cancelTarget.responsavel.nome}</strong> referente ao período{" "}
                <strong>{formatPeriodo(cancelTarget.fatura?.periodo_referencia)}</strong>?
                Esta ação será enviada diretamente à Neofim.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>
                  Voltar
                </Button>
                <Button
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelando…" : "Confirmar cancelamento"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Table row (main + expanded) ──

function TableRow({
  cobranca: c,
  expanded,
  onToggle,
  onCopy,
  onCancel,
}: {
  cobranca: Cobranca;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (link: string) => void;
  onCancel: () => void;
}) {
  const badgeCls = STATUS_BADGE[c.status] ?? "bg-slate-100 text-slate-600 border-slate-300";
  const canCancel = c.status === "PENDENTE" || c.status === "VENCIDO";

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/60"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-slate-400">
          {expanded ? <CaretDown size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
        </td>
        <td className="px-4 py-3 font-medium text-slate-800">{c.responsavel.nome}</td>
        <td className="px-4 py-3 text-slate-600">{c.responsavel.cpf ? formatCPF(c.responsavel.cpf) : "—"}</td>
        <td className="px-4 py-3 text-slate-600">{formatPeriodo(c.fatura?.periodo_referencia)}</td>
        <td className="px-4 py-3 text-right font-medium text-slate-800">{formatBRLFromCentavos(c.valor_centavos)}</td>
        <td className="px-4 py-3 text-center text-slate-600">{formatDate(c.vencimento)}</td>
        <td className="px-4 py-3">
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeCls}`}>
            {c.status}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {c.link_pagamento && (
              <>
                <button
                  title="Abrir link de pagamento"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-violet-600"
                  onClick={() => window.open(c.link_pagamento!, "_blank")}
                >
                  <LinkIcon size={18} weight="regular" />
                </button>
                <button
                  title="Copiar link"
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-violet-600"
                  onClick={() => onCopy(c.link_pagamento!)}
                >
                  <Copy size={18} weight="regular" />
                </button>
              </>
            )}
            {canCancel && (
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                onClick={onCancel}
              >
                Cancelar
              </button>
            )}
            {c.status === "CANCELADO" && (
              <button
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                disabled
              >
                Reabrir
              </button>
            )}
            <button
              title="Abrir no painel Neofim"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-violet-600"
              onClick={() => window.open("https://app.neofin.com.br", "_blank")}
            >
              <ArrowSquareOut size={18} weight="regular" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-slate-100">
          <td colSpan={8} className="bg-slate-50/30 p-0">
            <ExpandedContent cobranca={c} />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Expanded content ──

function ExpandedContent({ cobranca: c }: { cobranca: Cobranca }) {
  const subtotalLanc = c.lancamentos.reduce((acc, l) => acc + (l.valor_centavos ?? 0), 0);

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2">
      {/* Bloco A — Alunos vinculados */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">👥 Alunos vinculados</h3>
        {c.alunos_vinculados.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum aluno ativo vinculado a este responsável.</p>
        ) : (
          <ul className="space-y-1">
            {c.alunos_vinculados.map((a) => (
              <li key={a.id} className="text-sm text-slate-700">• {a.nome}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Bloco B — Composição da fatura */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          🧾 Composição da fatura — {formatPeriodo(c.fatura?.periodo_referencia)}
        </h3>

        {c.lancamentos.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum lançamento encontrado.</p>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                  <th className="py-1.5 pr-2">Descrição</th>
                  <th className="py-1.5 pr-2">Origem</th>
                  <th className="py-1.5 pr-2">Data</th>
                  <th className="py-1.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {c.lancamentos.map((l) => {
                  const origemCls = ORIGEM_BADGE[l.origem_sistema?.toUpperCase()] ?? "bg-slate-100 text-slate-600";
                  return (
                    <tr key={l.id} className="border-b border-slate-100">
                      <td className="py-1.5 pr-2 text-slate-700">{l.descricao}</td>
                      <td className="py-1.5 pr-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${origemCls}`}>
                          {l.origem_sistema ?? "—"}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2 text-slate-600">{formatDate(l.data_lancamento)}</td>
                      <td className="py-1.5 text-right font-medium text-slate-800">
                        {formatBRLFromCentavos(l.valor_centavos)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-2 space-y-0.5 border-t border-slate-200 pt-2 text-xs text-slate-700">
              <p>Subtotal lançamentos: {formatBRLFromCentavos(subtotalLanc)}</p>
              <p>Taxas: {formatBRLFromCentavos(c.fatura?.valor_taxas_centavos ?? 0)}</p>
              <p className="font-semibold">
                Total da fatura: {formatBRLFromCentavos(c.fatura?.valor_total_centavos ?? 0)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
