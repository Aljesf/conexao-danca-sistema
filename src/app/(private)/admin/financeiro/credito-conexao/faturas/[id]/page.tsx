"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Fatura = any;

export default function DetalheFaturaCreditoConexaoPage() {
  const params = useParams();
  const faturaId = Number(params?.id);

  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function fmtMoney(centavos: number) {
    return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function fmtDate(d: string | null) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("pt-BR");
  }

  const comprasCentavos = useMemo(() => {
    if (!fatura) return 0;
    const total = Number(fatura.valor_total_centavos ?? 0);
    const taxas = Number(fatura.valor_taxas_centavos ?? 0);
    return Math.max(0, total - taxas);
  }, [fatura]);

  async function carregar() {
    try {
      setLoading(true);
      setErro(null);

      const [fRes, lRes] = await Promise.all([
        fetch(`/api/financeiro/credito-conexao/faturas/${faturaId}`),
        fetch(`/api/financeiro/credito-conexao/faturas/${faturaId}/lancamentos`),
      ]);

      if (!fRes.ok) throw new Error(await fRes.text());
      if (!lRes.ok) throw new Error(await lRes.text());

      const fJson = await fRes.json();
      const lJson = await lRes.json();

      setFatura(fJson.fatura ?? null);
      setLancamentos(lJson.lancamentos ?? []);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar detalhe da fatura.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!faturaId || Number.isNaN(faturaId)) return;
    carregar();
  }, [faturaId]);

  async function syncBoleto() {
    if (!fatura?.cobranca?.id) return;
    try {
      setSyncing(true);
      const res = await fetch("/api/integracoes/neofin/cobrancas/sync-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cobranca_id: fatura.cobranca.id }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        console.error(json);
        setErro("Falha ao sincronizar boleto.");
        return;
      }

      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Falha ao sincronizar boleto.");
    } finally {
      setSyncing(false);
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // ignore
    }
  }

  if (!faturaId || Number.isNaN(faturaId)) {
    return <div className="p-6">ID inválido.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crédito Conexão — Fatura #{faturaId}</h1>
        <p className="text-sm text-gray-600">Detalhe da fatura, cobrança e lançamentos vinculados.</p>
      </div>

      {erro && <div className="text-sm text-red-600">{erro}</div>}

      {loading || !fatura ? (
        <div className="text-sm text-gray-600">Carregando...</div>
      ) : (
        <>
          {/* Cabeçalho */}
          <div className="border rounded-xl bg-white shadow-sm p-4 grid md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Conta</div>
              <div className="font-medium">#{fatura.conta_conexao_id}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Período</div>
              <div className="font-medium">{fatura.periodo_referencia}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Fechamento</div>
              <div className="font-medium">{fmtDate(fatura.data_fechamento)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Vencimento</div>
              <div className="font-medium">{fmtDate(fatura.data_vencimento)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Compras</div>
              <div className="font-medium">{fmtMoney(comprasCentavos)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Taxas</div>
              <div className="font-medium">
                {fmtMoney(Number(fatura.valor_taxas_centavos ?? 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-medium">
                {fmtMoney(Number(fatura.valor_total_centavos ?? 0))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="font-medium">{fatura.status}</div>
            </div>
          </div>

          {/* Cobrança */}
          <div className="border rounded-xl bg-white shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Cobrança (Neofin)</h2>
              <button
                type="button"
                onClick={syncBoleto}
                disabled={!fatura.cobranca?.id || syncing}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
              >
                {syncing ? "Sincronizando..." : "Sync boleto"}
              </button>
            </div>

            {!fatura.cobranca ? (
              <p className="text-sm text-gray-600">Sem cobrança vinculada.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Cobrança ID</div>
                  <div className="font-medium">{fatura.cobranca.id}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{fatura.cobranca.status}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Neofin charge</div>
                  <div className="font-medium">{fatura.cobranca.neofin_charge_id ?? "—"}</div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Link do boleto</div>
                  {fatura.cobranca.link_pagamento ? (
                    <a
                      className="text-indigo-600 hover:underline break-all"
                      href={fatura.cobranca.link_pagamento}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fatura.cobranca.link_pagamento}
                    </a>
                  ) : (
                    <div className="text-gray-600">—</div>
                  )}
                </div>

                <div>
                  <div className="text-xs text-gray-500">Linha digitável</div>
                  {fatura.cobranca.linha_digitavel ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fatura.cobranca.linha_digitavel}</span>
                      <button
                        type="button"
                        onClick={() => copiar(fatura.cobranca.linha_digitavel)}
                        className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                      >
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-600">—</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lançamentos */}
          <div className="border rounded-xl bg-white shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Lançamentos vinculados</h2>
            </div>

            {lancamentos.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">Nenhum lançamento encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Origem</th>
                      <th className="px-3 py-2 text-left">Origem ID</th>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      <th className="px-3 py-2 text-right">Parcelas</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentos.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="px-3 py-2">{l.id}</td>
                        <td className="px-3 py-2">{l.origem_sistema}</td>
                        <td className="px-3 py-2">{l.origem_id ?? "—"}</td>
                        <td className="px-3 py-2">{l.descricao ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{fmtMoney(Number(l.valor_centavos ?? 0))}</td>
                        <td className="px-3 py-2 text-right">{l.numero_parcelas ?? 1}x</td>
                        <td className="px-3 py-2">{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
