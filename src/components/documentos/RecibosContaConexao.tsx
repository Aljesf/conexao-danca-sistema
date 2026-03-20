"use client";

import { useEffect, useState } from "react";
import { ReciboModal, type ReciboModalParams } from "@/components/documentos/ReciboModal";

type FaturaItem = {
  faturaId: number;
  contaInternaId: number | null;
  contaInternaDescricao: string | null;
  competenciaAnoMes: string;
  status: string | null;
  totalCentavos: number;
  cobrancaFaturaId: number | null;
  neofinInvoiceId: string | null;
  houveGeracaoNeoFin: boolean;
  dataFechamento: string | null;
  dataVencimento: string | null;
  itens: Array<{
    lancamentoId: number;
    descricao: string | null;
    referenciaItem: string | null;
    valorCentavos: number;
    alunoIds: number[];
    alunoNomes: string[];
    matriculaIds: number[];
  }>;
};

type FaturasApiResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  faturas?: FaturaItem[];
};

function formatarMoeda(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function mensagemErroFaturas(): string {
  return "Nao foi possivel carregar os recibos da conta interna.";
}

function statusNeoFin(fatura: FaturaItem): string {
  return fatura.houveGeracaoNeoFin ? "Cobranca NeoFin gerada" : "Cobranca NeoFin nao gerada";
}

export function RecibosContaConexao(props: { pessoaTitularId: number }) {
  const { pessoaTitularId } = props;

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [faturas, setFaturas] = useState<FaturaItem[]>([]);
  const [reciboOpen, setReciboOpen] = useState(false);
  const [reciboParams, setReciboParams] = useState<ReciboModalParams | null>(null);

  async function carregarFaturas() {
    setErro(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/financeiro/credito-conexao/faturas?titular_pessoa_id=${pessoaTitularId}`, {
        cache: "no-store",
      });
      const json = (await response.json().catch(() => null)) as FaturasApiResponse | null;

      if (!response.ok || !json?.ok) {
        setFaturas([]);
        setErro(json?.message ?? mensagemErroFaturas());
        return;
      }

      const lista = [...(json.faturas ?? [])].sort((a, b) => {
        const byCompetencia = (b.competenciaAnoMes ?? "").localeCompare(a.competenciaAnoMes ?? "");
        if (byCompetencia !== 0) return byCompetencia;
        return b.faturaId - a.faturaId;
      });

      setFaturas(lista);
    } catch {
      setFaturas([]);
      setErro(mensagemErroFaturas());
    } finally {
      setLoading(false);
    }
  }

  function abrirModalRecibo(competenciaAnoMes: string) {
    setErro(null);
    if (!competenciaAnoMes || !/^\d{4}-\d{2}$/.test(competenciaAnoMes)) {
      setErro("Nao foi possivel abrir o recibo desta competencia.");
      return;
    }

    setReciboParams({
      tipo: "CONTA_INTERNA",
      competencia: competenciaAnoMes,
      responsavel_pessoa_id: pessoaTitularId,
    });
    setReciboOpen(true);
  }

  useEffect(() => {
    void carregarFaturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoaTitularId]);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Recibos da conta interna (por competencia)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Recibos emitidos a partir das faturas internas e de seus itens vinculados.
          </p>
        </div>

        <button className="rounded-md border px-3 py-2 text-sm" onClick={carregarFaturas} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {erro ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Fatura interna</th>
              <th className="py-2 text-left">Competencia</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">NeoFin</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((fatura) => (
              <tr key={fatura.faturaId} className="border-t">
                <td className="py-2">
                  <div className="font-medium text-slate-900">#{fatura.faturaId}</div>
                  <div className="text-xs text-slate-500">
                    {fatura.contaInternaId ? `Conta interna #${fatura.contaInternaId}` : "Conta interna nao resolvida"}
                    {fatura.itens.length > 0 ? ` | ${fatura.itens.length} item(ns)` : ""}
                  </div>
                </td>
                <td className="py-2">{fatura.competenciaAnoMes}</td>
                <td className="py-2">{fatura.status ?? "Sem status"}</td>
                <td className="py-2">
                  <div>{statusNeoFin(fatura)}</div>
                  {fatura.neofinInvoiceId ? (
                    <div className="text-xs text-slate-500">Invoice {fatura.neofinInvoiceId}</div>
                  ) : null}
                </td>
                <td className="py-2 text-right">{formatarMoeda(fatura.totalCentavos)}</td>
                <td className="py-2 text-right">
                  <button
                    className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={loading}
                    onClick={() => abrirModalRecibo(fatura.competenciaAnoMes)}
                  >
                    Recibo
                  </button>
                </td>
              </tr>
            ))}

            {!loading && faturas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">
                  Nenhuma fatura interna encontrada para este responsavel.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ReciboModal
        open={reciboOpen}
        onClose={() => setReciboOpen(false)}
        params={reciboParams}
        title="Recibo da conta interna"
      />
    </div>
  );
}
