"use client";

import React, { useEffect, useMemo, useState } from "react";
import PlaceholderPage from "@/components/PlaceholderPage";

type RoleSistema = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type UsuarioRow = {
  user_id: string;
  full_name: string | null;
  is_admin: boolean;
  pessoa: { id: number; nome: string; email: string | null; cpf: string | null } | null;
  roles: Array<{ id: string; codigo: string; nome: string; ativo: boolean }>;
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        fontSize: 12,
        marginRight: 6,
        marginBottom: 6,
        background: "rgba(0,0,0,0.02)",
      }}
    >
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(920px, 96vw)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
            Fechar
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export default function AdminUsuariosPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [rolesSistema, setRolesSistema] = useState<RoleSistema[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<UsuarioRow | null>(null);
  const [modalRolesUser, setModalRolesUser] = useState<RoleSistema[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const nomeExibicao = (u: UsuarioRow) => u.pessoa?.nome || u.full_name || u.user_id;
  const emailExibicao = (u: UsuarioRow) => u.pessoa?.email || "—";

  const rolesAtivos = useMemo(() => rolesSistema.filter((r) => r.ativo), [rolesSistema]);

  async function carregarRolesSistema() {
    const data = await apiJson<{ ok: true; roles: RoleSistema[] }>("/api/admin/roles");
    setRolesSistema(data.roles || []);
  }

  async function carregarUsuarios() {
    setLoading(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", "100");
      params.set("offset", "0");

      const data = await apiJson<{ ok: true; users: UsuarioRow[] }>(`/api/admin/usuarios?${params.toString()}`);
      setUsers(data.users || []);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) setErro("Acesso negado. Você precisa estar logado como admin.");
      else setErro(e?.payload?.details || e?.message || "Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirModalRoles(u: UsuarioRow) {
    setModalUser(u);
    setModalOpen(true);
    setModalLoading(true);
    setSelectedRoleId("");
    try {
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>(`/api/admin/usuarios/${u.user_id}/roles`);
      setModalRolesUser(data.roles || []);
    } catch (e: any) {
      alert(e?.payload?.details || e?.message || "Erro ao carregar roles do usuário.");
      setModalRolesUser([]);
    } finally {
      setModalLoading(false);
    }
  }

  async function toggleAdmin(u: UsuarioRow, novo: boolean) {
    const prev = users;
    setUsers((arr) => arr.map((x) => (x.user_id === u.user_id ? { ...x, is_admin: novo } : x)));

    try {
      await apiJson<{ ok: true; profile: any }>("/api/admin/usuarios", {
        method: "PATCH",
        body: JSON.stringify({ user_id: u.user_id, is_admin: novo }),
      });
    } catch (e: any) {
      setUsers(prev); // rollback
      alert(e?.payload?.details || e?.message || "Erro ao atualizar admin.");
    }
  }

  async function adicionarRole() {
    if (!modalUser || !selectedRoleId) return;

    try {
      await apiJson<{ ok: true }>(`/api/admin/usuarios/${modalUser.user_id}/roles`, {
        method: "POST",
        body: JSON.stringify({ role_id: selectedRoleId }),
      });

      const role = rolesSistema.find((r) => r.id === selectedRoleId);
      if (role) {
        setModalRolesUser((prev) => {
          if (prev.some((x) => x.id === role.id)) return prev;
          return [...prev, role];
        });
      }
      setSelectedRoleId("");
      await carregarUsuarios(); // reflete badges na tabela
    } catch (e: any) {
      alert(e?.payload?.details || e?.message || "Erro ao adicionar role.");
    }
  }

  async function removerRole(roleId: string) {
    if (!modalUser) return;
    if (!confirm("Remover este papel do usuário?")) return;

    try {
      await apiJson<{ ok: true }>(`/api/admin/usuarios/${modalUser.user_id}/roles`, {
        method: "DELETE",
        body: JSON.stringify({ role_id: roleId }),
      });

      setModalRolesUser((prev) => prev.filter((r) => r.id !== roleId));
      await carregarUsuarios();
    } catch (e: any) {
      alert(e?.payload?.details || e?.message || "Erro ao remover role.");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await carregarRolesSistema();
      } catch (e) {
        // silent: roles é secundário na primeira renderização
      }
      await carregarUsuarios();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se não carregou nada e houve erro de auth, exibe placeholder
  if (erro && !users.length) {
    return <PlaceholderPage title="Usuários" description={erro} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Usuários</h1>
          <div style={{ color: "rgba(0,0,0,0.6)", marginTop: 4 }}>Controle de admin e papéis (roles) por usuário.</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou email..."
            style={{
              width: 340,
              maxWidth: "70vw",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") carregarUsuarios();
            }}
          />
          <button
            onClick={carregarUsuarios}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {erro ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: "rgba(255,0,0,0.06)",
            border: "1px solid rgba(255,0,0,0.18)",
          }}
        >
          <b>Erro:</b> {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 16, border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #eee",
            background: "rgba(0,0,0,0.02)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontWeight: 700 }}>Lista de usuários</div>
          <div style={{ color: "rgba(0,0,0,0.6)" }}>{loading ? "Carregando..." : `${users.length} usuário(s)`}</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.01)" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Nome</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Email</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Admin</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Papéis</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", fontWeight: 650 }}>{nomeExibicao(u)}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>{emailExibicao(u)}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={!!u.is_admin} onChange={(e) => toggleAdmin(u, e.target.checked)} />
                      {u.is_admin ? "Sim" : "Não"}
                    </label>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                      {(u.roles || []).length ? (
                        u.roles.map((r) => <Badge key={r.id}>{r.nome}</Badge>)
                      ) : (
                        <span style={{ color: "rgba(0,0,0,0.5)" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <button
                      onClick={() => abrirModalRoles(u)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Gerenciar roles
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: "rgba(0,0,0,0.6)" }}>
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={modalUser ? `Papéis do usuário: ${nomeExibicao(modalUser)}` : "Papéis do usuário"}
        onClose={() => {
          setModalOpen(false);
          setModalUser(null);
          setModalRolesUser([]);
          setSelectedRoleId("");
        }}
      >
        {!modalUser ? null : (
          <div>
            <div style={{ marginBottom: 10, color: "rgba(0,0,0,0.65)" }}>
              User ID: <code>{modalUser.user_id}</code>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", minWidth: 320 }}
              >
                <option value="">Selecionar papel para adicionar...</option>
                {rolesAtivos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome} ({r.codigo})
                  </option>
                ))}
              </select>

              <button
                onClick={adicionarRole}
                disabled={!selectedRoleId}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: selectedRoleId ? "#fff" : "rgba(0,0,0,0.05)",
                  cursor: selectedRoleId ? "pointer" : "not-allowed",
                }}
              >
                Adicionar papel
              </button>
            </div>

            <div style={{ marginTop: 14, fontWeight: 700 }}>Papéis atribuídos</div>

            {modalLoading ? (
              <div style={{ marginTop: 10, color: "rgba(0,0,0,0.65)" }}>Carregando papéis...</div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {modalRolesUser.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {modalRolesUser.map((r) => (
                      <span key={r.id} style={{ display: "inline-flex", alignItems: "center", marginRight: 8, marginBottom: 8 }}>
                        <Badge>{r.nome}</Badge>
                        <button
                          onClick={() => removerRole(r.id)}
                          title="Remover"
                          style={{
                            marginLeft: 6,
                            padding: "2px 8px",
                            borderRadius: 999,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Remover
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "rgba(0,0,0,0.6)" }}>Nenhum papel atribuído.</div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
