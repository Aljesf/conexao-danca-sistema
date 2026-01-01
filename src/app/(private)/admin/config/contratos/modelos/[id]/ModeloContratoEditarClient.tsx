"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export default function ModeloContratoEditarClient(props: { id: string }) {
  const idNum = Number(props.id);

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
      const res = await fetch(`/api/contratos/modelos/${idNum}`, { method: "GET" });
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
  }, [idNum]);

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

      const res = await fetch(`/api/contratos/modelos/${idNum}`, {
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
    if (!Number.isFinite(idNum)) return;
    void carregar();
  }, [carregar, idNum]);

  if (!Number.isFinite(idNum)) {
    return <div className="p-6">ID invalido.</div>;
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Editar modelo de contrato</h1>
        <p className="text-sm opacity-80">Padronize template e schema (DB/CALC/MANUAL) para emissao.</p>
        <div className="mt-2">
          <Link className="text-sm underline opacity-80" href="/admin/config/contratos/modelos">
            Voltar para modelos
          </Link>
        </div>
      </div>

      {erro ? (
        <Card className="border-red-300">
          <CardContent className="text-sm text-red-700">{erro}</CardContent>
        </Card>
      ) : null}

      {okMsg ? (
        <Card className="border-green-300 mt-3">
          <CardContent className="text-sm text-green-700">{okMsg}</CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Dados do modelo</CardTitle>
          <CardDescription>
            ID: {modelo?.id ?? "-"} | Versao: {modelo?.versao ?? "-"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Titulo</label>
              <div className="mt-1">
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo</label>
              <div className="mt-1">
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {tipos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                Ativo
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Texto do modelo (Markdown)</label>
            <div className="mt-1">
              <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12} />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">Schema de placeholders (JSON)</label>
            <p className="text-xs opacity-70 mt-1">
              Use DB (path), CALC (snapshot) e MANUAL (digitado). Ex.: ALUNO_NOME, VALOR_TOTAL_CONTRATADO, OBS_ADICIONAIS.
            </p>
            <div className="mt-2">
              <Textarea value={schemaJson} onChange={(e) => setSchemaJson(e.target.value)} rows={12} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-between">
          <Link className="text-sm underline opacity-80" href="/admin/config/contratos">
            Voltar ao hub
          </Link>
          <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !texto.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardFooter>
      </Card>

      {loading ? <div className="text-sm opacity-70 mt-3">Carregando...</div> : null}
    </div>
  );
}
