"use client";

import { useEffect, useState } from "react";

type CentroCusto = { id: number; nome: string; codigo?: string | null };
type CategoriaFinanceira = { id: number; nome: string; codigo?: string | null };

type SubcategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo?: boolean;
  categoria_id?: number | null;
  centro_custo_id?: number | null;
  receita_categoria_id?: number | null;
  despesa_categoria_id?: number | null;
};

type CategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo?: boolean;
  subcategorias?: SubcategoriaLoja[];
};

export default function CategoriasLojaAdminPage() {
  const [categorias, setCategorias] = useState<CategoriaLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCategorias, setErroCategorias] = useState("");

  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [catsReceita, setCatsReceita] = useState<CategoriaFinanceira[]>([]);
  const [catsDespesa, setCatsDespesa] = useState<CategoriaFinanceira[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);
  const [erroFinanceiro, setErroFinanceiro] = useState<string | null>(null);
  const [savingSubId, setSavingSubId] = useState<number | null>(null);

  useEffect(() => {
    async function carregarTudo() {
      try {
        setLoading(true);
        setErro(null);
        setErroCategorias("");

        const res = await fetch("/api/loja/produtos/categorias");
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Erro ao listar categorias da loja.");
        }

        setCategorias(json.categorias ?? []);
      } catch (err: any) {
        console.error(err);
        setErro(err.message || "Erro ao carregar categorias da loja.");
        setCategorias([]);
        setErroCategorias(err.message || "Erro ao listar categorias da loja.");
      } finally {
        setLoading(false);
      }
    }

    async function carregarFinanceiro() {
      try {
        setLoadingFinanceiro(true);
        setErroFinanceiro(null);

        const [resCentros, resRec, resDesp] = await Promise.all([
          fetch("/api/financeiro/centros-custo"),
          fetch("/api/financeiro/categorias-receita"),
          fetch("/api/financeiro/categorias-despesa"),
        ]);

        const centrosJson = await resCentros.json();
        const recJson = await resRec.json();
        const despJson = await resDesp.json();

        if (!centrosJson.ok) throw new Error(centrosJson.error || "Erro ao carregar centros de custo.");
        if (!recJson.ok) throw new Error(recJson.error || "Erro ao carregar categorias de receita.");
        if (!despJson.ok) throw new Error(despJson.error || "Erro ao carregar categorias de despesa.");

        setCentrosCusto(centrosJson.itens ?? []);
        setCatsReceita(recJson.itens ?? []);
        setCatsDespesa(despJson.itens ?? []);
      } catch (err: any) {
        console.error(err);
        setErroFinanceiro(err.message || "Erro ao carregar dados financeiros.");
      } finally {
        setLoadingFinanceiro(false);
      }
    }

    carregarTudo();
    carregarFinanceiro();
  }, []);

  async function handleUpdateSubcategoria(
    subcategoriaId: number,
    data: { centro_custo_id?: number | null; receita_categoria_id?: number | null; despesa_categoria_id?: number | null }
  ) {
    try {
      setSavingSubId(subcategoriaId);
      const res = await fetch(`/api/loja/produtos/subcategorias/${subcategoriaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Erro ao atualizar subcategoria.");
      }

      setCategorias((prev) =>
        prev.map((cat) => ({
          ...cat,
          subcategorias: cat.subcategorias?.map((sub) =>
            sub.id === subcategoriaId ? { ...sub, ...data } : sub
          ),
        }))
      );
    } catch (err) {
      console.error(err);
      setErro(err instanceof Error ? err.message : "Erro ao atualizar subcategoria.");
    } finally {
      setSavingSubId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="space-y-1">
        <p className="text-xs text-gray-500 uppercase">Administracao da Loja</p>
        <h1 className="text-lg font-semibold">Categorias e subcategorias</h1>
        <p className="text-xs text-gray-600">
          Defina o mapeamento financeiro por subcategoria para centros de custo e categorias de receita/despesa.
        </p>
      </header>

      {erro && <p className="text-xs text-red-600">{erro}</p>}
      {loading && <p className="text-xs text-gray-500">Carregando categorias...</p>}
      {erroCategorias && <p className="text-sm text-red-600">{erroCategorias}</p>}

      {!loading && !erroCategorias && categorias.length === 0 && (
        <p className="text-xs text-gray-500">Nenhuma categoria cadastrada.</p>
      )}

      {categorias.map((categoria) => (
        <div key={categoria.id} className="rounded-lg border bg-white p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">
                {categoria.nome} {categoria.codigo ? `(${categoria.codigo})` : ""}
              </p>
              <p className="text-[11px] text-gray-500">ID #{categoria.id}</p>
            </div>
            {categoria.ativo !== undefined && (
              <span className="text-[11px] rounded-full border px-2 py-0.5">
                {categoria.ativo ? "Ativa" : "Inativa"}
              </span>
            )}
          </div>

          {(categoria.subcategorias ?? []).length === 0 ? (
            <p className="text-xs text-gray-500">Nenhuma subcategoria nesta categoria.</p>
          ) : (
            <div className="space-y-3">
              {categoria.subcategorias?.map((sub) => (
                <div key={sub.id} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {sub.nome} {sub.codigo ? `(${sub.codigo})` : ""}
                      </p>
                      <p className="text-[11px] text-gray-500">Subcategoria #{sub.id}</p>
                    </div>
                    {sub.ativo !== undefined && (
                      <span className="text-[11px] rounded-full border px-2 py-0.5">
                        {sub.ativo ? "Ativa" : "Inativa"}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-semibold mb-2">Integracao financeira</p>
                    {erroFinanceiro && (
                      <p className="text-xs text-red-600 mb-2">{erroFinanceiro}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Centro de custo</label>
                        <select
                          className="input w-full border rounded-md px-2 py-1 text-sm"
                          value={sub.centro_custo_id ?? ""}
                          onChange={(e) =>
                            handleUpdateSubcategoria(sub.id, {
                              centro_custo_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={loadingFinanceiro || savingSubId === sub.id}
                        >
                          <option value="">(definir no financeiro)</option>
                          {centrosCusto.map((cc) => (
                            <option key={cc.id} value={cc.id}>
                              {cc.nome} {cc.codigo ? `(${cc.codigo})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Categoria de receita</label>
                        <select
                          className="input w-full border rounded-md px-2 py-1 text-sm"
                          value={sub.receita_categoria_id ?? ""}
                          onChange={(e) =>
                            handleUpdateSubcategoria(sub.id, {
                              receita_categoria_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={loadingFinanceiro || savingSubId === sub.id}
                        >
                          <option value="">(nao definida)</option>
                          {catsReceita.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome} {cat.codigo ? `(${cat.codigo})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Categoria de despesa</label>
                        <select
                          className="input w-full border rounded-md px-2 py-1 text-sm"
                          value={sub.despesa_categoria_id ?? ""}
                          onChange={(e) =>
                            handleUpdateSubcategoria(sub.id, {
                              despesa_categoria_id: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          disabled={loadingFinanceiro || savingSubId === sub.id}
                        >
                          <option value="">(nao definida)</option>
                          {catsDespesa.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nome} {cat.codigo ? `(${cat.codigo})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {savingSubId === sub.id && (
                      <p className="text-[11px] text-gray-500 mt-1">Salvando...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

