"use client";

import { useEffect, useMemo, useState } from "react";

type ProjetoSocial = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type Beneficiario = {
  id: number;
  projeto_social_id: number;
  pessoa_id: number;
  status: "ATIVO" | "INATIVO" | "SUSPENSO";
  data_inicio: string;
  data_fim: string | null;
  origem_legado: string | null;
  observacoes: string | null;
  pessoas?: { id: number; nome: string } | null;
};

type ApiResp<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string | null };

export default function BolsasBeneficiariosPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [qProjeto, setQProjeto] = useState("");
  const [projetos, setProjetos] = useState<ProjetoSocial[]>([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState<ProjetoSocial | null>(null);

  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);

  const [pessoaIdNovo, setPessoaIdNovo] = useState("");
  const pessoaIdNovoNum = useMemo(() => Number(pessoaIdNovo), [pessoaIdNovo]);

  async function buscarProjetos() {
    const q = qProjeto.trim();
    if (q.length < 2) {
      setProjetos([]);
      return;
    }
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/projetos-sociais/busca?nome=${encodeURIComponent(q)}`);
    const json = (await res.json()) as ApiResp<ProjetoSocial[]>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else setProjetos(json.data);

    setLoading(false);
  }

  async function carregarBeneficiarios(projetoId: number) {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`/api/projetos-sociais/beneficiarios?projeto_social_id=${projetoId}`);
    const json = (await res.json()) as ApiResp<Beneficiario[]>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else setBeneficiarios(json.data);

    setLoading(false);
  }

  async function adicionarBeneficiario() {
    if (!projetoSelecionado) return;
    if (!Number.isFinite(pessoaIdNovoNum) || pessoaIdNovoNum <= 0) {
      setMsg("Informe um pessoa_id v\u00E1lido.");
      return;
    }

    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/projetos-sociais/beneficiarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projeto_social_id: projetoSelecionado.id,
        pessoa_id: pessoaIdNovoNum,
        status: "ATIVO",
      }),
    });

    const json = (await res.json()) as ApiResp<Beneficiario>;
    if (!json.ok) setMsg(`${json.error}${json.detail ? `: ${json.detail}` : ""}`);
    else {
      setPessoaIdNovo("");
      await carregarBeneficiarios(projetoSelecionado.id);
      setMsg("Benefici\u00E1rio vinculado ao projeto.");
    }

    setLoading(false);
  }

  useEffect(() => {
    setQProjeto("Movimento Conex\u00E3o Dan\u00E7a");
  }, []);

  useEffect(() => {
    void buscarProjetos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qProjeto]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Benefici\u00E1rios do Projeto Social</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um projeto social por nome e gerencie os benefici\u00E1rios (independente de bolsa).
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Selecionar projeto</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Buscar por nome</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={qProjeto}
                onChange={(e) => setQProjeto(e.target.value)}
                placeholder="Ex.: Movimento Conex\u00E3o Dan\u00E7a"
              />
              <p className="text-xs text-muted-foreground">Digite 2+ caracteres para buscar.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Resultados</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={projetoSelecionado?.id ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const p = projetos.find((x) => x.id === id) ?? null;
                  setProjetoSelecionado(p);
                  setBeneficiarios([]);
                  if (p) void carregarBeneficiarios(p.id);
                }}
              >
                <option value="">Selecione...</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (#{p.id})
                  </option>
                ))}
              </select>
              {projetoSelecionado ? (
                <p className="text-xs text-muted-foreground">
                  Selecionado: <span className="font-medium">{projetoSelecionado.nome}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              className="rounded-md border px-4 py-2 text-sm"
              onClick={() => void buscarProjetos()}
              disabled={loading}
            >
              Recarregar busca
            </button>
            {loading ? <span className="text-sm text-muted-foreground">Carregando...</span> : null}
            {msg ? <span className="text-sm">{msg}</span> : null}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Adicionar beneficiario (MVP)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Por enquanto e por <code>pessoa_id</code>. Na proxima rodada vamos trocar por busca de pessoa (nome/CPF).
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-sm">pessoa_id</label>
              <input
                className="w-48 rounded-md border px-3 py-2 text-sm"
                value={pessoaIdNovo}
                onChange={(e) => setPessoaIdNovo(e.target.value)}
                placeholder="Ex.: 123"
              />
            </div>
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={!projetoSelecionado || loading}
              onClick={() => void adicionarBeneficiario()}
            >
              Vincular ao projeto
            </button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold">Beneficiarios</h2>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Pessoa</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Inicio</th>
                  <th className="py-2 text-left">Fim</th>
                  <th className="py-2 text-left">Origem</th>
                </tr>
              </thead>
              <tbody>
                {beneficiarios.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="py-2">
                      <div className="font-medium">{b.pessoas?.nome ?? `Pessoa #${b.pessoa_id}`}</div>
                      <div className="text-xs text-muted-foreground">pessoa_id: {b.pessoa_id}</div>
                    </td>
                    <td className="py-2">{b.status}</td>
                    <td className="py-2">{b.data_inicio}</td>
                    <td className="py-2">{b.data_fim ?? "-"}</td>
                    <td className="py-2">{b.origem_legado ?? "-"}</td>
                  </tr>
                ))}
                {beneficiarios.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={5}>
                      Selecione um projeto para carregar os benefici\u00E1rios.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {projetoSelecionado ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Total exibido: <span className="font-medium">{beneficiarios.length}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
