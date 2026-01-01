"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Modelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
};

type MatriculaBuscaItem = {
  matricula_id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
  label: string;
  aluno_nome: string | null;
  responsavel_nome: string | null;
  tipo_matricula: string | null;
  ano_referencia: number | null;
  status: string | null;
};

export default function AdminContratosEmitirPage() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modelosLoading, setModelosLoading] = useState(true);

  const [q, setQ] = useState("");
  const [buscaLoading, setBuscaLoading] = useState(false);
  const [matriculas, setMatriculas] = useState<MatriculaBuscaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [matriculaSel, setMatriculaSel] = useState<MatriculaBuscaItem | null>(null);
  const [modeloId, setModeloId] = useState<number | null>(null);

  const [valorTotalCentavos, setValorTotalCentavos] = useState<string>("");
  const [variaveisManuaisJson, setVariaveisManuaisJson] = useState<string>(
    JSON.stringify({ OBS_ADICIONAIS: "" }, null, 2),
  );

  const modelosAtivos = useMemo(() => modelos.filter((m) => m.ativo), [modelos]);

  async function carregarModelos() {
    setModelosLoading(true);
    try {
      const res = await fetch("/api/contratos/modelos");
      const json = (await res.json()) as { data?: Modelo[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setModelos(json.data ?? []);
    } finally {
      setModelosLoading(false);
    }
  }

  async function buscar() {
    setBuscaLoading(true);
    setErro(null);
    setOkMsg(null);
    setMatriculaSel(null);
    try {
      const res = await fetch(`/api/contratos/buscar-matriculas?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { data?: MatriculaBuscaItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao buscar matriculas.");
      setMatriculas(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao buscar.");
    } finally {
      setBuscaLoading(false);
    }
  }

  async function emitir() {
    setErro(null);
    setOkMsg(null);

    if (!matriculaSel) {
      setErro("Selecione uma matricula.");
      return;
    }
    if (!modeloId) {
      setErro("Selecione um modelo.");
      return;
    }

    let variaveis_manuais: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(variaveisManuaisJson) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error();
      variaveis_manuais = parsed as Record<string, unknown>;
    } catch {
      setErro("JSON de variaveis manuais invalido.");
      return;
    }

    const snapshot_financeiro: Record<string, unknown> = {};
    const v = valorTotalCentavos.trim();
    if (v.length > 0) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        setErro("Valor total contratado (centavos) invalido.");
        return;
      }
      snapshot_financeiro.valor_total_contratado_centavos = n;
    }

    const res = await fetch("/api/contratos/emitir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matricula_id: matriculaSel.matricula_id,
        contrato_modelo_id: modeloId,
        snapshot_financeiro,
        variaveis_manuais,
      }),
    });

    const json = (await res.json()) as { data?: { id?: number }; error?: string; missing?: string[] };
    if (!res.ok) {
      const missing = Array.isArray((json as Record<string, unknown>).missing)
        ? (json as { missing: string[] }).missing
        : null;
      setErro(missing ? `Placeholders obrigatorios ausentes: ${missing.join(", ")}` : json.error ?? "Falha ao emitir.");
      return;
    }

    setOkMsg(`Contrato emitido com sucesso. ID: ${json.data?.id ?? "?"}`);
  }

  useEffect(() => {
    void carregarModelos();
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Emitir Contrato</h1>
      <p style={{ opacity: 0.8 }}>
        Busque a matricula pelo nome do aluno ou do responsavel, selecione o modelo e emita.
      </p>

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f00", borderRadius: 8 }}>{erro}</div>
      ) : null}

      {okMsg ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #0a0", borderRadius: 8 }}>{okMsg}</div>
      ) : null}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>1) Buscar matricula</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Digite nome, CPF, telefone ou e-mail (aluno ou responsavel)..."
            style={{ minWidth: 420, flex: 1 }}
          />
          <button onClick={() => void buscar()} disabled={buscaLoading || q.trim().length < 2}>
            {buscaLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          {matriculas.length === 0 ? (
            <div style={{ opacity: 0.75 }}>Nenhum resultado ainda.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {matriculas.map((m) => (
                <label key={m.matricula_id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="radio"
                    name="matricula"
                    checked={matriculaSel?.matricula_id === m.matricula_id}
                    onChange={() => setMatriculaSel(m)}
                    style={{ marginTop: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.label}</div>
                    <div style={{ opacity: 0.75 }}>
                      Tipo: {m.tipo_matricula ?? "-"} | Ano: {m.ano_referencia ?? "-"} | Status: {m.status ?? "-"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>2) Selecionar modelo</h2>

        {modelosLoading ? (
          <p>Carregando modelos...</p>
        ) : modelosAtivos.length === 0 ? (
          <p>Nenhum modelo ativo encontrado.</p>
        ) : (
          <select
            value={modeloId ?? ""}
            onChange={(e) => setModeloId(e.target.value ? Number(e.target.value) : null)}
            style={{ marginTop: 8, minWidth: 520 }}
          >
            <option value="">Selecione...</option>
            {modelosAtivos.map((m) => (
              <option key={m.id} value={m.id}>
                [{m.tipo_contrato}] {m.titulo} (ID: {m.id})
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>3) Snapshot contratual (MVP)</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Por enquanto, informe apenas o valor total contratado (em centavos). Depois vamos ligar isso ao motor de precificacao.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxWidth: 360 }}>
          <span>Valor total contratado (centavos)</span>
          <input
            value={valorTotalCentavos}
            onChange={(e) => setValorTotalCentavos(e.target.value)}
            placeholder="Ex.: 120000"
          />
        </label>
      </div>

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>4) Variaveis manuais (JSON)</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Dica: coloque aqui campos como OBS_ADICIONAIS, clausulas especificas, observacoes negociadas, etc.
        </p>

        <textarea
          value={variaveisManuaisJson}
          onChange={(e) => setVariaveisManuaisJson(e.target.value)}
          rows={10}
          style={{ width: "100%", marginTop: 8 }}
        />
      </div>

      <button onClick={() => void emitir()} style={{ marginTop: 14 }} disabled={!matriculaSel || !modeloId}>
        Emitir contrato
      </button>

      <div style={{ marginTop: 18, opacity: 0.8 }}>
        <Link href="/admin/config/contratos" style={{ textDecoration: "none" }}>
          Voltar ao hub de Contratos
        </Link>
      </div>
    </div>
  );
}
