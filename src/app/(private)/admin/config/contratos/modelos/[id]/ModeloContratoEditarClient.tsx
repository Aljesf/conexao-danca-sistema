"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
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
    return (
      <SystemPage>
        <SystemContextCard title="Editar modelo de contrato" subtitle="Padronize template e schema (DB/CALC/MANUAL)." />
        <SystemSectionCard title="Dados gerais">
          <p className="text-sm text-slate-600">ID invalido.</p>
        </SystemSectionCard>
      </SystemPage>
    );
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Editar modelo de contrato"
        subtitle="Padronize template e schema (DB/CALC/MANUAL) para emissao."
      >
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline text-slate-600" href="/admin/config/contratos/modelos">
            Voltar para modelos
          </Link>
          <Link className="underline text-slate-600" href="/admin/config/contratos">
            Voltar ao hub
          </Link>
        </div>
        {loading ? <p className="text-xs text-slate-500">Carregando...</p> : null}
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Edite dados gerais, texto e schema em blocos separados.",
          "Use placeholders em CAIXA ALTA para variaveis do contrato.",
          "Salve sempre que ajustar o schema ou o texto.",
        ]}
      />

      <SystemSectionCard
        title="Dados gerais"
        description={`ID: ${modelo?.id ?? "-"} | Versao: ${modelo?.versao ?? "-"}`}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
      </SystemSectionCard>

      <SystemSectionCard title="Texto do modelo (Markdown)">
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={12} />
      </SystemSectionCard>

      <SystemSectionCard
        title="Schema de placeholders (JSON)"
        description="Use DB (path), CALC (snapshot) e MANUAL (digitado)."
        footer={
          <>
            <Link className="text-sm underline text-slate-600" href="/admin/config/contratos">
              Voltar
            </Link>
            <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !texto.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600">Ex.: ALUNO_NOME, VALOR_TOTAL_CONTRATADO, OBS_ADICIONAIS.</p>
        <div className="mt-2">
          <Textarea value={schemaJson} onChange={(e) => setSchemaJson(e.target.value)} rows={12} />
        </div>
        {erro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
        ) : null}
        {okMsg ? (
          <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {okMsg}
          </div>
        ) : null}
      </SystemSectionCard>
    </SystemPage>
  );
}
