"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Layers3, Wand2 } from "lucide-react";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, type RteVariable } from "@/components/ui/RichTextEditor/RichTextEditor";
import { AiAssistenteModelos } from "@/components/documentos/AiAssistenteModelos";
import type { DocumentoModeloDTO, DocumentoModeloFormato } from "@/lib/documentos/modelos.types";

type TipoDocOpt = { id: number; label: string };
type ConjuntoOpt = { id: number; label: string; grupos: Array<{ id: number; label: string }> };
type LayoutTemplateOpt = { id: number; label: string; tipo: "HEADER" | "FOOTER"; height_px: number };

function extrairTexto(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function resumirConteudo(modelo: DocumentoModeloDTO): string {
  const bruto =
    modelo.formato === "RICH_HTML"
      ? modelo.conteudo_html ?? modelo.texto_modelo_md ?? ""
      : modelo.texto_modelo_md ?? modelo.conteudo_html ?? "";
  const texto = extrairTexto(bruto);
  if (!texto) return "Sem conteudo principal preenchido.";
  if (texto.length <= 180) return texto;
  return `${texto.slice(0, 177)}...`;
}

async function fetchVariaveisAtivas(): Promise<RteVariable[]> {
  const res = await fetch("/api/documentos/variaveis?ativo=1", { cache: "no-store" });
  const json = (await res.json()) as {
    data?: Array<{ codigo?: string; descricao?: string }>;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "Falha ao carregar variaveis.");
  }

  return (json.data ?? [])
    .map((v) => ({
      code: String(v.codigo ?? "").trim(),
      label: String(v.descricao ?? v.codigo ?? "").trim(),
    }))
    .filter((v) => v.code.length > 0);
}

export default function AdminDocumentosModelosPage() {
  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState<DocumentoModeloDTO[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoFormato, setNovoFormato] = useState<DocumentoModeloFormato>("RICH_HTML");
  const [novoTextoMarkdown, setNovoTextoMarkdown] = useState("");
  const [novoHtml, setNovoHtml] = useState("<p></p>");
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
  const [saving, setSaving] = useState(false);
  const [variaveis, setVariaveis] = useState<RteVariable[]>([]);
  const [variaveisLoading, setVariaveisLoading] = useState(false);
  const [variaveisErro, setVariaveisErro] = useState<string | null>(null);

  const conteudoOk =
    novoFormato === "RICH_HTML"
      ? extrairTexto(novoHtml).length > 0
      : novoTextoMarkdown.trim().length > 0;

  const tipoDocMap = useMemo(() => {
    const map = new Map<number, string>();
    tiposDoc.forEach((item) => map.set(item.id, item.label));
    return map;
  }, [tiposDoc]);

  const resumoModelos = useMemo(() => {
    const ativos = itens.filter((item) => item.ativo).length;
    const html = itens.filter((item) => item.formato === "RICH_HTML").length;
    return {
      total: itens.length,
      ativos,
      rascunhos: itens.length - ativos,
      html,
    };
  }, [itens]);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/documentos/modelos", { method: "GET" });
      const json = (await res.json()) as { data?: DocumentoModeloDTO[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar modelos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  async function recarregarVariaveis() {
    setVariaveisErro(null);
    setVariaveisLoading(true);
    try {
      const list = await fetchVariaveisAtivas();
      setVariaveis(list);
    } catch (e) {
      setVariaveisErro(e instanceof Error ? e.message : "Erro ao carregar variaveis.");
    } finally {
      setVariaveisLoading(false);
    }
  }

  async function carregarTiposDoc() {
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
  }

  async function carregarLayoutTemplates() {
    try {
      const res = await fetch("/api/documentos/layout-templates?ativo=1", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: Array<{ layout_template_id?: number; nome?: string; tipo?: string; height_px?: number }>;
        message?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.message || "Falha ao carregar templates.");
      const list = (json.data ?? [])
        .map((t) => ({
          id: Number(t.layout_template_id),
          label: String(t.nome ?? "").trim(),
          tipo: String(t.tipo ?? "").trim().toUpperCase() as "HEADER" | "FOOTER",
          height_px: Number(t.height_px) || 0,
        }))
        .filter((t) => Number.isFinite(t.id) && t.id > 0 && (t.tipo === "HEADER" || t.tipo === "FOOTER"));
      setHeaderTemplates(list.filter((t) => t.tipo === "HEADER"));
      setFooterTemplates(list.filter((t) => t.tipo === "FOOTER"));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar templates.");
    }
  }

  async function carregarConjuntosComGrupos() {
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
  }

  async function criarModelo() {
    setSaving(true);
    setErro(null);
    try {
      if (!tipoDocumentoId) {
        throw new Error("Selecione o tipo de documento.");
      }

      const payloadBase = {
        titulo: novoTitulo.trim(),
        formato: novoFormato,
        tipo_documento_id: Number(tipoDocumentoId),
        ativo: true,
        placeholders_schema_json: [],
        observacoes: null,
      };

      const payload =
        novoFormato === "RICH_HTML"
          ? { ...payloadBase, formato: "RICH_HTML", conteudo_html: novoHtml }
          : { ...payloadBase, formato: "MARKDOWN", texto_modelo_md: novoTextoMarkdown };

      const payloadFinal = {
        ...payload,
        conjunto_grupo_id: conjuntoGrupoId || null,
        ordem: vinculoOrdem,
        header_template_id: headerTemplateId || null,
        footer_template_id: footerTemplateId || null,
        header_height_px: headerHeightPx,
        footer_height_px: footerHeightPx,
        page_margin_mm: pageMarginMm,
      };

      const res = await fetch("/api/documentos/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFinal),
      });
      const json = (await res.json()) as { data?: DocumentoModeloDTO; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar modelo.");

      setNovoTitulo("");
      setNovoTextoMarkdown("");
      setNovoHtml("<p></p>");
      setHeaderTemplateId("");
      setFooterTemplateId("");
      setHeaderHeightPx(120);
      setFooterHeightPx(80);
      setPageMarginMm(15);
      setConjuntoId("");
      setConjuntoGrupoId("");
      setVinculoOrdem(1);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao criar modelo.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void carregar();
    void recarregarVariaveis();
    void carregarTiposDoc();
    void carregarLayoutTemplates();
    void carregarConjuntosComGrupos();
  }, []);

  return (
    <SystemPage>
      <SystemContextCard
        title="Documentos - Modelos"
        subtitle="Autoria guiada para criar, testar e evoluir modelos sem abrir toda a governanca tecnica de uma vez."
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{resumoModelos.total} modelos</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
            {resumoModelos.ativos} ativos
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {resumoModelos.rascunhos} em revisao
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
            {resumoModelos.html} em editor rico
          </span>
        </div>
        <Link className="text-sm underline text-slate-600" href="/admin/config/documentos">
          Voltar ao hub de documentos
        </Link>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Comece pelo nome, pelo tipo documental e pelo corpo do texto. A configuracao tecnica fica recolhida.",
          "Use a listagem para retomar versoes existentes sem abrir um cadastro cru.",
          "Assistente de IA, variaveis e colecoes entram como apoio de autoria, nao como etapa inicial obrigatoria.",
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SystemSectionCard
          title="Criar novo modelo"
          description="Comece pelo basico: identidade, tipo do documento e primeiro rascunho. O refinamento entra na edicao por etapas."
          footer={
            <Button
              onClick={() => void criarModelo()}
              disabled={saving || !novoTitulo.trim() || !conteudoOk || !tipoDocumentoId}
            >
              {saving ? "Salvando..." : "Criar modelo e continuar edicao"}
            </Button>
          }
        >
          {erro ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
          ) : null}

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { icon: <FileText className="h-4 w-4" />, title: "1. Identidade", text: "Nome e tipo do documento para situar o modelo na operacao." },
                { icon: <Wand2 className="h-4 w-4" />, title: "2. Corpo inicial", text: "Escreva o primeiro rascunho agora e refine depois no fluxo guiado." },
                { icon: <Layers3 className="h-4 w-4" />, title: "3. Ajuste fino", text: "Cabecalho, rodape, grupos e margens ficam recolhidos como configuracao avancada." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                      {item.icon}
                    </span>
                    {item.title}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nome do modelo</label>
                <div className="mt-1">
                  <Input
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    placeholder="Ex.: Recibo de pagamento confirmado"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Use um nome que ajude a reconhecer versao, finalidade e operacao sem abrir o detalhe.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Documento vinculado</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
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
                <p className="mt-2 text-xs text-slate-500">
                  Nesta primeira rodada de autoria, o tipo documental organiza a experiencia. A operacao canonica segue preservada no backend.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Formato de autoria</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={novoFormato}
                  onChange={(e) => setNovoFormato(e.target.value as DocumentoModeloFormato)}
                >
                  <option value="RICH_HTML">Editor rico (HTML)</option>
                  <option value="MARKDOWN">Markdown (legado)</option>
                </select>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="font-medium text-slate-800">Bloco principal</div>
                <p className="mt-1">
                  Crie o rascunho principal agora. Cabecalho, rodape, conjuntos e detalhes de layout ficam no avancado ou na edicao por etapas.
                </p>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium">Corpo do documento</label>
                <button
                  type="button"
                  onClick={() => void recarregarVariaveis()}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={variaveisLoading}
                >
                  {variaveisLoading ? "Recarregando variaveis..." : "Atualizar variaveis"}
                </button>
              </div>

              {variaveisErro ? <p className="mt-2 text-sm text-red-600">{variaveisErro}</p> : null}

              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
                {novoFormato === "RICH_HTML" ? (
                  <RichTextEditor
                    valueHtml={novoHtml}
                    onChangeHtml={setNovoHtml}
                    enableVariables
                    enableCollections
                    variables={variaveis}
                    minHeightPx={360}
                    pageWidthPx={1120}
                  />
                ) : (
                  <Textarea
                    value={novoTextoMarkdown}
                    onChange={(e) => setNovoTextoMarkdown(e.target.value)}
                    rows={12}
                    placeholder="Escreva o modelo com placeholders, ex.: {{ALUNO_NOME}}"
                  />
                )}
              </div>
            </div>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                Configuracoes avancadas de estrutura
              </summary>
              <p className="mt-2 text-sm text-slate-600">
                Abra somente se este modelo precisar de cabecalho, rodape, grupos ou margens fora do padrao inicial.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Link
                  href="/admin/config/documentos/cabecalhos"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <div className="font-semibold text-slate-900">Gerenciar cabecalhos</div>
                  <p className="mt-1">Cadastre aqui o bloco superior institucional e depois selecione no modelo.</p>
                </Link>
                <Link
                  href="/admin/config/documentos/rodapes"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <div className="font-semibold text-slate-900">Gerenciar rodapes</div>
                  <p className="mt-1">Cadastre aqui assinatura, local e rodape institucional reutilizavel.</p>
                </Link>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                    <option value="">Sem cabecalho especifico</option>
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
                    <option value="">Sem rodape especifico</option>
                    {footerTemplates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label || `Footer ${item.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Conjunto documental</label>
                  <select
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    value={conjuntoId}
                    onChange={(e) => {
                      const next = e.target.value ? Number(e.target.value) : "";
                      setConjuntoId(next);
                      setConjuntoGrupoId("");
                    }}
                  >
                    <option value="">Sem conjunto no inicio</option>
                    {conjuntos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Grupo do conjunto</label>
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
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      type="number"
                      min={40}
                      value={headerHeightPx}
                      onChange={(e) => setHeaderHeightPx(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Rodape (px)</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      type="number"
                      min={40}
                      value={footerHeightPx}
                      onChange={(e) => setFooterHeightPx(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Margem (mm)</label>
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      type="number"
                      min={5}
                      value={pageMarginMm}
                      onChange={(e) => setPageMarginMm(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Ordem do vinculo</label>
                  <input
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    type="number"
                    min={1}
                    value={vinculoOrdem}
                    onChange={(e) => setVinculoOrdem(Number(e.target.value))}
                  />
                </div>
              </div>
            </details>
          </div>
        </SystemSectionCard>

        <div className="space-y-6">
          <SystemSectionCard
            title="Apoio contextual"
            description="Ajuda de autoria, componentes reutilizaveis e assistente ficam aqui sem disputar espaco com o bloco principal."
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              A IA agora entra como apoio contextual. Ela nao substitui o fluxo principal de autoria.
            </div>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/config/documentos/cabecalhos"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Cabecalhos reutilizaveis</div>
                <p className="mt-1">Crie o bloco superior institucional e reaproveite em varios modelos.</p>
              </Link>
              <Link
                href="/admin/config/documentos/rodapes"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">Rodapes reutilizaveis</div>
                <p className="mt-1">Centralize assinatura, local, data e elementos finais em componentes compartilhados.</p>
              </Link>
            </div>
            <div className="mt-4">
              <AiAssistenteModelos
                onApplyTemplateHtml={(html) => {
                  setNovoFormato("RICH_HTML");
                  setNovoHtml(html);
                  setNovoTextoMarkdown(html);
                }}
              />
            </div>
          </SystemSectionCard>

          <SystemSectionCard
            title="Consultar modelos existentes"
            description="Retome um modelo pelo status, formato e tipo documental, sem precisar abrir um formulario tecnico."
          >
            {loading ? (
              <p className="text-sm text-slate-600">Carregando...</p>
            ) : itens.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum modelo cadastrado.</p>
            ) : (
              <div className="grid gap-4">
                {itens.map((item) => {
                  const formato = item.formato ?? "MARKDOWN";
                  const tipoLabel =
                    item.tipo_documento_id && tipoDocMap.has(item.tipo_documento_id)
                      ? tipoDocMap.get(item.tipo_documento_id)
                      : "Tipo documental nao identificado";

                  return (
                    <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">{item.titulo}</h3>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                              {item.versao}
                            </span>
                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-xs font-medium",
                                item.ativo
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-slate-200 bg-slate-100 text-slate-600",
                              ].join(" ")}
                            >
                              {item.ativo ? "Ativo" : "Em revisao"}
                            </span>
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
                              {formato === "RICH_HTML" ? "Editor rico" : "Markdown"}
                            </span>
                          </div>

                          <div className="text-sm text-slate-600">
                            <span className="font-medium text-slate-800">Documento:</span> {tipoLabel}
                          </div>
                          <p className="text-sm text-slate-600">{resumirConteudo(item)}</p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Link
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            href={`/admin/config/documentos/modelos/${item.id}`}
                          >
                            Continuar edicao
                          </Link>
                          <span className="text-xs text-slate-500">Modelo #{item.id}</span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Estrutura</div>
                          <div className="mt-2 text-slate-700">
                            Header {item.header_template_id ? `#${item.header_template_id}` : "padrao"}
                            <br />
                            Rodape {item.footer_template_id ? `#${item.footer_template_id}` : "padrao"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Formato</div>
                          <div className="mt-2 text-slate-700">
                            {formato === "RICH_HTML" ? "Edicao visual com variaveis e colecoes" : "Modo legado em markdown"}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Proximo passo</div>
                          <div className="mt-2 text-slate-700">
                            {item.ativo ? "Revisar corpo, preview e versionamento" : "Concluir o fluxo guiado e ativar"}
                          </div>
                        </div>
                      </div>

                      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                          Ver contexto rapido do modelo
                        </summary>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                          <div>
                            <span className="font-medium text-slate-800">Conteudo resumo:</span> {resumirConteudo(item)}
                          </div>
                          <div>
                            <span className="font-medium text-slate-800">Abertura recomendada:</span> editar em etapas, validar preview e depois ativar.
                          </div>
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            )}
          </SystemSectionCard>
        </div>
      </div>
    </SystemPage>
  );
}
