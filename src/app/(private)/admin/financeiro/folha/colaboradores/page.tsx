"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  colaborador_nome: string | null;
  status: string;
  data_pagamento: string | null;
};

type PainelCompetencia = {
  competencia: string;
  valor_total_centavos: number;
  status_fatura: string;
  status_importacao_folha: string;
  espelho_disponivel: boolean;
  referencia_fatura_id: number;
  folha_pagamento_colaborador_id: number | null;
};

type PainelColaborador = {
  referencias: { conta_interna_id: number | null };
  competencias: PainelCompetencia[];
};

const STATUS_OPTIONS = ["", "ABERTA", "FECHADA", "PAGA", "CANCELADA"] as const;

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function competenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function FolhaColaboradoresPage() {
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [somenteComDebito, setSomenteComDebito] = useState(false);
  const [rows, setRows] = useState<FolhaRow[]>([]);
  const [painelMap, setPainelMap] = useState<Record<number, PainelColaborador>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState<"abrir" | "espelho" | null>(null);

  const rowsFiltradas = useMemo(() => {
    if (!somenteComDebito) return rows;
    return rows.filter((row) =>
      (painelMap[row.colaborador_id]?.competencias ?? []).some((item) => item.valor_total_centavos > 0),
    );
  }, [painelMap, rows, somenteComDebito]);

  const indicadores = useMemo(() => {
    const paineis = Object.values(painelMap);
    const comContaInterna = paineis.filter((item) => item.referencias.conta_interna_id).length;
    const comDebitoAberto = paineis.filter((item) => item.competencias.some((c) => c.valor_total_centavos > 0)).length;
    const comFaturaAberta = paineis.filter((item) => item.competencias.some((c) => c.status_fatura === "ABERTA")).length;
    const aguardandoImportacao = new Set<string>();
    for (const painel of paineis) {
      for (const item of painel.competencias) {
        if (item.valor_total_centavos > 0 && !item.folha_pagamento_colaborador_id) {
          aguardandoImportacao.add(item.competencia);
        }
      }
    }
    return {
      comContaInterna,
      comDebitoAberto,
      comFaturaAberta,
      aguardandoImportacao: aguardandoImportacao.size,
    };
  }, [painelMap]);

  async function fetchList() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ competencia });
      if (statusFiltro) params.set("status", statusFiltro);

      const res = await fetch(`/api/admin/folha/colaboradores?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { data?: FolhaRow[]; error?: string } | null;
      if (!res.ok) {
        setRows([]);
        setPainelMap({});
        setMessage(json?.error ?? "falha_listar_folhas");
        return;
      }

      const nextRows = Array.isArray(json?.data) ? json.data : [];
      setRows(nextRows);

      const painelEntries = await Promise.all(
        nextRows.map(async (row) => {
          const painelRes = await fetch(`/api/financeiro/folha/colaboradores/${row.colaborador_id}/painel`, {
            cache: "no-store",
          });
          const painelJson = (await painelRes.json().catch(() => null)) as PainelColaborador | { error?: string } | null;
          return [row.colaborador_id, painelRes.ok ? (painelJson as PainelColaborador) : { referencias: { conta_interna_id: null }, competencias: [] }] as const;
        }),
      );

      setPainelMap(Object.fromEntries(painelEntries));
    } finally {
      setLoading(false);
    }
  }

  async function abrirFolha() {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      setMessage("Informe competencia valida (YYYY-MM).");
      return;
    }
    setRunning("abrir");
    setMessage(null);
    try {
      const res = await fetch("/api/financeiro/folha/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencia }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_abrir_folha");
        return;
      }
      setMessage(`Folha da competencia ${competencia} aberta/garantida.`);
      await fetchList();
    } finally {
      setRunning(null);
    }
  }

  async function gerarEspelho() {
    if (!/^\d{4}-\d{2}$/.test(competencia)) {
      setMessage("Informe competencia valida (YYYY-MM).");
      return;
    }
    setRunning("espelho");
    setMessage(null);
    try {
      const res = await fetch("/api/financeiro/folha/gerar-espelho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencia_base: competencia, meses: 12, importar_cartao: true }),
      });
      const json = (await res.json().catch(() => null)) as { imported_cartao_total?: number; error?: string } | null;
      if (!res.ok) {
        setMessage(json?.error ?? "falha_gerar_espelho");
        return;
      }
      setMessage(`Espelho gerado. Itens de conta interna importados: ${json?.imported_cartao_total ?? 0}.`);
      await fetchList();
    } finally {
      setRunning(null);
    }
  }

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia, statusFiltro]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Folha de pagamento - colaboradores</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visao gerencial por competencia, com atalho para debitos em aberto, perfil do colaborador e importacao da conta interna.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-slate-500">Conta interna</div>
            <div className="mt-2 text-2xl font-semibold">{indicadores.comContaInterna}</div>
            <div className="text-sm text-slate-600">colaboradores com conta interna ativa</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-slate-500">Debito em aberto</div>
            <div className="mt-2 text-2xl font-semibold">{indicadores.comDebitoAberto}</div>
            <div className="text-sm text-slate-600">colaboradores com saldo pendente</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-slate-500">Fatura aberta</div>
            <div className="mt-2 text-2xl font-semibold">{indicadores.comFaturaAberta}</div>
            <div className="text-sm text-slate-600">colaboradores com fatura em andamento</div>
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs uppercase text-slate-500">Aguardando importacao</div>
            <div className="mt-2 text-2xl font-semibold">{indicadores.aguardandoImportacao}</div>
            <div className="text-sm text-slate-600">competencias com espelho ainda nao vinculado</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span>Competencia</span>
                <input className="w-full rounded-md border px-3 py-2" value={competencia} onChange={(event) => setCompetencia(event.target.value)} placeholder="YYYY-MM" />
              </label>
              <label className="space-y-1 text-sm">
                <span>Status da folha</span>
                <select className="w-full rounded-md border px-3 py-2" value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status || "todos"} value={status}>
                      {status || "Todos"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={somenteComDebito} onChange={(event) => setSomenteComDebito(event.target.checked)} />
                Abrir colaboradores com debito em aberto
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-md border px-3 py-2 text-sm" disabled={running !== null} onClick={() => void abrirFolha()}>
                {running === "abrir" ? "Abrindo..." : "Abrir folha"}
              </button>
              <button type="button" className="rounded-md border px-3 py-2 text-sm" disabled={running !== null} onClick={() => void gerarEspelho()}>
                {running === "espelho" ? "Gerando..." : "Gerar espelho"}
              </button>
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => void fetchList()}>
                Atualizar
              </button>
            </div>
          </div>
          {message ? <div className="mt-4 text-sm text-slate-600">{message}</div> : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Colaborador</th>
                  <th className="px-3 py-2 text-left">Competencia</th>
                  <th className="px-3 py-2 text-left">Status folha</th>
                  <th className="px-3 py-2 text-left">Conta interna</th>
                  <th className="px-3 py-2 text-left">Importacao</th>
                  <th className="px-3 py-2 text-right">Valor da competencia</th>
                  <th className="px-3 py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={7}>
                      Carregando...
                    </td>
                  </tr>
                ) : rowsFiltradas.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={7}>
                      Nenhum colaborador encontrado para a competencia informada.
                    </td>
                  </tr>
                ) : (
                  rowsFiltradas.map((row) => {
                    const painel = painelMap[row.colaborador_id];
                    const competenciaAtualPainel =
                      painel?.competencias.find((item) => item.competencia === row.competencia_ano_mes) ?? null;
                    return (
                      <tr key={row.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.colaborador_nome ?? `Colaborador #${row.colaborador_id}`}</div>
                          <div className="mt-1">
                            <Link className="text-xs underline" href={`/admin/config/colaboradores/${row.colaborador_id}`}>
                              Abrir perfil do colaborador
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-2">{row.competencia_ano_mes}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{painel?.referencias.conta_interna_id ? "Ativa" : "Nao criada"}</td>
                        <td className="px-3 py-2">
                          {competenciaAtualPainel
                            ? `${competenciaAtualPainel.status_importacao_folha}${competenciaAtualPainel.espelho_disponivel ? " / Espelho disponivel" : ""}`
                            : "Sem fatura"}
                        </td>
                        <td className="px-3 py-2 text-right">{brl(Number(competenciaAtualPainel?.valor_total_centavos ?? 0))}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <Link className="rounded border px-3 py-1 text-xs hover:bg-slate-50" href={`/admin/financeiro/folha/colaboradores/${row.id}`}>
                              Abrir folha
                            </Link>
                            {competenciaAtualPainel?.referencia_fatura_id ? (
                              <Link
                                className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
                                href={`/admin/financeiro/credito-conexao/faturas/${competenciaAtualPainel.referencia_fatura_id}`}
                              >
                                Ver fatura
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
