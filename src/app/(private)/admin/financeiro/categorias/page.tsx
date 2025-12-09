"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type TipoCategoria = "RECEITA" | "DESPESA" | string;

type PlanoConta = {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoCategoria;
  parent_id: number | null;
};

type Categoria = {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoCategoria;
  plano_conta_id: number | null;
  ativo: boolean;
};

type TreeNode = PlanoConta & { children: TreeNode[] };

type CategoriaModalState =
  | { open: false }
  | {
      open: true;
      modo: "novo" | "editar";
      conta: PlanoConta;
      categoria?: Categoria;
    };

function buildTree(nodes: PlanoConta[], tipo: TipoCategoria): TreeNode[] {
  const filtered = nodes.filter((n) => n.tipo === tipo);
  const map = new Map<number, TreeNode>();
  filtered.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else if (node.parent_id === null) {
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

function PlanoContaTree({
  nodes,
  categoriasPorConta,
  onNova,
  onEditar,
  onToggle,
}: {
  nodes: TreeNode[];
  categoriasPorConta: Map<number, Categoria[]>;
  onNova: (conta: PlanoConta) => void;
  onEditar: (conta: PlanoConta, categoria: Categoria) => void;
  onToggle: (categoria: Categoria) => void;
}) {
  return (
    <ul className="space-y-3">
      {nodes.map((n) => {
        const cats = categoriasPorConta.get(n.id) || [];
        const hasChildren = n.children.length > 0;
        const isLeaf = !hasChildren;
        return (
          <li key={n.id}>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">{n.codigo}</span>
                <span className="text-sm font-semibold text-slate-800">{n.nome}</span>
              </div>
              {isLeaf && (
                <div className="mt-2 space-y-2">
                  {cats.length === 0 && <div className="text-xs text-slate-500">Nenhuma categoria vinculada.</div>}
                  {cats.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{cat.nome}</div>
                        <div className="text-xs text-slate-600">{cat.codigo}</div>
                        {!cat.ativo && <div className="text-xs text-rose-600">Inativa</div>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditar(n, cat)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onToggle(cat)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {cat.ativo ? "Desativar" : "Reativar"}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => onNova(n)}
                    className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-purple-700 hover:border-purple-300 hover:bg-purple-50"
                  >
                    + Nova categoria
                  </button>
                </div>
              )}
            </div>
            {hasChildren && (
              <div className="ml-4 mt-2 border-l border-dashed border-slate-200 pl-3">
                <PlanoContaTree
                  nodes={n.children}
                  categoriasPorConta={categoriasPorConta}
                  onNova={onNova}
                  onEditar={onEditar}
                  onToggle={onToggle}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function CategoriasFinanceirasPage() {
  const [planos, setPlanos] = useState<PlanoConta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [modalCategoria, setModalCategoria] = useState<CategoriaModalState>({ open: false });
  const [form, setForm] = useState<{ codigo: string; nome: string; ativo: boolean }>({
    codigo: "",
    nome: "",
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pcResp, catResp] = await Promise.all([
          fetch("/api/financeiro/plano-contas"),
          fetch("/api/financeiro/categorias"),
        ]);
        const pcJson = await pcResp.json();
        const catJson = await catResp.json();
        if (!pcResp.ok || !pcJson.ok) throw new Error(pcJson.error || "Erro ao carregar plano de contas.");
        if (!catResp.ok || !catJson.ok) throw new Error(catJson.error || "Erro ao carregar categorias financeiras.");
        setPlanos(pcJson.data ?? []);
        setCategorias(catJson.data ?? []);
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Erro ao carregar dados financeiros.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const receitas = useMemo(() => buildTree(planos, "RECEITA"), [planos]);
  const despesas = useMemo(() => buildTree(planos, "DESPESA"), [planos]);
  const categoriasPorConta = useMemo(() => {
    const map = new Map<number, Categoria[]>();
    categorias.forEach((cat) => {
      const list = map.get(cat.plano_conta_id ?? -1) || [];
      list.push(cat);
      map.set(cat.plano_conta_id ?? -1, list);
    });
    return map;
  }, [categorias]);

  function abrirNovo(conta: PlanoConta) {
    setModalCategoria({ open: true, modo: "novo", conta });
    setForm({ codigo: "", nome: "", ativo: true });
  }

  function abrirEdicao(conta: PlanoConta, categoria: Categoria) {
    setModalCategoria({ open: true, modo: "editar", conta, categoria });
    setForm({ codigo: categoria.codigo, nome: categoria.nome, ativo: categoria.ativo });
  }

  async function salvarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCategoria.open) return;
    if (!form.codigo.trim() || !form.nome.trim()) return;
    const conta = modalCategoria.conta;
    setSaving(true);
    try {
      if (modalCategoria.modo === "novo") {
        const resp = await fetch("/api/financeiro/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: conta.tipo,
            codigo: form.codigo.trim().toUpperCase(),
            nome: form.nome.trim(),
            plano_conta_id: conta.id,
            ativo: form.ativo,
          }),
        });
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao criar categoria financeira.");
        setCategorias((prev) => [...prev, json.data]);
      } else if (modalCategoria.categoria) {
        const resp = await fetch("/api/financeiro/categorias", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modalCategoria.categoria.id,
            tipo: conta.tipo,
            codigo: form.codigo.trim().toUpperCase(),
            nome: form.nome.trim(),
            plano_conta_id: conta.id,
            ativo: form.ativo,
          }),
        });
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao atualizar categoria financeira.");
        setCategorias((prev) => prev.map((c) => (c.id === json.data.id ? json.data : c)));
      }
      setModalCategoria({ open: false });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar categoria financeira.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(cat: Categoria) {
    try {
      const resp = await fetch("/api/financeiro/categorias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, ativo: !cat.ativo }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json.error || "Erro ao atualizar categoria financeira.");
      setCategorias((prev) => prev.map((c) => (c.id === json.data.id ? json.data : c)));
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao atualizar categoria financeira.");
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Categorias financeiras</h1>
          <p className="text-sm text-slate-600">
            Ancoradas ao Plano de Contas. Cada categoria pertence a uma conta contábil e segue o tipo Receita ou Despesa.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Classificação de receitas e despesas."
          items={[
            "Categorias são criadas diretamente em cada conta contábil folha.",
            "Receitas e Despesas seguem o mesmo plano de contas.",
            "Categorias inativas não aparecem em lançamentos, mas podem ser reativadas.",
            "Use códigos claros para facilitar o uso em contas a pagar/receber.",
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Receitas</h2>
              <p className="text-sm text-slate-600">Plano de contas e categorias de receita.</p>
            </div>
            {loading ? (
              <p className="text-sm text-slate-600">Carregando...</p>
            ) : (
              <PlanoContaTree
                nodes={receitas}
                categoriasPorConta={categoriasPorConta}
                onNova={abrirNovo}
                onEditar={abrirEdicao}
                onToggle={toggleAtivo}
              />
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Despesas</h2>
              <p className="text-sm text-slate-600">Plano de contas e categorias de despesa.</p>
            </div>
            {loading ? (
              <p className="text-sm text-slate-600">Carregando...</p>
            ) : (
              <PlanoContaTree
                nodes={despesas}
                categoriasPorConta={categoriasPorConta}
                onNova={abrirNovo}
                onEditar={abrirEdicao}
                onToggle={toggleAtivo}
              />
            )}
          </div>
        </div>
      </div>

      {modalCategoria.open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {modalCategoria.modo === "novo" ? "Nova categoria" : "Editar categoria"}
                </h3>
                <p className="text-sm text-slate-600">
                  Conta: {modalCategoria.conta.codigo} - {modalCategoria.conta.nome} ({modalCategoria.conta.tipo})
                </p>
              </div>
              <button
                onClick={() => setModalCategoria({ open: false })}
                className="text-sm font-semibold text-slate-500"
                type="button"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarCategoria} className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Código
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  placeholder="SAL_PROF"
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Nome
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Salário de professor"
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                Tipo
                <input
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={modalCategoria.conta.tipo}
                />
              </label>
              <label className="text-sm text-slate-700">
                Conta contábil
                <input
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={`${modalCategoria.conta.codigo} - ${modalCategoria.conta.nome}`}
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-70"
                >
                  {saving ? "Salvando..." : modalCategoria.modo === "novo" ? "Adicionar categoria" : "Salvar alterações"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalCategoria({ open: false })}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
