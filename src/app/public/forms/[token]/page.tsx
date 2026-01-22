"use client";

/* eslint-disable @next/next/no-img-element */

import { use, useEffect, useMemo, useState } from "react";
import { PublicFormExperienceShell } from "@/components/forms/PublicFormExperienceShell";
import PublicFormWizard, { type PublicQuestion } from "@/components/forms/PublicFormWizard";

type Option = { id: string; valor: string; rotulo: string; ordem: number; ativo: boolean };
type Question = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  ajuda: string | null;
  placeholder: string | null;
  min_num: number | null;
  max_num: number | null;
  min_len: number | null;
  max_len: number | null;
  scale_min: number | null;
  scale_max: number | null;
  form_question_options?: Option[];
};

type Item = {
  id: string;
  ordem: number;
  obrigatoria: boolean;
  cond_question_id: string | null;
  cond_equals_value: string | null;
  form_questions: Question;
};

type BlockType = "PERGUNTA" | "TEXTO" | "IMAGEM" | "DIVISOR";
type BlockAlign = "ESQUERDA" | "CENTRO" | "DIREITA";

type Block = {
  id: string;
  ordem: number;
  tipo: BlockType;
  question_id: string | null;
  template_item_id: string | null;
  titulo: string | null;
  texto_md: string | null;
  imagem_url: string | null;
  alinhamento: BlockAlign | null;
  obrigatoria: boolean;
  cond_question_id: string | null;
  cond_equals_value: string | null;
  form_questions?: Question | null;
};

type Payload = {
  submission: { id: string; template_id: string };
  template: {
    id: string;
    nome: string;
    descricao: string | null;
    status: string;
    versao: number;
    header_image_url?: string | null;
    footer_image_url?: string | null;
    intro_text_md?: string | null;
    outro_text_md?: string | null;
  };
  items?: Item[];
  blocks?: Block[];
};

type AnswerState = Record<string, unknown>;

function asString(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
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

function normalizeMd(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export default function PublicFormTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<AnswerState>({});

  const blocks = useMemo(() => {
    const list = Array.isArray(data?.blocks) ? (data?.blocks ?? []) : [];
    if (list.length > 0) return list.slice().sort((a, b) => a.ordem - b.ordem);

    const legacy = Array.isArray(data?.items) ? (data?.items ?? []) : [];
    return legacy
      .map((item, idx) => ({
        id: item.id,
        ordem: Number.isFinite(item.ordem) ? item.ordem : idx,
        tipo: "PERGUNTA" as const,
        question_id: item.form_questions?.id ?? "",
        template_item_id: item.id,
        titulo: null,
        texto_md: null,
        imagem_url: null,
        alinhamento: null,
        obrigatoria: item.obrigatoria,
        cond_question_id: item.cond_question_id,
        cond_equals_value: item.cond_equals_value,
        form_questions: item.form_questions,
      }))
      .sort((a, b) => a.ordem - b.ordem);
  }, [data]);

  function isVisible(block: Block, snapshot: AnswerState = answers): boolean {
    if (block.tipo !== "PERGUNTA") return true;
    if (!block.cond_question_id) return true;
    const val = asString(snapshot[block.cond_question_id]).trim();
    const allowed = asString(block.cond_equals_value)
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    if (allowed.length === 0) return false;
    return allowed.includes(val);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      setOkMsg(null);
      setSubmitted(false);
      try {
        const res = await fetch(`/api/public/forms/${token}`, { cache: "no-store" });
        const json = (await res.json()) as { data?: Payload; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar formulario.");
        setData(json.data ?? null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function submit(nextAnswers: AnswerState) {
    setErr(null);
    setOkMsg(null);

    if (!data) return;

    const questionBlocks = blocks.filter((block) => block.tipo === "PERGUNTA");

    for (const block of questionBlocks) {
      if (!isVisible(block, nextAnswers)) continue;
      if (!block.obrigatoria) continue;
      const q = block.form_questions ?? null;
      if (!q) {
        setErr("Formulario invalido: pergunta nao encontrada.");
        return;
      }
      const v = nextAnswers[q.id];
      const s = asString(v).trim();
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (!s && !isEmptyArray) {
        setErr(`Preencha: ${q.titulo}`);
        return;
      }
    }

    const rows = questionBlocks
      .filter((block) => isVisible(block, nextAnswers))
      .map((block) => {
        const q = block.form_questions ?? null;
        if (!q || !block.template_item_id) {
          return null;
        }
        const v = nextAnswers[q.id];

        const base = {
          template_item_id: block.template_item_id,
          question_id: q.id,
          question_titulo_snapshot: q.titulo,
          option_rotulos_snapshot: null as string | null,
          value_text: null as string | null,
          value_number: null as number | null,
          value_bool: null as boolean | null,
          value_date: null as string | null,
          value_json: null as unknown | null,
        };

        if (q.tipo === "number") {
          base.value_number = v === "" || v === null || v === undefined ? null : Number(v);
        } else if (q.tipo === "boolean") {
          base.value_bool = Boolean(v);
        } else if (q.tipo === "date") {
          base.value_date = v ? asString(v) : null;
        } else if (q.tipo === "single_choice") {
          base.value_text = v ? asString(v) : null;
          const opt = (q.form_question_options ?? []).find((o) => o.valor === base.value_text);
          base.option_rotulos_snapshot = opt ? opt.rotulo : null;
        } else if (q.tipo === "multi_choice") {
          const arr = Array.isArray(v) ? v.map(asString) : [];
          base.value_json = arr;
          const rotulos = (q.form_question_options ?? [])
            .filter((o) => arr.includes(o.valor))
            .map((o) => o.rotulo);
          base.option_rotulos_snapshot = rotulos.length ? rotulos.join(", ") : null;
        } else if (q.tipo === "scale") {
          base.value_number = v === "" || v === null || v === undefined ? null : Number(v);
        } else {
          base.value_text = v ? asString(v) : null;
        }

        return base;
      });

    if (rows.some((row) => !row)) {
      setErr("Formulario invalido: perguntas incompletas.");
      return;
    }

    const res = await fetch(`/api/public/forms/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: rows.filter((row): row is NonNullable<typeof row> => !!row) }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao enviar respostas.");
      return;
    }

    setOkMsg("Formulario enviado com sucesso. Obrigado!");
    setSubmitted(true);
  }

  if (loading) return <div className="p-4">Carregando...</div>;
  if (err && !data) return <div className="p-4 text-red-600">{err}</div>;
  if (!data) return <div className="p-4">Formulario indisponivel.</div>;

  const introMarkdown =
    data.template.intro_text_md ??
    "Este formulario existe para entender seu contexto e melhorar nossas decisoes institucionais com responsabilidade.";
  const highlightMarkdown = data.template.outro_text_md ?? null;
  const outroMarkdown =
    highlightMarkdown &&
    normalizeMd(highlightMarkdown) !== normalizeMd(introMarkdown ?? "")
      ? highlightMarkdown
      : null;

  const visibleQuestionBlocks = blocks.filter(
    (block) => block.tipo === "PERGUNTA" && isVisible(block)
  );
  const wizardQuestions: PublicQuestion[] = visibleQuestionBlocks
    .map((block) => {
      const q = block.form_questions ?? null;
      if (!q) return null;
      const options = (q.form_question_options ?? [])
        .filter((o) => o.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .map((o) => ({ value: o.valor, label: o.rotulo }));

      let type: PublicQuestion["type"] = "short_text";
      if (q.tipo === "textarea") type = "long_text";
      else if (q.tipo === "text") type = "short_text";
      else if (q.tipo === "number") type = "number";
      else if (q.tipo === "date") type = "date";
      else if (q.tipo === "single_choice") type = "single_choice";
      else if (q.tipo === "multi_choice") type = "multi_choice";
      else if (q.tipo === "scale") type = "scale";
      else if (q.tipo === "boolean") type = "boolean";

      return {
        id: q.id,
        code: q.codigo,
        title: q.titulo,
        description: q.descricao ?? q.ajuda ?? null,
        type,
        required: block.obrigatoria,
        options,
        scaleMin: q.scale_min ?? null,
        scaleMax: q.scale_max ?? null,
      };
    })
    .filter((q): q is PublicQuestion => q !== null);

  return (
    <PublicFormExperienceShell
      title={data.template.nome ?? "Formulario"}
      subtitle={data.template.descricao ?? "Responda com calma e sinceridade."}
      headerImageUrl={null}
      introText={undefined}
      hideHeader
      progress={{
        mode: "manual",
        totalRequired: 0,
        answeredRequired: 0,
      }}
    >
      {submitted ? (
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm text-slate-700 shadow-sm">
          <div className="text-base font-semibold text-slate-900">Envio concluido</div>
          <div className="mt-2">
            {okMsg ?? "Formulario enviado com sucesso. Obrigado!"}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
              onClick={() => {
                if (window.opener) window.close();
                else if (window.history.length > 1) window.history.back();
                else window.location.reload();
              }}
            >
              Fechar
            </button>
            <button
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => window.location.reload()}
            >
              Reabrir link
            </button>
          </div>
        </div>
      ) : (
        <>
          {okMsg ? (
            <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {okMsg}
            </div>
          ) : null}
          {err ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {err}
            </div>
          ) : null}

          <PublicFormWizard
            questions={wizardQuestions}
            answers={answers}
            onAnswersChange={setAnswers}
            cover={{
              imageUrl: data.template.header_image_url ?? null,
              title: data.template.nome ?? "Formulario",
              subtitle: data.template.descricao ?? null,
            }}
            intro={{ markdown: introMarkdown }}
            outro={{
              imageUrl: data.template.footer_image_url ?? null,
              markdown: outroMarkdown,
            }}
            renderMarkdown={(content) => (
              <span dangerouslySetInnerHTML={{ __html: markdownToHtmlSimples(content) }} />
            )}
            onSubmit={(nextAnswers) => submit(nextAnswers)}
          />
        </>
      )}
    </PublicFormExperienceShell>
  );
}
