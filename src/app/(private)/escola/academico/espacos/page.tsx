"use client";

import { useEffect, useMemo, useState } from "react";

type Local = {
  id: number;
  nome: string;
  tipo: string;
};

type Espaco = {
  id: number;
  local_id: number;
  nome: string;
  tipo: string;
  capacidade: number | null;
  ativo: boolean;
  observacoes: string | null;
  local?: Local | null;
};

export default function EspacosPage() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [localId, setLocalId] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("SALA");
  const [capacidade, setCapacidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  const [filtroLocalId, setFiltroLocalId] = useState("");

  const locaisMap = useMemo(() => new Map(locais.map((l) => [l.id, l])), [locais]);

  async function carregarLocais() {
    const res = await fetch("/api/locais");
    const json = (await res.json()) as { locais?: Local[]; error?: string };
    if (!res.ok) {
      setErro(json.error ?? "Erro ao carregar locais.");
      return;
    }
    setLocais(json.locais ?? []);
  }

  async function carregarEspacos(localFiltro?: string) {
    const query = localFiltro ? `?local_id=${encodeURIComponent(localFiltro)}` : "";
    const res = await fetch(`/api/espacos${query}`);
    const json = (await res.json()) as { espacos?: Espaco[]; error?: string };
    if (!res.ok) {
      setErro(json.error ?? "Erro ao carregar espacos.");
      return;
    }
    setEspacos(json.espacos ?? []);
  }

  async function criarEspaco() {
    setErro(null);
    const localIdNum = Number(localId);
    if (!Number.isInteger(localIdNum) || localIdNum <= 0) {
      setErro("Selecione um local valido.");
      return;
    }
    if (!nome.trim()) {
      setErro("Informe o nome do espaco.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/espacos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          local_id: localIdNum,
          nome: nome.trim(),
          tipo,
          capacidade: capacidade ? Number(capacidade) : null,
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErro(json.error ?? "Erro ao criar espaco.");
        return;
      }
      setNome("");
      setCapacidade("");
      setObservacoes("");
      await carregarEspacos(filtroLocalId);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregarLocais();
  }, []);

  useEffect(() => {
    void carregarEspacos(filtroLocalId);
  }, [filtroLocalId]);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Espacos</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastre espacos dentro de cada local.</p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Novo espaco</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
              >
                <option value="">-</option>
                {locais.map((local) => (
                  <option key={`local-${local.id}`} value={local.id}>
                    {local.nome} ({local.tipo})
                  </option>
                ))}
              </select>
            </div>
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
                <option value="SALA">SALA</option>
                <option value="PALCO">PALCO</option>
                <option value="AREA">AREA</option>
                <option value="OUTRO">OUTRO</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacidade</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={capacidade}
                onChange={(e) => setCapacidade(e.target.value)}
                type="number"
              />
            </div>
            <div className="md:col-span-2">
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
              onClick={() => void criarEspaco()}
              disabled={saving}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Criar espaco"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Lista de espacos</h2>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Filtrar por local:</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
                value={filtroLocalId}
                onChange={(e) => setFiltroLocalId(e.target.value)}
              >
                <option value="">Todos</option>
                {locais.map((local) => (
                  <option key={`filtro-${local.id}`} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {espacos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhum espaco cadastrado ainda.</p>
          ) : (
            <table className="mt-3 min-w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Local</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Capacidade</th>
                  <th className="px-3 py-2 text-left">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {espacos.map((espaco) => {
                  const local = espaco.local ?? locaisMap.get(espaco.local_id) ?? null;
                  return (
                    <tr key={`espaco-${espaco.id}`}>
                      <td className="px-3 py-2 font-medium">{espaco.nome}</td>
                      <td className="px-3 py-2 text-xs">
                        {local ? `${local.nome} (${local.tipo})` : `Local #${espaco.local_id}`}
                      </td>
                      <td className="px-3 py-2 text-xs">{espaco.tipo}</td>
                      <td className="px-3 py-2 text-xs">{espaco.capacidade ?? "-"}</td>
                      <td className="px-3 py-2 text-xs">{espaco.ativo ? "Sim" : "Nao"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
