"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type TipoConta = "RECEITA" | "DESPESA" | string;

type ContaContabil = {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoConta;
  parentId: number | null;
};

type TreeNode = ContaContabil & { children: TreeNode[] };

const seedPlanoContas: ContaContabil[] = [
  { id: 1, codigo: "1", nome: "Receitas", tipo: "RECEITA", parentId: null },
  { id: 2, codigo: "1.1", nome: "Receitas da Escola", tipo: "RECEITA", parentId: 1 },
  { id: 3, codigo: "1.1.1", nome: "Mensalidades", tipo: "RECEITA", parentId: 2 },
  { id: 4, codigo: "1.1.2", nome: "Workshops", tipo: "RECEITA", parentId: 2 },
  { id: 5, codigo: "1.1.3", nome: "Espetáculos", tipo: "RECEITA", parentId: 2 },
  { id: 6, codigo: "1.2", nome: "Receitas da Loja", tipo: "RECEITA", parentId: 1 },
  { id: 7, codigo: "1.2.1", nome: "Vendas Loja", tipo: "RECEITA", parentId: 6 },
  { id: 8, codigo: "1.3", nome: "Receitas do Café", tipo: "RECEITA", parentId: 1 },
  { id: 9, codigo: "1.3.1", nome: "Vendas Café", tipo: "RECEITA", parentId: 8 },
  { id: 10, codigo: "2", nome: "Despesas", tipo: "DESPESA", parentId: null },
  { id: 11, codigo: "2.1", nome: "Salários", tipo: "DESPESA", parentId: 10 },
  { id: 12, codigo: "2.1.1", nome: "Salários de Professores", tipo: "DESPESA", parentId: 11 },
  { id: 13, codigo: "2.1.2", nome: "Salários de Colaboradores", tipo: "DESPESA", parentId: 11 },
  { id: 14, codigo: "2.2", nome: "Despesas da Escola", tipo: "DESPESA", parentId: 10 },
  { id: 15, codigo: "2.3", nome: "Despesas da Loja", tipo: "DESPESA", parentId: 10 },
  { id: 16, codigo: "2.4", nome: "Despesas do Café", tipo: "DESPESA", parentId: 10 },
];

const mapApiToConta = (row: any): ContaContabil => ({
  id: row.id,
  codigo: row.codigo,
  nome: row.nome,
  tipo: row.tipo,
  parentId: row.parent_id ?? null,
});

function buildTree(nodes: ContaContabil[], tipo: TipoConta): TreeNode[] {
  const filtered = nodes.filter((n) => n.tipo === tipo);
  const map = new Map<number, TreeNode>();
  filtered.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else if (node.parentId === null) {
      roots.push(node);
    }
  });
  const sortNodes = (list: TreeNode[]) => {
    list.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
    list.forEach((child) => sortNodes(child.children));
  };
  sortNodes(roots);
  return roots;
}

function TreeList({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-2">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">{n.codigo}</span>
            <span className="text-sm font-semibold text-slate-800">{n.nome}</span>
          </div>
          {n.children.length > 0 && (
            <div className="ml-4 mt-2 border-l border-dashed border-slate-200 pl-3">
              <TreeList nodes={n.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PlanoContasPage() {
  const [contas, setContas] = useState<ContaContabil[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{ codigo: string; nome: string; tipo: TipoConta; parentId: number | null }>({
    codigo: "",
    nome: "",
    tipo: "RECEITA",
    parentId: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetch("/api/financeiro/plano-contas");
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao carregar plano de contas.");
        const dados = Array.isArray(json.data) ? json.data.map(mapApiToConta) : [];
        setContas(dados);
      } catch (err) {
        console.error("Falha ao carregar plano de contas", err);
        setContas(seedPlanoContas);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const receitas = useMemo(() => buildTree(contas, "RECEITA"), [contas]);
  const despesas = useMemo(() => buildTree(contas, "DESPESA"), [contas]);
  const paisPorTipo = useMemo(() => contas.filter((c) => c.tipo === form.tipo), [contas, form.tipo]);

  function resetForm() {
    setForm({ codigo: "", nome: "", tipo: "RECEITA", parentId: null });
  }

  async function salvarNovaConta(e: React.FormEvent) {
    e.preventDefault();
    if (!form.codigo.trim() || !form.nome.trim()) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/financeiro/plano-contas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: form.codigo.trim(),
          nome: form.nome.trim(),
          tipo: form.tipo,
          parent_id: form.parentId ?? null,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao salvar conta contábil.");
      setContas((prev) => [...prev, mapApiToConta(json.data)]);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar conta contábil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Plano de contas</h1>
          <p className="text-sm text-slate-600">
            Estrutura contábil usada para classificar receitas e despesas em todas as telas financeiras. Alinha o
            lançamento contábil com centros de custo, categorias e movimentos de caixa, conforme docs/modelo_financeiro.md.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow"
            >
              + Nova conta contábil
            </button>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Estrutura contábil da instituição."
          items={[
            "Visualize o Plano de Contas contábil completo.",
            "Contas são hierárquicas (ex.: 1.1.1 Mensalidades).",
            "Categorias financeiras devem estar vinculadas a estas contas.",
            "Evite alterar códigos sem orientação contábil.",
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Receitas</h2>
                <p className="text-sm text-slate-600">Hierarquia de contas de receita.</p>
              </div>
            </div>
            {loading ? <p className="text-sm text-slate-600">Carregando...</p> : <TreeList nodes={receitas} />}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Despesas</h2>
                <p className="text-sm text-slate-600">Hierarquia de contas de despesa.</p>
              </div>
            </div>
            {loading ? <p className="text-sm text-slate-600">Carregando...</p> : <TreeList nodes={despesas} />}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Nova conta contábil</h3>
                <p className="text-sm text-slate-600">Código, nome, tipo e vínculo opcional ao nível pai.</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-sm font-semibold text-slate-500"
                type="button"
              >
                Fechar
              </button>
            </div>
            <form onSubmit={salvarNovaConta} className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Código
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="1.1.4"
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Nome
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nova conta"
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Tipo
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoConta, parentId: null })}
                >
                  <option value="RECEITA">Receita</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Conta pai (opcional)
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.parentId ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parentId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Sem pai</option>
                  {paisPorTipo.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-70"
                >
                  {saving ? "Salvando..." : "Salvar conta"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
