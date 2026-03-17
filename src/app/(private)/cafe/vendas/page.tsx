"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafeCatalogoProdutos, { type CafeCatalogoProduto } from "@/components/cafe/catalogo/CafeCatalogoProdutos";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";

type PessoaBusca = {
  id: number;
  nome: string;
  email?: string | null;
};

type CafeCompradorTipo =
  | "NAO_IDENTIFICADO"
  | "ALUNO"
  | "COLABORADOR"
  | "PESSOA_AVULSA";

type PagamentoOpcao = {
  id: number | null;
  codigo: string;
  label: string;
  tipo_fluxo:
    | "IMEDIATO"
    | "CARTAO_EXTERNO"
    | "CARTAO_CONEXAO_ALUNO"
    | "CARTAO_CONEXAO_COLABORADOR"
    | "CONTA_INTERNA";
  exige_conta_conexao: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
};

type PagamentosResponse = {
  centro_custo_id: number;
  comprador: {
    pessoa_id: number | null;
    tipo: CafeCompradorTipo;
  };
  opcoes: PagamentoOpcao[];
};

type CaixaResponse = {
  data?: {
    id?: number;
    cobranca_id?: number | null;
    recebimento_id?: number | null;
    movimento_financeiro_id?: number | null;
    status_financeiro?: string | null;
    forma_pagamento?: string | null;
  };
  error?: string;
  detalhe?: string;
};

type ItemCarrinho = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
  unidade_venda: string | null;
};

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function competenciaFromDate(dateIso: string) {
  return dateIso.slice(0, 7);
}

function formatBuyerType(value: CafeCompradorTipo) {
  switch (value) {
    case "ALUNO":
      return "Aluno";
    case "COLABORADOR":
      return "Colaborador";
    case "PESSOA_AVULSA":
      return "Pessoa avulsa";
    default:
      return "Nao identificado";
  }
}

function buildFinancialEffect(option: PagamentoOpcao | null, buyerType: CafeCompradorTipo) {
  if (!option) return "Selecione uma forma de pagamento valida para continuar.";
  switch (option.tipo_fluxo) {
    case "CARTAO_CONEXAO_ALUNO":
      return "Esta venda sera enviada para o Cartao Conexao do aluno, sem recebimento imediato.";
    case "CARTAO_CONEXAO_COLABORADOR":
      return "Esta venda ficara no fluxo futuro do colaborador, vinculada ao Cartao Conexao.";
    case "CONTA_INTERNA":
      return "Esta venda ficara em conta interna do colaborador para fechamento futuro.";
    case "CARTAO_EXTERNO":
      return "Esta venda seguira o fluxo financeiro do cartao externo do Ballet Cafe.";
    default:
      return buyerType === "NAO_IDENTIFICADO"
        ? "Esta venda entrara imediatamente no caixa do Ballet Cafe."
        : "Esta venda gerara efeito financeiro imediato no Ballet Cafe.";
  }
}

export default function CafeVendasPage() {
  const [buscaComprador, setBuscaComprador] = useState("");
  const [compradores, setCompradores] = useState<PessoaBusca[]>([]);
  const [compradoresLoading, setCompradoresLoading] = useState(false);
  const [compradorSelecionado, setCompradorSelecionado] = useState<PessoaBusca | null>(null);
  const [compradorTipo, setCompradorTipo] = useState<CafeCompradorTipo>("NAO_IDENTIFICADO");
  const [centroCustoId, setCentroCustoId] = useState<number | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoOpcao[]>([]);
  const [pagamentosLoading, setPagamentosLoading] = useState(false);
  const [pagamentoCodigo, setPagamentoCodigo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const term = buscaComprador.trim();
    if (term.length < 2) {
      setCompradores([]);
      return;
    }

    const controller = new AbortController();

    async function carregarCompradores() {
      setCompradoresLoading(true);
      try {
        const response = await fetch(`/api/pessoas/busca?query=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as { items?: PessoaBusca[]; error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "falha_buscar_pessoas");
        }

        setCompradores(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCompradores([]);
          setMensagem(error instanceof Error ? error.message : "falha_buscar_pessoas");
          setMensagemTipo("error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCompradoresLoading(false);
        }
      }
    }

    void carregarCompradores();
    return () => controller.abort();
  }, [buscaComprador]);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarPagamentos() {
      setPagamentosLoading(true);
      try {
        const params = new URLSearchParams();
        if (compradorSelecionado?.id) params.set("comprador_pessoa_id", String(compradorSelecionado.id));
        const response = await fetch(`/api/cafe/pagamentos/opcoes?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as PagamentosResponse | { detalhe?: string } | null;
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "detalhe" in payload && payload.detalhe
              ? String(payload.detalhe)
              : "falha_carregar_formas_pagamento_cafe",
          );
        }

        const nextPayments = Array.isArray(payload?.opcoes) ? payload.opcoes : [];
        const fallback = nextPayments.find((item) => item.habilitado) ?? null;

        setPagamentos(nextPayments);
        setCentroCustoId(payload?.centro_custo_id ?? null);
        setCompradorTipo(payload?.comprador.tipo ?? "NAO_IDENTIFICADO");
        setPagamentoCodigo((current) => {
          const existing = nextPayments.find((item) => item.codigo === current && item.habilitado);
          return existing?.codigo ?? fallback?.codigo ?? "";
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setPagamentos([]);
          setPagamentoCodigo("");
          setMensagem(error instanceof Error ? error.message : "falha_carregar_formas_pagamento_cafe");
          setMensagemTipo("error");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPagamentosLoading(false);
        }
      }
    }

    void carregarPagamentos();
    return () => controller.abort();
  }, [compradorSelecionado]);

  const totalItens = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade, 0),
    [itens],
  );

  const totalCentavos = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade * item.valor_unitario_centavos, 0),
    [itens],
  );

  const quantidadesPorProdutoId = useMemo(
    () =>
      itens.reduce<Record<number, number>>((acc, item) => {
        acc[item.produto_id] = (acc[item.produto_id] ?? 0) + item.quantidade;
        return acc;
      }, {}),
    [itens],
  );
  const pagamentoSelecionado = useMemo(
    () => pagamentos.find((item) => item.codigo === pagamentoCodigo) ?? null,
    [pagamentoCodigo, pagamentos],
  );
  const efeitoFinanceiro = useMemo(
    () => buildFinancialEffect(pagamentoSelecionado, compradorTipo),
    [compradorTipo, pagamentoSelecionado],
  );

  function adicionarProduto(produto: CafeCatalogoProduto) {
    setMensagem(null);
    setMensagemTipo(null);
    setItens((current) => {
      const index = current.findIndex((item) => item.produto_id === produto.id);
      if (index >= 0) {
        return current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, quantidade: item.quantidade + 1 } : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          valor_unitario_centavos: Number(produto.preco_venda_centavos ?? 0),
          unidade_venda: produto.unidade_venda ?? "un",
        },
      ];
    });
  }

  function atualizarQuantidade(produtoId: number, quantidade: number) {
    setItens((current) =>
      current
        .map((item) => (item.produto_id === produtoId ? { ...item, quantidade } : item))
        .filter((item) => item.quantidade > 0),
    );
  }

  function limparVenda() {
    setItens([]);
    setObservacoes("");
    setCompradorSelecionado(null);
    setBuscaComprador("");
    setCompradores([]);
    setPagamentoCodigo("");
  }

  async function finalizarVenda() {
    if (itens.length === 0) {
      setMensagem("Adicione ao menos um item antes de finalizar a venda.");
      setMensagemTipo("error");
      return;
    }

    if (!pagamentoSelecionado?.habilitado) {
      setMensagem("Selecione uma forma de pagamento valida para concluir a venda.");
      setMensagemTipo("error");
      return;
    }

    setSaving(true);
    setMensagem(null);
    setMensagemTipo(null);

    try {
      const valorPagoCentavos =
        pagamentoSelecionado.tipo_fluxo === "IMEDIATO" || pagamentoSelecionado.tipo_fluxo === "CARTAO_EXTERNO"
          ? totalCentavos
          : 0;
      const response = await fetch("/api/cafe/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_operacao: todayIso(),
          origem_operacao: "PDV",
          comprador_tipo: compradorTipo,
          comprador_id: compradorSelecionado?.id ?? null,
          comprador_pessoa_id: compradorSelecionado?.id ?? null,
          pagador_pessoa_id: compradorSelecionado?.id ?? null,
          cliente_pessoa_id: compradorSelecionado?.id ?? null,
          tipo_quitacao:
            pagamentoSelecionado.tipo_fluxo === "CONTA_INTERNA"
              ? "CONTA_INTERNA_COLABORADOR"
              : pagamentoSelecionado.tipo_fluxo === "CARTAO_CONEXAO_ALUNO" ||
                  pagamentoSelecionado.tipo_fluxo === "CARTAO_CONEXAO_COLABORADOR"
                ? "CARTAO_CONEXAO"
                : "IMEDIATA",
          forma_pagamento_id: pagamentoSelecionado.id,
          forma_pagamento_codigo: pagamentoSelecionado.codigo,
          metodo_pagamento: pagamentoSelecionado.codigo,
          data_competencia: pagamentoSelecionado.exige_conta_conexao ? competenciaFromDate(todayIso()) : null,
          valor_pago_centavos: valorPagoCentavos,
          observacoes: observacoes || "Venda registrada pelo PDV do Ballet Cafe.",
          observacoes_internas: observacoes ? `PDV: ${observacoes}` : "PDV / Vendas",
          itens: itens.map((item) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario_centavos: item.valor_unitario_centavos,
            descricao_snapshot: item.nome,
          })),
        }),
      });

      const payload = (await response.json().catch(() => null)) as CaixaResponse | null;
      if (!response.ok) {
        throw new Error(payload?.detalhe ?? payload?.error ?? "falha_finalizar_venda_pdv");
      }

      const vendaId = payload?.data?.id;
      const complemento = [
        payload?.data?.recebimento_id ? `recebimento #${payload.data.recebimento_id}` : null,
        payload?.data?.cobranca_id ? `cobranca #${payload.data.cobranca_id}` : null,
        payload?.data?.movimento_financeiro_id ? `movimento #${payload.data.movimento_financeiro_id}` : null,
      ].filter(Boolean);
      limparVenda();
      setMensagem(
        vendaId
          ? `Venda registrada no PDV com sucesso. Comanda #${vendaId}${complemento.length ? `, ${complemento.join(", ")}` : ""}.`
          : "Venda registrada no PDV com sucesso.",
      );
      setMensagemTipo("success");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_finalizar_venda_pdv");
      setMensagemTipo("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CafePageShell
      eyebrow="PDV"
      title="Vendas do Ballet Cafe"
      description="Frente de balcao para operacao rapida. Categorias, produtos e fechamento imediato ficam aqui; retroativos e regularizacoes ficam em Caixa / Lancamentos."
      actions={
        <>
          <Link
            href="/cafe/caixa"
            className="rounded-full border border-[#d7c3a4] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#fff8ef]"
          >
            Caixa / Lancamentos
          </Link>
          <Link
            href="/cafe/admin"
            className="rounded-full bg-[#9a3412] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7c2d12]"
          >
            Gestao do Cafe
          </Link>
        </>
      }
      summary={
        <>
          <CafeStatCard
            label="Carrinho"
            value={`${totalItens} item${totalItens === 1 ? "" : "s"}`}
            description="Clique nos cards do catalogo para montar a venda do balcao."
          />
          <CafeStatCard
            label="Total"
            value={brl(totalCentavos)}
            description="O fechamento do PDV usa a mesma regra operacional e financeira central do Caixa."
          />
          <CafeStatCard
            label="Comprador"
            value={compradorSelecionado?.nome ?? formatBuyerType(compradorTipo)}
            description={`Perfil resolvido: ${formatBuyerType(compradorTipo)}.`}
          />
          <CafeStatCard
            label="Liquidacao"
            value={pagamentoSelecionado?.label ?? "Nao selecionada"}
            description={efeitoFinanceiro}
          />
        </>
      }
    >
      {mensagem ? (
        <CafeCard variant={mensagemTipo === "success" ? "stats" : "muted"}>
          <div className={mensagemTipo === "success" ? "text-sm text-emerald-900" : "text-sm text-amber-900"}>
            {mensagem}
          </div>
        </CafeCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <CafeCard
          title="Catalogo do PDV"
          description="Escolha a categoria, filtre o que precisa e clique nos cards de produto para adicionar no carrinho."
        >
          <CafeSectionIntro
            title="Venda de balcao"
            description="A experiencia principal do cafe volta a ser visual e rapida, sem transformar o PDV em um formulario administrativo."
          />
          <CafeCatalogoProdutos
            onAddProduct={adicionarProduto}
            quantitiesByProductId={quantidadesPorProdutoId}
            helperText="Use o Caixa / Lancamentos para retroativos, baixa parcial e conta interna."
          />
        </CafeCard>

        <div className="flex flex-col gap-6">
          <CafeCard
            title="Venda atual"
            description="Comprador opcional, formas de pagamento por contexto e fechamento rapido do PDV."
            className="xl:sticky xl:top-6"
          >
            <div className="grid gap-4">
              <CafePanel>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-800">Comprador</div>
                  {compradorSelecionado ? (
                    <div className="rounded-2xl border border-[#e6d3b8] bg-white px-4 py-3">
                      <div className="font-medium text-slate-900">{compradorSelecionado.nome}</div>
                      <div className="mt-1 text-sm text-slate-500">{compradorSelecionado.email ?? "Sem email"}</div>
                      <button
                        type="button"
                        className="mt-3 text-xs font-medium text-[#9a3412] hover:underline"
                        onClick={() => setCompradorSelecionado(null)}
                      >
                        Remover comprador
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="w-full rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c57f39]"
                        value={buscaComprador}
                        onChange={(event) => setBuscaComprador(event.target.value)}
                        placeholder="Buscar comprador (opcional)"
                      />
                      <div className="max-h-44 overflow-y-auto rounded-2xl border border-[#eadfcd] bg-white">
                        {compradoresLoading ? (
                          <div className="px-4 py-3 text-sm text-slate-500">Buscando pessoas...</div>
                        ) : compradores.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-500">
                            {buscaComprador.trim().length >= 2
                              ? "Nenhuma pessoa encontrada."
                              : "Digite ao menos 2 caracteres para buscar."}
                          </div>
                        ) : (
                          compradores.map((pessoa) => (
                            <button
                              key={pessoa.id}
                              type="button"
                              onClick={() => {
                                setCompradorSelecionado(pessoa);
                                setBuscaComprador("");
                                setCompradores([]);
                              }}
                              className="flex w-full items-start justify-between border-b border-[#f4eadb] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[#fff8ef]"
                            >
                              <span className="font-medium text-slate-800">{pessoa.nome}</span>
                              <span className="text-xs text-slate-500">#{pessoa.id}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CafePanel>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Pagamento</span>
                  <select
                    className="w-full rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c57f39]"
                    value={pagamentoCodigo}
                    onChange={(event) => setPagamentoCodigo(event.target.value)}
                    disabled={pagamentosLoading || pagamentos.length === 0}
                  >
                    {pagamentos.length === 0 ? (
                      <option value="">Sem opcoes configuradas</option>
                    ) : null}
                    {pagamentos.map((item) => (
                      <option key={item.codigo} value={item.codigo} disabled={!item.habilitado}>
                        {item.label}
                        {item.habilitado ? "" : " - indisponivel"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-slate-500">
                    {pagamentosLoading
                      ? "Resolvendo meios validos para este comprador..."
                      : pagamentoSelecionado?.motivo_bloqueio ?? efeitoFinanceiro}
                  </p>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Observacoes do balcao</span>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-[#eadfcd] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#c57f39]"
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Observacao opcional da venda"
                  />
                </label>
              </div>

              <div className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf4] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Carrinho</div>
                    <div className="mt-1 text-lg font-semibold text-slate-950">{brl(totalCentavos)}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Centro de custo: {centroCustoId ? `#${centroCustoId} Ballet Cafe` : "resolvendo..."}
                    </div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {totalItens} item{totalItens === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {itens.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d7c3a4] px-4 py-6 text-center text-sm text-slate-500">
                      Nenhum item no carrinho.
                    </div>
                  ) : (
                    itens.map((item) => (
                      <div key={item.produto_id} className="rounded-2xl border border-[#eadfcd] bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-slate-900">{item.nome}</div>
                            <div className="text-sm text-slate-500">{brl(item.valor_unitario_centavos)} cada</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-slate-900">
                              {brl(item.quantidade * item.valor_unitario_centavos)}
                            </div>
                            <div className="text-xs text-slate-500">{item.unidade_venda ?? "un"}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfcd] px-2 py-1">
                            <button
                              type="button"
                              className="h-7 w-7 rounded-full border border-[#eadfcd] text-sm text-slate-700 hover:bg-[#fff8ef]"
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade - 1)}
                            >
                              -
                            </button>
                            <span className="min-w-6 text-center text-sm font-medium text-slate-900">{item.quantidade}</span>
                            <button
                              type="button"
                              className="h-7 w-7 rounded-full border border-[#eadfcd] text-sm text-slate-700 hover:bg-[#fff8ef]"
                              onClick={() => atualizarQuantidade(item.produto_id, item.quantidade + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-medium text-red-600 hover:underline"
                            onClick={() => atualizarQuantidade(item.produto_id, 0)}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-[#d7c3a4] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-[#fff8ef]"
                  onClick={limparVenda}
                >
                  Limpar venda
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-full bg-[#9a3412] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#7c2d12] disabled:opacity-60"
                  disabled={saving || itens.length === 0 || !pagamentoSelecionado?.habilitado}
                  onClick={() => void finalizarVenda()}
                >
                  {saving ? "Finalizando..." : "Finalizar venda"}
                </button>
              </div>
            </div>
          </CafeCard>
        </div>
      </div>
    </CafePageShell>
  );
}
