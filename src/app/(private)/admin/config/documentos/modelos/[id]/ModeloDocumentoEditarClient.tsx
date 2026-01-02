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
import { DocumentoTemplateEditor } from "@/components/documentos/DocumentoTemplateEditor";
import { safeParseSchema, type PlaceholderSchemaItem } from "@/lib/documentos/placeholders";

type DocumentoModelo = {
  id: number;
  tipo_contrato: string;
  titulo: string;
  versao: string;
  ativo: boolean;
  texto_modelo_md: string;
  placeholders_schema_json: unknown;
  observacoes: string | null;
};

type Origem =
  | "ALUNO"
  | "RESPONSAVEL_FINANCEIRO"
  | "MATRICULA"
  | "TURMA"
  | "ESCOLA"
  | "FINANCEIRO"
  | "MANUAL";
type Tipo = "TEXTO" | "MONETARIO" | "DATA";

type DocumentoVariavel = {
  id: number;
  codigo: string;
  descricao: string;
  origem: Origem;
  tipo: Tipo;
  path_origem: string | null;
  formato: string | null;
  ativo: boolean;
};

function buildSchemaItem(variavel: DocumentoVariavel): PlaceholderSchemaItem {
  const key = variavel.codigo.trim().toUpperCase();
  const label = variavel.descricao;

  if (variavel.origem === "MANUAL") {
    return { key, label, source: "MANUAL" };
  }

  if (variavel.origem === "FINANCEIRO") {
    const useMoeda = variavel.tipo === "MONETARIO" || variavel.formato === "BRL";
    const fromKey = variavel.path_origem?.trim() || key;
    return {
      key,
      label,
      source: "CALC",
      calc: {
        type: useMoeda ? "FORMAT_MOEDA" : "SNAPSHOT",
        fromKey,
      },
    };
  }

  const base =
    variavel.origem === "ALUNO"
      ? "aluno"
      : variavel.origem === "RESPONSAVEL_FINANCEIRO"
        ? "responsavel"
        : variavel.origem === "TURMA"
          ? "turma"
          : variavel.origem === "ESCOLA"
            ? "escola"
            : "matricula";
  const rawPath = variavel.path_origem?.trim();
  const path = rawPath ? (rawPath.includes(".") ? rawPath : `${base}.${rawPath}`) : base;

  return {
    key,
    label,
    source: "DB",
    db: { path },
  };
}

export default function ModeloDocumentoEditarClient(props: { id: string }) {
  const idNum = Number(props.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [modelo, setModelo] = useState<DocumentoModelo | null>(null);
  const [schemaAtual, setSchemaAtual] = useState<PlaceholderSchemaItem[]>([]);
  const [schemaExtras, setSchemaExtras] = useState<PlaceholderSchemaItem[]>([]);
  const [schemaInit, setSchemaInit] = useState(false);

  const [variaveis, setVariaveis] = useState<DocumentoVariavel[]>([]);
  const [variaveisLoading, setVariaveisLoading] = useState(true);
  const [variaveisErro, setVariaveisErro] = useState<string | null>(null);
  const [variaveisSelecionadas, setVariaveisSelecionadas] = useState<string[]>([]);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("REGULAR");
  const [ativo, setAtivo] = useState(true);
  const [texto, setTexto] = useState("");

  const tipos = useMemo(() => ["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"], []);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/documentos/modelos/${idNum}`, { method: "GET" });
      const json = (await res.json()) as { data?: DocumentoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelo.");

      const m = json.data as DocumentoModelo;
      setModelo(m);

      setTitulo(m.titulo ?? "");
      setTipo(m.tipo_contrato ?? "REGULAR");
      setAtivo(Boolean(m.ativo));
      setTexto(m.texto_modelo_md ?? "");
      setSchemaAtual(safeParseSchema(m.placeholders_schema_json));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [idNum]);

  const carregarVariaveis = useCallback(async () => {
    setVariaveisLoading(true);
    setVariaveisErro(null);
    try {
      const res = await fetch("/api/documentos/variaveis");
      const json = (await res.json()) as { data?: DocumentoVariavel[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar variaveis.");
      setVariaveis(json.data ?? []);
    } catch (e) {
      setVariaveisErro(e instanceof Error ? e.message : "Erro ao carregar variaveis.");
    } finally {
      setVariaveisLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Number.isFinite(idNum)) return;
    void carregar();
    void carregarVariaveis();
  }, [carregar, carregarVariaveis, idNum]);

  useEffect(() => {
    if (schemaInit || variaveisLoading) return;
    const knownCodes = new Set(variaveis.map((v) => v.codigo));
    const selecionadas = schemaAtual.filter((item) => knownCodes.has(item.key)).map((item) => item.key);
    const extras = schemaAtual.filter((item) => !knownCodes.has(item.key));
    setVariaveisSelecionadas(selecionadas);
    setSchemaExtras(extras);
    setSchemaInit(true);
  }, [schemaAtual, schemaInit, variaveis, variaveisLoading]);

  const variaveisAtivas = useMemo(() => variaveis.filter((v) => v.ativo), [variaveis]);
  const variaveisMap = useMemo(() => new Map(variaveis.map((v) => [v.codigo, v])), [variaveis]);
  const selecionadasSet = useMemo(() => new Set(variaveisSelecionadas), [variaveisSelecionadas]);
  const selecionadasInativas = useMemo(() => {
    const ativasSet = new Set(variaveisAtivas.map((v) => v.codigo));
    return variaveisSelecionadas.filter((codigo) => !ativasSet.has(codigo));
  }, [variaveisAtivas, variaveisSelecionadas]);

  const schemaFinal = useMemo(() => {
    const items = variaveisSelecionadas
      .map((codigo) => variaveisMap.get(codigo))
      .filter((v): v is DocumentoVariavel => Boolean(v))
      .map((v) => buildSchemaItem(v));
    const extras = schemaExtras.filter((item) => !selecionadasSet.has(item.key));
    return [...items, ...extras];
  }, [schemaExtras, selecionadasSet, variaveisMap, variaveisSelecionadas]);

  const schemaPreview = useMemo(() => JSON.stringify(schemaFinal, null, 2), [schemaFinal]);

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/documentos/modelos/${idNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo_contrato: tipo,
          ativo,
          texto_modelo_md: texto,
          placeholders_schema_json: schemaFinal,
        }),
      });

      const json = (await res.json()) as { data?: DocumentoModelo; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar.");

      setModelo(json.data ?? null);
      setOkMsg("Modelo salvo com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const toggleVariavel = (codigo: string) => {
    setVariaveisSelecionadas((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo],
    );
  };

  const inserirNoTexto = () => {
    if (variaveisSelecionadas.length === 0) {
      setErro("Selecione ao menos uma variavel para inserir.");
      return;
    }

    const placeholders = variaveisSelecionadas.map((codigo) => `{{${codigo}}}`);
    const novos = placeholders.filter((p) => !texto.includes(p));
    if (novos.length === 0) {
      setOkMsg("Todos os placeholders ja estao no texto.");
      return;
    }

    const suffix = novos.map((item) => `<p>${item}</p>`).join("");
    const novoTexto = texto.trim() ? `${texto}${suffix}` : suffix;
    setTexto(novoTexto);
  };

  if (!Number.isFinite(idNum)) {
    return (
      <SystemPage>
        <SystemContextCard
          title="Editar modelo de documento"
          subtitle="Padronize template e schema (DB/CALC/MANUAL)."
        />
        <SystemSectionCard title="Dados gerais">
          <p className="text-sm text-slate-600">ID invalido.</p>
        </SystemSectionCard>
      </SystemPage>
    );
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Editar modelo de documento"
        subtitle="Padronize template e schema (DB/CALC/MANUAL) para emissao."
      >
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-slate-600 underline" href="/admin/config/documentos/modelos">
            Voltar para modelos
          </Link>
          <Link className="text-slate-600 underline" href="/admin/config/documentos">
            Voltar ao hub
          </Link>
        </div>
        {loading ? <p className="text-xs text-slate-500">Carregando...</p> : null}
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Edite dados gerais e texto do modelo.",
          "Selecione variaveis para gerar placeholders automaticamente.",
          "Use o editor para inserir variaveis no cursor.",
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

      <SystemSectionCard
        title="Variaveis disponiveis"
        description="Selecione variaveis ativas para compor o schema automaticamente."
        footer={
          <Button variant="secondary" onClick={inserirNoTexto} disabled={variaveisSelecionadas.length === 0}>
            Inserir no texto
          </Button>
        }
      >
        {variaveisErro ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {variaveisErro}
          </div>
        ) : null}

        {variaveisLoading ? (
          <p className="text-sm text-slate-600">Carregando variaveis...</p>
        ) : variaveisAtivas.length === 0 ? (
          <p className="text-sm text-slate-600">Nenhuma variavel ativa encontrada.</p>
        ) : (
          <div className="grid gap-3">
            {variaveisAtivas.map((v) => (
              <label key={v.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={selecionadasSet.has(v.codigo)}
                  onChange={() => toggleVariavel(v.codigo)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium">{v.codigo}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {v.descricao} | Origem: {v.origem} | Tipo: {v.tipo}
                  </div>
                  {v.path_origem ? <div className="text-xs text-slate-500">Path: {v.path_origem}</div> : null}
                </div>
              </label>
            ))}
          </div>
        )}

        {schemaExtras.length > 0 ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Existem placeholders no modelo que nao estao cadastrados nas variaveis.
          </div>
        ) : null}

        {selecionadasInativas.length > 0 ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Ha variaveis inativas vinculadas ao modelo: {selecionadasInativas.join(", ")}.
          </div>
        ) : null}
      </SystemSectionCard>

      <SystemSectionCard title="Texto do modelo (editor)">
        <DocumentoTemplateEditor initialHtml={texto} onChangeHtml={setTexto} />
      </SystemSectionCard>

      <SystemSectionCard
        title="Schema de placeholders (JSON)"
        description="Gerado automaticamente a partir das variaveis selecionadas."
        footer={
          <>
            <Link className="text-sm text-slate-600 underline" href="/admin/config/documentos">
              Voltar
            </Link>
            <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !texto.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <Textarea value={schemaPreview} readOnly rows={12} />
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
