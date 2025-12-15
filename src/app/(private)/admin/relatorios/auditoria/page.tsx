"use client";

import React, { useEffect, useMemo, useState } from "react";
import PlaceholderPage from "@/components/PlaceholderPage";

type AuditLog = {
  id?: string;
  created_at?: string;
  user_id?: string;
  acao?: string;
  entidade?: string;
  entidade_id?: string;
  detalhes?: any;
  ip?: string;
  user_agent?: string;
  usuario_nome?: string;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return logs.slice(0, limit);
    const filtered = logs.filter((l) => {
      const texto = [
        l.acao,
        l.entidade,
        l.entidade_id,
        l.user_id,
        l.usuario_nome,
        l.detalhes ? JSON.stringify(l.detalhes) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return texto.includes(term);
    });
    return filtered.slice(0, limit);
  }, [logs, q, limit]);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      // API aceita filtros data_ini/data_fim/usuario_id; usamos listagem simples aqui.
      const data = await apiGet<any>("/api/auditoria");
      const arr = data.data || data.logs || data.items || [];
      setLogs(arr);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) setErro("Acesso negado. Você precisa estar logado.");
      else setErro(e?.payload?.details || e?.message || "Erro ao carregar auditoria.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (erro && !logs.length) {
    return <PlaceholderPage title="Auditoria do sistema" description={erro} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Auditoria do sistema</h1>
      <div style={{ color: "rgba(0,0,0,0.6)", marginTop: 4 }}>
        Logs gerados automaticamente por ações no sistema (ex.: criar/editar/excluir).
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar (ação, entidade, usuário, id...)"
          style={{ width: 380, maxWidth: "70vw", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") carregar();
          }}
        />
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
        >
          <option value={50}>Últimos 50</option>
          <option value={100}>Últimos 100</option>
          <option value={200}>Últimos 200</option>
        </select>
        <button
          onClick={carregar}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontWeight: 700 }}
        >
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {erro ? (
        <div
          style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)" }}
        >
          <b>Erro:</b> {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "rgba(0,0,0,0.02)", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700 }}>Eventos</div>
          <div style={{ color: "rgba(0,0,0,0.6)" }}>{loading ? "..." : `${filtrados.length} registro(s)`}</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Data</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Ação</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Entidade</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Entidade ID</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l: any, idx: number) => (
                <tr key={l.id || idx}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", fontWeight: 650 }}>{l.acao || l.descricao || "—"}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>{l.entidade || "—"}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>{l.entidade_id || "—"}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", fontFamily: "monospace" }}>
                    {l.usuario_nome || l.user_id || "—"}
                  </td>
                </tr>
              ))}

              {!loading && filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "rgba(0,0,0,0.6)" }}>
                    Nenhum log encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12, color: "rgba(0,0,0,0.6)", fontSize: 12 }}>
        Nota: próxima melhoria pode ser abrir detalhes por linha para exibir <code>detalhes</code>.
      </div>
    </div>
  );
}
