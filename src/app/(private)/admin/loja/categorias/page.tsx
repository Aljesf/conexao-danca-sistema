"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CentroCusto = {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type CategoriaFinanceira = {
  id: number;
  tipo: string; // RECEITA / DESPESA / etc.
  codigo: string;
  nome: string;
  ativo: boolean;
};

type LojaCategoria = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  ativo: boolean;
  ordem: number | null;

  // se for categoria de topo, parent_id = null
  // se for subcategoria, parent_id = id da categoria
  parent_id: number | null;

  // vínculos financeiros (usados em subcategoria)
  centro_custo_id: number | null;
  receita_categoria_id: number | null;
  despesa_categoria_id: number | null;
};

type LojaCategoriaForm = {
  id?: number;
  nome: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  ordem: number | "";
  parent_id: number | null;

  // só usados em subcategoria
  centro_custo_id: number | "";
  receita_categoria_id: number | "";
  despesa_categoria_id: number | "";
};

type LojaCategoriaTreeNode = LojaCategoria & {
  children: LojaCategoriaTreeNode[];
};

type ApiResponse<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

function buildCategoriaTree(categorias: LojaCategoria[]): LojaCategoriaTreeNode[] {
  const byId = new Map<number, LojaCategoriaTreeNode>();

  categorias.forEach((cat) => {
    byId.set(cat.id, { ...cat, children: [] });
  });

  const roots: LojaCategoriaTreeNode[] = [];

  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // ordenar por ordem, depois nome
  const sortNodes = (nodes: LojaCategoriaTreeNode[]) => {
    nodes.sort((a, b) => {
      const ao = a.ordem ?? 0;
      const bo = b.ordem ?? 0;
      if (ao !== bo) return ao - bo;
      return a.nome.localeCompare(b.nome);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };

  sortNodes(roots);
  return roots;
}

const initialFormState: LojaCategoriaForm = {
  nome: "",
  codigo: "",
  descricao: "",
  ativo: true,
  ordem: "",
  parent_id: null,
  centro_custo_id: "",
  receita_categoria_id: "",
  despesa_categoria_id: "",
};

export default function AdminLojaCategoriasPage() {
  const [categorias, setCategorias] = useState<LojaCategoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<CategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState<LojaCategoriaForm>(initialFormState);
  const isSubcategoria = form.parent_id !== null;

  const tree = useMemo(() => buildCategoriaTree(categorias), [categorias]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, ccRes, cfRes] = await Promise.all([
          fetch("/api/loja/categorias"),
          fetch("/api/financeiro/centros-custo"),
          fetch("/api/financeiro/categorias"),
        ]);

        if (!catRes.ok) throw new Error("Falha ao carregar categorias da loja.");
        if (!ccRes.ok) throw new Error("Falha ao carregar centros de custo.");
        if (!cfRes.ok) throw new Error("Falha ao carregar categorias financeiras.");

        const catJson: ApiResponse<LojaCategoria[]> | LojaCategoria[] = await catRes.json();
        const ccJson: ApiResponse<CentroCusto[]> | CentroCusto[] = await ccRes.json();
        const cfJson: ApiResponse<CategoriaFinanceira[]> | CategoriaFinanceira[] = await cfRes.json();

        const categoriasData = Array.isArray(catJson) ? catJson : (catJson.data ?? []);
        const centrosData = Array.isArray(ccJson) ? ccJson : (ccJson.data ?? []);
        const categoriasFinData = Array.isArray(cfJson) ? cfJson : (cfJson.data ?? []);

        setCategorias(categoriasData);
        setCentrosCusto(centrosData);
        setCategoriasFinanceiras(categoriasFinData);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const handleEdit = (cat: LojaCategoria, asChildOf?: LojaCategoria | null) => {
    setError(null);
    setSuccessMessage(null);
    setForm({
      id: cat.id,
      nome: cat.nome ?? "",
      codigo: cat.codigo ?? "",
      descricao: cat.descricao ?? "",
      ativo: cat.ativo ?? true,
      ordem: cat.ordem ?? "",
      parent_id: typeof cat.parent_id === "number" ? cat.parent_id : null,
      centro_custo_id: cat.centro_custo_id ?? "",
      receita_categoria_id: cat.receita_categoria_id ?? "",
      despesa_categoria_id: cat.despesa_categoria_id ?? "",
    });
  };

  const handleCreateRoot = () => {
    setError(null);
    setSuccessMessage(null);
    setForm({
      ...initialFormState,
      parent_id: null,
    });
  };

  const handleCreateChild = (parent: LojaCategoria) => {
    setError(null);
    setSuccessMessage(null);
    setForm({
      ...initialFormState,
      parent_id: parent.id,
    });
  };

  const handleChange = (field: keyof LojaCategoriaForm, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleAtivo = async (cat: LojaCategoria) => {
    setError(null);
    setSuccessMessage(null);
    try {
      setSaving(true);
      const res = await fetch(`/api/loja/categorias/${cat.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: !cat.ativo }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao atualizar categoria.");
      }

      // Atualiza na lista local
      setCategorias((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, ativo: !cat.ativo } : c))
      );
      setSuccessMessage(`Categoria ${!cat.ativo ? "ativada" : "desativada"} com sucesso.`);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Erro ao alterar status da categoria.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!form.nome.trim()) {
      setError("Nome da categoria é obrigatório.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim() || null,
        descricao: form.descricao.trim() || null,
        ativo: form.ativo,
        ordem: form.ordem === "" ? null : Number(form.ordem),
        parent_id: form.parent_id,
        centro_custo_id:
          form.centro_custo_id === "" ? null : Number(form.centro_custo_id),
        receita_categoria_id:
          form.receita_categoria_id === "" ? null : Number(form.receita_categoria_id),
        despesa_categoria_id:
          form.despesa_categoria_id === "" ? null : Number(form.despesa_categoria_id),
      };

      const isEdit = !!form.id;
      const url = isEdit
        ? `/api/loja/categorias/${form.id}`
        : "/api/loja/categorias";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao salvar categoria da loja.");
      }

      const json = await res.json();
      const saved: LojaCategoria = (json.data ?? json) as LojaCategoria;

      setCategorias((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        if (exists) {
          return prev.map((c) => (c.id === saved.id ? saved : c));
        }
        return [...prev, saved];
      });

      setSuccessMessage(isEdit ? "Categoria atualizada com sucesso." : "Categoria criada com sucesso.");
      // Mantém o formulário preenchido com os dados salvos (incluindo id, se era novo)
      setForm((prev) => ({
        ...prev,
        id: saved.id,
      }));
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Erro ao salvar categoria.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearForm = () => {
    setForm(initialFormState);
    setError(null);
    setSuccessMessage(null);
  };

  const renderTreeNode = (node: LojaCategoriaTreeNode, level = 0) => {
    const paddingLeft = 8 + level * 16;

    return (
      <div key={node.id} className="mb-2">
        <div
          className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          style={{ paddingLeft }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {node.nome}
              </span>
              {node.codigo && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                  {node.codigo}
                </span>
              )}
              {!node.ativo && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                  Inativa
                </span>
              )}
            </div>
            {node.descricao && (
              <p className="mt-1 text-xs text-slate-500">{node.descricao}</p>
            )}
          </div>
          <div className="ml-4 flex flex-col gap-1 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => handleEdit(node)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleCreateChild(node)}
              className="rounded-full border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
            >
              Nova subcategoria
            </button>
            <button
              type="button"
              onClick={() => handleToggleAtivo(node)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              {node.ativo ? "Desativar" : "Ativar"}
            </button>
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="mt-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho interno da página */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <h1 className="text-lg font-semibold text-slate-900">
          Categorias e subcategorias da Loja
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Defina o catálogo de categorias de produtos da loja e faça o
          mapeamento financeiro para centros de custo e categorias de
          receita/depesa. Este mapeamento será usado em vendas, compras e
          relatórios.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando dados...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Coluna esquerda: árvore de categorias */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Categorias da loja
              </h2>
              <button
                type="button"
                onClick={handleCreateRoot}
                className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                Nova categoria
              </button>
            </div>

            {categorias.length === 0 ? (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                <span>Nenhuma categoria cadastrada.</span>
                <button
                  type="button"
                  onClick={handleCreateRoot}
                  className="rounded-full border border-violet-300 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Criar primeira categoria
                </button>
              </div>
            ) : (
              <div className="max-h-[540px] space-y-1 overflow-auto pr-1">
                {tree.map((node) => renderTreeNode(node))}
              </div>
            )}
          </section>

          {/* Coluna direita: formulário */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              {form.id
                ? isSubcategoria
                  ? "Editar subcategoria"
                  : "Editar categoria"
                : isSubcategoria
                ? "Nova subcategoria"
                : "Nova categoria"}
            </h2>

            {error && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              {/* Nome e código */}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700">
                    Nome da categoria *
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    placeholder="Ex.: Collants, Sapatilhas, Acessórios..."
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700">
                    Código interno
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => handleChange("codigo", e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    placeholder="Ex.: COLLANT, SAPATILHA"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-700">
                  Descrição
                </label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => handleChange("descricao", e.target.value)}
                  className="min-h-[72px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                  placeholder="Detalhes sobre o tipo de produto desta categoria."
                />
              </div>

              {isSubcategoria && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Centro de custo (financeiro)
                    </label>
                    <select
                      value={form.centro_custo_id}
                      onChange={(e) =>
                        handleChange(
                          "centro_custo_id",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    >
                      <option value="">— Não vinculado —</option>
                      {centrosCusto
                        .filter((cc) => cc.ativo !== false)
                        .map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.codigo} — {cc.nome}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Não encontrou o centro de custo?
                      <Link
                        href="/admin/financeiro/centros-custo"
                        className="ml-1 font-semibold text-violet-700 hover:underline"
                      >
                        Gerenciar centros de custo
                      </Link>
                      .
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Categoria financeira de <strong>receita</strong>
                    </label>
                    <select
                      value={form.receita_categoria_id}
                      onChange={(e) =>
                        handleChange(
                          "receita_categoria_id",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    >
                      <option value="">— Não vinculado —</option>
                      {categoriasFinanceiras
                        .filter((cf) => cf.tipo === "RECEITA" && cf.ativo !== false)
                        .map((cf) => (
                          <option key={cf.id} value={cf.id}>
                            {cf.codigo} — {cf.nome}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {isSubcategoria && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-700">
                      Categoria financeira de <strong>despesa</strong>
                    </label>
                    <select
                      value={form.despesa_categoria_id}
                      onChange={(e) =>
                        handleChange(
                          "despesa_categoria_id",
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    >
                      <option value="">— Não vinculado —</option>
                      {categoriasFinanceiras
                        .filter((cf) => cf.tipo === "DESPESA" && cf.ativo !== false)
                        .map((cf) => (
                          <option key={cf.id} value={cf.id}>
                            {cf.codigo} — {cf.nome}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <p className="text-[11px] text-slate-500">
                      A receita será usada nas vendas da loja.
                      A despesa será usada nas compras de estoque e nas saídas
                      relacionadas a esta subcategoria de produto.
                      <br />
                      Não encontrou a categoria financeira?
                      <Link
                        href="/admin/financeiro/categorias"
                        className="ml-1 font-semibold text-violet-700 hover:underline"
                      >
                        Gerenciar plano financeiro
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Categoria pai e ordem */}
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700">
                    Categoria pai
                  </label>
                  <select
                    value={form.parent_id ?? ""}
                    onChange={(e) =>
                      handleChange(
                        "parent_id",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                  >
                    <option value="">— Categoria de topo —</option>
                    {categorias
                      .filter((c) => !form.id || c.id !== form.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                          {c.codigo ? ` (${c.codigo})` : ""}
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Use para transformar esta categoria em subcategoria de outra.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-700">
                    Ordem (opcional)
                  </label>
                  <input
                    type="number"
                    value={form.ordem}
                    onChange={(e) =>
                      handleChange("ordem", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-violet-400 focus:bg-white focus:ring-1 focus:ring-violet-300"
                    placeholder="Ex.: 1, 2, 3..."
                  />
                </div>
              </div>

              {/* Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="ativo"
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => handleChange("ativo", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="ativo" className="text-xs text-slate-700">
                  Categoria ativa (disponível na loja)
                </label>
              </div>

              {/* Ações */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Salvando..."
                      : form.id
                      ? "Salvar alterações"
                      : "Criar categoria"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    disabled={saving}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Limpar formulário
                  </button>
                </div>
                {form.id && (
                  <p className="text-[11px] text-slate-500">
                    ID interno: <span className="font-mono">{form.id}</span>
                  </p>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
