"use client";

/* eslint-disable @next/next/no-img-element */

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import ToolbarRow from "@/components/layout/ToolbarRow";

type Option = { id: string; valor: string; rotulo: string; ordem: number; ativo: boolean };

type Question = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  scale_min?: number | null;
  scale_max?: number | null;
  form_question_options?: Option[];
};

type BlockType = "PERGUNTA" | "TEXTO" | "IMAGEM" | "DIVISOR";
type BlockAlign = "ESQUERDA" | "CENTRO" | "DIREITA";

type Block = {
  id?: string;
  client_id: string;
  ordem: number;
  tipo: BlockType;
  question_id?: string | null;
  titulo?: string | null;
  texto_md?: string | null;
  imagem_url?: string | null;
  alinhamento?: BlockAlign | null;
  obrigatoria?: boolean;
  cond_question_id?: string | null;
  cond_equals_value?: string | null;
  form_questions?: Question | null;
};

type Template = {
  id: string;
  nome: string;
  descricao: string | null;
  status: "draft" | "published" | "archived";
  versao: number;
  header_image_url?: string | null;
  footer_image_url?: string | null;
  intro_text_md?: string | null;
  outro_text_md?: string | null;
};

type QuestionTypeOption = { value: string; label: string };

const QUESTION_TYPES: QuestionTypeOption[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim ou nao" },
  { value: "single_choice", label: "Escolha unica" },
  { value: "multi_choice", label: "Multipla escolha" },
  { value: "scale", label: "Escala" },
];

const CONDITION_TYPES = new Set(["boolean", "single_choice", "scale"]);

function isConditionEligible(question: Question): boolean {
  return CONDITION_TYPES.has(question.tipo);
}

function makeClientId(prefix = "block"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function markdownToHtmlSimples(markdown: string): string {
  const trimmed = markdown.trim();
  if (!trimmed) return "<p></p>";
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const blocks = escaped
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\n/g, "<br/>")}</p>`);
  return blocks.join("") || "<p></p>";
}

export default function AdminFormsTemplatesEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: templateId } = use(params);

  const [tpl, setTpl] = useState<Template | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingBlocks, setSavingBlocks] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [footerImageUrl, setFooterImageUrl] = useState("");
  const [introTextMd, setIntroTextMd] = useState("");
  const [outroTextMd, setOutroTextMd] = useState("");
  const [headerUploadFile, setHeaderUploadFile] = useState<File | null>(null);
  const [footerUploadFile, setFooterUploadFile] = useState<File | null>(null);
  const [headerUploading, setHeaderUploading] = useState(false);
  const [footerUploading, setFooterUploading] = useState(false);
  const headerFileRef = useRef<HTMLInputElement | null>(null);
  const footerFileRef = useRef<HTMLInputElement | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [questionCodigo, setQuestionCodigo] = useState("");
  const [questionTitulo, setQuestionTitulo] = useState("");
  const [questionTipo, setQuestionTipo] = useState("text");
  const [questionDescricao, setQuestionDescricao] = useState("");
  const [questionAjuda, setQuestionAjuda] = useState("");
  const [questionErr, setQuestionErr] = useState<string | null>(null);
  const [questionSaving, setQuestionSaving] = useState(false);

  const selectedIds = useMemo(() => {
    const ids = blocks
      .filter((b) => b.tipo === "PERGUNTA")
      .map((b) => b.question_id ?? b.form_questions?.id)
      .filter((id): id is string => !!id);
    return new Set(ids);
  }, [blocks]);

  const load = useCallback(async () => {
    setErr(null);
    setPublicLink(null);
    setSubmissionId(null);
    setLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        fetch(`/api/admin/forms/templates/${templateId}`, { cache: "no-store" }),
        fetch("/api/admin/forms/questions", { cache: "no-store" }),
        fetch(`/api/admin/forms/templates/${templateId}/blocos`, { cache: "no-store" }),
      ]);

      const aj = (await a.json()) as { data?: { template: Template; items?: unknown[] }; error?: string };
      const bj = (await b.json()) as { data?: Question[]; error?: string };
      const cj = (await c.json()) as { data?: Block[]; error?: string };

      if (!a.ok) throw new Error(aj.error ?? "Falha ao carregar template.");
      if (aj.error) throw new Error(aj.error);
      if (!b.ok) throw new Error(bj.error ?? "Falha ao carregar perguntas.");
      if (bj.error) throw new Error(bj.error);
      if (!c.ok) throw new Error(cj.error ?? "Falha ao carregar blocos.");
      if (cj.error) throw new Error(cj.error);

      if (!aj.data?.template) throw new Error("Template nao encontrado.");

      const template = aj.data.template;
      setTpl(template);
      setHeaderImageUrl(template.header_image_url ?? "");
      setFooterImageUrl(template.footer_image_url ?? "");
      setIntroTextMd(template.intro_text_md ?? "");
      setOutroTextMd(template.outro_text_md ?? "");

      const rawBlocks = Array.isArray(cj.data) ? cj.data : [];
      const normalizedBlocks = rawBlocks.map((b, idx) => {
        const questionId = b.question_id ?? b.form_questions?.id ?? null;
        return {
          ...b,
          client_id: b.id ?? makeClientId(),
          ordem: Number.isFinite(b.ordem) ? b.ordem : idx,
          tipo: b.tipo,
          question_id: questionId,
          titulo: b.titulo ?? null,
          texto_md: b.texto_md ?? null,
          imagem_url: b.imagem_url ?? null,
          alinhamento: b.alinhamento ?? null,
          obrigatoria: b.obrigatoria ?? false,
          cond_question_id: b.cond_question_id ?? null,
          cond_equals_value: b.cond_equals_value ?? null,
          form_questions: b.form_questions ?? null,
        };
      });

      setBlocks(normalizedBlocks);
      setAllQuestions(bj.data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  function normalizeBlocks(list: Block[]): Block[] {
    return list.map((item, idx) => ({ ...item, ordem: idx }));
  }

  function addQuestionBlock(q: Question) {
    if (selectedIds.has(q.id)) return;
    setBlocks((prev) => {
      const block: Block = {
        client_id: makeClientId("question"),
        ordem: prev.length,
        tipo: "PERGUNTA",
        question_id: q.id,
        obrigatoria: false,
        cond_question_id: null,
        cond_equals_value: null,
        form_questions: q,
      };
      return normalizeBlocks([...prev, block]);
    });
  }

  function addBlock(tipo: BlockType) {
    setBlocks((prev) => {
      const block: Block = {
        client_id: makeClientId(tipo.toLowerCase()),
        ordem: prev.length,
        tipo,
        question_id: null,
        obrigatoria: false,
        titulo: "",
        texto_md: "",
        imagem_url: "",
        alinhamento: "ESQUERDA",
        cond_question_id: null,
        cond_equals_value: null,
        form_questions: null,
      };
      return normalizeBlocks([...prev, block]);
    });
  }

  function removeBlock(clientId: string) {
    setBlocks((prev) => normalizeBlocks(prev.filter((x) => x.client_id !== clientId)));
  }

  function moveBlock(clientId: string, dir: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((x) => x.client_id === clientId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[next];
      copy[next] = tmp;
      return normalizeBlocks(copy);
    });
  }

  function updateBlock(clientId: string, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((x) => (x.client_id === clientId ? { ...x, ...patch } : x)));
  }

  async function saveTemplateMeta() {
    setMsg(null);
    setErr(null);
    setSavingTemplate(true);
    try {
      const res = await fetch(`/api/admin/forms/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header_image_url: headerImageUrl.trim() || null,
          footer_image_url: footerImageUrl.trim() || null,
          intro_text_md: introTextMd.trim() || null,
          outro_text_md: outroTextMd.trim() || null,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar template.");
      setMsg("Template atualizado.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function saveBlocks() {
    setMsg(null);
    setErr(null);
    setSavingBlocks(true);
    try {
      const questionBlocks = blocks.filter((b) => b.tipo === "PERGUNTA");
      const questionMap = new Map(
        questionBlocks
          .map((b) => {
            const q = b.form_questions ?? allQuestions.find((x) => x.id === b.question_id) ?? null;
            return q ? [q.id, q] : null;
          })
          .filter((pair): pair is [string, Question] => !!pair)
      );

      const seen = new Set<string>();
      for (const block of questionBlocks) {
        const qid = block.question_id ?? block.form_questions?.id ?? "";
        if (!qid) {
          setErr("Pergunta invalida: selecione uma pergunta para todos os blocos.");
          return;
        }
        if (seen.has(qid)) {
          setErr("Pergunta duplicada: remova duplicatas antes de salvar.");
          return;
        }
        seen.add(qid);

        if (!block.cond_question_id) continue;
        if (block.cond_question_id === qid) {
          setErr("Condicao invalida: pergunta nao pode depender dela mesma.");
          return;
        }
        const condQuestion = questionMap.get(block.cond_question_id) ?? null;
        if (!condQuestion || !isConditionEligible(condQuestion)) {
          setErr("Condicao invalida: escolha uma pergunta elegivel.");
          return;
        }
        const condValue = String(block.cond_equals_value ?? "").trim();
        if (!condValue) {
          const current = questionMap.get(qid);
          setErr(`Informe o valor esperado da condicao para "${current?.titulo ?? "pergunta"}".`);
          return;
        }
        if (condQuestion.tipo === "boolean" && !["true", "false"].includes(condValue)) {
          setErr("Condicao invalida: valor esperado deve ser true ou false.");
          return;
        }
      }

      const payload = {
        blocks: blocks.map((block, idx) => ({
          tipo: block.tipo,
          ordem: idx,
          question_id:
            block.tipo === "PERGUNTA" ? block.question_id ?? block.form_questions?.id ?? null : null,
          obrigatoria: Boolean(block.obrigatoria),
          cond_question_id: block.cond_question_id ?? null,
          cond_equals_value: block.cond_equals_value ? String(block.cond_equals_value).trim() : null,
          titulo: block.titulo ? String(block.titulo).trim() : null,
          texto_md: block.texto_md ? String(block.texto_md).trim() : null,
          imagem_url: block.imagem_url ? String(block.imagem_url).trim() : null,
          alinhamento: block.alinhamento ?? null,
        })),
      };

      const res = await fetch(`/api/admin/forms/templates/${templateId}/blocos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar blocos.");
      setMsg("Blocos salvos.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSavingBlocks(false);
    }
  }

  async function setStatus(status: "draft" | "published" | "archived") {
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/forms/templates/${templateId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao alterar status.");
      setMsg(`Status atualizado para ${status}.`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    }
  }

  async function generateLink() {
    setMsg(null);
    setErr(null);
    setPublicLink(null);
    setSubmissionId(null);
    try {
      const res = await fetch(`/api/admin/forms/templates/${templateId}/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pessoa_id: null, responsavel_id: null }),
      });
      const json = (await res.json()) as {
        data?: {
          public_url?: string;
          short_url?: string | null;
          public_token?: string;
          submission_id?: string | number;
        };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar link.");
      const publicUrl = json.data?.public_url ?? "";
      const shortUrl = typeof json.data?.short_url === "string" ? json.data?.short_url : "";
      const finalUrl = shortUrl || publicUrl;
      if (!finalUrl) throw new Error("Falha ao gerar link publico.");
      const newSubmissionId = json.data?.submission_id;
      setSubmissionId(newSubmissionId ? String(newSubmissionId) : null);
      setPublicLink(finalUrl);
      setMsg("Link publico gerado.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
    }
  }

  function resetQuestionForm() {
    setQuestionCodigo("");
    setQuestionTitulo("");
    setQuestionTipo("text");
    setQuestionDescricao("");
    setQuestionAjuda("");
    setQuestionErr(null);
  }

  async function createQuestion() {
    setQuestionErr(null);
    setMsg(null);

    const codigo = questionCodigo.trim();
    const titulo = questionTitulo.trim();
    const tipo = questionTipo.trim();

    if (!codigo || !titulo || !tipo) {
      setQuestionErr("Informe codigo, titulo e tipo.");
      return;
    }

    setQuestionSaving(true);
    try {
      const res = await fetch("/api/admin/forms/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo,
          titulo,
          tipo,
          descricao: questionDescricao.trim() ? questionDescricao.trim() : null,
          ajuda: questionAjuda.trim() ? questionAjuda.trim() : null,
        }),
      });

      const json = (await res.json()) as { data?: Question; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao criar pergunta.");

      setModalOpen(false);
      resetQuestionForm();
      setMsg("Pergunta criada.");
      await load();
    } catch (e) {
      setQuestionErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setQuestionSaving(false);
    }
  }

  async function uploadImagem(file: File, nome: string): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    form.append("nome", nome);
    form.append("tags", "forms,template");

    const res = await fetch("/api/documentos/imagens/upload", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { ok?: boolean; data?: { public_url?: string }; message?: string };
    if (!res.ok || !json.ok) {
      throw new Error(json.message || "Falha ao enviar imagem.");
    }
    const url = json.data?.public_url;
    if (!url) throw new Error("Upload concluido sem URL publica.");
    return url;
  }

  async function uploadHeaderImage() {
    if (!headerUploadFile) {
      setErr("Selecione uma imagem para o cabecalho.");
      return;
    }
    setErr(null);
    setMsg(null);
    setHeaderUploading(true);
    try {
      const nome = `${tpl?.nome ?? "template"} - cabecalho`;
      const url = await uploadImagem(headerUploadFile, nome);
      setHeaderImageUrl(url);
      setHeaderUploadFile(null);
      if (headerFileRef.current) headerFileRef.current.value = "";
      setMsg("Imagem do cabecalho enviada.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao enviar imagem.");
    } finally {
      setHeaderUploading(false);
    }
  }

  async function uploadFooterImage() {
    if (!footerUploadFile) {
      setErr("Selecione uma imagem para o rodape.");
      return;
    }
    setErr(null);
    setMsg(null);
    setFooterUploading(true);
    try {
      const nome = `${tpl?.nome ?? "template"} - rodape`;
      const url = await uploadImagem(footerUploadFile, nome);
      setFooterImageUrl(url);
      setFooterUploadFile(null);
      if (footerFileRef.current) footerFileRef.current.value = "";
      setMsg("Imagem do rodape enviada.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao enviar imagem.");
    } finally {
      setFooterUploading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Carregando...</div>;
  }

  if (err && !tpl) {
    return <div className="p-6 text-sm text-red-600">{err}</div>;
  }

  if (!tpl) {
    return <div className="p-6 text-sm text-slate-600">Template nao encontrado.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={tpl.nome}
        description={`Status: ${tpl.status} | Versao: ${tpl.versao}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void saveBlocks()}
              disabled={savingBlocks}
            >
              {savingBlocks ? "Salvando blocos..." : "Salvar blocos"}
            </button>
            <button
              className="rounded-md border px-4 py-2 text-sm"
              onClick={() => void saveTemplateMeta()}
              disabled={savingTemplate}
            >
              {savingTemplate ? "Salvando template..." : "Salvar template"}
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void setStatus("published")}>
              Publicar
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void setStatus("draft")}>
              Rascunho
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void setStatus("archived")}>
              Arquivar
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => void generateLink()}>
              Gerar link
            </button>
          </div>
        }
      />

      {msg ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {msg}
        </div>
      ) : null}

      {publicLink || submissionId ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
          {publicLink ? (
            <div>
              <span className="font-medium text-emerald-800">Link gerado:</span>{" "}
              <a
                href={publicLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline break-all"
              >
                {publicLink}
              </a>
            </div>
          ) : null}
          {submissionId ? (
            <div className={publicLink ? "mt-2" : undefined}>
              <Link href={`/admin/forms/submissions/${submissionId}`} className="text-emerald-700 underline">
                Ver respostas
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {err ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

      <SectionCard
        title="Cabecalho do formulario"
        description="Imagem principal e texto introdutorio do formulario."
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Imagem do cabecalho (URL)</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={headerImageUrl}
                onChange={(e) => setHeaderImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">Upload rapido</span>
              <input
                ref={headerFileRef}
                type="file"
                accept="image/*"
                className="w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => setHeaderUploadFile(e.target.files?.[0] ?? null)}
              />
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => void uploadHeaderImage()}
                disabled={headerUploading || !headerUploadFile}
              >
                {headerUploading ? "Enviando..." : "Enviar imagem"}
              </button>
            </div>
          </div>

          {headerImageUrl ? (
            <div className="rounded-md border bg-slate-50 p-3">
              <img src={headerImageUrl} alt="Cabecalho do formulario" className="max-h-32 w-full object-contain" />
            </div>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Texto introdutorio (markdown)</span>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={4}
              value={introTextMd}
              onChange={(e) => setIntroTextMd(e.target.value)}
              placeholder="Use markdown simples para apresentar o formulario."
            />
          </label>

          {introTextMd.trim() ? (
            <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs text-slate-500 mb-2">Preview</div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtmlSimples(introTextMd) }}
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Perguntas disponiveis" description="Selecione para adicionar ao template.">
          <ToolbarRow>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => {
                setQuestionErr(null);
                setModalOpen(true);
              }}
            >
              Criar pergunta
            </button>
          </ToolbarRow>

          {allQuestions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
              Nenhuma pergunta cadastrada. Clique em Criar pergunta.
            </div>
          ) : (
            <div className="grid gap-2 max-h-[420px] overflow-auto">
              {allQuestions.map((q) => (
                <button
                  key={q.id}
                  className="text-left rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => addQuestionBlock(q)}
                  disabled={selectedIds.has(q.id)}
                >
                  <div className="font-medium text-slate-900">{q.titulo}</div>
                  <div className="text-xs text-slate-500">
                    {q.codigo} - {q.tipo}
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Blocos do formulario" description="Organize ordem e conteudo do template.">
          <ToolbarRow>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => addBlock("TEXTO")}>
              + Texto
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => addBlock("IMAGEM")}>
              + Imagem
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={() => addBlock("DIVISOR")}>
              + Divisor
            </button>
          </ToolbarRow>

          {blocks.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
              Adicione blocos ao template.
            </div>
          ) : (
            <div className="grid gap-3">
              {blocks.map((block) => {
                const questionId = block.question_id ?? block.form_questions?.id ?? null;
                const question =
                  block.form_questions ?? allQuestions.find((q) => q.id === questionId) ?? null;
                const questionBlocks = blocks
                  .filter((b) => b.tipo === "PERGUNTA")
                  .map((b) => b.form_questions ?? allQuestions.find((q) => q.id === b.question_id) ?? null)
                  .filter((q): q is Question => !!q);
                const condCandidates = questionBlocks.filter(
                  (q) => q.id !== questionId && isConditionEligible(q)
                );
                const condQuestion = questionBlocks.find((q) => q.id === block.cond_question_id) ?? null;
                const condEligible = condQuestion ? isConditionEligible(condQuestion) : false;

                return (
                  <div key={block.client_id} className="rounded-lg border p-3 grid gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {block.ordem + 1}.{" "}
                          {block.tipo === "PERGUNTA"
                            ? question?.titulo ?? "Pergunta"
                            : block.tipo === "TEXTO"
                              ? "Bloco de texto"
                              : block.tipo === "IMAGEM"
                                ? "Bloco de imagem"
                                : "Divisor"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {block.tipo === "PERGUNTA"
                            ? `${question?.codigo ?? "-"} - ${question?.tipo ?? "-"}`
                            : block.tipo}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => moveBlock(block.client_id, -1)}
                        >
                          Subir
                        </button>
                        <button
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => moveBlock(block.client_id, 1)}
                        >
                          Descer
                        </button>
                        <button
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() => removeBlock(block.client_id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {block.tipo === "PERGUNTA" && question ? (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(block.obrigatoria)}
                            onChange={(e) => updateBlock(block.client_id, { obrigatoria: e.target.checked })}
                          />
                          Obrigatoria
                        </label>

                        <div className="grid gap-2 rounded-md border border-dashed p-3">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Condicao (opcional)</span>
                            {block.cond_question_id ? (
                              <button
                                className="rounded-md border px-2 py-1 text-xs"
                                onClick={() =>
                                  updateBlock(block.client_id, {
                                    cond_question_id: null,
                                    cond_equals_value: null,
                                  })
                                }
                              >
                                Limpar
                              </button>
                            ) : null}
                          </div>

                          <label className="grid gap-1 text-sm">
                            <span className="font-medium">Pergunta de referencia</span>
                            <select
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              value={block.cond_question_id ?? ""}
                              onChange={(e) =>
                                updateBlock(block.client_id, {
                                  cond_question_id: e.target.value ? e.target.value : null,
                                  cond_equals_value: null,
                                })
                              }
                            >
                              <option value="">Sem condicao</option>
                              {condCandidates.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.titulo}
                                </option>
                              ))}
                            </select>
                          </label>

                          {block.cond_question_id && !condEligible ? (
                            <div className="text-xs text-red-600">
                              Condicao atual nao elegivel. Limpe para continuar.
                            </div>
                          ) : null}

                          {block.cond_question_id && condEligible && condQuestion ? (
                            <label className="grid gap-1 text-sm">
                              <span className="font-medium">Valor esperado</span>
                              {condQuestion.tipo === "boolean" ? (
                                <select
                                  className="w-full rounded-md border px-3 py-2 text-sm"
                                  value={block.cond_equals_value ?? ""}
                                  onChange={(e) =>
                                    updateBlock(block.client_id, {
                                      cond_equals_value: e.target.value || null,
                                    })
                                  }
                                >
                                  <option value="">Selecione...</option>
                                  <option value="true">True</option>
                                  <option value="false">False</option>
                                </select>
                              ) : condQuestion.tipo === "single_choice" ? (
                                <select
                                  className="w-full rounded-md border px-3 py-2 text-sm"
                                  value={block.cond_equals_value ?? ""}
                                  onChange={(e) =>
                                    updateBlock(block.client_id, {
                                      cond_equals_value: e.target.value || null,
                                    })
                                  }
                                >
                                  <option value="">Selecione...</option>
                                  {(condQuestion.form_question_options ?? [])
                                    .filter((o) => o.ativo)
                                    .sort((a, b) => a.ordem - b.ordem)
                                    .map((o) => (
                                      <option key={o.id} value={o.valor}>
                                        {o.rotulo}
                                      </option>
                                    ))}
                                </select>
                              ) : condQuestion.tipo === "scale" ? (
                                <input
                                  className="w-full rounded-md border px-3 py-2 text-sm"
                                  type="number"
                                  min={condQuestion.scale_min ?? undefined}
                                  max={condQuestion.scale_max ?? undefined}
                                  value={block.cond_equals_value ?? ""}
                                  onChange={(e) =>
                                    updateBlock(block.client_id, {
                                      cond_equals_value: e.target.value || null,
                                    })
                                  }
                                />
                              ) : null}
                            </label>
                          ) : null}
                        </div>
                      </>
                    ) : null}

                    {block.tipo === "TEXTO" ? (
                      <div className="grid gap-2">
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">Titulo (opcional)</span>
                          <input
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={block.titulo ?? ""}
                            onChange={(e) => updateBlock(block.client_id, { titulo: e.target.value })}
                            placeholder="Titulo do bloco"
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">Texto (markdown)</span>
                          <textarea
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            rows={4}
                            value={block.texto_md ?? ""}
                            onChange={(e) => updateBlock(block.client_id, { texto_md: e.target.value })}
                            placeholder="Escreva o conteudo..."
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">Alinhamento</span>
                          <select
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={block.alinhamento ?? "ESQUERDA"}
                            onChange={(e) =>
                              updateBlock(block.client_id, { alinhamento: e.target.value as BlockAlign })
                            }
                          >
                            <option value="ESQUERDA">Esquerda</option>
                            <option value="CENTRO">Centro</option>
                            <option value="DIREITA">Direita</option>
                          </select>
                        </label>
                      </div>
                    ) : null}

                    {block.tipo === "IMAGEM" ? (
                      <div className="grid gap-2">
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">URL da imagem</span>
                          <input
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={block.imagem_url ?? ""}
                            onChange={(e) => updateBlock(block.client_id, { imagem_url: e.target.value })}
                            placeholder="https://..."
                          />
                        </label>
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">Alinhamento</span>
                          <select
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={block.alinhamento ?? "CENTRO"}
                            onChange={(e) =>
                              updateBlock(block.client_id, { alinhamento: e.target.value as BlockAlign })
                            }
                          >
                            <option value="ESQUERDA">Esquerda</option>
                            <option value="CENTRO">Centro</option>
                            <option value="DIREITA">Direita</option>
                          </select>
                        </label>
                        {block.imagem_url ? (
                          <div className="rounded-md border bg-slate-50 p-3">
                            <img src={block.imagem_url} alt="Bloco de imagem" className="max-h-40 w-full object-contain" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {block.tipo === "DIVISOR" ? (
                      <div className="grid gap-2">
                        <label className="grid gap-1 text-sm">
                          <span className="font-medium">Titulo (opcional)</span>
                          <input
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={block.titulo ?? ""}
                            onChange={(e) => updateBlock(block.client_id, { titulo: e.target.value })}
                            placeholder="Divisao visual"
                          />
                        </label>
                        <div className="rounded-md border bg-slate-50 px-3 py-4">
                          <div className="h-px w-full bg-slate-200" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Rodape do formulario" description="Imagem e texto final do formulario.">
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Imagem do rodape (URL)</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={footerImageUrl}
                onChange={(e) => setFooterImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
            <div className="grid gap-2 text-sm">
              <span className="font-medium">Upload rapido</span>
              <input
                ref={footerFileRef}
                type="file"
                accept="image/*"
                className="w-full rounded-md border px-3 py-2 text-sm"
                onChange={(e) => setFooterUploadFile(e.target.files?.[0] ?? null)}
              />
              <button
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                onClick={() => void uploadFooterImage()}
                disabled={footerUploading || !footerUploadFile}
              >
                {footerUploading ? "Enviando..." : "Enviar imagem"}
              </button>
            </div>
          </div>

          {footerImageUrl ? (
            <div className="rounded-md border bg-slate-50 p-3">
              <img src={footerImageUrl} alt="Rodape do formulario" className="max-h-32 w-full object-contain" />
            </div>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-medium">Texto final (markdown)</span>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={4}
              value={outroTextMd}
              onChange={(e) => setOutroTextMd(e.target.value)}
              placeholder="Mensagem final ou instrucoes."
            />
          </label>

          {outroTextMd.trim() ? (
            <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs text-slate-500 mb-2">Preview</div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownToHtmlSimples(outroTextMd) }}
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Criar pergunta</h3>
                <p className="text-sm text-slate-600">Cadastro rapido para adicionar ao template.</p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500"
                onClick={() => {
                  setModalOpen(false);
                  resetQuestionForm();
                }}
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Codigo *</span>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={questionCodigo}
                  onChange={(e) => setQuestionCodigo(e.target.value)}
                  placeholder="ex: renda_familiar_mensal"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Titulo *</span>
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={questionTitulo}
                  onChange={(e) => setQuestionTitulo(e.target.value)}
                  placeholder="Titulo da pergunta"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Tipo *</span>
                <select
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={questionTipo}
                  onChange={(e) => setQuestionTipo(e.target.value)}
                >
                  {QUESTION_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Descricao</span>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={questionDescricao}
                  onChange={(e) => setQuestionDescricao(e.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="font-medium">Ajuda</span>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={questionAjuda}
                  onChange={(e) => setQuestionAjuda(e.target.value)}
                  placeholder="Opcional"
                />
              </label>

              {questionErr ? (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {questionErr}
                </div>
              ) : null}
            </div>

            <ToolbarRow className="mt-4">
              <button
                className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void createQuestion()}
                disabled={questionSaving}
              >
                {questionSaving ? "Salvando..." : "Criar pergunta"}
              </button>
              <button
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => {
                  setModalOpen(false);
                  resetQuestionForm();
                }}
              >
                Cancelar
              </button>
            </ToolbarRow>
          </div>
        </div>
      ) : null}
    </div>
  );
}
