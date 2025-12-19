"use client";

import React, { useEffect, useMemo, useState } from "react";

type ProdutoEstoqueResumo = {
  id: number;
  nome: string;
  codigo: string | null;
  categoria: string | null;
  estoque_atual: number;
};

type MovimentoEstoque = {
  id: number;
  produto_id: number;
  variante_id: number | null;
  sku?: string | null;
  tipo: "ENTRADA" | "SAIDA" | "AJUSTE";
  quantidade: number;
  origem: string;
  referencia_id?: number | null;
  observacao?: string | null;
  created_at: string;
};

type ProdutoVariante = {
  id: number;
  sku: string | null;
  cor?: string | null;
  tamanho?: string | null;
  numeracao?: string | null;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

export default function LojaEstoquePage() {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<ProdutoEstoqueResumo[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);

  const [produtoSelecionado, setProdutoSelecionado] =
    useState<ProdutoEstoqueResumo | null>(null);
  const [variantes, setVariantes] = useState<ProdutoVariante[]>([]);
  const [varianteSelecionada, setVarianteSelecionada] = useState<string>("");
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [loadingMovimentos, setLoadingMovimentos] = useState(false);
  const [erroMovimentos, setErroMovimentos] = useState<string | null>(null);

  const [ajusteTipo, setAjusteTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [ajusteQuantidade, setAjusteQuantidade] = useState<number | "">("");
  const [ajusteObs, setAjusteObs] = useState("");
  const [ajusteLoading, setAjusteLoading] = useState(false);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<
    "success" | "error" | "info" | null
  >(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const produtosOrdenados = useMemo(() => {
    return [...produtos].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
    );
  }, [produtos]);

  const variantesMap = useMemo(() => {
    const map = new Map<number, string>();
    variantes.forEach((v) => {
      if (Number.isFinite(v.id)) {
        const labelParts = [v.sku, v.cor, v.tamanho, v.numeracao].filter(Boolean);
        map.set(v.id, labelParts.join(" - ") || v.sku || `Variante #${v.id}`);
      }
    });
    return map;
  }, [variantes]);

  async function carregarProdutos() {
    setErroProdutos(null);
    setLoadingProdutos(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("q", busca.trim());

      const res = await fetch(`/api/loja/estoque?${params.toString()}`, {
        cache: "no-store",
      });
      const json: ApiResponse<ProdutoEstoqueResumo[]> = await res.json();
      if (!res.ok || !json.ok || !json.data) {
        setErroProdutos(json.error || "Erro ao carregar estoque.");
        setProdutos([]);
        return;
      }
      setProdutos(json.data);
    } catch (err) {
      console.error("Erro ao carregar estoque:", err);
      setErroProdutos("Erro inesperado ao carregar estoque.");
      setProdutos([]);
    } finally {
      setLoadingProdutos(false);
    }
  }

  async function carregarVariantes(produtoId: number) {
    try {
      setVariantes([]);
      const res = await fetch(`/api/loja/variantes?produto_id=${produtoId}`);
      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }
      if (!res.ok || json?.ok === false) {
        console.error("Erro ao carregar variantes:", json?.error || raw);
        return;
      }
      const lista = Array.isArray(json?.variantes) ? json.variantes : [];
      setVariantes(lista);
    } catch (err) {
      console.error("Erro inesperado ao carregar variantes:", err);
      setVariantes([]);
    }
  }

  async function carregarMovimentos(produtoId: number, varianteId?: number | null) {
    setErroMovimentos(null);
    setLoadingMovimentos(true);
    try {
      const params = new URLSearchParams();
      params.set("produto_id", String(produtoId));
      params.set("limit", "50");
      if (varianteId && Number.isFinite(varianteId)) {
        params.set("variante_id", String(varianteId));
      }

      const res = await fetch(`/api/loja/estoque/movimentos?${params.toString()}`, {
        cache: "no-store",
      });
      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok || json?.ok === false) {
        const msg =
          json?.error ||
          `Erro ao carregar movimentos (status ${res.status}${
            json?.details ? `: ${json.details}` : ""
          })`;
        console.error("Erro ao carregar movimentos:", msg, raw);
        setErroMovimentos(msg);
        setMovimentos([]);
        return;
      }

      const dados = Array.isArray(json?.movimentos)
        ? json.movimentos
        : Array.isArray(json?.data)
        ? json.data
        : [];
      const normalizados = dados.map((m: any) => ({
        ...m,
        variante_id: m?.variante_id ?? null,
        sku: m?.sku ?? null,
      }));
      setMovimentos(normalizados);
    } catch (err) {
      console.error("Erro ao carregar movimentos:", err);
      setErroMovimentos("Erro inesperado ao carregar movimentos.");
      setMovimentos([]);
    } finally {
      setLoadingMovimentos(false);
    }
  }

  function selecionarProduto(p: ProdutoEstoqueResumo) {
    setProdutoSelecionado(p);
    setVariantes([]);
    setVarianteSelecionada("");
    carregarVariantes(p.id);
    carregarMovimentos(p.id);
    setMensagem(null);
    setMensagemTipo(null);
  }

  function statusEstoque(qtd: number): { label: string; color: string } {
    if (qtd <= 0) return { label: "Zerado", color: "text-rose-600" };
    if (qtd <= 5) return { label: "Baixo", color: "text-amber-600" };
    return { label: "OK", color: "text-emerald-600" };
  }

  function labelVariante(v: ProdutoVariante) {
    const parts = [v.sku, v.cor, v.tamanho, v.numeracao].filter(Boolean);
    return parts.join(" - ") || v.sku || `Variante #${v.id}`;
  }

  function labelVarianteMovimento(m: MovimentoEstoque) {
    if (!m.variante_id) return "-";
    return variantesMap.get(m.variante_id) || m.sku || `Variante #${m.variante_id}`;
  }

  function handleVarianteChange(value: string) {
    setVarianteSelecionada(value);
    if (produtoSelecionado) {
      const varId = value ? Number(value) : null;
      carregarMovimentos(produtoSelecionado.id, varId);
    }
  }

  async function handleAjusteManual(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    setMensagemTipo(null);

    if (!produtoSelecionado) {
      setMensagem("Selecione um produto antes de ajustar o estoque.");
      setMensagemTipo("error");
      return;
    }
    if (!ajusteQuantidade || ajusteQuantidade <= 0) {
      setMensagem("Informe uma quantidade maior que zero.");
      setMensagemTipo("error");
      return;
    }

    setAjusteLoading(true);
    try {
      const res = await fetch("/api/loja/estoque/movimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produtoSelecionado.id,
          tipo: ajusteTipo,
          quantidade: Number(ajusteQuantidade),
          observacao: ajusteObs.trim() || null,
        }),
      });
      const json: ApiResponse<any> = await res.json();
      if (!res.ok || !json.ok) {
        setMensagem(json.error || "Erro ao ajustar estoque.");
        setMensagemTipo("error");
        return;
      }

      // Recarrega lista e movimentos
      await carregarProdutos();
      const varId = varianteSelecionada ? Number(varianteSelecionada) : null;
      await carregarMovimentos(produtoSelecionado.id, varId);

      // Atualiza saldo na seleção atual
      const atualizado = produtos.find((p) => p.id === produtoSelecionado.id);
      if (atualizado) setProdutoSelecionado(atualizado);

      setMensagem("Ajuste registrado com sucesso.");
      setMensagemTipo("success");
      setAjusteQuantidade("");
      setAjusteObs("");
    } catch (err) {
      console.error("Erro ao ajustar estoque:", err);
      setMensagem("Erro inesperado ao ajustar estoque.");
      setMensagemTipo("error");
    } finally {
      setAjusteLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Estoque — Loja v0</h1>
        <p className="text-sm text-gray-600">
          Visualize o saldo atual dos produtos, os movimentos recentes e registre ajustes
          manuais de entrada ou saída.
        </p>
      </header>

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Buscar por nome ou código
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Ex.: sapatilha, meias, código interno..."
            />
          </div>
          <button
            type="button"
            onClick={carregarProdutos}
            disabled={loadingProdutos}
            className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {loadingProdutos ? "Atualizando..." : "Atualizar lista"}
          </button>
        </div>
        {erroProdutos && (
          <p className="text-xs text-rose-600">{erroProdutos}</p>
        )}
      </section>

      <section className="bg-white border rounded-xl shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Produtos e saldo atual</h2>
          <span className="text-xs text-gray-500">
            {produtos.length} produto(s)
          </span>
        </div>
        <div className="border-t overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-right">Estoque</th>
                <th className="px-3 py-2 text-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {produtosOrdenados.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-xs text-gray-500"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
              {produtosOrdenados.map((p) => {
                const status = statusEstoque(p.estoque_atual);
                const selecionado = produtoSelecionado?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => selecionarProduto(p)}
                    className={`cursor-pointer ${
                      selecionado ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      {p.nome}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {p.codigo || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {p.categoria || "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {p.estoque_atual}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.color.replace(
                          "text-",
                          "border-"
                        )} ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Movimentos recentes</h2>
            <p className="text-xs text-gray-500">
              Selecione um produto na tabela para ver o histórico de movimentos e
              registrar ajustes.
            </p>
          </div>
          {produtoSelecionado && (
            <div className="text-xs text-gray-600">
              Produto selecionado:{" "}
              <span className="font-semibold text-gray-800">
                {produtoSelecionado.nome}
              </span>{" "}
              — saldo: {produtoSelecionado.estoque_atual}
            </div>
          )}
        </div>

        {produtoSelecionado ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600">
                  Filtrar por variante
                </label>
                <select
                  value={varianteSelecionada}
                  onChange={(e) => handleVarianteChange(e.target.value)}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value="">Todas (produto)</option>
                  {variantes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {labelVariante(v)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase text-gray-600">
                    Histórico (últimos lançamentos)
                  </h3>
                  {loadingMovimentos && (
                    <span className="text-[11px] text-gray-500">Carregando...</span>
                  )}
                </div>
                {erroMovimentos && (
                  <p className="text-xs text-rose-600 mb-2">{erroMovimentos}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase">
                      <tr>
                        <th className="px-2 py-1 text-left">Data</th>
                        <th className="px-2 py-1 text-left">Tipo</th>
                        <th className="px-2 py-1 text-left">Variante</th>
                        <th className="px-2 py-1 text-right">Qtd</th>
                        <th className="px-2 py-1 text-left">Origem</th>
                        <th className="px-2 py-1 text-left">Obs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentos.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-2 py-3 text-center text-gray-500"
                          >
                            Nenhum movimento encontrado.
                          </td>
                        </tr>
                      )}
                      {movimentos.map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="px-2 py-1 text-gray-800">
                            {new Date(m.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-2 py-1 font-semibold text-gray-800">
                            {m.tipo}
                          </td>
                          <td className="px-2 py-1 text-gray-700">
                            {labelVarianteMovimento(m)}
                          </td>
                          <td className="px-2 py-1 text-right text-gray-800">
                            {m.quantidade}
                          </td>
                          <td className="px-2 py-1 text-gray-700">{m.origem}</td>
                          <td className="px-2 py-1 text-gray-700">
                            {m.observacao || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-slate-50">
                <h3 className="text-xs font-semibold uppercase text-gray-600 mb-2">
                  Ajuste manual
                </h3>
                <form className="space-y-3" onSubmit={handleAjusteManual}>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Tipo de ajuste
                    </label>
                    <select
                      value={ajusteTipo}
                      onChange={(e) =>
                        setAjusteTipo(e.target.value as "ENTRADA" | "SAIDA")
                      }
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={ajusteQuantidade}
                      onChange={(e) =>
                        setAjusteQuantidade(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="Ex.: 5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={ajusteObs}
                      onChange={(e) => setAjusteObs(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Ex.: ajuste de inventário, contagem física..."
                    />
                  </div>

                  {mensagem && (
                    <div
                      className={`text-xs border rounded-md px-3 py-2 ${
                        mensagemTipo === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {mensagem}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={ajusteLoading}
                      className="inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {ajusteLoading ? "Registrando..." : "Registrar ajuste"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Nenhum produto selecionado. Clique em um produto na tabela acima para ver o
            histórico e registrar ajustes.
          </p>
        )}
      </section>
    </div>
  );
}
