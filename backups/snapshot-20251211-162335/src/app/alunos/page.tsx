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
  <>
    <h1 className="mb-4 text-2xl font-semibold">Alunos</h1>

    {/* Busca + Ações rápidas */}
    <div className="mb-4 flex items-center gap-2">
      <input
        placeholder="Buscar por nome/email/telefone"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="input max-w-md"
      />
    </div>

    {/* Formulário de criação */}
    <div className="card mb-6">
      <form onSubmit={criar} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nome</label>
          <input
            required
            placeholder="Nome do aluno"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="label">Telefone</label>
          <input
            placeholder="(xx) xxxxx-xxxx"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Data de nascimento (YYYY-MM-DD)</label>
          <input
            placeholder="2005-06-30"
            value={form.data_nascimento}
            onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <button type="submit" className="btn">Criar aluno</button>
        </div>
      </form>
    </div>

    {erro && <p className="mb-4 text-red-400">Erro: {erro}</p>}

    {/* Lista */}
    <ul className="space-y-3">
      {listaFiltrada.map((a) => (
        <li key={a.id} className="card">
          {/* Linha superior */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">#{a.id}</span>
              <strong className="text-base">{a.nome || <em>(sem nome)</em>}</strong>
              <span className="pill">{a.ativo ? "ativo" : "inativo"}</span>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              {editingId === a.id ? (
                <>
                  <button onClick={salvarEdit} className="btn">Salvar</button>
                  <button onClick={cancelEdit} className="btn-outline">Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(a)} className="btn-outline">Editar</button>
                  <button onClick={() => toggleAtivo(a)} className="btn-outline">
                    {a.ativo ? "Inativar" : "Ativar"}
                  </button>
                  <button onClick={() => excluir(a.id)} className="btn-outline">Excluir</button>
                </>
              )}
            </div>
          </div>

          {/* Dados / edição */}
          {editingId === a.id ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Nome</label>
                <input
                  value={edit.nome}
                  onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  value={edit.email}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Telefone</label>
                <input
                  value={edit.telefone}
                  onChange={(e) => setEdit({ ...edit, telefone: e.target.value })}
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label">Data de nascimento</label>
                <input
                  value={edit.data_nascimento}
                  onChange={(e) => setEdit({ ...edit, data_nascimento: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm text-zinc-400">
              <div>{a.email ? <>📧 {a.email}</> : "—"}</div>
              <div>{a.telefone ? <>📱 {a.telefone}</> : "—"}</div>
              <div>
                criado {a.created_at && new Date(a.created_at).toLocaleString()}
                {a.user_email ? <> • por {a.user_email}</> : null}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  </>
);
}

