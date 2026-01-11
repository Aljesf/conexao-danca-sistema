"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FinancePageShell } from "@/components/financeiro/FinancePageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ApiConta = {
  id: number;
  tipo_conta: string;
  descricao_exibicao: string | null;
  pessoa_nome: string;
  pessoa_cpf: string | null;
};

type ApiRow = {
  id: number;
  conta_conexao_id: number;
  titulo_conta: string;
  pessoa_nome: string;
  pessoa_cpf: string | null;
  tipo_conta: string | null;
  periodo_referencia: string;
  data_fechamento: string;
  data_vencimento: string | null;
  compras_centavos: number;
  taxas_centavos: number;
  total_centavos: number;
  status: string;
  composicao_resumo?: string | null;
};

type ApiResp = {
  ok: boolean;
  periodo?: string;
  contas?: ApiConta[];
  rows?: ApiRow[];
  error?: string;
};

function formatBRLFromCentavos(v: number): string {
  const n = (v ?? 0) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(periodo: string): string {
  const [y, m] = periodo.split("-");
  const month = Number(m);
  const months = [
    "janeiro",
    "fevereiro",
    "mar\u00e7o",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${months[Math.max(1, Math.min(12, month)) - 1]} de ${y}`;
}

function addMonths(periodo: string, delta: number): string {
  const [y, m] = periodo.split("-").map((x) => Number(x));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

function currentPeriodo(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export default function AdminCreditoConexaoFaturasPage() {
  const [periodo, setPeriodo] = useState<string>(currentPeriodo());
  const [q, setQ] = useState<string>("");
  const [contaId, setContaId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [contas, setContas] = useState<ApiConta[]>([]);
  const [rows, setRows] = useState<ApiRow[]>([]);
  const queryRef = React.useRef(q);

  const periodoHuman = useMemo(() => monthLabel(periodo), [periodo]);

  useEffect(() => {
    queryRef.current = q;
  }, [q]);

  const carregar = React.useCallback(async (overrideQ?: string) => {
    const searchValue =
      typeof overrideQ === "string" ? overrideQ : queryRef.current;
    setLoading(true);
    setError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("periodo", periodo);
      if (searchValue.trim()) sp.set("q", searchValue.trim());
      if (contaId.trim()) sp.set("conta_id", contaId.trim());

      const res = await fetch(`/api/credito-conexao/faturas?${sp.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await res.json()) as ApiResp;

      if (!data.ok) {
        setError(data.error ?? "Erro ao carregar faturas do Cart\u00e3o Conex\u00e3o.");
        setContas([]);
        setRows([]);
        return;
      }

      setContas(data.contas ?? []);
      setRows(data.rows ?? []);
    } catch {
      setError("Erro ao carregar faturas do Cart\u00e3o Conex\u00e3o.");
      setContas([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [periodo, contaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function onBuscar() {
    void carregar(q);
  }

  return (
    <FinancePageShell
      title="Cr\u00e9dito Conex\u00e3o - Faturas"
      subtitle="Visualize as faturas do Cart\u00e3o Conex\u00e3o (Aluno/Colaborador), com valores de compras, taxas e total consolidado."
      actions={
        <Button type="button" variant="secondary" onClick={carregar} disabled={loading}>
          Atualizar
        </Button>
      }
    >
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setPeriodo(addMonths(periodo, -1))} disabled={loading}>
              m\u00eas anterior
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{periodoHuman}</span>
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                disabled={loading}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {Array.from({ length: 25 }).map((_, i) => {
                  const p = addMonths(currentPeriodo(), i - 12);
                  return (
                    <option key={p} value={p}>
                      {monthLabel(p)}
                    </option>
                  );
                })}
              </select>
            </div>

            <Button type="button" variant="secondary" onClick={() => setPeriodo(addMonths(periodo, 1))} disabled={loading}>
              m\u00eas seguinte
            </Button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                disabled={loading}
                className="h-10 min-w-[220px] rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Todas as contas</option>
                {contas.map((c) => {
                  const label =
                    (c.descricao_exibicao?.trim()
                      ? c.descricao_exibicao.trim()
                      : `Cart\u00e3o Conex\u00e3o ${c.tipo_conta}`) + ` - ${c.pessoa_nome}`;
                  return (
                    <option key={c.id} value={String(c.id)}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por pessoa (nome/CPF)"
                disabled={loading}
              />

              <Button type="button" variant="secondary" onClick={onBuscar} disabled={loading}>
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base text-slate-800">Faturas</CardTitle>
            {loading ? <span className="text-xs text-slate-500">Carregando...</span> : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Conta</th>
                  <th className="px-3 py-2 text-left">Per\u00edodo</th>
                  <th className="px-3 py-2 text-left">Fechamento</th>
                  <th className="px-3 py-2 text-left">Vencimento</th>
                  <th className="px-3 py-2 text-right">Compras</th>
                  <th className="px-3 py-2 text-right">Taxas</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">A\u00e7\u00f5es</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      Carregando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                      Nenhuma fatura para este filtro.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const contaLinha = (
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-slate-800">{r.titulo_conta}</div>
                        <div className="text-xs text-slate-500">
                          {r.pessoa_nome}
                          {r.pessoa_cpf ? ` - CPF ${r.pessoa_cpf}` : ""}
                        </div>
                      </div>
                    );

                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          <Link href={`/admin/financeiro/credito-conexao/faturas/${r.id}`} className="text-purple-700 hover:underline">
                            {r.id}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{contaLinha}</td>
                        <td className="px-3 py-2">{r.periodo_referencia}</td>
                        <td className="px-3 py-2">{r.data_fechamento}</td>
                        <td className="px-3 py-2">{r.data_vencimento ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{formatBRLFromCentavos(r.compras_centavos)}</td>
                        <td className="px-3 py-2 text-right">{formatBRLFromCentavos(r.taxas_centavos)}</td>
                        <td
                          className="px-3 py-2 text-right"
                          title={r.composicao_resumo?.trim() || undefined}
                        >
                          {formatBRLFromCentavos(r.total_centavos)}
                        </td>
                        <td className="px-3 py-2">{r.status}</td>
                        <td className="px-3 py-2 text-right">
                          <Link href={`/admin/financeiro/credito-conexao/faturas/${r.id}`}>
                            <Button variant="secondary">Ver fatura</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-500">
        Observa\u00e7\u00e3o: a lista exibe apenas faturas existentes. Faturas s\u00e3o criadas somente quando h\u00e1 lan\u00e7amentos.
      </div>
    </FinancePageShell>
  );
}
