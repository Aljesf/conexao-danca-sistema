"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { CobrancasCompetenciaCard } from "@/components/financeiro/credito-conexao/CobrancasCompetenciaCard";
import { CobrancasMensaisResumo } from "@/components/financeiro/credito-conexao/CobrancasMensaisResumo";
import { CompetenciaTabs } from "@/components/financeiro/credito-conexao/CompetenciaTabs";
import { VincularCobrancaFaturaDialog } from "@/components/financeiro/credito-conexao/VincularCobrancaFaturaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function mensagemErroCobrancas(): string {
  return "Nao foi possivel carregar a carteira operacional agora. Atualize a pagina ou tente novamente em instantes.";
}

function mensagemErroPagamento(): string {
  return "Nao foi possivel registrar o recebimento agora. Revise os dados e tente novamente.";
}

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
  const [statusOperacional, setStatusOperacional] = useState("TODOS");
  const [statusNeofin, setStatusNeofin] = useState("TODOS");
  const [competenciaAtiva, setCompetenciaAtiva] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<CobrancasMensaisResponse | null>(null);
  const [modalPagamento, setModalPagamento] = useState<CobrancaOperacionalItem | null>(null);
  const [modalVinculo, setModalVinculo] = useState<CobrancaOperacionalItem | null>(null);
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
        params.set("limite", "36");
        if (buscaDiferida.trim()) params.set("q", buscaDiferida.trim());
        if (statusOperacional !== "TODOS") params.set("status_operacional", statusOperacional);
        if (statusNeofin !== "TODOS") params.set("status_neofin", statusNeofin);

        const response = await fetch(`/api/financeiro/credito-conexao/cobrancas?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await response.json().catch(() => null)) as ApiResponse | null;

        if (!response.ok || !json?.ok) {
          setData(null);
          setErro(mensagemErroCobrancas());
          return;
        }

        setData(json);
      } catch (error: unknown) {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        setData(null);
        setErro(mensagemErroCobrancas());
      } finally {
        setLoading(false);
      }
    }

    void carregar();

    return () => controller.abort();
  }, [buscaDiferida, reloadToken, statusNeofin, statusOperacional]);

  useEffect(() => {
    const disponiveis = data?.competencias_disponiveis ?? [];
    if (disponiveis.length === 0) {
      setCompetenciaAtiva(null);
      return;
    }

    if (competenciaAtiva && disponiveis.some((item) => item.competencia === competenciaAtiva)) {
      return;
    }

    setCompetenciaAtiva(data?.competencia_ativa_padrao ?? disponiveis[0]?.competencia ?? null);
  }, [competenciaAtiva, data]);

  const competenciaAtual = useMemo(() => {
    if (!competenciaAtiva) return data?.meses[0] ?? null;
    return data?.meses.find((mes) => mes.competencia === competenciaAtiva) ?? data?.meses[0] ?? null;
  }, [competenciaAtiva, data]);

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
          mensagem: json?.message ?? mensagemErroPagamento(),
        });
        return;
      }

      setFeedback({
        tipo: "sucesso",
        mensagem: json.message ?? `Recebimento registrado para a cobranca #${modalPagamento.cobranca_id}.`,
      });
      setModalPagamento(null);
      setReloadToken((current) => current + 1);
    } catch {
      setFeedback({
        tipo: "erro",
        mensagem: mensagemErroPagamento(),
      });
    } finally {
      setSavingPagamento(false);
    }
  }

  function limparFiltros() {
    setBusca("");
    setStatusOperacional("TODOS");
    setStatusNeofin("TODOS");
  }

  return (
    <FinancePageShell
      title="Conta Interna Aluno - Carteira operacional"
      subtitle="Visao mensal SaaS da carteira do aluno com mensalidades, avulsas, cobrancas sem NeoFin e ajuste manual de vinculo."
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
            A carteira inclui mensalidades, avulsas e cobrancas sem NeoFin. NeoFin e camada operacional de cobranca, nao
            criterio de existencia da divida. O vinculo manual com fatura deve ser usado como recurso administrativo
            excepcional.
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, ID ou referencia"
              disabled={loading}
            />

            <select
              value={statusOperacional}
              onChange={(event) => setStatusOperacional(event.target.value)}
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
              onChange={(event) => setStatusNeofin(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Situacao NeoFin: todas</option>
              <option value="VINCULADA">Em cobranca NeoFin</option>
              <option value="NAO_VINCULADA">Sem vinculo NeoFin</option>
              <option value="FALHA_INTEGRACAO">Falha de integracao</option>
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

      <CompetenciaTabs
        items={data?.competencias_disponiveis ?? []}
        active={competenciaAtiva}
        onChange={setCompetenciaAtiva}
      />

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Competencia ativa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && !data ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              Carregando carteira operacional...
            </div>
          ) : null}

          {!loading && !competenciaAtual ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              Nenhuma cobranca encontrada para o filtro atual.
            </div>
          ) : null}

          {competenciaAtual ? (
            <CobrancasCompetenciaCard
              competencia={competenciaAtual}
              onRegistrarRecebimento={abrirModalPagamento}
              onVincularFatura={setModalVinculo}
            />
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

      <VincularCobrancaFaturaDialog
        item={modalVinculo}
        open={Boolean(modalVinculo)}
        onClose={() => setModalVinculo(null)}
        onSuccess={(mensagem) => {
          setFeedback({ tipo: "sucesso", mensagem });
          setReloadToken((current) => current + 1);
        }}
      />
    </FinancePageShell>
  );
}
