"use client";

import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

// Visual espelhado no Plano de Contas: arvore por tipo, categorias ancoradas em cada conta contabill.

type TipoCategoria = "RECEITA" | "DESPESA";

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
  plano_conta_id: number;
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

const seedPlanos: PlanoConta[] = [
  { id: 1, codigo: "1", nome: "Receitas", tipo: "RECEITA", parent_id: null },
  { id: 2, codigo: "1.1", nome: "Receitas da Escola", tipo: "RECEITA", parent_id: 1 },
  { id: 3, codigo: "1.1.1", nome: "Mensalidades", tipo: "RECEITA", parent_id: 2 },
  { id: 4, codigo: "1.1.2", nome: "Workshops", tipo: "RECEITA", parent_id: 2 },
  { id: 5, codigo: "1.2", nome: "Receitas da Loja", tipo: "RECEITA", parent_id: 1 },
  { id: 6, codigo: "1.2.1", nome: "Vendas Loja", tipo: "RECEITA", parent_id: 5 },
  { id: 7, codigo: "2", nome: "Despesas", tipo: "DESPESA", parent_id: null },
  { id: 8, codigo: "2.1", nome: "Salarios", tipo: "DESPESA", parent_id: 7 },
  { id: 9, codigo: "2.1.1", nome: "Salarios Professores", tipo: "DESPESA", parent_id: 8 },
  { id: 10, codigo: "2.2", nome: "Despesas da Escola", tipo: "DESPESA", parent_id: 7 },
];

const seedCategorias: Categoria[] = [
  { id: 1, codigo: "MENSAL", nome: "Mensalidade", tipo: "RECEITA", plano_conta_id: 3, ativo: true },
  { id: 2, codigo: "WORK", nome: "Workshop", tipo: "RECEITA", plano_conta_id: 4, ativo: true },
  { id: 3, codigo: "VENDA_LOJA", nome: "Venda loja", tipo: "RECEITA", plano_conta_id: 6, ativo: true },
  { id: 4, codigo: "SAL_PROF", nome: "Salario Professor", tipo: "DESPESA", plano_conta_id: 9, ativo: true },
  { id: 5, codigo: "ALUGUEL", nome: "Aluguel", tipo: "DESPESA", plano_conta_id: 10, ativo: true },
];

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
  onToggle: (categoriaId: number) => void;
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
                  {cats.length === 0 && (
                    <div className="text-xs text-slate-500">Nenhuma categoria vinculada.</div>
                  )}
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
                          onClick={() => onToggle(cat.id)}
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
  const supabase = getSupabaseBrowser();
  const [planos, setPlanos] = useState<PlanoConta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [modalCategoria, setModalCategoria] = useState<CategoriaModalState>({ open: false });
  const [form, setForm] = useState<{ codigo: string; nome: string; ativo: boolean }>({
    codigo: "",
    nome: "",
    ativo: true,
  });

  useEffect(() => {
    let ativo = true;
    async function carregarPlanos() {
      try {
        const { data, error } = await supabase
          .from("plano_contas")
          .select("id, codigo, nome, tipo, parent_id")
          .order("codigo");
        if (error) throw error;
        if (ativo && data) {
          setPlanos(data as PlanoConta[]);
        }
      } catch (err) {
        console.error("Falha ao carregar plano_contas", err);
        if (ativo) setPlanos(seedPlanos);
      }
    }
    carregarPlanos();
    return () => {
      ativo = false;
    };
  }, [supabase]);

  useEffect(() => {
    let ativo = true;
    async function carregarCategorias() {
      try {
        const { data, error } = await supabase
          .from("categorias_financeiras")
          .select("id, codigo, nome, tipo, plano_conta_id, ativo")
          .order("codigo");
        if (error) throw error;
        if (ativo && data) {
          setCategorias(data as Categoria[]);
        }
      } catch (err) {
        console.error("Falha ao carregar categorias_financeiras", err);
        if (ativo) setCategorias(seedCategorias);
      }
    }
    carregarCategorias();
    return () => {
      ativo = false;
    };
  }, [supabase]);

  const receitas = useMemo(() => buildTree(planos, "RECEITA"), [planos]);
  const despesas = useMemo(() => buildTree(planos, "DESPESA"), [planos]);
  const categoriasPorConta = useMemo(() => {
    const map = new Map<number, Categoria[]>();
    categorias.forEach((cat) => {
      const list = map.get(cat.plano_conta_id) || [];
      list.push(cat);
      map.set(cat.plano_conta_id, list);
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

  function salvarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!modalCategoria.open) return;
    if (!form.codigo.trim() || !form.nome.trim()) return;
    const conta = modalCategoria.conta;
    if (modalCategoria.modo === "novo") {
      const novoId = categorias.length ? Math.max(...categorias.map((c) => c.id)) + 1 : 1;
      const nova: Categoria = {
        id: novoId,
        codigo: form.codigo.toUpperCase(),
        nome: form.nome,
        tipo: conta.tipo,
        plano_conta_id: conta.id,
        ativo: form.ativo,
      };
      setCategorias((prev) => [...prev, nova]);
    } else if (modalCategoria.categoria) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.id === modalCategoria.categoria!.id
            ? { ...c, codigo: form.codigo.toUpperCase(), nome: form.nome, ativo: form.ativo }
            : c
        )
      );
    }
    setModalCategoria({ open: false });
  }

  function toggleAtivo(categoriaId: number) {
    setCategorias((prev) => prev.map((c) => (c.id === categoriaId ? { ...c, ativo: !c.ativo } : c)));
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Categorias financeiras</h1>
          <p className="text-sm text-slate-600">
            Ancoradas ao Plano de Contas. Cada categoria pertence a uma conta contabill e segue o tipo Receita ou Despesa.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Classificacao de receitas e despesas."
          items={[
            "Categorias sao criadas diretamente em cada conta contabill folha.",
            "Receitas e Despesas seguem o mesmo plano de contas.",
            "Categorias inativas nao aparecem em lancamentos, mas podem ser reativadas.",
            "Use codigos claros para facilitar o uso em contas a pagar/receber.",
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Receitas</h2>
              <p className="text-sm text-slate-600">Plano de contas e categorias de receita.</p>
            </div>
            <PlanoContaTree
              nodes={receitas}
              categoriasPorConta={categoriasPorConta}
              onNova={abrirNovo}
              onEditar={abrirEdicao}
              onToggle={toggleAtivo}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-slate-800">Despesas</h2>
              <p className="text-sm text-slate-600">Plano de contas e categorias de despesa.</p>
            </div>
            <PlanoContaTree
              nodes={despesas}
              categoriasPorConta={categoriasPorConta}
              onNova={abrirNovo}
              onEditar={abrirEdicao}
              onToggle={toggleAtivo}
            />
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
              >
                Fechar
              </button>
            </div>

            <form onSubmit={salvarCategoria} className="mt-4 grid gap-3">
              <label className="text-sm text-slate-700">
                Codigo
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
                  placeholder="Salario de professor"
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
                Conta contabill
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
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  {modalCategoria.modo === "novo" ? "Adicionar categoria" : "Salvar alteracoes"}
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
