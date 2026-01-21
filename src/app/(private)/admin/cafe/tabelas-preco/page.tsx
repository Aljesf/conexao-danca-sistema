"use client";

import { useEffect, useState } from "react";

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
};

export default function AdminCafeTabelasPrecoPage() {
  const [data, setData] = useState<TabelaPreco[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  async function load() {
    const res = await fetch("/api/cafe/tabelas-preco");
    const json = (await res.json()) as { ok: boolean; data: TabelaPreco[] };
    setData(Array.isArray(json?.data) ? json.data : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function criar() {
    if (!codigo.trim() || !nome.trim()) return;
    const res = await fetch("/api/cafe/tabelas-preco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codigo,
        nome,
        descricao: descricao ? descricao : null,
        is_default: isDefault,
      }),
    });
    if (!res.ok) return;
    setCodigo("");
    setNome("");
    setDescricao("");
    setIsDefault(false);
    await load();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Ballet Cafe (Admin) — Tabelas de preco</h1>
          <p className="mt-1 text-sm text-slate-600">
            Crie tabelas (Aluno, Colaborador, Evento...) e defina qual e a tabela principal (default).
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Nova tabela de preco</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Codigo</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="ex.: ALUNO"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="ex.: Preco Aluno (Padrao)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descricao</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="opcional"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            <span className="text-sm">Marcar como tabela principal (default)</span>
          </div>
          <div className="mt-4">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              onClick={() => void criar()}
            >
              Criar tabela
            </button>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Tabelas cadastradas</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Codigo</th>
                  <th className="px-2 py-2 text-left">Nome</th>
                  <th className="px-2 py-2 text-left">Default</th>
                  <th className="px-2 py-2 text-left">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-2 py-2">{t.codigo}</td>
                    <td className="px-2 py-2">{t.nome}</td>
                    <td className="px-2 py-2">{t.is_default ? "Sim" : "Nao"}</td>
                    <td className="px-2 py-2">{t.ativo ? "Sim" : "Nao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Edicao avancada (ativar/desativar/ordem) pode ser adicionada depois; foco agora e operar com duas tabelas.
          </p>
        </div>
      </div>
    </div>
  );
}
