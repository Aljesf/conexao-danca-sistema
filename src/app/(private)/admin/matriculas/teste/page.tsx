"use client";

import React, { useMemo, useState } from "react";

type PessoaOption = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  ativo?: boolean;
};

type TurmaOption = {
  turma_id: number;
  nome: string | null;
  status: string | null;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

function parsePositiveInt(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function pessoaLabel(p: PessoaOption) {
  const nome = p.nome?.trim() || "Sem nome";
  const cpf = p.cpf ? ` CPF:${p.cpf}` : "";
  const email = p.email ? ` ${p.email}` : "";
  return `${nome} (#${p.id})${cpf}${email}`;
}

function turmaLabel(t: TurmaOption) {
  const nome = t.nome?.trim() || "Sem nome";
  return `${nome} (#${t.turma_id})`;
}

export default function AdminMatriculasTestePage() {
  const [pessoaQuery, setPessoaQuery] = useState("");
  const [respQuery, setRespQuery] = useState("");
  const [turmaQuery, setTurmaQuery] = useState("");

  const [pessoaOptions, setPessoaOptions] = useState<PessoaOption[]>([]);
  const [respOptions, setRespOptions] = useState<PessoaOption[]>([]);
  const [turmaOptions, setTurmaOptions] = useState<TurmaOption[]>([]);

  const [pessoaId, setPessoaId] = useState("");
  const [respId, setRespId] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const [anoRef, setAnoRef] = useState("");
  const [dataMatricula, setDataMatricula] = useState("");
  const [mesInicio, setMesInicio] = useState("");
  const [gerarProrata, setGerarProrata] = useState("true");

  const [searching, setSearching] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<number | null>(null);
  const [submitJson, setSubmitJson] = useState("");

  const years = useMemo(() => {
    const now = new Date();
    const base = now.getFullYear();
    return [base - 1, base, base + 1, base + 2, base + 3];
  }, []);

  async function fetchPessoas(query: string): Promise<PessoaOption[]> {
    if (!query || query.trim().length < 2) return [];
    const res = await fetch(`/api/pessoas/busca?q=${encodeURIComponent(query.trim())}`);
    const json = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok || json.ok === false) {
      const msg = typeof json.error === "string" ? json.error : `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return (json.pessoas as PessoaOption[]) ?? [];
  }

  async function fetchTurmas(query: string): Promise<TurmaOption[]> {
    if (!query || query.trim().length < 2) return [];
    const res = await fetch(`/api/turmas/busca?query=${encodeURIComponent(query.trim())}`);
    const json = (await res.json().catch(() => ({}))) as ApiResponse;
    if (!res.ok || json.ok === false) {
      const msg = typeof json.error === "string" ? json.error : `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return (json.turmas as TurmaOption[]) ?? [];
  }

  async function buscarPessoa(setter: (v: PessoaOption[]) => void, query: string) {
    setSearching(true);
    try {
      const data = await fetchPessoas(query);
      setter(data);
    } catch (e) {
      setter([]);
    } finally {
      setSearching(false);
    }
  }

  async function buscarTurma() {
    setSearching(true);
    try {
      const data = await fetchTurmas(turmaQuery);
      setTurmaOptions(data);
    } catch {
      setTurmaOptions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    setSubmitLoading(true);
    setSubmitStatus(null);
    setSubmitJson("");

    const payload: Record<string, unknown> = {
      pessoa_id: parsePositiveInt(pessoaId),
      responsavel_financeiro_id: parsePositiveInt(respId),
      turma_id: parsePositiveInt(turmaId),
      ano_referencia: parsePositiveInt(anoRef),
      gerar_prorata: gerarProrata === "true",
    };

    if (dataMatricula.trim()) payload.data_matricula = dataMatricula.trim();
    const mesInicioNum = parsePositiveInt(mesInicio);
    if (mesInicioNum) payload.mes_inicio_cobranca = mesInicioNum;

    try {
      const res = await fetch("/api/matriculas/operacional/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      setSubmitStatus(res.status);
      setSubmitJson(JSON.stringify(json, null, 2));
    } catch (e) {
      setSubmitStatus(0);
      setSubmitJson(JSON.stringify({ error: "fetch_failed", message: String(e) }, null, 2));
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Admin / Matriculas / Teste</h1>
      <div style={{ color: "rgba(0,0,0,0.6)", marginTop: 4 }}>
        Tela interna para validar a API de criacao de matricula (sem UX final).
      </div>

      <div style={{ marginTop: 16, border: "1px solid #e6e6e6", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Dados principais</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Aluno (pessoa)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input
                value={pessoaQuery}
                onChange={(e) => setPessoaQuery(e.target.value)}
                placeholder="Buscar pessoa (min 2 chars)"
                style={{ flex: "1 1 280px", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
              <button
                onClick={() => buscarPessoa(setPessoaOptions, pessoaQuery)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                disabled={searching}
              >
                Buscar
              </button>
            </div>
            <select
              value={pessoaId}
              onChange={(e) => setPessoaId(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
            >
              <option value="">Selecione um aluno...</option>
              {pessoaOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {pessoaLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Responsavel financeiro (pessoa)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input
                value={respQuery}
                onChange={(e) => setRespQuery(e.target.value)}
                placeholder="Buscar pessoa (min 2 chars)"
                style={{ flex: "1 1 280px", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
              <button
                onClick={() => buscarPessoa(setRespOptions, respQuery)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                disabled={searching}
              >
                Buscar
              </button>
            </div>
            <select
              value={respId}
              onChange={(e) => setRespId(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
            >
              <option value="">Selecione um responsavel...</option>
              {respOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {pessoaLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Turma</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              <input
                value={turmaQuery}
                onChange={(e) => setTurmaQuery(e.target.value)}
                placeholder="Buscar turma (min 2 chars)"
                style={{ flex: "1 1 280px", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
              <button
                onClick={buscarTurma}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                disabled={searching}
              >
                Buscar
              </button>
            </div>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              style={{ width: "100%", marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
            >
              <option value="">Selecione uma turma...</option>
              {turmaOptions.map((t) => (
                <option key={t.turma_id} value={t.turma_id}>
                  {turmaLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Ano referencia</div>
              <select
                value={anoRef}
                onChange={(e) => setAnoRef(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              >
                <option value="">Selecione...</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Data matricula</div>
              <input
                type="date"
                value={dataMatricula}
                onChange={(e) => setDataMatricula(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Mes inicio cobranca (opcional)</div>
              <select
                value={mesInicio}
                onChange={(e) => setMesInicio(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              >
                <option value="">Auto</option>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const value = String(idx + 1);
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Gerar prorata</div>
              <select
                value={gerarProrata}
                onChange={(e) => setGerarProrata(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
              >
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleSubmit}
              disabled={submitLoading}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: submitLoading ? "rgba(0,0,0,0.06)" : "#fff",
                cursor: submitLoading ? "not-allowed" : "pointer",
              }}
            >
              {submitLoading ? "Criando..." : "Criar matricula"}
            </button>
            {submitStatus !== null ? (
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>Status: {submitStatus}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #e6e6e6", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Resposta (JSON bruto)</div>
        <pre
          style={{
            margin: 0,
            maxHeight: 420,
            overflow: "auto",
            background: "rgba(0,0,0,0.03)",
            borderRadius: 8,
            padding: 12,
            fontSize: 12,
          }}
        >
          {submitJson || "{}"}
        </pre>
      </div>
    </div>
  );
}
