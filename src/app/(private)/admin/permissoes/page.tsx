"use client";

import React, { useEffect, useMemo, useState } from "react";
import PlaceholderPage from "@/components/PlaceholderPage";

type RoleSistema = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  permissoes?: any;
};

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data?.error || `HTTP_${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}

function safeStringify(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminPermissoesPage() {
  const [roles, setRoles] = useState<RoleSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [roleSelecionadaId, setRoleSelecionadaId] = useState<string>("");
  const roleSelecionada = useMemo(
    () => roles.find((r) => r.id === roleSelecionadaId) || null,
    [roles, roleSelecionadaId]
  );

  const [jsonText, setJsonText] = useState<string>("{}");
  const [salvando, setSalvando] = useState(false);

  async function carregarRoles() {
    setLoading(true);
    setErro(null);
    try {
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>("/api/admin/roles");
      setRoles(data.roles || []);
      if (!roleSelecionadaId && (data.roles || []).length) {
        setRoleSelecionadaId((data.roles || [])[0].id);
      }
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) setErro("Acesso negado. Você precisa estar logado como admin.");
      else setErro(e?.payload?.details || e?.message || "Erro ao carregar papéis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (roleSelecionada) {
      setJsonText(safeStringify((roleSelecionada as any).permissoes));
    }
  }, [roleSelecionada]);

  async function salvarPermissoes() {
    if (!roleSelecionada) return;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText || "{}");
    } catch (e) {
      alert("JSON inválido. Corrija antes de salvar.");
      return;
    }

    setSalvando(true);
    try {
      await apiJson<{ ok: true; role: RoleSistema }>("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ id: roleSelecionada.id, permissoes: parsed }),
      });

      await carregarRoles();
      alert("Permissões salvas com sucesso.");
    } catch (e: any) {
      alert(e?.payload?.details || e?.message || "Erro ao salvar permissões.");
    } finally {
      setSalvando(false);
    }
  }

  if (erro && !roles.length) {
    return <PlaceholderPage title="Permissões" description={erro} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Permissões</h1>
      <div style={{ color: "rgba(0,0,0,0.6)", marginTop: 4 }}>
        Permissões são definidas por papel (role). Usuários recebem papéis na tela de Usuários.
      </div>

      {erro ? (
        <div
          style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)" }}
        >
          <b>Erro:</b> {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "rgba(0,0,0,0.02)", fontWeight: 700 }}>Papéis (roles)</div>

          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", marginBottom: 8 }}>
              Selecione um papel para editar o JSON de permissões.
            </div>

            <select
              value={roleSelecionadaId}
              onChange={(e) => setRoleSelecionadaId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
              disabled={loading}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} ({r.codigo}) {r.ativo ? "" : "— INATIVO"}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
              Dica: mantenha o JSON pequeno e objetivo. Este editor é MVP.
            </div>
          </div>
        </div>

        <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" }}>
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #eee",
              background: "rgba(0,0,0,0.02)",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              Editor de permissões (JSON)
              {roleSelecionada ? (
                <span style={{ marginLeft: 8, color: "rgba(0,0,0,0.6)", fontWeight: 600 }}>
                  — {roleSelecionada.nome} ({roleSelecionada.codigo})
                </span>
              ) : null}
            </div>
            <button
              onClick={salvarPermissoes}
              disabled={salvando || !roleSelecionada}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: salvando ? "not-allowed" : "pointer",
                fontWeight: 700,
              }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>

          <div style={{ padding: 12 }}>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={18}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                fontFamily: "monospace",
              }}
              placeholder='Ex.: { "financeiro": { "contas_pagar": true } }'
            />

            <div style={{ marginTop: 10, color: "rgba(0,0,0,0.6)", fontSize: 12, lineHeight: 1.5 }}>
              Modelo atual:
              <ul style={{ marginTop: 6 }}>
                <li>Usuário recebe papéis em <code>/admin/usuarios</code>.</li>
                <li>Papéis são criados/ativados em <code>/admin/perfis</code>.</li>
                <li>Permissões (JSON) ficam por papel (role) nesta tela.</li>
              </ul>
              Se o campo <code>roles_sistema.permissoes</code> ainda não existir no banco, esta tela apenas exibirá <code>{`{}`}</code> e você pode criar o campo numa fase futura (SQL).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
