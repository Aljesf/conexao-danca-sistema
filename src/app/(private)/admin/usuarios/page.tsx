"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RoleSistema = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type UsuarioRow = {
  user_id: string;
  pessoa_id: number | null;
  nome: string | null;
  email: string | null;
  is_admin: boolean;
  papeis: Array<{ codigo: string; nome: string }>;
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
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
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
  title: React.ReactNode;
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
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
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [rolesSistema, setRolesSistema] = useState<RoleSistema[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState<UsuarioRow | null>(null);
  const [modalRolesUser, setModalRolesUser] = useState<RoleSistema[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UsuarioRow | null>(null);
  const [resetSenha, setResetSenha] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const shortUserId = (id: string) => {
    if (!id) return "";
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (!err) return fallback;
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message || fallback;
    if (typeof err === "object") {
      const payload = (err as { payload?: { message?: string; error?: string; details?: string } }).payload;
      return payload?.message || payload?.details || payload?.error || fallback;
    }
    return fallback;
  };

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

      const endpoint = `/api/admin/usuarios?${params.toString()}`;
      const res = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      const body = await res.json().catch(() => ({}));
      console.debug("[admin/usuarios] fetch", { endpoint, status: res.status, body });
      if (!res.ok) {
        setUsers([]);
        setErro(`${res.status} ${body?.code || body?.message || "ERRO"}`);
        return;
      }
      setUsers(body?.users || body?.usuarios || []);
    } catch (e) {
      setUsers([]);
      setErro(getErrorMessage(e, "Erro ao carregar usuários."));
    } finally {
      setLoading(false);
    }
  }
  async function abrirModalRoles(u: UsuarioRow) {
    setModalUser(u);
    setModalOpen(true);
    setModalLoading(true);
    setModalSaving(false);
    setSelectedRoleId("");
    setModalError(null);
    setModalSuccess(null);
    try {
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>(`/api/admin/usuarios/${u.user_id}/roles`);
      setModalRolesUser(data.roles || []);
    } catch (e) {
      setModalRolesUser([]);
      setModalError(getErrorMessage(e, "Erro ao carregar papéis do usuário."));
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
    if (!modalUser || !selectedRoleId || modalSaving) return;

    setModalSaving(true);
    setModalError(null);
    setModalSuccess(null);
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
      setModalSuccess("Papel adicionado.");
      await carregarUsuarios(); // reflete badges na tabela
    } catch (e) {
      setModalError(getErrorMessage(e, "Erro ao adicionar papel."));
    } finally {
      setModalSaving(false);
    }
  }

  async function removerRole(roleId: string) {
    if (!modalUser || modalSaving) return;
    if (!confirm("Remover este papel do usuário?")) return;

    setModalSaving(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      await apiJson<{ ok: true }>(`/api/admin/usuarios/${modalUser.user_id}/roles`, {
        method: "DELETE",
        body: JSON.stringify({ role_id: roleId }),
      });

      setModalRolesUser((prev) => prev.filter((r) => r.id !== roleId));
      setModalSuccess("Papel removido.");
      await carregarUsuarios();
    } catch (e) {
      setModalError(getErrorMessage(e, "Erro ao remover papel."));
    } finally {
      setModalSaving(false);
    }
  }

  function abrirResetSenha(u: UsuarioRow) {
    setResetUser(u);
    setResetOpen(true);
    setResetSenha("");
    setResetConfirm("");
    setResetError(null);
    setResetSuccess(null);
  }

  function fecharResetSenha() {
    setResetOpen(false);
    setResetUser(null);
    setResetSenha("");
    setResetConfirm("");
    setResetError(null);
    setResetSuccess(null);
  }

  async function confirmarResetSenha() {
    if (!resetUser || resetLoading) return;
    setResetError(null);
    setResetSuccess(null);

    const senha = resetSenha.trim();
    const confirmacao = resetConfirm.trim();

    if (senha.length < 6) {
      setResetError("A senha precisa ter ao menos 6 caracteres.");
      return;
    }

    if (senha !== confirmacao) {
      setResetError("As senhas não conferem.");
      return;
    }

    setResetLoading(true);
    try {
      await apiJson<{ ok: true }>("/api/admin/usuarios/resetar-senha", {
        method: "POST",
        body: JSON.stringify({ user_id: resetUser.user_id, senha }),
      });
      setResetSuccess("Senha redefinida com sucesso.");
      setTimeout(() => {
        fecharResetSenha();
      }, 800);
    } catch (e) {
      setResetError(getErrorMessage(e, "Erro ao redefinir senha."));
    } finally {
      setResetLoading(false);
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

  async function criarUsuarioFromPessoa(pessoaIdPrefill?: number) {
    const pessoaIdStr = window.prompt("Informe o ID da pessoa para criar o usuário", pessoaIdPrefill ? String(pessoaIdPrefill) : "");
    if (!pessoaIdStr) return;
    const pessoaId = Number(pessoaIdStr);
    if (!pessoaId || Number.isNaN(pessoaId)) return;

    const email = window.prompt("Email do usuário (obrigatório):") || "";
    if (!email.trim()) return;
    const senha = window.prompt("Senha inicial (obrigatória):") || "";
    if (!senha.trim()) return;

    try {
      await apiJson("/api/usuarios/create-from-pessoa", {
        method: "POST",
        body: JSON.stringify({ pessoaId, email: email.trim(), senha: senha.trim() }),
      });
      await carregarUsuarios();
      alert("Usuário criado e vinculado à pessoa.");
    } catch (e: any) {
      alert(e?.payload?.error || e?.payload?.details || e?.message || "Erro ao criar usuário a partir da pessoa.");
    }
  }


    return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-6 px-4">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Usuários</h1>
              <p className="mt-1 text-sm text-slate-600">Controle de admin e papéis (roles) por usuário.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/usuarios/novo"
                className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                Novo usuário
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Filtros</div>
              <div className="text-xs text-slate-500">Busque por nome ou email.</div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-72"
                onKeyDown={(e) => {
                  if (e.key === "Enter") carregarUsuarios();
                }}
              />
              <button
                onClick={carregarUsuarios}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">Carregando usuários...</div>
            <div className="mt-4 h-2 w-2/3 rounded-full bg-slate-200" />
          </div>
        ) : erro ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm">
            <div className="text-sm font-semibold">Erro ao carregar usuários</div>
            <div className="mt-1 text-sm">{erro}</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Lista de usuários</div>
                <div className="text-xs text-slate-500">{users.length} usuário(s)</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Pessoa</th>
                    <th className="px-6 py-3">Admin</th>
                    <th className="px-6 py-3">Papéis</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const papeis = Array.isArray(u.papeis) ? u.papeis : [];
                    const visiveis = papeis.slice(0, 2);
                    const extras = papeis.length - visiveis.length;
                    return (
                      <tr key={u.user_id} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          {u.nome ? (
                            <div className="font-semibold text-slate-900">{u.nome}</div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">Sem vínculo</span>
                              <span className="text-xs text-slate-500">UID: {shortUserId(u.user_id)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.email ? u.email : "Sem vínculo"}</td>
                        <td className="px-6 py-4">
                          {typeof u.pessoa_id === "number" ? (
                            <a className="text-sky-700 hover:underline" href={`/pessoas/${u.pessoa_id}`}>
                              Pessoa #{u.pessoa_id}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => criarUsuarioFromPessoa()}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            >
                              Vincular...
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => toggleAdmin(u, !u.is_admin)}
                            title="Clique para alternar admin"
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              u.is_admin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {u.is_admin ? "SIM" : "NÃO"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {visiveis.map((r) => (
                              <Badge key={r.codigo}>{r.nome}</Badge>
                            ))}
                            {extras > 0 ? <Badge>+{extras}</Badge> : null}
                            {papeis.length === 0 ? <span className="text-slate-400">—</span> : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalRoles(u)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            >
                              Gerenciar roles
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirResetSenha(u)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            >
                              Redefinir senha
                            </button>
                            {!u.pessoa_id ? (
                              <button
                                type="button"
                                onClick={() => criarUsuarioFromPessoa()}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              >
                                Vincular...
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!users.length ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        <div className="text-sm font-semibold">Nenhum usuário encontrado.</div>
                        <div className="mt-1 text-xs text-slate-400">Tente ajustar os filtros ou recarregar.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Modal
        open={modalOpen}
        title={
          modalUser ? (
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-900">Papéis do usuário</span>
              <span className="text-xs text-slate-500">UID: {shortUserId(modalUser.user_id)}</span>
            </div>
          ) : (
            <span className="text-base font-semibold text-slate-900">Papéis do usuário</span>
          )
        }
        onClose={() => {
          setModalOpen(false);
          setModalUser(null);
          setModalRolesUser([]);
          setSelectedRoleId("");
          setModalError(null);
          setModalSuccess(null);
          setModalSaving(false);
          setModalLoading(false);
        }}
      >
        {!modalUser ? null : (
          <div className="space-y-4">
            {modalError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {modalError}
              </div>
            ) : null}
            {modalSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {modalSuccess}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pessoa</div>
              <div className="mt-1 text-sm text-slate-700">
                {typeof modalUser.pessoa_id === "number" ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Link className="text-sky-700 hover:underline" href={`/pessoas/${modalUser.pessoa_id}`}>
                      Pessoa #{modalUser.pessoa_id}
                    </Link>
                    {modalUser.nome ? <span className="text-slate-600">- {modalUser.nome}</span> : null}
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-2 text-slate-600">
                    <span>Sem vínculo.</span>
                    <button
                      type="button"
                      onClick={() => criarUsuarioFromPessoa()}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-white"
                    >
                      Vincular...
                    </button>
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adicionar papel</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  disabled={modalLoading || modalSaving}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-80"
                >
                  <option value="">Selecionar papel para adicionar...</option>
                  {rolesAtivos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome} ({r.codigo})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={adicionarRole}
                  disabled={!selectedRoleId || modalLoading || modalSaving}
                  className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {modalSaving ? "Salvando..." : "Adicionar papel"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Papéis atribuídos</div>
              <div className="mt-3">
                {modalLoading ? (
                  <div className="text-sm text-slate-500">Carregando papéis...</div>
                ) : modalRolesUser.length ? (
                  <div className="flex flex-wrap gap-2">
                    {modalRolesUser.map((r) => (
                      <div key={r.id} className="inline-flex items-center gap-2">
                        <Badge>{r.nome}</Badge>
                        <button
                          type="button"
                          onClick={() => removerRole(r.id)}
                          disabled={modalSaving}
                          className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">Nenhum papel atribuído.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={resetOpen}
        title={
          resetUser ? (
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-900">Redefinir senha</span>
              <span className="text-xs text-slate-500">UID: {shortUserId(resetUser.user_id)}</span>
            </div>
          ) : (
            <span className="text-base font-semibold text-slate-900">Redefinir senha</span>
          )
        }
        onClose={fecharResetSenha}
      >
        {!resetUser ? null : (
          <div className="space-y-4">
            {resetError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {resetError}
              </div>
            ) : null}
            {resetSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {resetSuccess}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usuário</div>
              <div className="mt-1 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{resetUser.nome ?? "Sem vínculo"}</div>
                <div className="text-xs text-slate-500">{resetUser.email ?? "Sem email"}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="reset-senha">
                  Nova senha
                </label>
                <input
                  id="reset-senha"
                  type="password"
                  value={resetSenha}
                  onChange={(e) => setResetSenha(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Digite a nova senha"
                  autoComplete="new-password"
                />
                <div className="mt-1 text-xs text-slate-500">Mínimo 6 caracteres.</div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="reset-confirm">
                  Confirmar senha
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={fecharResetSenha}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                disabled={resetLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarResetSenha}
                disabled={resetLoading}
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {resetLoading ? "Salvando..." : "Redefinir senha"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}






