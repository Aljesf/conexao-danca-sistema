"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type CentroCusto = {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
};

export default function CentrosCustoPage() {
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const [form, setForm] = useState({ codigo: "", nome: "", ativo: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const ativos = useMemo(() => centros.filter((c) => c.ativo), [centros]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetch("/api/financeiro/centros-custo");
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao carregar centros de custo.");
        setCentros(json.data ?? []);
      } catch (err: unknown) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Erro ao carregar centros de custo.";
        alert(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  function resetForm() {
    setEditing(null);
    setForm({ codigo: "", nome: "", ativo: true });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nome.trim()) {
      alert("Código e nome são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        codigo: form.codigo.toUpperCase(),
        nome: form.nome.trim(),
        ativo: form.ativo,
        ...(editing ? { id: editing.id } : {}),
      };

      const resp = await fetch("/api/financeiro/centros-custo", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao salvar centro de custo.");

      if (editing) {
        setCentros((prev) => prev.map((c) => (c.id === editing.id ? json.data : c)));
      } else {
        setCentros((prev) => [json.data, ...prev]);
      }
      resetForm();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Erro ao salvar centro de custo.";
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function alternar(item: CentroCusto) {
    try {
      const resp = await fetch("/api/financeiro/centros-custo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ativo: !item.ativo }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao atualizar centro de custo.");
      setCentros((prev) => prev.map((c) => (c.id === item.id ? json.data : c)));
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Erro ao atualizar centro de custo.";
      alert(message);
    }
  }

  function editar(item: CentroCusto) {
    setEditing(item);
    setForm({ codigo: item.codigo, nome: item.nome, ativo: item.ativo });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Centros de custo</h1>
          <p className="text-sm text-slate-600">
            Estrutura de alocação financeira usada em todas as telas (Escola, Loja, Café). Baseada em
            docs/modelo_financeiro.md.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Organização financeira por área."
          items={[
            "Cadastre Escola, Loja e Café (ou outros centros no futuro).",
            "Cada lançamento financeiro deve estar vinculado a um centro de custo.",
            "Evite apagar centros já utilizados; prefira marcar como inativo.",
            "Use nomes claros para facilitar relatórios.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Cadastrar / editar centro</h3>
          <p className="text-sm text-slate-600">Campos seguem o padrão de formulários do design system.</p>
          <form onSubmit={salvar} className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Código
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="ESCOLA"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Nome
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Escola"
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="h-4 w-4"
              />
              Ativo
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-70"
              >
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar centro"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Centros cadastrados</h3>
          <p className="text-sm text-slate-600">Exibindo ativos e inativos. Use o modo edição para ajustes inline.</p>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Carregando...</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {centros.map((c) => (
                  <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">{c.nome}</div>
                        <div className="text-sm text-slate-600">{c.codigo}</div>
                        <div className="text-xs text-slate-500">Status: {c.ativo ? "Ativo" : "Inativo"}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => editar(c)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => alternar(c)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
                        >
                          {c.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-slate-600">
                Ativos: {ativos.length} • Total: {centros.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
