"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EditorRico, type EditorRicoHandle, type VariavelDoc } from "@/components/documentos/EditorRico";
import { safeParseSchema, type PlaceholderSchemaItem } from "@/lib/documentos/placeholders";
import type { DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type DocumentoModelo = {
  id: number;
  titulo: string;
  versao: string;
  ativo: boolean;
  tipo_documento_id?: number | null;
  formato?: DocumentoModeloFormato | null;
  texto_modelo_md: string | null;
  conteudo_html?: string | null;
  placeholders_schema_json: unknown;
  observacoes: string | null;
  vinculos?: VinculoModelo[];
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

type TipoDocOpt = { id: number; label: string };
type ConjuntoOpt = { id: number; label: string; grupos: Array<{ id: number; label: string }> };

type VinculoModelo = {
  conjunto_grupo_id?: number | null;
  ordem?: number | null;
  grupo_codigo?: string | null;
  grupo_nome?: string | null;
  conjunto_codigo?: string | null;
  conjunto_nome?: string | null;
};

export default function ModeloDocumentoEditarClient(props: { id: string }) {
  const idNum = Number(props.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [modelo, setModelo] = useState<DocumentoModelo | null>(null);
  const [schemaAtual, setSchemaAtual] = useState<PlaceholderSchemaItem[]>([]);

  const [variaveis, setVariaveis] = useState<DocumentoVariavel[]>([]);
  const [variaveisErro, setVariaveisErro] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [formato, setFormato] = useState<DocumentoModeloFormato>("MARKDOWN");
  const [conteudoHtml, setConteudoHtml] = useState("");
  const [textoMarkdown, setTextoMarkdown] = useState("");

  const [tiposDoc, setTiposDoc] = useState<TipoDocOpt[]>([]);
  const [tipoDocumentoId, setTipoDocumentoId] = useState<number | "">("");

  const [conjuntos, setConjuntos] = useState<ConjuntoOpt[]>([]);
  const [conjuntoId, setConjuntoId] = useState<number | "">("");
  const [conjuntoGrupoId, setConjuntoGrupoId] = useState<number | "">("");
  const [vinculoOrdem, setVinculoOrdem] = useState<number>(1);
  const [vinculosAtuais, setVinculosAtuais] = useState<VinculoModelo[]>([]);

  const editorRef = useRef<EditorRicoHandle | null>(null);

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
      setAtivo(Boolean(m.ativo));
      setTipoDocumentoId(m.tipo_documento_id ?? "");
      const vinculos = Array.isArray(m.vinculos) ? m.vinculos : [];
      setVinculosAtuais(vinculos);
      if (vinculos.length > 0) {
        const primeiro = vinculos[0];
        const grupoId = Number(primeiro.conjunto_grupo_id);
        setConjuntoGrupoId(Number.isFinite(grupoId) ? grupoId : "");
        const ordemAtual = Number(primeiro.ordem);
        setVinculoOrdem(Number.isFinite(ordemAtual) && ordemAtual > 0 ? ordemAtual : 1);
      } else {
        setConjuntoGrupoId("");
        setVinculoOrdem(1);
      }
      setConjuntoId("");
      const formatoInicial: DocumentoModeloFormato = m.formato === "RICH_HTML" ? "RICH_HTML" : "MARKDOWN";
      setFormato(formatoInicial);
      const conteudoHtmlInicial = m.conteudo_html ?? m.texto_modelo_md ?? "";
      const textoMarkdownInicial = m.texto_modelo_md ?? m.conteudo_html ?? "";
      setConteudoHtml(conteudoHtmlInicial);
      setTextoMarkdown(textoMarkdownInicial);
      setSchemaAtual(safeParseSchema(m.placeholders_schema_json));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [idNum]);

  const carregarVariaveis = useCallback(async () => {
    setVariaveisErro(null);
    try {
      const res = await fetch("/api/documentos/variaveis");
      const json = (await res.json()) as { data?: DocumentoVariavel[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar variaveis.");
      setVariaveis(json.data ?? []);
    } catch (e) {
      setVariaveisErro(e instanceof Error ? e.message : "Erro ao carregar variaveis.");
    }
  }, []);

  const carregarTiposDoc = useCallback(async () => {
    try {
      const res = await fetch("/api/documentos/tipos?ativo=1", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{ tipo_documento_id?: number; nome?: string; codigo?: string }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar tipos.");
      const list = (json.data ?? [])
        .map((t) => ({
          id: Number(t.tipo_documento_id),
          label: `${String(t.nome ?? "").trim()} (${String(t.codigo ?? "").trim()})`,
        }))
        .filter((t) => Number.isFinite(t.id) && t.id > 0);
      setTiposDoc(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar tipos.");
    }
  }, []);

  const carregarConjuntosComGrupos = useCallback(async () => {
    try {
      const res = await fetch("/api/documentos/conjuntos?include=grupos", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{
          id?: number;
          nome?: string;
          codigo?: string;
          grupos?: Array<{ id?: number; nome?: string; codigo?: string }>;
        }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar conjuntos.");
      const list = (json.data ?? [])
        .map((c) => ({
          id: Number(c.id),
          label: `${String(c.nome ?? "").trim()} (${String(c.codigo ?? "").trim()})`,
          grupos: (c.grupos ?? [])
            .map((g) => ({
              id: Number(g.id),
              label: `${String(g.nome ?? "").trim()} (${String(g.codigo ?? "").trim()})`,
            }))
            .filter((g) => Number.isFinite(g.id) && g.id > 0),
        }))
        .filter((c) => Number.isFinite(c.id) && c.id > 0);
      setConjuntos(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar conjuntos.");
    }
  }, []);

  useEffect(() => {
    if (!Number.isFinite(idNum)) return;
    void carregar();
    void carregarVariaveis();
    void carregarTiposDoc();
    void carregarConjuntosComGrupos();
  }, [carregar, carregarConjuntosComGrupos, carregarTiposDoc, carregarVariaveis, idNum]);

  useEffect(() => {
    if (!conjuntoGrupoId || conjuntos.length === 0) return;
    const conjunto = conjuntos.find((c) => c.grupos.some((g) => g.id === conjuntoGrupoId));
    if (conjunto) setConjuntoId(conjunto.id);
  }, [conjuntos, conjuntoGrupoId]);

  const variaveisAtivas = useMemo(() => variaveis.filter((v) => v.ativo), [variaveis]);
  const variaveisEditor = useMemo<VariavelDoc[]>(
    () =>
      variaveisAtivas.map((v) => ({
        code: v.codigo,
        label: v.descricao || v.codigo,
      })),
    [variaveisAtivas],
  );
  const schemaFinal = schemaAtual;
  const schemaPreview = useMemo(() => JSON.stringify(schemaAtual, null, 2), [schemaAtual]);
  const conteudoOk =
    formato === "RICH_HTML"
      ? conteudoHtml.replace(/<[^>]+>/g, "").trim().length > 0
      : textoMarkdown.trim().length > 0;

  async function salvar() {
    setSaving(true);
    setErro(null);
    setOkMsg(null);

    try {
      if (!tipoDocumentoId) {
        throw new Error("Selecione o tipo de documento.");
      }

      const res = await fetch(`/api/documentos/modelos/${idNum}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          ativo,
          formato,
          tipo_documento_id: tipoDocumentoId,
          conjunto_grupo_id: conjuntoGrupoId || null,
          ordem: vinculoOrdem,
          ...(formato === "RICH_HTML" ? { conteudo_html: conteudoHtml } : { texto_modelo_md: textoMarkdown }),
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
          "Use o editor para inserir variaveis no cursor.",
        ]}
      />

      <SystemSectionCard
        title="Dados gerais"
        description={`ID: ${modelo?.id ?? "-"} | Versao: ${modelo?.versao ?? "-"}`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Titulo</label>
            <div className="mt-1">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo de documento</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm"
              value={tipoDocumentoId}
              onChange={(e) => setTipoDocumentoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {tiposDoc.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Formato</label>
            <div className="mt-1">
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={formato}
                onChange={(e) => setFormato(e.target.value as DocumentoModeloFormato)}
              >
                <option value="RICH_HTML">Editor rico (HTML)</option>
                <option value="MARKDOWN">Markdown (legado)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Conjunto (opcional)</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm"
              value={conjuntoId}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : "";
                setConjuntoId(next);
                setConjuntoGrupoId("");
              }}
            >
              <option value="">Selecione...</option>
              {conjuntos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Grupo (opcional)</label>
            <select
              className="mt-1 w-full rounded-md border p-2 text-sm"
              value={conjuntoGrupoId}
              onChange={(e) => setConjuntoGrupoId(e.target.value ? Number(e.target.value) : "")}
              disabled={!conjuntoId}
            >
              <option value="">{conjuntoId ? "Selecione..." : "Selecione um conjunto primeiro"}</option>
              {(conjuntos.find((c) => c.id === conjuntoId)?.grupos || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Ordem do vinculo (opcional)</label>
            <input
              className="mt-1 w-full rounded-md border p-2 text-sm"
              type="number"
              min={1}
              value={vinculoOrdem}
              onChange={(e) => setVinculoOrdem(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Se o modelo estiver vinculado a mais de um grupo, gerencie os demais vinculos em Conjuntos e Grupos.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Vinculos atuais</label>
            {vinculosAtuais.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Sem vinculos ativos.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {vinculosAtuais.map((v) => (
                  <li key={`${v.conjunto_grupo_id ?? "v"}-${v.ordem ?? 0}`}>
                    {v.conjunto_nome ?? "-"} / {v.grupo_nome ?? "-"} (ordem {v.ordem ?? 1})
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Ativo
            </label>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Texto do modelo">
        {variaveisErro ? <p className="mb-2 text-sm text-red-600">{variaveisErro}</p> : null}
        {formato === "RICH_HTML" ? (
          <EditorRico
            ref={editorRef}
            valueHtml={conteudoHtml}
            onChangeHtml={setConteudoHtml}
            variaveis={variaveisEditor}
          />
        ) : (
          <Textarea
            value={textoMarkdown}
            onChange={(e) => setTextoMarkdown(e.target.value)}
            rows={12}
            placeholder="Cole aqui o texto do modelo com placeholders, ex.: {{ALUNO_NOME}}"
          />
        )}
      </SystemSectionCard>

      <SystemSectionCard
        title="Schema de placeholders (JSON)"
        description="Persistido junto ao modelo para integracao."
        footer={
          <>
            <Link className="text-sm text-slate-600 underline" href="/admin/config/documentos">
              Voltar
            </Link>
            <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !conteudoOk}>
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
