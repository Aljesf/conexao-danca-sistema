"use client";

import { useEffect, useMemo, useState } from "react";

type Projeto = {
  id: number;
  escola_id: number | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type ApiResp<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string | null };

export default function BolsasProjetosPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Projeto[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const canCreate = useMemo(() => nome.trim().length >= 2, [nome]);

  async function load() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/bolsas/projetos?ativo=true");
    const json = (await res.json()) as ApiResp<Projeto[]>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else setItems(json.data);
    setLoading(false);
  }

  async function create() {
    if (!canCreate) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/bolsas/projetos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || null, ativo: true }),
    });
    const json = (await res.json()) as ApiResp<Projeto>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else {
      setNome("");
      setDescricao("");
      await load();
      setMsg("Projeto social criado.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Projetos sociais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre o projeto social institucional da escola (ex.: Movimento Conexao Danca).
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Criar novo</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Nome</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Movimento Conexao Danca"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm">Descricao</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Texto curto sobre o projeto."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canCreate || loading}
              onClick={() => void create()}
            >
              Criar
            </button>
            <button className="rounded-md border px-4 py-2 text-sm" disabled={loading} onClick={() => void load()}>
              Recarregar
            </button>
            {loading ? <span className="text-sm text-muted-foreground">Carregando...</span> : null}
          </div>

          {msg ? <p className="mt-3 text-sm">{msg}</p> : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Ativos</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">ID</th>
                  <th className="py-2 text-left">Nome</th>
                  <th className="py-2 text-left">Descricao</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2">{p.id}</td>
                    <td className="py-2 font-medium">{p.nome}</td>
                    <td className="py-2 text-muted-foreground">{p.descricao ?? "-"}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={3}>
                      Nenhum projeto cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
