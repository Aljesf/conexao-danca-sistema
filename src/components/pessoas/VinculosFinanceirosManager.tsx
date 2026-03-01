"use client";

import * as React from "react";

type Pessoa = { id: number; nome: string; cpf: string | null; telefone: string | null };

type Dependente = {
  dependente_pessoa_id: number;
  dependente_nome: string;
  dependente_cpf: string | null;
  dependente_telefone: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
  atualizado_em: string | null;
};

type Responsavel = {
  responsavel_pessoa_id: number;
  responsavel_nome: string;
  responsavel_cpf: string | null;
  responsavel_telefone: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
  atualizado_em: string | null;
};

export function VinculosFinanceirosManager({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);

  const [dependentes, setDependentes] = React.useState<Dependente[]>([]);
  const [responsaveis, setResponsaveis] = React.useState<Responsavel[]>([]);

  const [busca, setBusca] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [sugestoes, setSugestoes] = React.useState<Pessoa[]>([]);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const [depRes, respRes] = await Promise.all([
        fetch(`/api/admin/pessoas/${pessoaId}/dependentes-financeiros`, { cache: "no-store" }),
        fetch(`/api/admin/pessoas/${pessoaId}/responsaveis-financeiros`, { cache: "no-store" }),
      ]);

      const depJson = await depRes.json().catch(() => ({}));
      const respJson = await respRes.json().catch(() => ({}));

      if (!depRes.ok || !depJson?.ok) throw new Error(depJson?.error || `erro_dependentes_${depRes.status}`);
      if (!respRes.ok || !respJson?.ok) throw new Error(respJson?.error || `erro_responsaveis_${respRes.status}`);

      setDependentes(depJson.dependentes ?? []);
      setResponsaveis(respJson.responsaveis ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar vinculos");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!Number.isFinite(pessoaId) || pessoaId <= 0) return;
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoaId]);

  React.useEffect(() => {
    const q = busca.trim();
    if (q.length < 2) {
      setSugestoes([]);
      return;
    }

    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/pessoas/busca?q=${encodeURIComponent(q)}&limit=10`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        setSugestoes(res.ok && json?.ok ? (json.pessoas ?? []) : []);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [busca]);

  async function vincularComoResponsavel(dependenteId: number) {
    setErro(null);
    const res = await fetch("/api/admin/vinculos-financeiros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel_pessoa_id: pessoaId, dependente_pessoa_id: dependenteId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setErro(json?.error || `erro_http_${res.status}`);
      return;
    }
    setBusca("");
    setSugestoes([]);
    await carregar();
  }

  async function removerVinculoComoResponsavel(dependenteId: number) {
    setErro(null);
    const url = `/api/admin/vinculos-financeiros?responsavel_pessoa_id=${pessoaId}&dependente_pessoa_id=${dependenteId}`;
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setErro(json?.error || `erro_http_${res.status}`);
      return;
    }
    await carregar();
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Vinculos</h3>
        <p className="text-sm text-slate-600">Vinculos financeiros entre responsavel e dependentes. Auditavel e corrigivel.</p>
      </div>

      {erro ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</div> : null}

      {loading ? (
        <div className="text-sm text-slate-600">Carregando vinculos...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-800">Dependentes financeiros desta pessoa</div>
            {dependentes.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhum dependente vinculado.</div>
            ) : (
              <ul className="space-y-2">
                {dependentes.map((d) => (
                  <li
                    key={d.dependente_pessoa_id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-100 p-2"
                  >
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{d.dependente_nome}</div>
                      <div className="text-xs text-slate-600">
                        ID #{d.dependente_pessoa_id} - Origem: {d.origem_tipo ?? "--"}
                        {d.origem_id ? ` #${d.origem_id}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      onClick={() => removerVinculoComoResponsavel(d.dependente_pessoa_id)}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-800">Responsaveis financeiros desta pessoa</div>
            {responsaveis.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhum responsavel vinculado.</div>
            ) : (
              <ul className="space-y-2">
                {responsaveis.map((r) => (
                  <li key={r.responsavel_pessoa_id} className="rounded-md border border-slate-100 p-2">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900">{r.responsavel_nome}</div>
                      <div className="text-xs text-slate-600">
                        ID #{r.responsavel_pessoa_id} - Origem: {r.origem_tipo ?? "--"}
                        {r.origem_id ? ` #${r.origem_id}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-slate-200 p-4">
        <div className="text-sm font-semibold text-slate-800">Vincular manualmente</div>
        <div className="text-sm text-slate-600">Busque uma pessoa e vincule como dependente financeiro desta pessoa.</div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Digite nome, CPF ou telefone..."
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />

        {buscando ? <div className="text-xs text-slate-500">Buscando...</div> : null}

        {sugestoes.length > 0 ? (
          <div className="rounded-md border border-slate-100">
            {sugestoes
              .filter((p) => p.id !== pessoaId)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => vincularComoResponsavel(p.id)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="text-sm font-medium text-slate-900">{p.nome}</div>
                  <div className="text-xs text-slate-600">
                    ID #{p.id}
                    {p.cpf ? ` - CPF: ${p.cpf}` : ""}
                    {p.telefone ? ` - Tel: ${p.telefone}` : ""}
                  </div>
                </button>
              ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
