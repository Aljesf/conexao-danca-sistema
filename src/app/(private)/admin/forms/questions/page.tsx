"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import ToolbarRow from "@/components/layout/ToolbarRow";

type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "boolean"
  | "single_choice"
  | "multi_choice"
  | "scale";

type Option = {
  id: string;
  valor: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
};

type Question = {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  tipo: QuestionType;
  ajuda: string | null;
  placeholder: string | null;
  ativo: boolean;
  min_num: number | null;
  max_num: number | null;
  min_len: number | null;
  max_len: number | null;
  scale_min: number | null;
  scale_max: number | null;
  form_question_options?: Option[];
};

type OptionState = {
  id?: string;
  tempId: string;
  valor: string;
  rotulo: string;
  ordem: number;
  ativo: boolean;
};

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Data" },
  { value: "boolean", label: "Sim/Nao" },
  { value: "single_choice", label: "Escolha unica" },
  { value: "multi_choice", label: "Multipla escolha" },
  { value: "scale", label: "Escala" },
];

const CHOICE_TYPES: QuestionType[] = ["single_choice", "multi_choice"];

function makeTempId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNumberField(value: string): { value: number | null; ok: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { value: null, ok: true };
  const n = Number(trimmed);
  return { value: Number.isFinite(n) ? n : null, ok: Number.isFinite(n) };
}

function normalizeOptions(list: OptionState[]): OptionState[] {
  return list.map((opt, idx) => ({ ...opt, ordem: idx }));
}

export default function AdminFormsQuestionsPage() {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<QuestionType | "">("");
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<QuestionType>("text");
  const [ajuda, setAjuda] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [minNum, setMinNum] = useState("");
  const [maxNum, setMaxNum] = useState("");
  const [minLen, setMinLen] = useState("");
  const [maxLen, setMaxLen] = useState("");
  const [scaleMin, setScaleMin] = useState("");
  const [scaleMax, setScaleMax] = useState("");
  const [options, setOptions] = useState<OptionState[]>([]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/forms/questions", { cache: "no-store" });
      const json = (await res.json()) as { data?: Question[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar perguntas.");
      setQuestions(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totalPerguntas = questions.length;
  const totalAtivas = questions.filter((q) => q.ativo).length;
  const escolhaComOpcoesAtivas = questions.filter((q) => {
    if (!CHOICE_TYPES.includes(q.tipo)) return false;
    return (q.form_question_options ?? []).some((o) => o.ativo);
  }).length;

  const tipoCounts = useMemo(
    () => ({
      text: questions.filter((q) => q.tipo === "text").length,
      textarea: questions.filter((q) => q.tipo === "textarea").length,
      number: questions.filter((q) => q.tipo === "number").length,
      date: questions.filter((q) => q.tipo === "date").length,
      boolean: questions.filter((q) => q.tipo === "boolean").length,
      single_choice: questions.filter((q) => q.tipo === "single_choice").length,
      multi_choice: questions.filter((q) => q.tipo === "multi_choice").length,
      scale: questions.filter((q) => q.tipo === "scale").length,
    }),
    [questions]
  );

  const filtradas = useMemo(() => {
    const termo = filtroTexto.trim().toLowerCase();
    return questions.filter((q) => {
      if (filtroTipo && q.tipo !== filtroTipo) return false;
      if (filtroAtivo === "ativos" && !q.ativo) return false;
      if (filtroAtivo === "inativos" && q.ativo) return false;
      if (!termo) return true;
      return (
        q.codigo.toLowerCase().includes(termo) || q.titulo.toLowerCase().includes(termo)
      );
    });
  }, [questions, filtroTexto, filtroTipo, filtroAtivo]);

  function resetForm() {
    setEditingId(null);
    setCodigo("");
    setTitulo("");
    setDescricao("");
    setTipo("text");
    setAjuda("");
    setPlaceholder("");
    setAtivo(true);
    setMinNum("");
    setMaxNum("");
    setMinLen("");
    setMaxLen("");
    setScaleMin("");
    setScaleMax("");
    setOptions([]);
    setFormErr(null);
    setMsg(null);
  }

  function applyQuestion(q: Question) {
    setEditingId(q.id);
    setCodigo(q.codigo ?? "");
    setTitulo(q.titulo ?? "");
    setDescricao(q.descricao ?? "");
    setTipo(q.tipo ?? "text");
    setAjuda(q.ajuda ?? "");
    setPlaceholder(q.placeholder ?? "");
    setAtivo(Boolean(q.ativo));
    setMinNum(q.min_num == null ? "" : String(q.min_num));
    setMaxNum(q.max_num == null ? "" : String(q.max_num));
    setMinLen(q.min_len == null ? "" : String(q.min_len));
    setMaxLen(q.max_len == null ? "" : String(q.max_len));
    setScaleMin(q.scale_min == null ? "" : String(q.scale_min));
    setScaleMax(q.scale_max == null ? "" : String(q.scale_max));

    const sortedOptions = (q.form_question_options ?? [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem);
    setOptions(
      normalizeOptions(
        sortedOptions.map((opt, idx) => ({
          id: opt.id,
          tempId: opt.id || makeTempId("opt"),
          valor: opt.valor,
          rotulo: opt.rotulo,
          ordem: Number.isFinite(opt.ordem) ? opt.ordem : idx,
          ativo: opt.ativo,
        }))
      )
    );
    setFormErr(null);
    setMsg(null);
  }

  function addOption() {
    setOptions((prev) =>
      normalizeOptions([
        ...prev,
        { tempId: makeTempId("opt"), valor: "", rotulo: "", ordem: prev.length, ativo: true },
      ])
    );
  }

  function updateOption(id: string, patch: Partial<OptionState>) {
    setOptions((prev) =>
      normalizeOptions(prev.map((opt) => (opt.tempId === id ? { ...opt, ...patch } : opt)))
    );
  }

  function removeOption(id: string) {
    setOptions((prev) => normalizeOptions(prev.filter((opt) => opt.tempId !== id)));
  }

  function moveOption(id: string, dir: -1 | 1) {
    setOptions((prev) => {
      const idx = prev.findIndex((opt) => opt.tempId === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[next];
      copy[next] = temp;
      return normalizeOptions(copy);
    });
  }

  async function save() {
    setFormErr(null);
    setMsg(null);

    const codigoTrim = codigo.trim();
    const tituloTrim = titulo.trim();
    if (!codigoTrim || !tituloTrim) {
      setFormErr("Informe codigo e titulo.");
      return;
    }

    if (!QUESTION_TYPES.some((t) => t.value === tipo)) {
      setFormErr("Tipo invalido.");
      return;
    }

    const minNumParsed = parseNumberField(minNum);
    const maxNumParsed = parseNumberField(maxNum);
    const minLenParsed = parseNumberField(minLen);
    const maxLenParsed = parseNumberField(maxLen);
    const scaleMinParsed = parseNumberField(scaleMin);
    const scaleMaxParsed = parseNumberField(scaleMax);

    const numbersOk =
      minNumParsed.ok &&
      maxNumParsed.ok &&
      minLenParsed.ok &&
      maxLenParsed.ok &&
      scaleMinParsed.ok &&
      scaleMaxParsed.ok;
    if (!numbersOk) {
      setFormErr("Campos numericos invalidos.");
      return;
    }

    const isChoice = CHOICE_TYPES.includes(tipo);
    const optionsPayload = normalizeOptions(options).map((opt) => ({
      valor: opt.valor.trim(),
      rotulo: opt.rotulo.trim(),
      ordem: opt.ordem,
      ativo: opt.ativo,
    }));

    if (isChoice && optionsPayload.some((opt) => !opt.valor || !opt.rotulo)) {
      setFormErr("Preencha valor e rotulo de todas as opcoes.");
      return;
    }

    const payload: Record<string, unknown> = {
      codigo: codigoTrim,
      titulo: tituloTrim,
      tipo,
      descricao: descricao.trim() ? descricao.trim() : null,
      ajuda: ajuda.trim() ? ajuda.trim() : null,
      placeholder: placeholder.trim() ? placeholder.trim() : null,
      ativo,
      min_num: tipo === "number" ? minNumParsed.value : null,
      max_num: tipo === "number" ? maxNumParsed.value : null,
      min_len: tipo === "text" || tipo === "textarea" ? minLenParsed.value : null,
      max_len: tipo === "text" || tipo === "textarea" ? maxLenParsed.value : null,
      scale_min: tipo === "scale" ? scaleMinParsed.value : null,
      scale_max: tipo === "scale" ? scaleMaxParsed.value : null,
      ...(isChoice ? { options: optionsPayload } : {}),
    };

    setSaving(true);
    try {
      if (!editingId) {
        const res = await fetch("/api/admin/forms/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { data?: Question; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao criar pergunta.");
        const createdId = json.data?.id;

        if (createdId && isChoice && optionsPayload.length > 0) {
          const resOpt = await fetch(`/api/admin/forms/questions/${createdId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ options: optionsPayload }),
          });
          const jsonOpt = (await resOpt.json()) as { error?: string };
          if (!resOpt.ok) throw new Error(jsonOpt.error ?? "Falha ao salvar opcoes.");
        }
        if (createdId) setEditingId(createdId);
      } else {
        const res = await fetch(`/api/admin/forms/questions/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao salvar pergunta.");
      }

      setMsg("Pergunta salva.");
      await load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Banco de Perguntas"
        description="Gerencie perguntas e opções usadas nos formulários internos."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              onClick={resetForm}
            >
              Nova pergunta
            </button>
            <button
              className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
              onClick={load}
              disabled={loading}
            >
              Atualizar
            </button>
          </div>
        }
      />

      {erro ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Resumo geral</h2>
          <p className="text-sm text-slate-500">Visão rápida do banco de perguntas.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Total de perguntas</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{totalPerguntas}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Ativas</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{totalAtivas}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Perguntas com opções ativas</div>
            <div className="mt-1 text-2xl font-semibold text-slate-800">{escolhaComOpcoesAtivas}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Texto curto</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.text}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Texto longo</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.textarea}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Número</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.number}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Data</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.date}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Sim/Não</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.boolean}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Escolha única</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.single_choice}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Múltipla escolha</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.multi_choice}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs text-slate-500">Escala</div>
            <div className="mt-1 text-lg font-semibold text-slate-800">{tipoCounts.scale}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Perguntas cadastradas</h2>
            <p className="text-sm text-slate-500">Busque e edite perguntas existentes.</p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Buscar</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Codigo ou titulo"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Tipo</span>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as QuestionType | "")}
              >
                <option value="">Todos</option>
                {QUESTION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Status</span>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value as "todos" | "ativos" | "inativos")}
              >
                <option value="todos">Todos</option>
                <option value="ativos">Ativas</option>
                <option value="inativos">Inativas</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Codigo</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Titulo</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Tipo</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Ativo</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtradas.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{q.codigo}</td>
                      <td className="px-4 py-2">{q.titulo}</td>
                      <td className="px-4 py-2">{q.tipo}</td>
                      <td className="px-4 py-2">{q.ativo ? "Sim" : "Nao"}</td>
                      <td className="px-4 py-2">
                        <button className="text-sm text-slate-600 hover:underline" onClick={() => applyQuestion(q)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtradas.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={5}>
                        Nenhuma pergunta encontrada.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Nova pergunta</h2>
            <p className="text-sm text-slate-500">Cadastre uma nova pergunta.</p>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Codigo *</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Titulo *</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Tipo *</span>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as QuestionType)}
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
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Ajuda</span>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={ajuda}
                onChange={(e) => setAjuda(e.target.value)}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Placeholder</span>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
              Ativo
            </label>

            {tipo === "text" || tipo === "textarea" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Min len</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={minLen}
                    onChange={(e) => setMinLen(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Max len</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={maxLen}
                    onChange={(e) => setMaxLen(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>
            ) : null}

            {tipo === "number" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Min num</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={minNum}
                    onChange={(e) => setMinNum(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Max num</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={maxNum}
                    onChange={(e) => setMaxNum(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
              </div>
            ) : null}

            {tipo === "scale" ? (
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Scale min</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={scaleMin}
                    onChange={(e) => setScaleMin(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Scale max</span>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={scaleMax}
                    onChange={(e) => setScaleMax(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
              </div>
            ) : null}

            {CHOICE_TYPES.includes(tipo) ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Opcoes</span>
                  <button className="rounded-md border px-2 py-1 text-xs" onClick={addOption}>
                    + Adicionar opcao
                  </button>
                </div>

                {options.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">
                    Nenhuma opcao cadastrada.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {options.map((opt, idx) => (
                      <div key={opt.tempId} className="rounded-md border p-2 grid gap-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Ordem #{idx + 1}</span>
                          <div className="flex gap-2">
                            <button
                              className="rounded-md border px-2 py-1"
                              onClick={() => moveOption(opt.tempId, -1)}
                              disabled={idx === 0}
                            >
                              Subir
                            </button>
                            <button
                              className="rounded-md border px-2 py-1"
                              onClick={() => moveOption(opt.tempId, 1)}
                              disabled={idx === options.length - 1}
                            >
                              Descer
                            </button>
                            <button
                              className="rounded-md border px-2 py-1 text-red-600"
                              onClick={() => removeOption(opt.tempId)}
                            >
                              Remover
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                          <input
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="Rotulo"
                            value={opt.rotulo}
                            onChange={(e) => updateOption(opt.tempId, { rotulo: e.target.value })}
                          />
                          <input
                            className="w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="Valor"
                            value={opt.valor}
                            onChange={(e) => updateOption(opt.tempId, { valor: e.target.value })}
                          />
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={opt.ativo}
                              onChange={(e) => updateOption(opt.tempId, { ativo: e.target.checked })}
                            />
                            Ativo
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {formErr ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {formErr}
              </div>
            ) : null}

            {msg ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {msg}
              </div>
            ) : null}
          </div>

          <ToolbarRow>
            <button
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {editingId ? (
              <button className="rounded-md border px-4 py-2 text-sm" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </ToolbarRow>
        </div>
      </div>
    </div>
  );
}
