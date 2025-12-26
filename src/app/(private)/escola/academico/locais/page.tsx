"use client";

import { useEffect, useState } from "react";

type Local = {
  id: number;
  nome: string;
  tipo: string;
  endereco: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export default function LocaisPage() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("INTERNO");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function carregarLocais() {
    setErro(null);
    const res = await fetch("/api/locais");
    const json = (await res.json()) as { locais?: Local[]; error?: string };
    if (!res.ok) {
      setErro(json.error ?? "Erro ao carregar locais.");
      return;
    }
    setLocais(json.locais ?? []);
  }

  async function criarLocal() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do local.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/locais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          tipo,
          endereco: endereco.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(json.error ?? "Erro ao criar local.");
        return;
      }
      setNome("");
      setEndereco("");
      setObservacoes("");
      await carregarLocais();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregarLocais();
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Locais</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastre locais internos ou externos.</p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Novo local</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="INTERNO">INTERNO</option>
                <option value="EXTERNO">EXTERNO</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Endereco</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void criarLocal()}
              disabled={saving}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Criar local"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Lista de locais</h2>
          {locais.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum local cadastrado ainda.</p>
          ) : (
            <table className="mt-3 min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Endereco</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {locais.map((local) => (
                  <tr key={`local-${local.id}`}>
                    <td className="px-3 py-2 font-medium">{local.nome}</td>
                    <td className="px-3 py-2 text-xs">{local.tipo}</td>
                    <td className="px-3 py-2 text-xs">{local.endereco ?? "-"}</td>
                    <td className="px-3 py-2 text-xs">{local.ativo ? "Sim" : "Nao"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
