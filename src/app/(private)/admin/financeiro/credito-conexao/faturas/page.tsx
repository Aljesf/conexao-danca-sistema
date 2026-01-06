"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
    "março",
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

  const periodoHuman = useMemo(() => monthLabel(periodo), [periodo]);

  async function carregar() {
    setLoading(true);
    setError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("periodo", periodo);
      if (q.trim()) sp.set("q", q.trim());
      if (contaId.trim()) sp.set("conta_id", contaId.trim());

      const res = await fetch(`/api/credito-conexao/faturas?${sp.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await res.json()) as ApiResp;

      if (!data.ok) {
        setError(data.error ?? "Erro ao carregar faturas do Cartão Conexão.");
        setContas([]);
        setRows([]);
        return;
      }

      setContas(data.contas ?? []);
      setRows(data.rows ?? []);
    } catch {
      setError("Erro ao carregar faturas do Cartão Conexão.");
      setContas([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, contaId]);

  function onBuscar() {
    void carregar();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Crédito Conexão — Faturas</h1>
      <p style={{ marginTop: 6, color: "#555" }}>
        Visualize as faturas geradas do Cartão Conexão (Aluno/Colaborador), com valores de compras, taxas e total consolidado.
      </p>

      {error ? (
        <div style={{ marginTop: 12, color: "#b00020", fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6 }}
        >
          Atualizar
        </button>

        <button
          type="button"
          onClick={() => setPeriodo(addMonths(periodo, -1))}
          disabled={loading}
          style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6 }}
        >
          mês anterior
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#333" }}>{periodoHuman}</span>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            disabled={loading}
            style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6 }}
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

        <button
          type="button"
          onClick={() => setPeriodo(addMonths(periodo, 1))}
          disabled={loading}
          style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6 }}
        >
          mês seguinte
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            disabled={loading}
            style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6, minWidth: 220 }}
          >
            <option value="">Todas as contas</option>
            {contas.map((c) => {
              const label =
                (c.descricao_exibicao?.trim() ? c.descricao_exibicao.trim() : `Cartão Conexão ${c.tipo_conta}`) +
                ` — ${c.pessoa_nome}`;
              return (
                <option key={c.id} value={String(c.id)}>
                  {label}
                </option>
              );
            })}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por pessoa (nome/CPF)"
            disabled={loading}
            style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6, minWidth: 240 }}
          />

          <button
            type="button"
            onClick={onBuscar}
            disabled={loading}
            style={{ padding: "6px 10px", border: "1px solid #aaa", borderRadius: 6 }}
          >
            Buscar
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>ID</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Conta</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Período</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Fechamento</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Vencimento</th>
                <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #ddd" }}>Compras</th>
                <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #ddd" }}>Taxas</th>
                <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #ddd" }}>Total</th>
                <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 12 }}>
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 12 }}>
                    Nenhuma fatura para este filtro.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const contaLinha = (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontWeight: 700 }}>{r.titulo_conta}</div>
                      <div style={{ color: "#555" }}>
                        {r.pessoa_nome}
                        {r.pessoa_cpf ? ` — CPF ${r.pessoa_cpf}` : ""}
                      </div>
                    </div>
                  );

                  return (
                    <tr key={r.id}>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        <Link href={`/admin/financeiro/credito-conexao/faturas/${r.id}`}>{r.id}</Link>
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{contaLinha}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.periodo_referencia}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.data_fechamento}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.data_vencimento ?? "—"}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", textAlign: "right" }}>
                        {formatBRLFromCentavos(r.compras_centavos)}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", textAlign: "right" }}>
                        {formatBRLFromCentavos(r.taxas_centavos)}
                      </td>
                      <td
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #eee",
                          textAlign: "right",
                          cursor: r.composicao_resumo ? "help" : "default",
                        }}
                        title={r.composicao_resumo?.trim() || undefined}
                      >
                        {formatBRLFromCentavos(r.total_centavos)}
                      </td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        Observação: o sistema garante (cria) as faturas do mês selecionado para as contas ativas, evitando erro em meses sem compras.
      </div>
    </div>
  );
}
