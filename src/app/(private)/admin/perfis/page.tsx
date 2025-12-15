"use client";

import React, { useEffect, useMemo, useState } from "react";
import PlaceholderPage from "@/components/PlaceholderPage";

type RoleSistema = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
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
          width: "min(820px, 96vw)",
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

export default function AdminPerfisPage() {
  const [roles, setRoles] = useState<RoleSistema[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const rolesFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return roles;
    return roles.filter((r) => r.nome.toLowerCase().includes(t) || r.codigo.toLowerCase().includes(t));
  }, [roles, q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [edit, setEdit] = useState<RoleSistema | null>(null);

  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);

  function abrirNovo() {
    setEdit(null);
    setFormCodigo("");
    setFormNome("");
    setFormDescricao("");
    setFormAtivo(true);
    setModalOpen(true);
  }

  function abrirEditar(r: RoleSistema) {
    setEdit(r);
    setFormCodigo(r.codigo);
    setFormNome(r.nome);
    setFormDescricao(r.descricao || "");
    setFormAtivo(r.ativo);
    setModalOpen(true);
  }

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const data = await apiJson<{ ok: true; roles: RoleSistema[] }>("/api/admin/roles");
      setRoles(data.roles || []);
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) setErro("Acesso negado. Você precisa estar logado como admin.");
      else setErro(e?.payload?.details || e?.message || "Erro ao carregar papéis.");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    const codigo = formCodigo.trim();
    const nome = formNome.trim();
    const descricao = formDescricao.trim();

    if (!codigo || !nome) {
      alert("Código e Nome são obrigatórios.");
      return;
    }

    try {
      if (!edit) {
        await apiJson<{ ok: true; role: RoleSistema }>("/api/admin/roles", {
          method: "POST",
          body: JSON.stringify({ codigo, nome, descricao }),
        });
      } else {
        await apiJson<{ ok: true; role: RoleSistema }>("/api/admin/roles", {
          method: "PATCH",
          body: JSON.stringify({ id: edit.id, nome, descricao, ativo: formAtivo }),
        });
      }

      setModalOpen(false);
      await carregar();
    } catch (e: any) {
      alert(e?.payload?.details || e?.message || "Erro ao salvar papel.");
    }
  }

  async function toggleAtivo(r: RoleSistema, ativo: boolean) {
    const prev = roles;
    setRoles((arr) => arr.map((x) => (x.id === r.id ? { ...x, ativo } : x)));

    try {
      await apiJson<{ ok: true; role: RoleSistema }>("/api/admin/roles", {
        method: "PATCH",
        body: JSON.stringify({ id: r.id, ativo }),
      });
    } catch (e: any) {
      setRoles(prev);
      alert(e?.payload?.details || e?.message || "Erro ao atualizar ativo.");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  if (erro && !roles.length) {
    return <PlaceholderPage title="Perfis" description={erro} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Perfis</h1>
          <div style={{ color: "rgba(0,0,0,0.6)", marginTop: 4 }}>
            Catálogo de papéis (roles) do sistema. Usuários recebem papéis na tela de Usuários.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por nome ou código..."
            style={{
              width: 340,
              maxWidth: "70vw",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
            }}
          />
          <button
            onClick={abrirNovo}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Novo papel
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
          <div style={{ fontWeight: 700 }}>Papéis cadastrados</div>
          <div style={{ color: "rgba(0,0,0,0.6)" }}>{loading ? "Carregando..." : `${rolesFiltrados.length} papel(is)`}</div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.01)" }}>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Código</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Nome</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Ativo</th>
                <th style={{ padding: 12, borderBottom: "1px solid #eee" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rolesFiltrados.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", fontFamily: "monospace" }}>{r.codigo}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0", fontWeight: 650 }}>{r.nome}</td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={!!r.ativo} onChange={(e) => toggleAtivo(r, e.target.checked)} />
                      {r.ativo ? "Sim" : "Não"}
                    </label>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <button
                      onClick={() => abrirEditar(r)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && rolesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 16, color: "rgba(0,0,0,0.6)" }}>
                    Nenhum papel encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} title={edit ? `Editar papel: ${edit.codigo}` : "Novo papel"} onClose={() => setModalOpen(false)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Código</div>
            <input
              value={formCodigo}
              onChange={(e) => setFormCodigo(e.target.value)}
              placeholder="Ex.: ADMIN"
              disabled={!!edit}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            />
            <div style={{ marginTop: 6, color: "rgba(0,0,0,0.55)", fontSize: 12 }}>Código é identificador estável. Não altera depois.</div>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Nome</div>
            <input
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex.: Administrador"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Descrição</div>
            <textarea
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Opcional..."
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </div>

          {edit ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={formAtivo} onChange={(e) => setFormAtivo(e.target.checked)} />
                Ativo
              </label>
            </div>
          ) : null}

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setModalOpen(false)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>
              Cancelar
            </button>
            <button
              onClick={salvar}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 700 }}
            >
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
