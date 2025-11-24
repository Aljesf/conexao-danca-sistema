"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Pessoa = {
  id: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
};

type Cobranca = {
  id: number;
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  moeda: string;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
  metodo_pagamento: string | null;
  link_pagamento: string | null;
  neofin_charge_id: string | null;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

type ApiResponse = {
  data: Cobranca[];
};

function formatCurrency(valorCentavos: number, moeda: string = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(valorCentavos / 100);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case "PAGA":
      return "bg-green-100 text-green-800";
    case "EM_ATRASO":
      return "bg-red-100 text-red-800";
    case "CANCELADA":
      return "bg-gray-200 text-gray-700";
    case "ERRO_INTEGRACAO":
      return "bg-orange-100 text-orange-800";
    case "PENDENTE":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/cobrancas", { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`Erro ao buscar cobranças (status ${res.status})`);
        }

        const json = (await res.json()) as ApiResponse;

        if (!ignore) {
          setCobrancas(json.data ?? []);
        }
      } catch (err: any) {
        console.error("[CobrancasPage] erro ao carregar:", err);
        if (!ignore) setError(err?.message ?? "Erro inesperado ao carregar.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Cobranças</h1>
          <p className="text-sm text-slate-500">
            Acompanhe as cobranças geradas para os responsáveis financeiros
            e sua integração com a Neofin.
          </p>
        </div>

        <Link
          href="/financeiro/cobrancas/nova"
          className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700 transition-colors"
        >
          + Nova cobrança
        </Link>
      </div>

      {/* Estados de carregamento / erro */}
      {loading && (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando cobranças...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabela */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">
                  Responsável
                </th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">
                  Descrição
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">
                  Valor
                </th>
                <th className="px-4 py-2 text-center font-medium text-slate-600">
                  Vencimento
                </th>
                <th className="px-4 py-2 text-center font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-2 text-center font-medium text-slate-600">
                  Pagamento
                </th>
                <th className="px-4 py-2 text-center font-medium text-slate-600">
                  Neofin
                </th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cobrancas.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nenhuma cobrança encontrada.
                  </td>
                </tr>
              )}

              {cobrancas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  {/* Responsável */}
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium text-slate-800">
                      {c.pessoa?.nome ?? `Pessoa #${c.pessoa_id}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.pessoa?.email || c.pessoa?.telefone || "-"}
                    </div>
                  </td>

                  {/* Descrição */}
                  <td className="px-4 py-2 align-top">
                    <div className="text-slate-800">{c.descricao}</div>
                    <div className="text-xs text-slate-500">
                      Criada em {formatDate(c.created_at)}
                    </div>
                  </td>

                  {/* Valor */}
                  <td className="px-4 py-2 text-right align-top whitespace-nowrap">
                    {formatCurrency(c.valor_centavos, c.moeda)}
                  </td>

                  {/* Vencimento */}
                  <td className="px-4 py-2 text-center align-top whitespace-nowrap">
                    {formatDate(c.vencimento)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2 text-center align-top">
                    <span
                      className={
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                        statusBadgeClasses(c.status)
                      }
                    >
                      {c.status || "PENDENTE"}
                    </span>
                  </td>

                  {/* Pagamento */}
                  <td className="px-4 py-2 text-center align-top whitespace-nowrap text-sm text-slate-700">
                    {c.data_pagamento ? formatDate(c.data_pagamento) : "-"}
                  </td>

                  {/* Neofin */}
                  <td className="px-4 py-2 text-center align-top text-xs text-slate-600">
                    {c.neofin_charge_id ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Integrada
                        </span>
                        <span className="truncate max-w-[140px]">
                          {c.neofin_charge_id}
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        Não enviada
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-2 text-right align-top whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {c.link_pagamento && (
                        <a
                          href={c.link_pagamento}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline"
                        >
                          Abrir link
                        </a>
                      )}

                      <Link
                        href={`/financeiro/cobrancas/${c.id}`}
                        className="text-xs text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Detalhes
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
