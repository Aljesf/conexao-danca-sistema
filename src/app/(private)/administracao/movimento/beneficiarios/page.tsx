"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Beneficiario = {
  id: string;
  pessoa_id: string;
  status: "EM_ANALISE" | "APROVADO" | "SUSPENSO" | "ENCERRADO";
  relatorio_socioeconomico: string;
  observacoes?: string | null;
  criado_em: string;
};

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export default function MovimentoBeneficiariosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Beneficiario[]>([]);
  const [q, setQ] = useState("");

  const [pessoaId, setPessoaId] = useState("");
  const [relatorio, setRelatorio] = useState("");
  const [obs, setObs] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    apiGet<{ ok: boolean; data: Beneficiario[] }>("/api/admin/movimento/beneficiarios")
      .then((r) => {
        if (!alive) return;
        setItems(r.ok ? r.data : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((b) => `${b.pessoa_id} ${b.status}`.toLowerCase().includes(term));
  }, [items, q]);

  async function criarBeneficiario() {
    setMsg(null);
    const payload = {
      pessoa_id: pessoaId.trim(),
      relatorio_socioeconomico: relatorio.trim(),
      observacoes: obs.trim() || undefined,
    };

    const r = await apiPost<{ ok: boolean; codigo?: string; data?: Beneficiario }>(
      "/api/admin/movimento/beneficiarios",
      payload
    );

    if (!r.ok) {
      setMsg(`Erro: ${r.codigo ?? "ERRO_INESPERADO"}`);
      return;
    }
    if (r.data) {
      setItems((prev) => [r.data, ...prev]);
      setPessoaId("");
      setRelatorio("");
      setObs("");
      setMsg("Beneficiario criado com sucesso.");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Beneficiarios do Movimento</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro institucional (porta de entrada) para concessao de creditos.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento">
            Voltar ao painel
          </Link>
          <Link className="px-3 py-2 rounded-md border text-sm" href="/administracao/movimento/creditos">
            Conceder creditos
          </Link>
        </div>
      </div>

      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-base font-medium">Novo beneficiario</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm">Pessoa ID (bigint)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
              placeholder="Ex.: 123"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm">Relatorio socioeconomico (obrigatorio)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={relatorio}
              onChange={(e) => setRelatorio(e.target.value)}
              placeholder="Resumo institucional (min. 10 caracteres)"
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm">Observacoes</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-md border text-sm" onClick={criarBeneficiario}>
            Criar
          </button>
          {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">Lista</h2>
          <input
            className="w-full max-w-sm rounded-md border px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por pessoa_id ou status"
          />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b">
                  <th className="py-2 pr-4">Pessoa</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Criado em</th>
                  <th className="py-2 pr-4">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={4}>
                      Nenhum beneficiario encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2 pr-4">{b.pessoa_id}</td>
                      <td className="py-2 pr-4">{b.status}</td>
                      <td className="py-2 pr-4">{new Date(b.criado_em).toLocaleString()}</td>
                      <td className="py-2 pr-4">
                        <Link className="underline" href={`/administracao/movimento/beneficiarios/${b.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
