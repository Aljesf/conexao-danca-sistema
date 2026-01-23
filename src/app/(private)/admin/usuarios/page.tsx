"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type RoleSistema = {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type PessoaResumo = {
  id: string | number;
  nome?: string | null;
  email?: string | null;
  cpf?: string | null;
};

type UsuarioRow = {
  id?: string;
  uid?: string;
  user_id?: string;
  pessoaId?: string | number | null;
  pessoa_id?: string | number | null;
  pessoa?: PessoaResumo | null;
  nome?: string | null;
  email: string | null;
  phone?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  is_admin?: boolean;
  papeis?: Array<{ codigo: string; nome: string }>;
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

  const [vinculoOpen, setVinculoOpen] = useState(false);
  const [vinculoUserId, setVinculoUserId] = useState<string | null>(null);
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [pessoasEncontradas, setPessoasEncontradas] = useState<PessoaResumo[]>([]);
  const [pessoaSelecionadaId, setPessoaSelecionadaId] = useState<string | null>(null);
  const [vinculoLoading, setVinculoLoading] = useState(false);
  const [vinculoError, setVinculoError] = useState<string | null>(null);

  const shortUserId = (id: string) => {
    if (!id) return "";
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  const getUid = (u: UsuarioRow) => u.uid ?? u.user_id ?? u.id ?? "";

  const getPessoaId = (u: UsuarioRow) => u.pessoaId ?? u.pessoa_id ?? null;

  const getPessoaNome = (u: UsuarioRow) => u.pessoa?.nome ?? u.nome ?? null;

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

  async function buscarPessoas(term: string) {
    const qTerm = term.trim();
    if (!qTerm) return [] as PessoaResumo[];
    try {
      const res = await fetch(`/api/admin/pessoas/search?q=${encodeURIComponent(qTerm)}`);
      if (!res.ok) return [] as PessoaResumo[];
      const json = (await res.json().catch(() => ({}))) as {
        data?: PessoaResumo[];
        pessoas?: PessoaResumo[];
      };
      return json.data ?? json.pessoas ?? [];
    } catch {
      return [] as PessoaResumo[];
    }
  }

  async function vincularUsuario(userId: string, pessoaId: string) {
    const res = await fetch(`/api/admin/usuarios/${encodeURIComponent(userId)}/vincular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa_id: pessoaId }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha ao vincular (HTTP ${res.status}). ${txt}`);
    }
  }

  function abrirModalVinculo(userId: string) {
    setVinculoUserId(userId);
    setBuscaPessoa("");
    setPessoasEncontradas([]);
    setPessoaSelecionadaId(null);
    setVinculoError(null);
    setVinculoOpen(true);
  }

  async function executarBuscaPessoa() {
    setVinculoError(null);
    const res = await buscarPessoas(buscaPessoa);
    setPessoasEncontradas(res);
    if (res.length === 0) {
      setPessoaSelecionadaId(null);
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
      const uid = getUid(u);
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>(`/api/admin/usuarios/${uid}/roles`);
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
    const uid = getUid(u);
    setUsers((arr) => arr.map((x) => (getUid(x) === uid ? { ...x, is_admin: novo } : x)));

    try {
      await apiJson<{ ok: true; profile: any }>("/api/admin/usuarios", {
        method: "PATCH",
        body: JSON.stringify({ user_id: uid, is_admin: novo }),
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
      const uid = getUid(modalUser);
      await apiJson<{ ok: true }>(`/api/admin/usuarios/${uid}/roles`, {
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
      const uid = getUid(modalUser);
      await apiJson<{ ok: true }>(`/api/admin/usuarios/${uid}/roles`, {
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
      const uid = getUid(resetUser);
      await apiJson<{ ok: true }>("/api/admin/usuarios/resetar-senha", {
        method: "POST",
        body: JSON.stringify({ user_id: uid, senha }),
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
                    const uid = getUid(u);
                    const pessoaId = getPessoaId(u);
                    const nome = getPessoaNome(u);
                    const isAdmin = Boolean(u.is_admin);
                    const papeis = Array.isArray(u.papeis) ? u.papeis : [];
                    const visiveis = papeis.slice(0, 2);
                    const extras = papeis.length - visiveis.length;
                    return (
                      <tr key={uid || u.email || String(pessoaId ?? "")} className="hover:bg-slate-50/60">
                        <td className="px-6 py-4">
                          {nome ? (
                            <div className="font-semibold text-slate-900">{nome}</div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">Sem vínculo</span>
                              <span className="text-xs text-slate-500">UID: {shortUserId(uid)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{u.email ? u.email : "Sem vínculo"}</td>
                        <td className="px-6 py-4">
                          {pessoaId ? (
                            <a className="text-sky-700 hover:underline" href={`/pessoas/${pessoaId}`}>
                              Pessoa #{pessoaId}
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => uid && abrirModalVinculo(uid)}
                              disabled={!uid}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            >
                              Vincular...
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => toggleAdmin(u, !isAdmin)}
                            title="Clique para alternar admin"
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isAdmin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isAdmin ? "SIM" : "NÃO"}
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
                            {!pessoaId ? (
                              <button
                                type="button"
                                onClick={() => uid && abrirModalVinculo(uid)}
                                disabled={!uid}
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
              <span className="text-xs text-slate-500">UID: {shortUserId(getUid(modalUser))}</span>
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
                {getPessoaId(modalUser) ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Link className="text-sky-700 hover:underline" href={`/pessoas/${getPessoaId(modalUser)}`}>
                      Pessoa #{getPessoaId(modalUser)}
                    </Link>
                    {getPessoaNome(modalUser) ? (
                      <span className="text-slate-600">- {getPessoaNome(modalUser)}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-2 text-slate-600">
                    <span>Sem vínculo.</span>
                    <button
                      type="button"
                      onClick={() => {
                        const uid = getUid(modalUser);
                        if (!uid) return;
                        setModalOpen(false);
                        abrirModalVinculo(uid);
                      }}
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
        open={vinculoOpen}
        title={<span className="text-base font-semibold text-slate-900">Vincular usuário a pessoa</span>}
        onClose={() => {
          setVinculoOpen(false);
          setVinculoUserId(null);
          setBuscaPessoa("");
          setPessoasEncontradas([]);
          setPessoaSelecionadaId(null);
          setVinculoError(null);
          setVinculoLoading(false);
        }}
      >
        <div className="space-y-4">
          {vinculoError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {vinculoError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={buscaPessoa}
              onChange={(e) => setBuscaPessoa(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") executarBuscaPessoa();
              }}
            />
            <button
              type="button"
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={executarBuscaPessoa}
            >
              Buscar
            </button>
          </div>

          <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
            {pessoasEncontradas.length === 0 ? (
              <div className="p-3 text-sm text-slate-600">Nenhum resultado.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pessoasEncontradas.map((p) => (
                  <li key={String(p.id)} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {p.nome ?? "(Sem nome)"}
                      </div>
                      <div className="truncate text-xs text-slate-600">
                        {p.email ?? "-"} {p.cpf ? ` • CPF: ${p.cpf}` : ""}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="pessoa"
                        checked={pessoaSelecionadaId === String(p.id)}
                        onChange={() => setPessoaSelecionadaId(String(p.id))}
                      />
                      Selecionar
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              onClick={() => setVinculoOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!vinculoUserId || !pessoaSelecionadaId || vinculoLoading}
              onClick={async () => {
                if (!vinculoUserId || !pessoaSelecionadaId) return;
                setVinculoLoading(true);
                setVinculoError(null);
                try {
                  await vincularUsuario(vinculoUserId, pessoaSelecionadaId);
                  setVinculoOpen(false);
                  await carregarUsuarios();
                } catch (e) {
                  setVinculoError(getErrorMessage(e, "Falha ao vincular usuário."));
                } finally {
                  setVinculoLoading(false);
                }
              }}
            >
              {vinculoLoading ? "Vinculando..." : "Confirmar vínculo"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={resetOpen}
        title={
          resetUser ? (
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-slate-900">Redefinir senha</span>
              <span className="text-xs text-slate-500">UID: {shortUserId(getUid(resetUser))}</span>
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






