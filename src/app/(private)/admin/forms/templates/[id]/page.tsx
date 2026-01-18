"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
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

type Item = {
  id?: string;
  ordem: number;
  obrigatoria: boolean;
  cond_question_id?: string | null;
  cond_equals_value?: string | null;
  form_questions: Question;
};

type Template = {
  id: string;
  nome: string;
  descricao: string | null;
  status: "draft" | "published" | "archived";
  versao: number;
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

export default function AdminFormsTemplatesEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: templateId } = use(params);

  const [tpl, setTpl] = useState<Template | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [questionCodigo, setQuestionCodigo] = useState("");
  const [questionTitulo, setQuestionTitulo] = useState("");
  const [questionTipo, setQuestionTipo] = useState("text");
  const [questionDescricao, setQuestionDescricao] = useState("");
  const [questionAjuda, setQuestionAjuda] = useState("");
  const [questionErr, setQuestionErr] = useState<string | null>(null);
  const [questionSaving, setQuestionSaving] = useState(false);

  const selectedIds = useMemo(() => new Set(items.map((i) => i.form_questions.id)), [items]);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/admin/forms/templates/${templateId}`, { cache: "no-store" }),
        fetch("/api/admin/forms/questions", { cache: "no-store" }),
      ]);

      const aj = (await a.json()) as { data?: { template: Template; items: Item[] }; error?: string };
      const bj = (await b.json()) as { data?: Question[]; error?: string };

      if (!a.ok) throw new Error(aj.error ?? "Falha ao carregar template.");
      if (aj.error) throw new Error(aj.error);
      if (!b.ok) throw new Error(bj.error ?? "Falha ao carregar perguntas.");
      if (bj.error) throw new Error(bj.error);

      if (!aj.data?.template) throw new Error("Template nao encontrado.");

      setTpl(aj.data.template);
      setItems(aj.data.items.map((x, idx) => ({ ...x, ordem: x.ordem ?? idx })));
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

  function addQuestion(q: Question) {
    if (selectedIds.has(q.id)) return;
    setItems((prev) => [...prev, { ordem: prev.length, obrigatoria: false, form_questions: q }]);
  }

  function removeQuestion(qid: string) {
    setItems((prev) =>
      prev
        .filter((x) => x.form_questions.id !== qid)
        .map((x, idx) => ({ ...x, ordem: idx }))
    );
  }

  function move(qid: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.form_questions.id === qid);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[next];
      copy[next] = tmp;
      return copy.map((x, i) => ({ ...x, ordem: i }));
    });
  }

  function updateItem(qid: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((x) => (x.form_questions.id === qid ? { ...x, ...patch } : x))
    );
  }

  async function saveItems() {
    setMsg(null);
    setErr(null);
    try {
      for (const it of items) {
        if (!it.cond_question_id) continue;
        if (it.cond_question_id === it.form_questions.id) {
          setErr("Condicao invalida: pergunta nao pode depender dela mesma.");
          return;
        }
        const condQuestion = items.find((x) => x.form_questions.id === it.cond_question_id)?.form_questions;
        if (!condQuestion || !isConditionEligible(condQuestion)) {
          setErr("Condicao invalida: escolha uma pergunta elegivel.");
          return;
        }
        const condValue = String(it.cond_equals_value ?? "").trim();
        if (!condValue) {
          setErr(`Informe o valor esperado da condicao para "${it.form_questions.titulo}".`);
          return;
        }
        if (condQuestion.tipo === "boolean" && !["true", "false"].includes(condValue)) {
          setErr("Condicao invalida: valor esperado deve ser true ou false.");
          return;
        }
      }

      const payload = {
        items: items.map((x) => ({
          question_id: x.form_questions.id,
          ordem: x.ordem,
          obrigatoria: x.obrigatoria,
          cond_question_id: x.cond_question_id ?? null,
          cond_equals_value: x.cond_equals_value ? String(x.cond_equals_value).trim() : null,
        })),
      };

      const res = await fetch(`/api/admin/forms/templates/${templateId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar itens.");
      setMsg("Itens salvos.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro desconhecido.");
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
    try {
      const res = await fetch(`/api/admin/forms/templates/${templateId}/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pessoa_id: null, responsavel_id: null }),
      });
      const json = (await res.json()) as { data?: { public_url: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar link.");
      setMsg(`Link gerado: ${json.data?.public_url ?? ""}`);
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
              onClick={() => void saveItems()}
            >
              Salvar itens
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

      {err ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      ) : null}

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
                  onClick={() => addQuestion(q)}
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

        <SectionCard title="Perguntas no template" description="Organize ordem e obrigatoriedade.">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
              Adicione perguntas ao template.
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((it) => (
                <div key={it.form_questions.id} className="rounded-lg border p-3 grid gap-2">
                  {(() => {
                    const condCandidates = items
                      .map((x) => x.form_questions)
                      .filter(
                        (q) =>
                          q.id !== it.form_questions.id &&
                          isConditionEligible(q)
                      );
                    const condQuestion =
                      items.find((x) => x.form_questions.id === it.cond_question_id)
                        ?.form_questions ?? null;
                    const condEligible = condQuestion ? isConditionEligible(condQuestion) : false;

                    return (
                      <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {it.ordem + 1}. {it.form_questions.titulo}
                      </div>
                      <div className="text-xs text-slate-500">{it.form_questions.codigo} - {it.form_questions.tipo}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={() => move(it.form_questions.id, -1)}
                      >
                        Subir
                      </button>
                      <button
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={() => move(it.form_questions.id, 1)}
                      >
                        Descer
                      </button>
                      <button
                        className="rounded-md border px-2 py-1 text-xs"
                        onClick={() => removeQuestion(it.form_questions.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={it.obrigatoria}
                      onChange={(e) =>
                        updateItem(it.form_questions.id, { obrigatoria: e.target.checked })
                      }
                    />
                    Obrigatoria
                  </label>

                  <div className="grid gap-2 rounded-md border border-dashed p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Condicao (opcional)</span>
                      {it.cond_question_id ? (
                        <button
                          className="rounded-md border px-2 py-1 text-xs"
                          onClick={() =>
                            updateItem(it.form_questions.id, {
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
                        value={it.cond_question_id ?? ""}
                        onChange={(e) =>
                          updateItem(it.form_questions.id, {
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

                    {it.cond_question_id && !condEligible ? (
                      <div className="text-xs text-red-600">
                        Condicao atual nao elegivel. Limpe para continuar.
                      </div>
                    ) : null}

                    {it.cond_question_id && condEligible && condQuestion ? (
                      <label className="grid gap-1 text-sm">
                        <span className="font-medium">Valor esperado</span>
                        {condQuestion.tipo === "boolean" ? (
                          <select
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            value={it.cond_equals_value ?? ""}
                            onChange={(e) =>
                              updateItem(it.form_questions.id, {
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
                            value={it.cond_equals_value ?? ""}
                            onChange={(e) =>
                              updateItem(it.form_questions.id, {
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
                            value={it.cond_equals_value ?? ""}
                            onChange={(e) =>
                              updateItem(it.form_questions.id, {
                                cond_equals_value: e.target.value || null,
                              })
                            }
                          />
                        ) : null}
                      </label>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

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
