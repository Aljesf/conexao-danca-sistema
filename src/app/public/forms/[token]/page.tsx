"use client";

import { use, useEffect, useMemo, useState } from "react";

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

type Payload = {
  submission: { id: string; template_id: string };
  template: { id: string; nome: string; descricao: string | null; status: string; versao: number };
  items: Item[];
};

type AnswerState = Record<string, unknown>;

function asString(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
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
  const [answers, setAnswers] = useState<AnswerState>({});

  const items = useMemo(
    () => (data?.items ?? []).slice().sort((a, b) => a.ordem - b.ordem),
    [data]
  );

  function isVisible(it: Item): boolean {
    if (!it.cond_question_id) return true;
    const val = answers[it.cond_question_id];
    return asString(val) === asString(it.cond_equals_value);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
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

  async function submit() {
    setErr(null);
    setOkMsg(null);

    if (!data) return;

    for (const it of items) {
      if (!isVisible(it)) continue;
      if (!it.obrigatoria) continue;
      const v = answers[it.form_questions.id];
      const s = asString(v).trim();
      const isEmptyArray = Array.isArray(v) && v.length === 0;
      if (!s && !isEmptyArray) {
        setErr(`Preencha: ${it.form_questions.titulo}`);
        return;
      }
    }

    const rows = items
      .filter((it) => isVisible(it))
      .map((it) => {
        const q = it.form_questions;
        const v = answers[q.id];

        const base = {
          template_item_id: it.id,
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

    const res = await fetch(`/api/public/forms/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: rows }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Falha ao enviar respostas.");
      return;
    }

    setOkMsg("Formulario enviado com sucesso. Obrigado!");
  }

  if (loading) return <div className="p-4">Carregando...</div>;
  if (err && !data) return <div className="p-4 text-red-600">{err}</div>;
  if (!data) return <div className="p-4">Formulario indisponivel.</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto grid gap-4">
      <div className="rounded-xl border p-4">
        <h1 className="text-xl font-semibold">{data.template.nome}</h1>
        {data.template.descricao ? (
          <p className="text-sm opacity-80 mt-2">{data.template.descricao}</p>
        ) : null}
      </div>

      {okMsg ? <div className="rounded-xl border p-3 text-sm">{okMsg}</div> : null}
      {err ? <div className="rounded-xl border p-3 text-sm text-red-600">{err}</div> : null}

      <div className="grid gap-3">
        {items.filter(isVisible).map((it) => {
          const q = it.form_questions;
          const v = answers[q.id];

          return (
            <div key={it.id} className="rounded-xl border p-4 grid gap-2">
              <div className="text-sm font-medium">
                {q.titulo} {it.obrigatoria ? <span className="text-red-600">*</span> : null}
              </div>
              {q.ajuda ? <div className="text-xs opacity-70">{q.ajuda}</div> : null}

              {q.tipo === "textarea" ? (
                <textarea
                  className="border rounded-lg px-3 py-2"
                  placeholder={q.placeholder ?? ""}
                  value={asString(v)}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                />
              ) : q.tipo === "number" ? (
                <input
                  className="border rounded-lg px-3 py-2"
                  type="number"
                  value={v === undefined || v === null ? "" : String(v)}
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      [q.id]: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              ) : q.tipo === "date" ? (
                <input
                  className="border rounded-lg px-3 py-2"
                  type="date"
                  value={asString(v)}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                />
              ) : q.tipo === "boolean" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.checked }))}
                  />
                  Sim
                </label>
              ) : q.tipo === "single_choice" ? (
                <select
                  className="border rounded-lg px-3 py-2"
                  value={asString(v)}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {(q.form_question_options ?? [])
                    .filter((o) => o.ativo)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((o) => (
                      <option key={o.id} value={o.valor}>
                        {o.rotulo}
                      </option>
                    ))}
                </select>
              ) : q.tipo === "multi_choice" ? (
                <div className="grid gap-2">
                  {(q.form_question_options ?? [])
                    .filter((o) => o.ativo)
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((o) => {
                      const arr = Array.isArray(v) ? (v as unknown[]).map(asString) : [];
                      const checked = arr.includes(o.valor);
                      return (
                        <label key={o.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const cur = new Set(arr);
                              if (e.target.checked) cur.add(o.valor);
                              else cur.delete(o.valor);
                              setAnswers((p) => ({ ...p, [q.id]: Array.from(cur) }));
                            }}
                          />
                          {o.rotulo}
                        </label>
                      );
                    })}
                </div>
              ) : q.tipo === "scale" ? (
                <input
                  className="border rounded-lg px-3 py-2"
                  type="number"
                  min={q.scale_min ?? undefined}
                  max={q.scale_max ?? undefined}
                  value={v === undefined || v === null ? "" : String(v)}
                  onChange={(e) =>
                    setAnswers((p) => ({
                      ...p,
                      [q.id]: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              ) : (
                <input
                  className="border rounded-lg px-3 py-2"
                  type="text"
                  placeholder={q.placeholder ?? ""}
                  value={asString(v)}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                />
              )}
            </div>
          );
        })}
      </div>

      <button className="px-4 py-3 rounded-xl border w-fit" onClick={submit}>
        Enviar
      </button>
    </div>
  );
}
