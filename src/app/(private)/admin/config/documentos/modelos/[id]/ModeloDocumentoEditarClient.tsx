"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Braces, CheckCircle2, Eye, Layers3, Settings2, Sparkles, Table, X } from "lucide-react";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RichTextEditor,
  type RichTextEditorHandle,
  type RteVariable,
} from "@/components/ui/RichTextEditor/RichTextEditor";
import { AiAssistenteModelos } from "@/components/documentos/AiAssistenteModelos";
import { ColecaoPickerModal, type ColecaoCatalogo } from "@/components/documentos/ColecaoPickerModal";
import { safeParseSchema, type PlaceholderSchemaItem } from "@/lib/documentos/placeholders";
import type { DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type DocumentoModelo = {
  id: number;
  titulo: string;
  versao: string;
  ativo: boolean;
  tipo_documento_id?: number | null;
  layout_id?: number | null;
  header_template_id?: number | null;
  footer_template_id?: number | null;
  header_height_px?: number | null;
  footer_height_px?: number | null;
  page_margin_mm?: number | null;
  formato?: DocumentoModeloFormato | null;
  texto_modelo_md: string | null;
  conteudo_html?: string | null;
  cabecalho_html?: string | null;
  rodape_html?: string | null;
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

type MatriculaTesteOption = {
  id: number;
  aluno_nome: string;
  curso_nome: string;
  ano: string;
  label: string;
};

type SimulacaoDocumentoPayload = {
  htmlSimulado: string;
  variaveisResolvidas: Record<string, string>;
  colecoesResolvidas: Record<string, Array<Record<string, string>>>;
  origem: {
    tipo: "MATRICULA";
    id: number;
    label: string;
  };
};

type TipoDocOpt = { id: number; label: string };
type ConjuntoOpt = { id: number; label: string; grupos: Array<{ id: number; label: string }> };
type LayoutTemplateOpt = { id: number; label: string; tipo: "HEADER" | "FOOTER"; height_px: number };

type VinculoModelo = {
  conjunto_grupo_id?: number | null;
  ordem?: number | null;
  grupo_codigo?: string | null;
  grupo_nome?: string | null;
  conjunto_codigo?: string | null;
  conjunto_nome?: string | null;
};

type StepKey =
  | "identidade"
  | "operacao"
  | "estrutura"
  | "corpo"
  | "variaveis"
  | "preview"
  | "ativacao";

type StepDef = {
  key: StepKey;
  short: string;
  title: string;
  description: string;
};

type EditorDrawerMode = "variaveis" | "ia" | null;

const STEPS: StepDef[] = [
  {
    key: "identidade",
    short: "01",
    title: "Identidade do modelo",
    description: "Defina nome, referencia de versao e o enquadramento basico do documento.",
  },
  {
    key: "operacao",
    short: "02",
    title: "Operacao documental",
    description: "Conecte o modelo ao tipo documental e alinhe o uso esperado.",
  },
  {
    key: "estrutura",
    short: "03",
    title: "Estrutura reutilizavel",
    description: "Cabecalho, rodape e vinculos ficam aqui, com avancado recolhido.",
  },
  {
    key: "corpo",
    short: "04",
    title: "Corpo do documento",
    description: "Escreva e refine o texto principal com editor e apoio contextual.",
  },
  {
    key: "variaveis",
    short: "05",
    title: "Variaveis e colecoes",
    description: "Revise o que o modelo usa e mantenha a governanca tecnica fora do centro da tela.",
  },
  {
    key: "preview",
    short: "06",
    title: "Preview e teste",
    description: "Conferir o documento faz parte do fluxo antes da ativacao.",
  },
  {
    key: "ativacao",
    short: "07",
    title: "Ativacao e versionamento",
    description: "Salve, ative e finalize a iteracao quando o modelo estiver confiavel.",
  },
];

const DOCUMENT_PAGE_WIDTH = 1120;

function markdownToHtmlSimples(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "<p></p>";
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocos = escaped
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\n/g, "<br/>")}</p>`);
  return blocos.join("") || "<p></p>";
}

function extrairTexto(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function StepButton(props: {
  step: StepDef;
  active: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  const { step, active, completed, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-4 text-left transition",
        active
          ? "border-slate-900 bg-slate-950 text-white shadow"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.24em] opacity-80">{step.short}</span>
        {completed ? <CheckCircle2 className="h-4 w-4" /> : null}
      </div>
      <div className="mt-2 text-sm font-semibold">{step.title}</div>
      <p className="mt-2 text-xs opacity-80">{step.description}</p>
    </button>
  );
}

function InfoBox(props: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{props.title}</div>
      <p className="mt-2 text-sm text-slate-700">{props.text}</p>
    </div>
  );
}

export default function ModeloDocumentoEditarClient(props: { id: string }) {
  const idNum = Number(props.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<StepKey>("identidade");

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
  const [headerTemplates, setHeaderTemplates] = useState<LayoutTemplateOpt[]>([]);
  const [footerTemplates, setFooterTemplates] = useState<LayoutTemplateOpt[]>([]);
  const [headerTemplateId, setHeaderTemplateId] = useState<number | "">("");
  const [footerTemplateId, setFooterTemplateId] = useState<number | "">("");
  const [headerHeightPx, setHeaderHeightPx] = useState<number>(120);
  const [footerHeightPx, setFooterHeightPx] = useState<number>(80);
  const [pageMarginMm, setPageMarginMm] = useState<number>(15);

  const [conjuntos, setConjuntos] = useState<ConjuntoOpt[]>([]);
  const [conjuntoId, setConjuntoId] = useState<number | "">("");
  const [conjuntoGrupoId, setConjuntoGrupoId] = useState<number | "">("");
  const [vinculoOrdem, setVinculoOrdem] = useState<number>(1);
  const [vinculosAtuais, setVinculosAtuais] = useState<VinculoModelo[]>([]);
  const [matriculasTeste, setMatriculasTeste] = useState<MatriculaTesteOption[]>([]);
  const [matriculasTesteLoading, setMatriculasTesteLoading] = useState(false);
  const [matriculasTesteErro, setMatriculasTesteErro] = useState<string | null>(null);
  const [matriculaTesteId, setMatriculaTesteId] = useState<number | "">("");
  const [previewMode, setPreviewMode] = useState<"estrutural" | "simulado">("estrutural");
  const [simulacaoLoading, setSimulacaoLoading] = useState(false);
  const [simulacaoErro, setSimulacaoErro] = useState<string | null>(null);
  const [htmlSimulado, setHtmlSimulado] = useState<string | null>(null);
  const [variaveisSimuladas, setVariaveisSimuladas] = useState<Record<string, string>>({});
  const [colecoesSimuladas, setColecoesSimuladas] = useState<Record<string, Array<Record<string, string>>>>({});
  const [origemSimulada, setOrigemSimulada] = useState<SimulacaoDocumentoPayload["origem"] | null>(null);
  const [editorDrawerMode, setEditorDrawerMode] = useState<EditorDrawerMode>(null);
  const [colecaoDrawerOpen, setColecaoDrawerOpen] = useState(false);
  const editorRef = useRef<RichTextEditorHandle | null>(null);

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
      setHeaderTemplateId(m.header_template_id ?? "");
      setFooterTemplateId(m.footer_template_id ?? "");

      const headerHeightValue = Number(m.header_height_px);
      const footerHeightValue = Number(m.footer_height_px);
      const pageMarginValue = Number(m.page_margin_mm);
      setHeaderHeightPx(Number.isFinite(headerHeightValue) && headerHeightValue > 0 ? headerHeightValue : 120);
      setFooterHeightPx(Number.isFinite(footerHeightValue) && footerHeightValue > 0 ? footerHeightValue : 80);
      setPageMarginMm(Number.isFinite(pageMarginValue) && pageMarginValue > 0 ? pageMarginValue : 15);

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
      setConteudoHtml(m.conteudo_html ?? m.texto_modelo_md ?? "");
      setTextoMarkdown(m.texto_modelo_md ?? m.conteudo_html ?? "");
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
        .map((item) => ({
          id: Number(item.tipo_documento_id),
          label: `${String(item.nome ?? "").trim()} (${String(item.codigo ?? "").trim()})`,
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0);
      setTiposDoc(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar tipos.");
    }
  }, []);

  const carregarLayoutTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/documentos/layout-templates?ativo=1", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{ layout_template_id?: number; nome?: string; tipo?: string; height_px?: number }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar templates.");
      const list = (json.data ?? [])
        .map((item) => ({
          id: Number(item.layout_template_id),
          label: String(item.nome ?? "").trim(),
          tipo: String(item.tipo ?? "").trim().toUpperCase() as "HEADER" | "FOOTER",
          height_px: Number(item.height_px) || 0,
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0 && (item.tipo === "HEADER" || item.tipo === "FOOTER"));
      setHeaderTemplates(list.filter((item) => item.tipo === "HEADER"));
      setFooterTemplates(list.filter((item) => item.tipo === "FOOTER"));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar templates.");
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
        .map((item) => ({
          id: Number(item.id),
          label: `${String(item.nome ?? "").trim()} (${String(item.codigo ?? "").trim()})`,
          grupos: (item.grupos ?? [])
            .map((grupo) => ({
              id: Number(grupo.id),
              label: `${String(grupo.nome ?? "").trim()} (${String(grupo.codigo ?? "").trim()})`,
            }))
            .filter((grupo) => Number.isFinite(grupo.id) && grupo.id > 0),
        }))
        .filter((item) => Number.isFinite(item.id) && item.id > 0);
      setConjuntos(list);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar conjuntos.");
    }
  }, []);

  const carregarMatriculasTeste = useCallback(async () => {
    setMatriculasTesteErro(null);
    setMatriculasTesteLoading(true);
    try {
      const res = await fetch("/api/documentos/teste/matriculas?limit=40", { cache: "no-store" });
      const json = (await res.json()) as Array<MatriculaTesteOption> | { error?: string };
      if (!res.ok) {
        const error =
          Array.isArray(json) ? "Falha ao carregar matriculas para teste." : json.error ?? "Falha ao carregar matriculas para teste.";
        throw new Error(error);
      }

      const list = Array.isArray(json) ? json : [];
      setMatriculasTeste(list);
      setMatriculaTesteId((current) => {
        if (current && list.some((item) => item.id === current)) return current;
        return list[0]?.id ?? "";
      });
    } catch (e) {
      setMatriculasTesteErro(e instanceof Error ? e.message : "Erro ao carregar matriculas para teste.");
    } finally {
      setMatriculasTesteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Number.isFinite(idNum)) return;
    void carregar();
    void carregarVariaveis();
    void carregarTiposDoc();
    void carregarLayoutTemplates();
    void carregarConjuntosComGrupos();
  }, [carregar, carregarConjuntosComGrupos, carregarLayoutTemplates, carregarTiposDoc, carregarVariaveis, idNum]);

  useEffect(() => {
    if (!conjuntoGrupoId || conjuntos.length === 0) return;
    const conjunto = conjuntos.find((item) => item.grupos.some((grupo) => grupo.id === conjuntoGrupoId));
    if (conjunto) setConjuntoId(conjunto.id);
  }, [conjuntos, conjuntoGrupoId]);

  useEffect(() => {
    if (activeStep !== "preview" || matriculasTeste.length > 0 || matriculasTesteLoading) return;
    void carregarMatriculasTeste();
  }, [activeStep, carregarMatriculasTeste, matriculasTeste.length, matriculasTesteLoading]);

  useEffect(() => {
    setPreviewMode("estrutural");
    setHtmlSimulado(null);
    setVariaveisSimuladas({});
    setColecoesSimuladas({});
    setOrigemSimulada(null);
    setSimulacaoErro(null);
  }, [
    conteudoHtml,
    textoMarkdown,
    formato,
    headerTemplateId,
    footerTemplateId,
    headerHeightPx,
    footerHeightPx,
    pageMarginMm,
  ]);

  const variaveisAtivas = useMemo(() => variaveis.filter((item) => item.ativo), [variaveis]);
  const variaveisEditor = useMemo<RteVariable[]>(
    () =>
      variaveisAtivas.map((item) => ({
        code: item.codigo,
        label: item.descricao || item.codigo,
      })),
    [variaveisAtivas],
  );
  const schemaPreview = useMemo(() => JSON.stringify(schemaAtual, null, 2), [schemaAtual]);
  const conteudoOk =
    formato === "RICH_HTML" ? extrairTexto(conteudoHtml).length > 0 : textoMarkdown.trim().length > 0;
  const previewHtml = useMemo(
    () => (formato === "RICH_HTML" ? conteudoHtml || "<p></p>" : markdownToHtmlSimples(textoMarkdown)),
    [conteudoHtml, formato, textoMarkdown],
  );
  const colecoesDetectadas = useMemo(() => {
    const source = formato === "RICH_HTML" ? conteudoHtml : textoMarkdown;
    const regex = /{{#([A-Za-z0-9_]+)}}/g;
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const code = String(match[1] ?? "").trim();
      if (code) found.add(code.toUpperCase());
    }
    return Array.from(found);
  }, [conteudoHtml, formato, textoMarkdown]);
  const tipoDocumentoAtual = useMemo(
    () => tiposDoc.find((item) => item.id === tipoDocumentoId)?.label ?? "Selecione um tipo documental.",
    [tipoDocumentoId, tiposDoc],
  );
  const previewHtmlAtual = previewMode === "simulado" && htmlSimulado ? htmlSimulado : previewHtml;
  const colecoesSimuladasResumo = useMemo(
    () =>
      Object.entries(colecoesSimuladas).map(([codigo, itens]) => ({
        codigo,
        quantidade: Array.isArray(itens) ? itens.length : 0,
      })),
    [colecoesSimuladas],
  );
  const currentStepIndex = STEPS.findIndex((step) => step.key === activeStep);

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
          header_template_id: headerTemplateId || null,
          footer_template_id: footerTemplateId || null,
          header_height_px: headerHeightPx,
          footer_height_px: footerHeightPx,
          page_margin_mm: pageMarginMm,
          ...(formato === "RICH_HTML" ? { conteudo_html: conteudoHtml } : { texto_modelo_md: textoMarkdown }),
          placeholders_schema_json: schemaAtual,
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

  function goToStep(offset: number) {
    const nextIndex = currentStepIndex + offset;
    if (nextIndex < 0 || nextIndex >= STEPS.length) return;
    setActiveStep(STEPS[nextIndex].key);
  }

  async function simularDocumento() {
    if (!matriculaTesteId) {
      setSimulacaoErro("Selecione uma matricula para testar.");
      return;
    }

    setSimulacaoLoading(true);
    setSimulacaoErro(null);

    try {
      const res = await fetch(`/api/documentos/modelos/${idNum}/simular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeloId: idNum,
          origemTipo: "MATRICULA",
          origemId: Number(matriculaTesteId),
        }),
      });

      const json = (await res.json()) as SimulacaoDocumentoPayload | { error?: string };
      if (!res.ok || !("htmlSimulado" in json)) {
        const message = "error" in json ? json.error ?? "Falha ao simular documento." : "Falha ao simular documento.";
        throw new Error(message);
      }

      setHtmlSimulado(json.htmlSimulado);
      setVariaveisSimuladas(json.variaveisResolvidas ?? {});
      setColecoesSimuladas(json.colecoesResolvidas ?? {});
      setOrigemSimulada(json.origem ?? null);
      setPreviewMode("simulado");
    } catch (e) {
      setSimulacaoErro(e instanceof Error ? e.message : "Erro ao simular documento.");
    } finally {
      setSimulacaoLoading(false);
    }
  }

  function inserirVariavelNoEditor(code: string) {
    editorRef.current?.insertPlaceholder(code);
  }

  function inserirColecaoNoEditor(colecao: ColecaoCatalogo) {
    editorRef.current?.insertCollectionTable(colecao);
  }

  if (!Number.isFinite(idNum)) {
    return (
      <SystemPage>
        <SystemContextCard title="Editar modelo de documento" subtitle="Fluxo guiado de autoria documental." />
        <SystemSectionCard title="Identidade do modelo">
          <p className="text-sm text-slate-600">ID invalido.</p>
        </SystemSectionCard>
      </SystemPage>
    );
  }

  if (loading) {
    return (
      <SystemPage>
        <SystemContextCard title="Editar modelo de documento" subtitle="Fluxo guiado de autoria documental." />
        <SystemSectionCard title="Carregando">
          <p className="text-sm text-slate-600">Carregando modelo...</p>
        </SystemSectionCard>
      </SystemPage>
    );
  }

  const currentStep = STEPS[currentStepIndex];

  return (
    <SystemPage>
      <SystemContextCard
        title={titulo.trim() ? `Modelo: ${titulo}` : "Editar modelo de documento"}
        subtitle="Fluxo guiado para estruturar, testar e ativar modelos sem expor toda a governanca tecnica ao mesmo tempo."
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Modelo #{modelo?.id ?? "-"}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{modelo?.versao ?? "-"}</span>
          <span
            className={[
              "rounded-full px-3 py-1",
              ativo ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {ativo ? "Ativo" : "Em revisao"}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
            {formato === "RICH_HTML" ? "Editor rico" : "Markdown"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="text-slate-600 underline" href="/admin/config/documentos/modelos">
            Voltar para modelos
          </Link>
          <Link className="text-slate-600 underline" href="/admin/config/documentos">
            Voltar ao hub
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Siga as etapas em ordem: identidade, operacao, estrutura, corpo, apoio tecnico, preview e ativacao.",
          "O modo avancado fica recolhido nas etapas de estrutura, variaveis e ativacao.",
          "O preview faz parte do fluxo antes de ativar o modelo.",
        ]}
      />

      {erro ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      ) : null}
      {okMsg ? (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">{okMsg}</div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-7">
        {STEPS.map((step, index) => (
          <StepButton
            key={step.key}
            step={step}
            active={step.key === activeStep}
            completed={index < currentStepIndex}
            onClick={() => setActiveStep(step.key)}
          />
        ))}
      </div>

      <SystemSectionCard
        title={currentStep.title}
        description={currentStep.description}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Etapa {currentStepIndex + 1} de {STEPS.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => goToStep(-1)} disabled={currentStepIndex === 0}>
                Etapa anterior
              </Button>
              {currentStepIndex < STEPS.length - 1 ? (
                <Button onClick={() => goToStep(1)}>Proxima etapa</Button>
              ) : (
                <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !conteudoOk || !tipoDocumentoId}>
                  {saving ? "Salvando..." : "Salvar modelo"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {activeStep === "identidade" ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do modelo</label>
                <div className="mt-1">
                  <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Recibo por pagamento confirmado" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox title="Versao atual" text={modelo?.versao ?? "Sem versao registrada."} />
                <InfoBox title="Estado atual" text={ativo ? "Pronto para uso administrativo." : "Ainda em revisao antes da ativacao."} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">O que fica nesta etapa</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Nome claro para encontrar o modelo na listagem.</li>
                <li>Leitura rapida de versao, status e formato.</li>
                <li>Preparacao para vincular o contexto documental na etapa seguinte.</li>
              </ul>
            </div>
          </div>
        ) : null}

        {activeStep === "operacao" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <label className="text-sm font-medium">Documento vinculado</label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={tipoDocumentoId}
                onChange={(e) => setTipoDocumentoId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Selecione...</option>
                {tiposDoc.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBox title="Contexto atual" text={tipoDocumentoAtual} />
                <InfoBox
                  title="Sem mexer no backend"
                  text="Nesta primeira rodada de UX, a operacao canonica permanece resolvida pelo backend. Aqui a autoria organiza o modelo pelo tipo documental."
                />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Sparkles className="h-4 w-4" />
                Orientacao da etapa
              </div>
              <p className="mt-3 text-sm text-slate-600">
                O objetivo agora e situar o modelo no catalogo documental antes de abrir configuracoes mais tecnicas. A governanca detalhada continua preservada fora do fluxo principal.
              </p>
            </div>
          </div>
        ) : null}

        {activeStep === "estrutura" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Componentes reutilizaveis</div>
                  <p className="mt-1 text-sm text-slate-600">
                    Se o cabecalho ou o rodape ainda nao existirem, cadastre primeiro o componente institucional e depois volte para selecionar aqui.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/config/documentos/cabecalhos"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Gerenciar cabecalhos
                  </Link>
                  <Link
                    href="/admin/config/documentos/rodapes"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Gerenciar rodapes
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Cabecalho reutilizavel</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={headerTemplateId}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : "";
                    setHeaderTemplateId(next);
                    if (next) {
                      const found = headerTemplates.find((item) => item.id === next);
                      if (found && Number.isFinite(found.height_px) && found.height_px > 0) {
                        setHeaderHeightPx(found.height_px);
                      }
                    }
                  }}
                >
                  <option value="">Usar cabecalho padrao</option>
                  {headerTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label || `Header ${item.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rodape reutilizavel</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={footerTemplateId}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : "";
                    setFooterTemplateId(next);
                    if (next) {
                      const found = footerTemplates.find((item) => item.id === next);
                      if (found && Number.isFinite(found.height_px) && found.height_px > 0) {
                        setFooterHeightPx(found.height_px);
                      }
                    }
                  }}
                >
                  <option value="">Usar rodape padrao</option>
                  {footerTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label || `Footer ${item.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                Modo avancado de estrutura
              </summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Conjunto</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={conjuntoId}
                    onChange={(e) => {
                      const next = e.target.value ? Number(e.target.value) : "";
                      setConjuntoId(next);
                      setConjuntoGrupoId("");
                    }}
                  >
                    <option value="">Sem conjunto definido</option>
                    {conjuntos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Grupo</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={conjuntoGrupoId}
                    onChange={(e) => setConjuntoGrupoId(e.target.value ? Number(e.target.value) : "")}
                    disabled={!conjuntoId}
                  >
                    <option value="">{conjuntoId ? "Selecione..." : "Selecione um conjunto primeiro"}</option>
                    {(conjuntos.find((item) => item.id === conjuntoId)?.grupos || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3 md:col-span-2">
                  <div>
                    <label className="text-sm font-medium">Header (px)</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type="number" min={40} value={headerHeightPx} onChange={(e) => setHeaderHeightPx(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rodape (px)</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type="number" min={40} value={footerHeightPx} onChange={(e) => setFooterHeightPx(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margem (mm)</label>
                    <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type="number" min={5} value={pageMarginMm} onChange={(e) => setPageMarginMm(Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ordem do vinculo</label>
                  <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type="number" min={1} value={vinculoOrdem} onChange={(e) => setVinculoOrdem(Number(e.target.value))} />
                </div>
              </div>
            </details>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-800">Vinculos atuais</div>
              {vinculosAtuais.length === 0 ? (
                <p className="mt-2">Sem vinculos ativos neste momento.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {vinculosAtuais.map((item) => (
                    <li key={`${item.conjunto_grupo_id ?? "v"}-${item.ordem ?? 0}`}>
                      {item.conjunto_nome ?? "-"} / {item.grupo_nome ?? "-"} (ordem {item.ordem ?? 1})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {activeStep === "corpo" ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
              <div
                className="mx-auto flex w-full flex-wrap items-center justify-between gap-3"
                style={{ maxWidth: `${DOCUMENT_PAGE_WIDTH}px` }}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">Area principal de edicao</div>
                  <p className="mt-1 text-sm text-slate-600">
                    O editor agora ocupa uma largura central de pagina para simular o documento final com leitura mais confortavel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setEditorDrawerMode("variaveis")}>
                    <Braces className="mr-2 h-4 w-4" />
                    Inserir variavel
                  </Button>
                  <Button variant="outline" onClick={() => setColecaoDrawerOpen(true)}>
                    <Table className="mr-2 h-4 w-4" />
                    Inserir colecao
                  </Button>
                  <Button variant="outline" onClick={() => setEditorDrawerMode("ia")}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Assistente IA
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className="w-full space-y-4 px-1 sm:px-0"
                style={{ maxWidth: `${DOCUMENT_PAGE_WIDTH}px` }}
              >
              <div>
                <label className="text-sm font-medium">Formato de edicao</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={formato}
                  onChange={(e) => setFormato(e.target.value as DocumentoModeloFormato)}
                >
                  <option value="RICH_HTML">Editor rico (HTML)</option>
                  <option value="MARKDOWN">Markdown (legado)</option>
                </select>
              </div>
              {variaveisErro ? <p className="text-sm text-red-600">{variaveisErro}</p> : null}
              {formato === "RICH_HTML" ? (
                <RichTextEditor
                  ref={editorRef}
                  valueHtml={conteudoHtml}
                  onChangeHtml={setConteudoHtml}
                  enableVariables
                  enableCollections
                  variables={variaveisEditor}
                  minHeightPx={640}
                  pageWidthPx={DOCUMENT_PAGE_WIDTH}
                  toolbarSticky
                  showVariablesInline={false}
                  showCollectionsInline={false}
                  toolbarExtras={
                    <>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setEditorDrawerMode("variaveis")}
                      >
                        <Braces className="h-3.5 w-3.5" />
                        Variaveis
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setColecaoDrawerOpen(true)}
                      >
                        <Table className="h-3.5 w-3.5" />
                        Colecoes
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => setEditorDrawerMode("ia")}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Assistente IA
                      </button>
                    </>
                  }
                />
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={textoMarkdown}
                    onChange={(e) => setTextoMarkdown(e.target.value)}
                    rows={16}
                    placeholder="Escreva o documento com placeholders, ex.: {{ALUNO_NOME}}"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const html = markdownToHtmlSimples(textoMarkdown);
                      setConteudoHtml(html);
                      setFormato("RICH_HTML");
                    }}
                  >
                    Levar para o editor rico
                  </Button>
                </div>
              )}
            </div>
          </div>
            <div className="flex justify-center">
              <div
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 md:px-5"
                style={{ maxWidth: `${DOCUMENT_PAGE_WIDTH}px` }}
              >
                <div className="font-semibold text-slate-900">Contexto editorial</div>
                <p className="mt-2">
                  Variaveis, colecoes e assistente IA ficam recolhidos por padrao e entram apenas quando voce precisa apoiar a escrita.
                </p>
              </div>
            </div>

            {editorDrawerMode ? (
              <div className="fixed inset-0 z-50 flex items-stretch justify-end">
                <div className="absolute inset-0 bg-slate-950/30" onClick={() => setEditorDrawerMode(null)} aria-hidden="true" />
                <div className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {editorDrawerMode === "variaveis" ? "Variaveis de apoio" : "Assistente IA"}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {editorDrawerMode === "variaveis"
                          ? "Insira placeholders sem comprimir a area principal do documento."
                          : "Use a IA como apoio pontual de redacao, sem competir com a pagina principal."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      onClick={() => setEditorDrawerMode(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto px-5 py-5">
                    {editorDrawerMode === "variaveis" ? (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                          Selecione uma variavel para inserir no ponto atual do cursor.
                        </div>
                        <div className="grid gap-2">
                          {variaveisAtivas.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => inserirVariavelNoEditor(item.codigo)}
                            >
                              <div className="text-sm font-semibold text-slate-900">{item.codigo}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.descricao || "Sem descricao"}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <AiAssistenteModelos
                        className="border-slate-200 shadow-none"
                        onApplyTemplateHtml={(html) => {
                          setFormato("RICH_HTML");
                          setConteudoHtml(html);
                          setTextoMarkdown(html);
                          setEditorDrawerMode(null);
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <ColecaoPickerModal
              open={colecaoDrawerOpen}
              onClose={() => setColecaoDrawerOpen(false)}
              onInsert={(colecao) => {
                inserirColecaoNoEditor(colecao);
                setColecaoDrawerOpen(false);
              }}
            />
          </div>
        ) : null}

        {activeStep === "variaveis" ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <InfoBox title="Variaveis ativas" text={`${variaveisAtivas.length} variaveis disponiveis para apoiar a autoria.`} />
              <InfoBox title="Colecoes detectadas" text={colecoesDetectadas.length > 0 ? colecoesDetectadas.join(", ") : "Nenhuma colecao detectada no corpo atual."} />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">Acesso rapido</div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link className="underline" href="/admin/config/documentos/variaveis">Abrir governanca de variaveis</Link>
                  <Link className="underline" href="/admin/config/documentos/colecoes">Abrir governanca de colecoes</Link>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Layers3 className="h-4 w-4" />
                  Catalogo rapido para autoria
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {variaveisAtivas.slice(0, 16).map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                      <div className="font-medium text-slate-800">{item.codigo}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.descricao || "Sem descricao"}</div>
                    </div>
                  ))}
                </div>
              </div>
              <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">Schema tecnico (modo avancado)</summary>
                <Textarea className="mt-3" value={schemaPreview} readOnly rows={12} />
              </details>
            </div>
          </div>
        ) : null}

        {activeStep === "preview" ? (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <InfoBox title="Checklist antes de ativar" text="Conferir preview, estrutura e placeholders faz parte da autoria. Ativacao vem depois da validacao." />
              <InfoBox title="Formato atual" text={formato === "RICH_HTML" ? "Preview do HTML autorado no editor rico." : "Preview derivado do markdown legado atual."} />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">Resumo do que sera revisado</div>
                <ul className="mt-3 space-y-2">
                  <li>Documento: {tipoDocumentoAtual}</li>
                  <li>Cabecalho: {headerTemplateId ? `#${headerTemplateId}` : "padrao"}</li>
                  <li>Rodape: {footerTemplateId ? `#${footerTemplateId}` : "padrao"}</li>
                  <li>Colecoes detectadas: {colecoesDetectadas.length > 0 ? colecoesDetectadas.join(", ") : "nenhuma"}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">Testar com dados reais</div>
                <p className="mt-2 text-sm text-slate-600">
                  A simulacao usa dados reais de uma matricula, mas nao emite documento nem grava historico.
                </p>
                <div className="mt-4 grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Origem</label>
                    <Input className="mt-1" value="Matricula" readOnly />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Registro</label>
                    <select
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={matriculaTesteId}
                      onChange={(e) => setMatriculaTesteId(e.target.value ? Number(e.target.value) : "")}
                      disabled={matriculasTesteLoading}
                    >
                      <option value="">{matriculasTesteLoading ? "Carregando matriculas..." : "Selecione uma matricula"}</option>
                      {matriculasTeste.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {matriculasTesteErro ? <p className="mt-2 text-sm text-red-600">{matriculasTesteErro}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void simularDocumento()} disabled={simulacaoLoading || !matriculaTesteId}>
                      {simulacaoLoading ? "Simulando..." : "Simular documento"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewMode("estrutural")}
                      disabled={previewMode === "estrutural"}
                    >
                      Preview estrutural
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setPreviewMode("simulado")}
                      disabled={!htmlSimulado || previewMode === "simulado"}
                    >
                      Preview com dados simulados
                    </Button>
                  </div>
                </div>
                {simulacaoErro ? <p className="mt-3 text-sm text-red-600">{simulacaoErro}</p> : null}
                {origemSimulada ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                    <div className="font-semibold">Preview com dados simulados</div>
                    <p className="mt-1">Origem atual: {origemSimulada.label}</p>
                  </div>
                ) : null}
                {colecoesSimuladasResumo.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-800">Colecoes resolvidas na simulacao</div>
                    <ul className="mt-3 space-y-2">
                      {colecoesSimuladasResumo.map((item) => (
                        <li key={item.codigo}>
                          {item.codigo}: {item.quantidade} item(ns)
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Eye className="h-4 w-4" />
                  Preview integrado da autoria
                </div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium",
                    previewMode === "simulado" && htmlSimulado
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-slate-200 bg-slate-50 text-slate-600",
                  ].join(" ")}
                >
                  {previewMode === "simulado" && htmlSimulado ? "Preview com dados simulados" : "Preview estrutural"}
                </span>
              </div>
              {previewMode === "simulado" && htmlSimulado ? (
                <p className="mt-3 text-sm text-slate-600">
                  Este preview usa uma matricula real para substituir placeholders e colecoes sem emitir documento.
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Este preview mostra a estrutura autorada atual antes da simulacao com dados reais.
                </p>
              )}
              <div className="mt-4 flex justify-center">
                <div
                  className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:px-6"
                  style={{ maxWidth: `${DOCUMENT_PAGE_WIDTH}px` }}
                >
                  <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: previewHtmlAtual }} />
                </div>
              </div>
              {previewMode === "simulado" && Object.keys(variaveisSimuladas).length > 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-800">Variaveis resolvidas na simulacao</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {Object.entries(variaveisSimuladas)
                      .slice(0, 12)
                      .map(([codigo, valor]) => (
                        <div key={codigo} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{codigo}</div>
                          <div className="mt-1 break-all text-slate-800">{valor || "-"}</div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeStep === "ativacao" ? (
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                {ativo ? "Modelo ativo e disponivel para uso" : "Salvar em revisao antes de ativar"}
              </label>
              <InfoBox title="Versionamento atual" text={`Versao ${modelo?.versao ?? "-"} preservada. Esta etapa fecha a iteracao depois do preview.`} />
              <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">Detalhes administrativos recolhidos</summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoBox title="Margem da pagina" text={`${pageMarginMm} mm`} />
                  <InfoBox title="Alturas" text={`Header ${headerHeightPx}px / Rodape ${footerHeightPx}px`} />
                </div>
              </details>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Settings2 className="h-4 w-4" />
                Fechamento da autoria
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Nome: {titulo || "-"}</li>
                <li>Documento: {tipoDocumentoAtual}</li>
                <li>Formato: {formato === "RICH_HTML" ? "Editor rico" : "Markdown"}</li>
                <li>Status pretendido: {ativo ? "Ativo" : "Em revisao"}</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => void salvar()} disabled={saving || !titulo.trim() || !conteudoOk || !tipoDocumentoId}>
                  {saving ? "Salvando..." : ativo ? "Salvar e manter ativo" : "Salvar em revisao"}
                </Button>
                <Button variant="outline" onClick={() => setActiveStep("preview")}>
                  Voltar ao preview
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </SystemSectionCard>
    </SystemPage>
  );
}
