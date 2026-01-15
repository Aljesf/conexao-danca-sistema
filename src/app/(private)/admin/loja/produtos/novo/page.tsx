"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SectionCard from "@/components/layout/SectionCard";

type ProdutoCriado = {
  id: number;
  nome: string | null;
  codigo: string | null;
};

type VariantesApiItem = {
  id: number;
  sku: string | null;
  nome: string | null;
  atributos: Record<string, string> | null;
  ativo: boolean | null;
};

function onlyDigits(v: string): string {
  return v.replace(/[^\d]/g, "");
}

function parseBRLToCentavos(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  if (!normalized) return null;
  const n = Number(normalized);
  if (Number.isNaN(n) || !Number.isFinite(n)) return null;

  const centavos = Math.round(n * 100);
  if (centavos < 0) return null;
  return centavos;
}

function formatCentavosToBRL(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  const v = (centavos / 100).toFixed(2);
  const parts = v.split(".");
  const intPart = parts[0] ?? "0";
  const decPart = parts[1] ?? "00";
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${decPart}`;
}

export default function LojaProdutoNovoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [unidade, setUnidade] = useState("UN");
  const [categoria, setCategoria] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [precoCustoUi, setPrecoCustoUi] = useState("");
  const [precoVendaUi, setPrecoVendaUi] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  const precoCustoCentavos = useMemo(
    () => parseBRLToCentavos(precoCustoUi),
    [precoCustoUi]
  );
  const precoVendaCentavos = useMemo(
    () => parseBRLToCentavos(precoVendaUi),
    [precoVendaUi]
  );

  const [produtoCriado, setProdutoCriado] = useState<ProdutoCriado | null>(null);

  async function handleCriarProduto() {
    try {
      setErro(null);
      setOkMsg(null);

      const nomeTrim = nome.trim();
      if (!nomeTrim) {
        setErro("Informe o nome do produto.");
        return;
      }

      const unidadeTrim = unidade.trim() || "UN";

      setLoading(true);

      const res = await fetch("/api/loja/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeTrim,
          codigo: codigo.trim() || null,
          unidade: unidadeTrim,
          categoria: categoria.trim() || null,
          subcategoria: subcategoria.trim() || null,
          fornecedor_principal_id: fornecedorId
            ? Number(onlyDigits(fornecedorId))
            : null,
          preco_custo_centavos: precoCustoCentavos,
          preco_venda_centavos: precoVendaCentavos,
          observacoes: observacoes.trim() || null,
          ativo,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { data?: ProdutoCriado; error?: string; details?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.details ?? json?.error ?? "Falha ao criar produto.");
      }

      const data = json?.data ?? null;
      if (!data?.id) {
        throw new Error("Produto criado, mas a API não retornou o ID.");
      }

      setProdutoCriado(data);
      setOkMsg(
        `Produto criado: ${data.nome ?? nomeTrim} (${data.codigo ?? "sem código"})`
      );
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao criar produto.");
    } finally {
      setLoading(false);
    }
  }

  const [variantesLoading, setVariantesLoading] = useState(false);
  const [variantesErro, setVariantesErro] = useState<string | null>(null);
  const [variantes, setVariantes] = useState<VariantesApiItem[]>([]);

  const [varNome, setVarNome] = useState("");
  const [varSku, setVarSku] = useState("");
  const [varAtributo1Nome, setVarAtributo1Nome] = useState("Tamanho");
  const [varAtributo1Valor, setVarAtributo1Valor] = useState("");
  const [varAtributo2Nome, setVarAtributo2Nome] = useState("Cor");
  const [varAtributo2Valor, setVarAtributo2Valor] = useState("");
  const [varAtivo, setVarAtivo] = useState(true);
  const [varSaving, setVarSaving] = useState(false);

  async function carregarVariantes(produtoId: number) {
    try {
      setVariantesErro(null);
      setVariantesLoading(true);

      const res = await fetch(`/api/loja/variantes?produto_id=${produtoId}`, {
        method: "GET",
      });

      const json = (await res.json().catch(() => null)) as
        | {
            items?: VariantesApiItem[];
            data?: VariantesApiItem[];
            error?: string;
            details?: string;
          }
        | null;

      if (!res.ok) {
        throw new Error(json?.details ?? json?.error ?? "Falha ao carregar variantes.");
      }

      const list = Array.isArray(json?.items)
        ? (json?.items as VariantesApiItem[])
        : Array.isArray(json?.data)
        ? (json?.data as VariantesApiItem[])
        : [];

      setVariantes(list);
    } catch (e: unknown) {
      setVariantesErro(e instanceof Error ? e.message : "Erro ao carregar variantes.");
      setVariantes([]);
    } finally {
      setVariantesLoading(false);
    }
  }

  useEffect(() => {
    if (!produtoCriado?.id) return;
    void carregarVariantes(produtoCriado.id);
  }, [produtoCriado?.id]);

  async function handleCriarVariante() {
    if (!produtoCriado?.id) return;

    try {
      setVariantesErro(null);
      setOkMsg(null);

      const nomeTrim = varNome.trim() || null;

      const atributos: Record<string, string> = {};
      const a1n = varAtributo1Nome.trim();
      const a1v = varAtributo1Valor.trim();
      const a2n = varAtributo2Nome.trim();
      const a2v = varAtributo2Valor.trim();
      if (a1n && a1v) atributos[a1n] = a1v;
      if (a2n && a2v) atributos[a2n] = a2v;

      if (!nomeTrim && Object.keys(atributos).length === 0) {
        setVariantesErro("Informe ao menos um nome ou um atributo (ex.: Tamanho).");
        return;
      }

      setVarSaving(true);

      const res = await fetch("/api/loja/variantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produtoCriado.id,
          nome: nomeTrim,
          sku: varSku.trim() || null,
          atributos: Object.keys(atributos).length ? atributos : null,
          ativo: varAtivo,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { data?: VariantesApiItem; error?: string; details?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.details ?? json?.error ?? "Falha ao criar variante.");
      }

      setVarNome("");
      setVarSku("");
      setVarAtributo1Valor("");
      setVarAtributo2Valor("");
      setVarAtivo(true);

      setOkMsg("Variante criada com sucesso.");
      await carregarVariantes(produtoCriado.id);
    } catch (e: unknown) {
      setVariantesErro(
        e instanceof Error ? e.message : "Erro inesperado ao criar variante."
      );
    } finally {
      setVarSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between text-[11px] text-slate-500 md:text-xs">
          <div className="flex items-center gap-1">
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Loja (Admin)
            </span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">Produtos</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-500">Novo</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/loja/produtos"
              className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-1.5 text-[11px] font-medium text-violet-700 shadow-sm backdrop-blur hover:bg-violet-50 md:text-xs"
            >
              Voltar para a lista
            </Link>
          </div>
        </div>

        <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Novo produto (cadastro rápido)
              </h1>
              <p className="mt-2 max-w-3xl text-[15px] text-slate-600">
                Cadastre o produto sem entrada de estoque. Você poderá cadastrar as
                variantes em seguida e usar este produto em pedidos e compras depois.
              </p>
            </div>

            {produtoCriado?.id ? (
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-[11px] font-medium text-slate-400 md:text-xs">
                  Produto criado
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm md:text-sm">
                  #{produtoCriado.id} • {produtoCriado.codigo ?? "sem código"}
                </span>
              </div>
            ) : null}
          </div>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm md:text-base">
            {erro}
          </div>
        )}
        {okMsg && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm md:text-base">
            {okMsg}
          </div>
        )}

        <SectionCard title="Cadastrar produto (sem estoque)">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-slate-400">Nome do produto *</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Uniforme Conexao Danca 2026"
                disabled={Boolean(produtoCriado?.id)}
              />
            </div>

            <div>
              <p className="text-sm text-slate-400">Codigo interno (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Se vazio, o sistema gera automaticamente"
                disabled={Boolean(produtoCriado?.id)}
              />
            </div>

            <div>
              <p className="text-sm text-slate-400">Unidade</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="UN"
                disabled={Boolean(produtoCriado?.id)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Dica: mantenha UN para pecas/uniformes. Sem estoque nesta tela.
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Fornecedor principal (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                placeholder="ID do fornecedor (opcional)"
                disabled={Boolean(produtoCriado?.id)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Se você preferir, pode deixar vazio e definir depois.
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-400">Categoria (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex.: Vestuário"
                disabled={Boolean(produtoCriado?.id)}
              />
            </div>

            <div>
              <p className="text-sm text-slate-400">Subcategoria (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                placeholder="Ex.: Uniforme"
                disabled={Boolean(produtoCriado?.id)}
              />
            </div>

            <div>
              <p className="text-sm text-slate-400">Preço de custo (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={precoCustoUi}
                onChange={(e) => setPrecoCustoUi(e.target.value)}
                placeholder="Ex.: 36,00"
                inputMode="decimal"
                disabled={Boolean(produtoCriado?.id)}
              />
              {!!precoCustoCentavos && (
                <p className="mt-1 text-xs text-slate-500">
                  Interpretado: R$ {formatCentavosToBRL(precoCustoCentavos)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-slate-400">Preço de venda (opcional)</p>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={precoVendaUi}
                onChange={(e) => setPrecoVendaUi(e.target.value)}
                placeholder="Ex.: 100,00"
                inputMode="decimal"
                disabled={Boolean(produtoCriado?.id)}
              />
              {!!precoVendaCentavos && (
                <p className="mt-1 text-xs text-slate-500">
                  Interpretado: R$ {formatCentavosToBRL(precoVendaCentavos)}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-slate-400">Observações (opcional)</p>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes gerais do produto..."
                disabled={Boolean(produtoCriado?.id)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="ativo"
                type="checkbox"
                className="h-4 w-4"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                disabled={Boolean(produtoCriado?.id)}
              />
              <label htmlFor="ativo" className="text-sm text-slate-700">
                Produto ativo
              </label>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Esta tela não registra estoque. Entradas e ajustes ficam na Gestão de
                Estoque.
              </div>

              {!produtoCriado?.id ? (
                <button
                  type="button"
                  onClick={handleCriarProduto}
                  disabled={loading}
                  className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
                >
                  {loading ? "Cadastrando..." : "Cadastrar produto"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/loja/produtos")}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProdutoCriado(null);
                      setNome("");
                      setCodigo("");
                      setUnidade("UN");
                      setCategoria("");
                      setSubcategoria("");
                      setFornecedorId("");
                      setPrecoCustoUi("");
                      setPrecoVendaUi("");
                      setObservacoes("");
                      setAtivo(true);
                      setVariantes([]);
                      setVariantesErro(null);
                      setOkMsg(null);
                      setErro(null);
                    }}
                    className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700"
                  >
                    Cadastrar outro produto
                  </button>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Variantes do produto">
          {!produtoCriado?.id ? (
            <p className="text-sm text-slate-600">
              Primeiro cadastre o produto. Em seguida, você poderá cadastrar as variantes
              aqui.
            </p>
          ) : (
            <div className="space-y-6">
              {variantesErro && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                  {variantesErro}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Nome da variante (opcional)</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={varNome}
                    onChange={(e) => setVarNome(e.target.value)}
                    placeholder="Ex.: Infantil / Adulto / Padrão"
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-400">SKU (opcional)</p>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                    value={varSku}
                    onChange={(e) => setVarSku(e.target.value)}
                    placeholder="Se vazio, o sistema gera SKU"
                  />
                </div>

                <div>
                  <p className="text-sm text-slate-400">Atributo 1</p>
                  <div className="mt-1 grid gap-3 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      value={varAtributo1Nome}
                      onChange={(e) => setVarAtributo1Nome(e.target.value)}
                      placeholder="Ex.: Tamanho"
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      value={varAtributo1Valor}
                      onChange={(e) => setVarAtributo1Valor(e.target.value)}
                      placeholder="Ex.: P / M / G / 10 / 12"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Atributo 2</p>
                  <div className="mt-1 grid gap-3 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      value={varAtributo2Nome}
                      onChange={(e) => setVarAtributo2Nome(e.target.value)}
                      placeholder="Ex.: Cor"
                    />
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      value={varAtributo2Valor}
                      onChange={(e) => setVarAtributo2Valor(e.target.value)}
                      placeholder="Ex.: Preto / Lilás"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="varAtivo"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={varAtivo}
                    onChange={(e) => setVarAtivo(e.target.checked)}
                  />
                  <label htmlFor="varAtivo" className="text-sm text-slate-700">
                    Variante ativa
                  </label>
                </div>

                <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">
                    Você pode cadastrar a variante padrão (sem atributos) informando
                    apenas um nome.
                  </div>

                  <button
                    type="button"
                    onClick={handleCriarVariante}
                    disabled={varSaving}
                    className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
                  >
                    {varSaving ? "Salvando..." : "Cadastrar variante"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-800">
                  Lista de variantes
                </h3>
                <button
                  type="button"
                  onClick={() => carregarVariantes(produtoCriado.id)}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Atualizar lista
                </button>
              </div>

              {variantesLoading ? (
                <p className="text-sm text-slate-600">Carregando variantes...</p>
              ) : variantes.length === 0 ? (
                <p className="text-sm text-slate-600">
                  Nenhuma variante cadastrada ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">SKU</th>
                        <th className="py-2 pr-3">Nome</th>
                        <th className="py-2 pr-3">Atributos</th>
                        <th className="py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {variantes.map((v) => {
                        const attrs = v.atributos ?? {};
                        const attrsLabel = Object.keys(attrs).length
                          ? Object.entries(attrs)
                              .map(([k, val]) => `${k}: ${val}`)
                              .join(" • ")
                          : "-";

                        return (
                          <tr key={v.id} className="align-top">
                            <td className="py-3 pr-3">{v.sku ?? "-"}</td>
                            <td className="py-3 pr-3">{v.nome ?? "-"}</td>
                            <td className="py-3 pr-3">{attrsLabel}</td>
                            <td className="py-3 text-right">
                              <span
                                className={
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                                  (v.ativo
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-100 text-slate-600")
                                }
                              >
                                {v.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Observação: se a lista não carregar, localize o endpoint real de
                variantes e ajuste as URLs do GET/POST desta página.
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

