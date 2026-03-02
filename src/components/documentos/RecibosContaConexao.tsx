"use client";

import { useEffect, useState } from "react";
import { ReciboModal, type ReciboModalParams } from "@/components/documentos/ReciboModal";

type FaturaItem = {
  fatura_id: number;
  competencia_ano_mes: string;
  valor_total_centavos: number;
  status_fatura: string;
  data_fechamento: string | null;
};

type FaturaApiRaw = {
  id?: number;
  fatura_id?: number;
  periodo_referencia?: string;
  competencia_ano_mes?: string;
  valor_total_centavos?: number;
  status?: string;
  status_fatura?: string;
  data_fechamento?: string | null;
};

function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function toCentavos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function mapRawFatura(raw: FaturaApiRaw): FaturaItem | null {
  const faturaId = toPositiveInt(raw.fatura_id ?? raw.id);
  if (!faturaId) return null;
  return {
    fatura_id: faturaId,
    competencia_ano_mes: toText(raw.competencia_ano_mes ?? raw.periodo_referencia) || "-",
    valor_total_centavos: toCentavos(raw.valor_total_centavos),
    status_fatura: toText(raw.status_fatura ?? raw.status) || "-",
    data_fechamento: raw.data_fechamento ?? null,
  };
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
      const r = await fetch(`/api/financeiro/credito-conexao/faturas?titular_pessoa_id=${pessoaTitularId}`, {
        cache: "no-store",
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; faturas?: FaturaApiRaw[] };
      if (!r.ok) {
        setErro(data?.error ?? "falha_ao_carregar_faturas");
        return;
      }

      const mapped = (data?.faturas ?? [])
        .map(mapRawFatura)
        .filter((x): x is FaturaItem => Boolean(x))
        .sort((a, b) => (b.data_fechamento ?? "").localeCompare(a.data_fechamento ?? ""));
      setFaturas(mapped);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setLoading(false);
    }
  }

  function abrirModalRecibo(competencia: string) {
    setErro(null);
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      setErro("competencia_invalida_para_preview");
      return;
    }
    setReciboParams({
      tipo: "CONTA_INTERNA",
      competencia,
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
          <h3 className="text-base font-semibold">Recibos da conta (por competencia)</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere recibo/demonstrativo da conta interna do titular por competencia, com itens discriminados.
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
              <th className="py-2 text-left">Competencia</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Total</th>
              <th className="py-2 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((f) => (
              <tr key={f.fatura_id} className="border-t">
                <td className="py-2">{f.competencia_ano_mes}</td>
                <td className="py-2">{f.status_fatura}</td>
                <td className="py-2 text-right">
                  {(f.valor_total_centavos / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="py-2 text-right">
                  <button
                    className="rounded-md bg-black px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={loading}
                    onClick={() => abrirModalRecibo(f.competencia_ano_mes)}
                  >
                    Recibo
                  </button>
                </td>
              </tr>
            ))}
            {faturas.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted-foreground">
                  Nenhuma fatura encontrada para este titular.
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
