"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CobrancasCompetenciaCard } from "@/components/financeiro/credito-conexao/CobrancasCompetenciaCard";
import { CobrancasMensaisResumo } from "@/components/financeiro/credito-conexao/CobrancasMensaisResumo";
import {
  type CobrancaOperacionalItem,
  type CobrancasMensaisResponse,
} from "@/lib/financeiro/creditoConexao/cobrancas";

type ApiResponse = CobrancasMensaisResponse & {
  ok: boolean;
  error?: string;
  detail?: string | null;
};

type FeedbackState = {
  tipo: "sucesso" | "erro";
  mensagem: string;
} | null;

type PagamentoResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  detail?: string | null;
};

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

type PagamentoModalProps = {
  item: CobrancaOperacionalItem | null;
  open: boolean;
  dataPagamento: string;
  metodoPagamento: "PIX" | "DINHEIRO";
  loading: boolean;
  onClose: () => void;
  onChangeData: (value: string) => void;
  onChangeMetodo: (value: "PIX" | "DINHEIRO") => void;
  onConfirm: () => void;
};

function PagamentoModal({
  item,
  open,
  dataPagamento,
  metodoPagamento,
  loading,
  onClose,
  onChangeData,
  onChangeMetodo,
  onConfirm,
}: PagamentoModalProps) {
  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Registrar recebimento</h2>
            <p className="mt-1 text-sm text-slate-600">{item.pessoa_label}</p>
            <p className="text-sm text-slate-500">{item.origem_referencia_label}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={loading}
          >
            Fechar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Data do pagamento</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={dataPagamento}
              onChange={(event) => onChangeData(event.target.value)}
              disabled={loading}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Metodo</span>
            <select
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={metodoPagamento}
              onChange={(event) => onChangeMetodo(event.target.value === "DINHEIRO" ? "DINHEIRO" : "PIX")}
              disabled={loading}
            >
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Registrando..." : "Confirmar recebimento"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCreditoConexaoCobrancasPage() {
  const [busca, setBusca] = useState("");
  const [competencia, setCompetencia] = useState("TODOS");
  const [statusOperacional, setStatusOperacional] = useState("TODOS");
  const [statusNeofin, setStatusNeofin] = useState("TODOS");
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<CobrancasMensaisResponse | null>(null);
  const [modalPagamento, setModalPagamento] = useState<CobrancaOperacionalItem | null>(null);
  const [dataPagamento, setDataPagamento] = useState(localTodayIso());
  const [metodoPagamento, setMetodoPagamento] = useState<"PIX" | "DINHEIRO">("PIX");
  const [savingPagamento, setSavingPagamento] = useState(false);

  const buscaDiferida = useDeferredValue(busca);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setLoading(true);
      setErro(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(pagina));
        params.set("limite", "6");
        if (buscaDiferida.trim()) params.set("q", buscaDiferida.trim());
        if (competencia !== "TODOS") params.set("competencia", competencia);
        if (statusOperacional !== "TODOS") params.set("status_operacional", statusOperacional);
        if (statusNeofin !== "TODOS") params.set("status_neofin", statusNeofin);

        const response = await fetch(`/api/financeiro/credito-conexao/cobrancas?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as ApiResponse | null;

        if (!response.ok || !json?.ok) {
          setData(null);
          setErro(json?.detail ?? json?.error ?? "falha_carregar_cobrancas");
          return;
        }

        setData(json);
      } catch (error) {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        setData(null);
        setErro(error instanceof Error ? error.message : "falha_inesperada");
      } finally {
        setLoading(false);
      }
    }

    void carregar();

    return () => controller.abort();
  }, [buscaDiferida, competencia, pagina, reloadToken, statusNeofin, statusOperacional]);

  const totalPaginas = useMemo(() => {
    const total = data?.paginacao.total ?? 0;
    const limite = data?.paginacao.limite ?? 6;
    return Math.max(1, Math.ceil(total / limite));
  }, [data?.paginacao.limite, data?.paginacao.total]);

  function abrirModalPagamento(item: CobrancaOperacionalItem) {
    setModalPagamento(item);
    setDataPagamento(localTodayIso());
    setMetodoPagamento("PIX");
  }

  async function confirmarPagamento() {
    if (!modalPagamento) return;

    setSavingPagamento(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/financeiro/cobrancas/registrar-pagamento-presencial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cobranca_id: modalPagamento.cobranca_id,
          data_pagamento: dataPagamento,
          metodo_pagamento: metodoPagamento,
        }),
      });

      const json = (await response.json().catch(() => null)) as PagamentoResponse | null;

      if (!response.ok || !json?.ok) {
        setFeedback({
          tipo: "erro",
          mensagem: json?.detail ?? json?.message ?? json?.error ?? "Falha ao registrar recebimento.",
        });
        return;
      }

      setFeedback({
        tipo: "sucesso",
        mensagem: json.message ?? `Recebimento registrado para a cobranca #${modalPagamento.cobranca_id}.`,
      });
      setModalPagamento(null);
      setReloadToken((current) => current + 1);
    } catch (error) {
      setFeedback({
        tipo: "erro",
        mensagem: error instanceof Error ? error.message : "Falha inesperada ao registrar recebimento.",
      });
    } finally {
      setSavingPagamento(false);
    }
  }

  function limparFiltros() {
    setBusca("");
    setCompetencia("TODOS");
    setStatusOperacional("TODOS");
    setStatusNeofin("TODOS");
    setPagina(1);
  }

  return (
    <FinancePageShell
      title="Cartao Conexao - Cobrancas (Aluno)"
      subtitle="Visao mensal e operacional da carteira do aluno, organizada por competencia, risco e proxima acao."
      actions={
        <Button type="button" variant="secondary" onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      }
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Filtros operacionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
            Leia primeiro o mes, depois o risco e por fim a acao. A carteira agora prioriza vencidos, a vencer e pagos em
            blocos separados.
          </div>

          {feedback ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.tipo === "sucesso"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {feedback.mensagem}
            </div>
          ) : null}

          {erro ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input
              value={busca}
              onChange={(event) => {
                setPagina(1);
                setBusca(event.target.value);
              }}
              placeholder="Buscar por nome, ID ou referencia"
              disabled={loading}
            />

            <select
              value={competencia}
              onChange={(event) => {
                setPagina(1);
                setCompetencia(event.target.value);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Competencia: todas</option>
              {(data?.competencias_disponiveis ?? []).map((item) => (
                <option key={item.competencia} value={item.competencia}>
                  {item.competencia_label}
                </option>
              ))}
            </select>

            <select
              value={statusOperacional}
              onChange={(event) => {
                setPagina(1);
                setStatusOperacional(event.target.value);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Status operacional: todos</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE_A_VENCER">Pendente a vencer</option>
              <option value="PENDENTE_VENCIDO">Pendente vencido</option>
            </select>

            <select
              value={statusNeofin}
              onChange={(event) => {
                setPagina(1);
                setStatusNeofin(event.target.value);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Status NeoFin: todos</option>
              <option value="COM_NEOFIN">Com NeoFin</option>
              <option value="SEM_NEOFIN">Sem NeoFin</option>
            </select>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={limparFiltros} disabled={loading}>
                Limpar filtros
              </Button>
              <Button type="button" variant="secondary" onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>
                Recarregar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {data ? <CobrancasMensaisResumo resumo={data.resumo_geral} /> : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Carteira por competencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && !data ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Carregando cobrancas...</div>
          ) : null}

          {!loading && (data?.meses.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              Nenhuma cobranca encontrada para o filtro atual.
            </div>
          ) : null}

          {(data?.meses ?? []).map((mes) => (
            <CobrancasCompetenciaCard
              key={mes.competencia}
              competencia={mes}
              onRegistrarRecebimento={abrirModalPagamento}
            />
          ))}

          {data && data.paginacao.total > 1 ? (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Pagina {data.paginacao.pagina} de {totalPaginas} competencias
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPagina((current) => Math.max(1, current - 1))}
                  disabled={loading || pagina <= 1}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPagina((current) => Math.min(totalPaginas, current + 1))}
                  disabled={loading || pagina >= totalPaginas}
                >
                  Proxima
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PagamentoModal
        item={modalPagamento}
        open={Boolean(modalPagamento)}
        dataPagamento={dataPagamento}
        metodoPagamento={metodoPagamento}
        loading={savingPagamento}
        onClose={() => setModalPagamento(null)}
        onChangeData={setDataPagamento}
        onChangeMetodo={setMetodoPagamento}
        onConfirm={() => void confirmarPagamento()}
      />
    </FinancePageShell>
  );
}
