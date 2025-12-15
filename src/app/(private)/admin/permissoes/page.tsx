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

type PermissionAction = "view" | "create" | "update" | "delete";

type PermissionModule = {
  key: string;
  label: string;
  actions: PermissionAction[];
  hint?: string;
};

const MODULES: PermissionModule[] = [
  { key: "admin", label: "Admin (geral)", actions: ["view"], hint: "Acesso ao contexto Administração do Sistema." },
  { key: "pessoas", label: "Pessoas", actions: ["view", "create", "update", "delete"] },
  { key: "colaboradores", label: "Colaboradores", actions: ["view", "create", "update", "delete"] },
  { key: "academico", label: "Acadêmico", actions: ["view", "create", "update", "delete"] },
  { key: "matriculas", label: "Matrículas", actions: ["view", "create", "update", "delete"] },
  { key: "financeiro", label: "Financeiro", actions: ["view", "create", "update", "delete"] },
  { key: "loja_operacao", label: "Loja (operação)", actions: ["view", "create", "update", "delete"] },
  { key: "loja_admin", label: "Loja (admin)", actions: ["view", "create", "update", "delete"] },
  { key: "cafe", label: "Ballet Café", actions: ["view", "create", "update", "delete"] },
  { key: "comunicacao", label: "Comunicação", actions: ["view", "create", "update", "delete"] },
  { key: "relatorios", label: "Relatórios", actions: ["view", "create"] },
  { key: "auditoria", label: "Auditoria", actions: ["view"] },
  { key: "usuarios", label: "Usuários & Segurança", actions: ["view", "update"] },
];

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

function safeParse(txt: string) {
  try {
    return { ok: true as const, value: JSON.parse(txt || "{}") };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "JSON inválido" };
  }
}

function ensureModel(obj: any) {
  const base = obj && typeof obj === "object" ? obj : {};
  if (!base.modules || typeof base.modules !== "object") base.modules = {};
  for (const m of MODULES) {
    if (!base.modules[m.key] || typeof base.modules[m.key] !== "object") base.modules[m.key] = {};
    for (const a of m.actions) {
      if (typeof base.modules[m.key][a] !== "boolean") base.modules[m.key][a] = false;
    }
  }
  return base;
}

export default function AdminPermissoesPage() {
  const [roles, setRoles] = useState<RoleSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [roleId, setRoleId] = useState<string>("");
  const role = useMemo(() => roles.find((r) => r.id === roleId) || null, [roles, roleId]);

  const [visualObj, setVisualObj] = useState<any>({});
  const [jsonText, setJsonText] = useState<string>("{}");
  const [salvando, setSalvando] = useState(false);
  const [jsonErro, setJsonErro] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [supportsPermColumn, setSupportsPermColumn] = useState(true);

  async function carregarRoles() {
    setLoading(true);
    setErro(null);
    try {
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>("/api/admin/roles");
      setRoles(data.roles || []);
      if (!roleId && (data.roles || []).length) setRoleId((data.roles || [])[0].id);
    } catch (e: any) {
      const details = e?.payload?.details || e?.message || "";
      if (typeof details === "string" && details.includes("does not exist") && details.includes("permissoes")) {
        setSupportsPermColumn(false);
        setErro(
          "A coluna roles_sistema.permissoes não existe no banco. O editor fica em modo leitura até criarmos essa coluna numa fase SQL."
        );
      } else if (e?.status === 401 || e?.status === 403) setErro("Acesso negado. Você precisa estar logado como admin.");
      else setErro(details || "Erro ao carregar papéis.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!role) return;
    const normalized = ensureModel({ ...(role.permissoes || {}) });
    setVisualObj(normalized);
    setJsonText(safeStringify(normalized));
    setJsonErro(null);
  }, [role]);

  function setAction(moduleKey: string, action: PermissionAction, value: boolean) {
    setVisualObj((prev: any) => {
      const next = ensureModel({ ...(prev || {}) });
      next.modules[moduleKey][action] = value;
      const txt = safeStringify(next);
      setJsonText(txt);
      setJsonErro(null);
      return next;
    });
  }

  function onJsonChange(txt: string) {
    setJsonText(txt);
    const parsed = safeParse(txt);
    if (!parsed.ok) {
      setJsonErro(parsed.error);
      return;
    }
    const normalized = ensureModel(parsed.value);
    setVisualObj(normalized);
    setJsonErro(null);
  }

  async function salvar() {
    if (!role) return;
    const parsed = safeParse(jsonText);
    if (!parsed.ok) {
      alert("JSON inválido. Corrija antes de salvar.");
      return;
    }
    const normalized = ensureModel(parsed.value);

    setSalvando(true);
    try {
      await apiJson<{ ok: true; role: RoleSistema }>("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ id: role.id, permissoes: normalized }),
      });
      await carregarRoles();
      alert("Permissões salvas.");
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
        Edite permissões por papel (role) com modo fácil (checkboxes) e modo avançado (JSON).
      </div>

      {erro ? (
        <div
          style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)" }}
        >
          <b>Aviso:</b> {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "rgba(0,0,0,0.02)", fontWeight: 700 }}>Papéis (roles)</div>
          <div style={{ padding: 12 }}>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
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
              Dica: você atribui papéis em <code>/admin/usuarios</code>.
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
              Permissões por contexto e ação
              {role ? (
                <span style={{ marginLeft: 8, color: "rgba(0,0,0,0.6)", fontWeight: 600 }}>
                  — {role.nome} ({role.codigo})
                </span>
              ) : null}
              {!supportsPermColumn ? (
                <span style={{ marginLeft: 10, color: "crimson", fontWeight: 600 }}>(Coluna permissoes ausente — modo leitura)</span>
              ) : null}
            </div>
            <button
              onClick={salvar}
              disabled={salvando || !role || !supportsPermColumn}
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
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Contexto / Módulo</th>
                    <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Ver</th>
                    <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Criar</th>
                    <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Editar</th>
                    <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Apagar</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((m) => {
                    const mod = visualObj?.modules?.[m.key] || {};
                    const can = (a: PermissionAction) => m.actions.includes(a);
                    const val = (a: PermissionAction) => !!mod[a];

                    return (
                      <tr key={m.key}>
                        <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                          <div style={{ fontWeight: 650 }}>{m.label}</div>
                          {m.hint ? <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>{m.hint}</div> : null}
                        </td>

                        {(["view", "create", "update", "delete"] as PermissionAction[]).map((a) => (
                          <td key={a} style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                            {can(a) ? (
                              <input
                                type="checkbox"
                                checked={val(a)}
                                disabled={!supportsPermColumn}
                                onChange={(e) => setAction(m.key, a, e.target.checked)}
                              />
                            ) : (
                              <span style={{ color: "rgba(0,0,0,0.35)" }}>—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
              >
                {advancedOpen ? "Ocultar JSON avançado" : "Mostrar JSON avançado"}
              </button>

              {advancedOpen ? (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: jsonErro ? "crimson" : "rgba(0,0,0,0.6)" }}>
                    {jsonErro ? `JSON inválido: ${jsonErro}` : "Modo avançado: ajuste fino do JSON."}
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(e) => onJsonChange(e.target.value)}
                    rows={14}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      fontFamily: "monospace",
                    }}
                    disabled={!supportsPermColumn}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
