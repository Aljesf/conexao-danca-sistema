"use client";

import { useEffect, useState } from "react";

type Aluno = {
  id: number;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  ativo: boolean;
  created_at?: string | null;
  user_email?: string | null;
};

export default function AlunosPage() {
  // Estado base
  const [lista, setLista] = useState<Aluno[]>([]);
  const [erro, setErro] = useState("");

  // Form de criação
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    data_nascimento: "",
  });

  // Busca
  const [filtro, setFiltro] = useState("");

  // Edição inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({
    nome: "",
    email: "",
    telefone: "",
    data_nascimento: "",
  });

  // ------------ helpers ------------
  async function carregar() {
    setErro("");
    const res = await fetch("/api/alunos", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body?.error || `${res.status} ${res.statusText}`);
      return;
    }
    setLista(body.data ?? []);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const res = await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body?.error || `${res.status} ${res.statusText}`);
      return;
    }
    setForm({ nome: "", email: "", telefone: "", data_nascimento: "" });
    carregar();
  }

  function startEdit(a: Aluno) {
    setEditingId(a.id);
    setEdit({
      nome: a.nome ?? "",
      email: a.email ?? "",
      telefone: a.telefone ?? "",
      data_nascimento: (a.data_nascimento ?? "").slice(0, 10),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit({ nome: "", email: "", telefone: "", data_nascimento: "" });
  }

  async function salvarEdit() {
    if (!editingId) return;
    setErro("");
    const res = await fetch(`/api/alunos/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body?.error || `${res.status} ${res.statusText}`);
      return;
    }
    cancelEdit();
    carregar();
  }

  async function toggleAtivo(a: Aluno) {
    setErro("");
    const res = await fetch(`/api/alunos/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !a.ativo }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body?.error || `${res.status} ${res.statusText}`);
      return;
    }
    carregar();
  }

  async function excluir(id: number) {
    if (!confirm("Excluir este aluno?")) return;
    setErro("");
    const res = await fetch(`/api/alunos/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(body?.error || `${res.status} ${res.statusText}`);
      return;
    }
    carregar();
  }

  useEffect(() => {
    carregar();
  }, []);

  const listaFiltrada = lista.filter((a) => {
    const q = filtro.toLowerCase().trim();
    return (
      !q ||
      [a.nome, a.email, a.telefone].some((v) =>
        (v ?? "").toLowerCase().includes(q)
      )
    );
  });

  // ------------ UI ------------
  return (
    <main
      style={{ padding: 24, color: "white", background: "black", minHeight: "100vh" }}
    >
      <h1>Alunos</h1>

      {/* 🔎 Busca */}
      <input
        placeholder="Buscar por nome/email/telefone"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ padding: 8, width: 320, marginRight: 8 }}
      />

      {/* Formulário de criação */}
      <form
        onSubmit={criar}
        style={{ display: "grid", gap: 8, maxWidth: 520, margin: "12px 0" }}
      >
        <input
          required
          placeholder="Nome"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          placeholder="Telefone"
          value={form.telefone}
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        />
        <input
          placeholder="Data de nascimento (YYYY-MM-DD)"
          value={form.data_nascimento}
          onChange={(e) =>
            setForm({ ...form, data_nascimento: e.target.value })
          }
        />
        <button type="submit">Criar aluno</button>
      </form>

      {erro && <p style={{ color: "tomato" }}>Erro: {erro}</p>}

      {/* Lista */}
      <ul style={{ marginTop: 16 }}>
        {listaFiltrada.map((a) => (
          <li
            key={a.id}
            style={{ marginBottom: 10, borderBottom: "1px solid #333", paddingBottom: 8 }}
          >
            {editingId === a.id ? (
              <>
                <div style={{ display: "grid", gap: 6, maxWidth: 520 }}>
                  <input
                    value={edit.nome}
                    onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                    placeholder="Nome"
                    required
                  />
                  <input
                    value={edit.email}
                    onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                    placeholder="Email"
                  />
                  <input
                    value={edit.telefone}
                    onChange={(e) =>
                      setEdit({ ...edit, telefone: e.target.value })
                    }
                    placeholder="Telefone"
                  />
                  <input
                    value={edit.data_nascimento}
                    onChange={(e) =>
                      setEdit({ ...edit, data_nascimento: e.target.value })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div style={{ marginTop: 6 }}>
                  <button onClick={salvarEdit} style={{ marginRight: 8 }}>
                    Salvar
                  </button>
                  <button onClick={cancelEdit}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <b>#{a.id}</b> — {a.nome} {a.email ? `• ${a.email}` : ""}{" "}
                {a.telefone ? `• ${a.telefone}` : ""}
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  criado em {a.created_at && new Date(a.created_at).toLocaleString()}
                  {a.user_email ? ` • por ${a.user_email}` : ""} •{" "}
                  {a.ativo ? "ativo" : "inativo"}
                </div>
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => startEdit(a)} style={{ marginRight: 8 }}>
                    Editar
                  </button>
                  <button onClick={() => toggleAtivo(a)} style={{ marginRight: 8 }}>
                    {a.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => excluir(a.id)}>Excluir</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

