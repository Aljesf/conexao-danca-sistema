"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Option = { id: string; valor: string; rotulo: string; ordem: number; ativo: boolean };
type Question = {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
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

export default function AdminFormsTemplatesEditorPage({ params }: { params: { id: string } }) {
  const templateId = params.id;

  const [tpl, setTpl] = useState<Template | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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
      if (!b.ok) throw new Error(bj.error ?? "Falha ao carregar perguntas.");

      setTpl(aj.data!.template);
      setItems(aj.data!.items.map((x, idx) => ({ ...x, ordem: x.ordem ?? idx })));
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

  async function saveItems() {
    setMsg(null);
    setErr(null);
    try {
      const payload = {
        items: items.map((x) => ({
          question_id: x.form_questions.id,
          ordem: x.ordem,
          obrigatoria: x.obrigatoria,
          cond_question_id: x.cond_question_id ?? null,
          cond_equals_value: x.cond_equals_value ?? null,
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

  if (loading) return <div className="p-4">Carregando...</div>;
  if (err && !tpl) return <div className="p-4 text-red-600">{err}</div>;
  if (!tpl) return <div className="p-4">Template nao encontrado.</div>;

  return (
    <div className="p-4 grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{tpl.nome}</h1>
          <div className="text-sm opacity-70">
            Status: {tpl.status} | Versao: {tpl.versao}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-2 rounded-lg border" onClick={saveItems}>
            Salvar itens
          </button>
          <button className="px-3 py-2 rounded-lg border" onClick={() => setStatus("published")}>
            Publicar
          </button>
          <button className="px-3 py-2 rounded-lg border" onClick={() => setStatus("draft")}>
            Rascunho
          </button>
          <button className="px-3 py-2 rounded-lg border" onClick={() => setStatus("archived")}>
            Arquivar
          </button>
          <button className="px-3 py-2 rounded-lg border" onClick={generateLink}>
            Gerar link
          </button>
        </div>
      </div>

      {msg ? <div className="text-sm">{msg}</div> : null}
      {err ? <div className="text-sm text-red-600">{err}</div> : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-3">
          <div className="font-medium mb-2">Perguntas disponiveis</div>
          <div className="grid gap-2 max-h-[420px] overflow-auto">
            {allQuestions.map((q) => (
              <button
                key={q.id}
                className="text-left px-3 py-2 rounded-lg border disabled:opacity-50"
                onClick={() => addQuestion(q)}
                disabled={selectedIds.has(q.id)}
              >
                <div className="text-sm font-medium">{q.titulo}</div>
                <div className="text-xs opacity-70">
                  {q.codigo} • {q.tipo}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="font-medium mb-2">Perguntas no template</div>

          {items.length === 0 ? (
            <div className="text-sm opacity-70">Adicione perguntas ao template.</div>
          ) : null}

          <div className="grid gap-2">
            {items.map((it) => (
              <div key={it.form_questions.id} className="rounded-lg border p-3 grid gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {it.ordem + 1}. {it.form_questions.titulo}
                    </div>
                    <div className="text-xs opacity-70">{it.form_questions.tipo}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => move(it.form_questions.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
                      onClick={() => move(it.form_questions.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      className="px-2 py-1 rounded border"
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
                      setItems((prev) =>
                        prev.map((x) =>
                          x.form_questions.id === it.form_questions.id
                            ? { ...x, obrigatoria: e.target.checked }
                            : x
                        )
                      )
                    }
                  />
                  Obrigatoria
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
