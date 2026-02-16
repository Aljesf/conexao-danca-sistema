"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CobrancaCartaoItem = {
  fatura_id: number;
  periodo: string;
  fatura_status: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  pessoa_id: number | null;
  pessoa_nome: string | null;
  cobranca_id: number;
  cobranca_status: string;
  vencimento: string | null;
  valor_centavos: number | null;
  neofin_charge_id: string;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
};

type ApiResponse = {
  ok: boolean;
  page: number;
  page_size: number;
  total: number;
  items: CobrancaCartaoItem[];
  error?: string;
  detail?: string | null;
};

function formatBRL(centavos: number | null): string {
  const n = (centavos ?? 0) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminCreditoConexaoCobrancasPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [faturaStatus, setFaturaStatus] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [items, setItems] = useState<CobrancaCartaoItem[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("page_size", String(pageSize));
      if (q.trim()) sp.set("q", q.trim());
      if (status !== "TODOS") sp.set("status", status);
      if (faturaStatus !== "TODOS") sp.set("fatura_status", faturaStatus);

      const res = await fetch(`/api/financeiro/credito-conexao/cobrancas?${sp.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json?.ok) {
        setItems([]);
        setTotal(0);
        setErro(json?.detail ?? json?.error ?? "falha_carregar_cobrancas_cartao");
        return;
      }

      setItems(json.items ?? []);
      setTotal(Number(json.total ?? 0));
    } catch (e) {
      setItems([]);
      setTotal(0);
      setErro(e instanceof Error ? e.message : "falha_inesperada");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, status, faturaStatus]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <FinancePageShell
      title="Cartao Conexao - Cobrancas (ALUNO)"
      subtitle="Lista somente cobrancas consolidadas de faturas ALUNO do Cartao Conexao (com NeoFin)."
      actions={
        <Button type="button" variant="secondary" onClick={() => void carregar()} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      }
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          {erro ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Buscar por nome, periodo, fatura, cobranca, charge..."
              disabled={loading}
            />

            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Status cobranca: todos</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="ERRO_INTEGRACAO">ERRO_INTEGRACAO</option>
            </select>

            <select
              value={faturaStatus}
              onChange={(e) => {
                setPage(1);
                setFaturaStatus(e.target.value);
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              disabled={loading}
            >
              <option value="TODOS">Status fatura: todos</option>
              <option value="ABERTA">ABERTA</option>
              <option value="FECHADA">FECHADA</option>
              <option value="PAGA">PAGA</option>
              <option value="EM_ATRASO">EM_ATRASO</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
                Anterior
              </Button>
              <span className="text-sm text-slate-600">
                Pagina {page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages}
              >
                Proxima
              </Button>
            </div>

            <div className="flex items-center justify-end text-sm text-slate-600">Total: {total}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Cobrancas consolidadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Fatura ID</th>
                  <th className="px-3 py-2 text-left">Pessoa</th>
                  <th className="px-3 py-2 text-left">Periodo</th>
                  <th className="px-3 py-2 text-left">Status fatura</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-left">Status cobranca</th>
                  <th className="px-3 py-2 text-left">NeoFin</th>
                  <th className="px-3 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma cobranca consolidada encontrada.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={`${row.fatura_id}-${row.cobranca_id}`} className="border-t">
                      <td className="px-3 py-2 font-medium">
                        <Link className="text-purple-700 hover:underline" href={`/admin/financeiro/credito-conexao/faturas/${row.fatura_id}`}>
                          {row.fatura_id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.pessoa_nome ?? "-"}</td>
                      <td className="px-3 py-2">{row.periodo}</td>
                      <td className="px-3 py-2">{row.fatura_status}</td>
                      <td className="px-3 py-2">{row.vencimento ?? row.data_vencimento ?? "-"}</td>
                      <td className="px-3 py-2 text-right">{formatBRL(row.valor_centavos)}</td>
                      <td className="px-3 py-2">{row.cobranca_status}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.neofin_charge_id}</div>
                        {row.link_pagamento ? (
                          <a className="text-xs underline" href={row.link_pagamento} target="_blank" rel="noreferrer">
                            Abrir link
                          </a>
                        ) : (
                          <div className="text-xs text-slate-500">Sem link</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/financeiro/credito-conexao/faturas/${row.fatura_id}`}>
                            <Button variant="secondary">Abrir fatura</Button>
                          </Link>
                          {row.cobranca_id ? (
                            <Link href={`/admin/governanca/cobrancas/${row.cobranca_id}`}>
                              <Button variant="secondary">Detalhar cobranca</Button>
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </FinancePageShell>
  );
}

