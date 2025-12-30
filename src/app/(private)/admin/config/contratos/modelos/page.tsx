"use client";

import { useEffect, useMemo, useState } from "react";

type ContratoModelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
  texto_modelo_md: string;
  placeholders_schema_json: unknown;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminContratosModelosPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<ContratoModelo[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [novoTipo, setNovoTipo] = useState("REGULAR");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoTexto, setNovoTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const tipos = useMemo(() => ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"], []);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/modelos", { method: "GET" });
      const json = (await res.json()) as { data?: ContratoModelo[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function criarModelo() {
    setSaving(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_contrato: novoTipo,
          titulo: novoTitulo.trim(),
          texto_modelo_md: novoTexto,
          ativo: true,
          placeholders_schema_json: [],
          observacoes: null,
        }),
      });
      const json = (await res.json()) as { data?: ContratoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar modelo.");
      setNovoTitulo("");
      setNovoTexto("");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar modelo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Contratos - Modelos</h1>
      <p style={{ opacity: 0.8 }}>
        Aqui voce mantem templates (placeholders) para emissao futura. MVP: sem PDF e sem assinatura digital.
      </p>

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f00", borderRadius: 8 }}>{erro}</div>
      ) : null}

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Novo modelo</h2>

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>Tipo</span>
            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 320, flex: 1 }}>
            <span>Titulo</span>
            <input
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex.: Contrato Regular 2026 (v1.0)"
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          <span>Texto do modelo (Markdown)</span>
          <textarea
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            rows={10}
            placeholder="Cole aqui o texto do modelo com placeholders, ex.: {{ALUNO_NOME}}"
          />
        </label>

        <button onClick={() => void criarModelo()} disabled={saving || !novoTitulo.trim() || !novoTexto.trim()} style={{ marginTop: 10 }}>
          {saving ? "Salvando..." : "Criar modelo"}
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Modelos cadastrados</h2>

        {loading ? (
          <p>Carregando...</p>
        ) : itens.length === 0 ? (
          <p>Nenhum modelo cadastrado.</p>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {itens.map((m) => (
              <div key={m.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      [{m.tipo_contrato}] {m.titulo} <span style={{ opacity: 0.7 }}>({m.versao})</span>
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>
                      ID: {m.id} • Ativo: {m.ativo ? "Sim" : "Nao"}
                    </div>
                  </div>
                </div>

                <details style={{ marginTop: 8 }}>
                  <summary>Ver texto</summary>
                  <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{m.texto_modelo_md}</pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
