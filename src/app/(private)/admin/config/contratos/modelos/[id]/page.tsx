"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ContratoModelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
  texto_modelo_md: string;
  placeholders_schema_json: unknown;
  observacoes: string | null;
};

export default function AdminContratoModeloEditarPage(props: { params: { id: string } }) {
  const id = Number(props.params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [modelo, setModelo] = useState<ContratoModelo | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("REGULAR");
  const [ativo, setAtivo] = useState(true);
  const [texto, setTexto] = useState("");
  const [schemaJson, setSchemaJson] = useState("[]");

  const tipos = useMemo(() => ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"], []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/contratos/modelos/${id}`, { method: "GET" });
      const json = (await res.json()) as { data?: ContratoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelo.");

      const m = json.data as ContratoModelo;
      setModelo(m);
      setTitulo(m.titulo ?? "");
      setTipo(m.tipo_contrato ?? "REGULAR");
      setAtivo(Boolean(m.ativo));
      setTexto(m.texto_modelo_md ?? "");
      setSchemaJson(JSON.stringify(m.placeholders_schema_json ?? [], null, 2));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOkMsg(null);

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(schemaJson);
      } catch {
        throw new Error("Schema JSON invalido. Corrija antes de salvar.");
      }

      const res = await fetch(`/api/contratos/modelos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo_contrato: tipo,
          ativo,
          texto_modelo_md: texto,
          placeholders_schema_json: parsed,
        }),
      });

      const json = (await res.json()) as { data?: ContratoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar.");

      setModelo(json.data ?? null);
      setOkMsg("Modelo salvo com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    void carregar();
  }, [carregar, id]);

  if (!Number.isFinite(id)) {
    return <div style={{ padding: 16 }}>ID invalido.</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Editar modelo de contrato</h1>

      {loading ? <p>Carregando...</p> : null}

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f00", borderRadius: 8 }}>{erro}</div>
      ) : null}

      {okMsg ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #0a0", borderRadius: 8 }}>{okMsg}</div>
      ) : null}

      {modelo ? (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ opacity: 0.75 }}>
            ID: {modelo.id} | Versao: {modelo.versao}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 320, flex: 1 }}>
              <span>Titulo</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span>Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24 }}>
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              <span>Ativo</span>
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <span>Texto do modelo (Markdown)</span>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={14} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <span>Schema de placeholders (JSON)</span>
            <textarea value={schemaJson} onChange={(e) => setSchemaJson(e.target.value)} rows={14} />
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              Exemplo de item:
              <pre style={{ whiteSpace: "pre-wrap" }}>
{`{
  "key": "ALUNO_NOME",
  "label": "Nome do aluno",
  "source": "DB",
  "required": true,
  "db": { "path": "aluno.nome" }
}`}
              </pre>
            </div>
          </label>

          <button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !texto.trim()} style={{ marginTop: 10 }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
