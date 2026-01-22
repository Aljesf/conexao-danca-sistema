"use client";

import { useMemo, useState } from "react";

type QuestionType =
  | "short_text"
  | "long_text"
  | "number"
  | "date"
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "boolean";

type QuestionOption = {
  value: string;
  label: string;
};

export type PublicQuestion = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: QuestionType;
  required?: boolean;
  options?: QuestionOption[];
  scaleMin?: number | null;
  scaleMax?: number | null;
};

type WizardCover = {
  imageUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
};

type WizardOutro = {
  imageUrl?: string | null;
  markdown?: string | null;
};

type WizardIntro = {
  markdown?: string | null;
};

type WizardStep =
  | { kind: "cover"; cover: WizardCover }
  | { kind: "intro"; intro: WizardIntro }
  | { kind: "question"; question: PublicQuestion }
  | { kind: "outro"; outro: WizardOutro };

type Props = {
  questions: PublicQuestion[];
  onSubmit: (answers: Record<string, unknown>) => Promise<void>;
  renderMarkdown?: (content: string) => React.ReactNode;
  cover?: WizardCover;
  intro?: WizardIntro;
  outro?: WizardOutro;
  answers?: Record<string, unknown>;
  onAnswersChange?: (answers: Record<string, unknown>) => void;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function PublicFormWizard({
  questions,
  onSubmit,
  renderMarkdown,
  cover,
  intro,
  outro,
  answers,
  onAnswersChange,
}: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, unknown>>({});

  const resolvedAnswers = answers ?? localAnswers;

  const steps = useMemo<WizardStep[]>(() => {
    const s: WizardStep[] = [];

    const hasCover = Boolean(cover?.imageUrl || cover?.title || cover?.subtitle);
    const hasIntro = Boolean(intro?.markdown && intro.markdown.trim().length > 0);
    const hasOutro = Boolean(outro?.imageUrl || (outro?.markdown && outro.markdown.trim().length > 0));

    if (hasCover) s.push({ kind: "cover", cover: cover ?? {} });
    if (hasIntro) s.push({ kind: "intro", intro: intro ?? {} });

    for (const q of questions) s.push({ kind: "question", question: q });

    if (hasOutro) s.push({ kind: "outro", outro: outro ?? {} });

    return s;
  }, [questions, cover, intro, outro]);

  const total = steps.length;
  const stepItem = steps[clamp(step, 0, Math.max(0, total - 1))];
  const isQuestion = stepItem?.kind === "question";
  const headerLeftLabel = isQuestion ? "Pergunta" : "Etapa";

  const progressLabel = useMemo(() => {
    if (total <= 0) return "";
    return `${step + 1}/${total}`;
  }, [step, total]);

  function setAnswer(questionId: string, value: unknown) {
    const next = { ...resolvedAnswers, [questionId]: value };
    if (!answers) setLocalAnswers(next);
    onAnswersChange?.(next);
  }

  function next() {
    setStep((s) => clamp(s + 1, 0, total - 1));
  }

  function back() {
    setStep((s) => clamp(s - 1, 0, total - 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(resolvedAnswers);
    } finally {
      setSubmitting(false);
    }
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <p className="text-sm text-slate-600">Nenhuma pergunta disponivel neste formulario.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500">{headerLeftLabel}</div>
        <div className="text-xs font-semibold text-slate-700">{progressLabel}</div>
      </div>

      {stepItem?.kind === "cover" ? (
        <div className="space-y-4">
          {stepItem.cover.imageUrl ? (
            <div className="overflow-hidden rounded-2xl border bg-white">
              <img
                src={stepItem.cover.imageUrl}
                alt={stepItem.cover.title ?? "Capa"}
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}

          {stepItem.cover.title ? (
            <h2 className="text-xl font-semibold text-slate-900">{stepItem.cover.title}</h2>
          ) : null}

          {stepItem.cover.subtitle ? (
            <p className="text-sm text-slate-600">{stepItem.cover.subtitle}</p>
          ) : null}
        </div>
      ) : null}

      {stepItem?.kind === "intro" ? (
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="prose max-w-none text-slate-700">
            {stepItem.intro.markdown
              ? renderMarkdown
                ? renderMarkdown(stepItem.intro.markdown)
                : stepItem.intro.markdown
              : null}
          </div>
        </div>
      ) : null}

      {stepItem?.kind === "question" ? (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{stepItem.question.title}</h2>
            {stepItem.question.description ? (
              <div className="mt-2 text-sm text-slate-600">
                {renderMarkdown ? renderMarkdown(stepItem.question.description) : stepItem.question.description}
              </div>
            ) : null}
          </div>

          <div className="mb-6">
            <QuestionField
              question={stepItem.question}
              value={resolvedAnswers[stepItem.question.id]}
              setAnswer={setAnswer}
            />
          </div>
        </>
      ) : null}

      {stepItem?.kind === "outro" ? (
        <div className="space-y-4">
          {stepItem.outro.imageUrl ? (
            <div className="overflow-hidden rounded-2xl border bg-white p-4">
              <img
                src={stepItem.outro.imageUrl}
                alt="Agradecimento"
                className="mx-auto h-auto max-h-40 w-auto object-contain"
              />
            </div>
          ) : null}

          {stepItem.outro.markdown ? (
            <div className="rounded-2xl border bg-white p-4">
              <div className="prose max-w-none text-slate-700">
                {renderMarkdown ? renderMarkdown(stepItem.outro.markdown) : stepItem.outro.markdown}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || submitting}
          className="h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
        >
          Voltar
        </button>

        {step < total - 1 ? (
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Proximo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionField({
  question,
  value,
  setAnswer,
}: {
  question: PublicQuestion;
  value: unknown;
  setAnswer: (questionId: string, value: unknown) => void;
}) {
  const id = question.id;

  if (question.type === "short_text") {
    return (
      <input
        className="h-12 w-full rounded-xl border px-4 text-base"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => setAnswer(id, e.target.value)}
        placeholder="Digite aqui..."
      />
    );
  }

  if (question.type === "long_text") {
    return (
      <textarea
        className="min-h-[140px] w-full rounded-xl border p-4 text-base"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => setAnswer(id, e.target.value)}
        placeholder="Digite aqui..."
      />
    );
  }

  if (question.type === "number") {
    return (
      <input
        className="h-12 w-full rounded-xl border px-4 text-base"
        inputMode="numeric"
        value={typeof value === "number" ? String(value) : value ? String(value) : ""}
        onChange={(e) => {
          const n = e.target.value.trim() === "" ? null : Number(e.target.value);
          setAnswer(id, Number.isFinite(n as number) ? n : null);
        }}
        placeholder="0"
      />
    );
  }

  if (question.type === "date") {
    return (
      <input
        className="h-12 w-full rounded-xl border px-4 text-base"
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => setAnswer(id, e.target.value)}
      />
    );
  }

  if (question.type === "boolean") {
    const selected = typeof value === "boolean" ? value : null;
    return (
      <div className="grid gap-3">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => setAnswer(id, opt)}
            className={[
              "min-h-[52px] w-full rounded-xl border px-4 text-left text-base",
              selected === opt ? "border-slate-900 bg-slate-50" : "bg-white",
            ].join(" ")}
          >
            {opt ? "Sim" : "Nao"}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "single_choice") {
    const opts = question.options ?? [];
    const selected = typeof value === "string" ? value : "";
    return (
      <div className="grid gap-3">
        {opts.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setAnswer(id, o.value)}
              className={[
                "min-h-[56px] w-full rounded-xl border px-4 text-left text-base transition",
                "flex items-center justify-between gap-4",
                active
                  ? "border-slate-900 bg-slate-900/[0.06] ring-2 ring-slate-900/20"
                  : "border-slate-300 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="leading-snug">{o.label}</span>
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  active ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white",
                ].join(" ")}
                aria-hidden="true"
              >
                <span className={active ? "h-2 w-2 rounded-full bg-white" : "hidden"} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "multi_choice") {
    const opts = question.options ?? [];
    const selected = Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
    const selectedSet = new Set(selected as string[]);
    return (
      <div className="grid gap-3">
        {opts.map((o) => {
          const active = selectedSet.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                const next = new Set(selectedSet);
                if (next.has(o.value)) next.delete(o.value);
                else next.add(o.value);
                setAnswer(id, Array.from(next));
              }}
              className={[
                "min-h-[56px] w-full rounded-xl border px-4 text-left text-base transition",
                "flex items-center justify-between gap-4",
                active
                  ? "border-slate-900 bg-slate-900/[0.06] ring-2 ring-slate-900/20"
                  : "border-slate-300 bg-white hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="leading-snug">{o.label}</span>
              <span
                className={[
                  "flex h-5 w-5 items-center justify-center rounded-md border",
                  active ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white",
                ].join(" ")}
                aria-hidden="true"
              >
                <span className={active ? "text-white text-sm leading-none" : "hidden"}>x</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === "scale") {
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 5;
    const n = typeof value === "number" ? value : null;

    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => {
          const active = n === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setAnswer(id, v)}
              className={[
                "h-12 min-w-[48px] rounded-xl border px-4 text-base font-semibold",
                active ? "border-slate-900 bg-slate-50" : "bg-white",
              ].join(" ")}
            >
              {v}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-600">
      Tipo de pergunta nao suportado: {question.type}
    </div>
  );
}
