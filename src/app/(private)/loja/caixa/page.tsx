"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PessoaResumo = {
  id: number;
  nome?: string | null;
  nome_completo?: string | null;
  cpf?: string | null;
  telefone_principal?: string | null;
  email?: string | null;
  documento_principal?: string | null;
};

type ProdutoResumo = {
  id: number;
  nome: string;
  codigo?: string | null;
  preco_venda_centavos: number;
};

type ItemCaixa = {
  idTemp: string;
  produto: ProdutoResumo;
  quantidade: number;
  precoUnitarioCentavos: number;
  beneficiario: PessoaResumo | null;
  observacoes?: string;
};

type MaquinaCartaoOpcao = {
  id: number;
  nome: string;
};

type BandeiraCartao = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
};

type RegraCartao = {
  id: number;
  maquina_id: number;
  bandeira_id: number;
  tipo_transacao: string;
  prazo_recebimento_dias: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  permitir_parcelado: boolean;
  max_parcelas: number;
  ativo: boolean;
};

type FormaPagamentoContexto = {
  id: number;
  centro_custo_id: number;
  forma_pagamento_codigo: string;
  descricao_exibicao: string;
  ativo: boolean;
  ordem_exibicao: number;
  conta_financeira_id?: number | null;
  cartao_maquina_id?: number | null;
  carteira_tipo?: string | null;
  formas_pagamento?: {
    codigo?: string;
    nome?: string;
    tipo_base?: string;
    ativo?: boolean;
  } | null;
  cartao_maquinas?: {
    id?: number;
    nome?: string | null;
  } | null;
};

type ApiResponse<T = any> = { ok?: boolean; error?: string; data?: T };

type RegraParcelamentoConexao = {
  id: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  numero_parcelas_min: number;
  numero_parcelas_max: number;
  valor_minimo_centavos: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  ativo: boolean;
};

// NOTA SOBRE O MODELO DE PAPEIS NA LOJA v0:
// - "comprador" é a Pessoa que está realizando a compra/pagamento.
// - "beneficiario" é a Pessoa que vai usar o produto (normalmente aluno), armazenada por item em loja_venda_itens.beneficiario_pessoa_id.

export default function FrenteCaixaLojaPage() {
  const router = useRouter();

  const [comprador, setComprador] = useState<PessoaResumo | null>(null);
  const [itens, setItens] = useState<ItemCaixa[]>([]);
  const [tipoVenda, setTipoVenda] = useState<"VENDA" | "CREDIARIO_INTERNO">("VENDA");

  // formas de pagamento por contexto (centro LOJA = id 2)
  const [formasPagamentoCtx, setFormasPagamentoCtx] = useState<FormaPagamentoContexto[]>(
    [],
  );
  const [formaPagamentoCtxId, setFormaPagamentoCtxId] = useState<number | "">("");

  // cartão externo (maquininha)
  const [cartaoMaquinas, setCartaoMaquinas] = useState<MaquinaCartaoOpcao[]>([]);
  const [cartaoBandeiras, setCartaoBandeiras] = useState<BandeiraCartao[]>([]);
  const [cartaoRegras, setCartaoRegras] = useState<RegraCartao[]>([]);
  const [cartaoMaquinaId, setCartaoMaquinaId] = useState<number | "">("");
  const [cartaoBandeiraId, setCartaoBandeiraId] = useState<number | "">("");
  const [cartaoNumeroParcelas, setCartaoNumeroParcelas] = useState<number>(1);
  const [carregandoCartao, setCarregandoCartao] = useState(false);

  // Cartão Conexão — regras de parcelamento
  const [regrasConexao, setRegrasConexao] = useState<RegraParcelamentoConexao[]>([]);
  const [carregandoRegrasConexao, setCarregandoRegrasConexao] = useState(false);
  const [parcelasConexao, setParcelasConexao] = useState<number>(1);

  const [dataVencimento, setDataVencimento] = useState<string | "">("");
  const [observacoes, setObservacoes] = useState("");
  const [observacaoVendedor, setObservacaoVendedor] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | "info" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // buscas auxiliares (comprador)
  const [buscaComprador, setBuscaComprador] = useState("");
  const [resultadoComprador, setResultadoComprador] = useState<PessoaResumo[]>([]);
  const [buscandoComprador, setBuscandoComprador] = useState(false);

  // busca aluno/usuario por item
  const [itemSelecionandoAluno, setItemSelecionandoAluno] = useState<string | null>(
    null,
  );
  const [buscaAluno, setBuscaAluno] = useState("");
  const [resultadoAluno, setResultadoAluno] = useState<PessoaResumo[]>([]);
  const [buscandoAluno, setBuscandoAluno] = useState(false);

  // busca produtos
  const [buscaProduto, setBuscaProduto] = useState("");
  const [resultadoProduto, setResultadoProduto] = useState<ProdutoResumo[]>([]);
  const [buscandoProduto, setBuscandoProduto] = useState(false);

  // helpers
  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }
  // ======== BUSCAS AUXILIARES (COMPRADOR, ALUNO, PRODUTO) =========
  // busca comprador
  useEffect(() => {
    const term = buscaComprador.trim();
    if (term.length < 2) {
      setResultadoComprador([]);
      return;
    }
    const controller = new AbortController();
    async function run() {
      setBuscandoComprador(true);
      try {
        const resp = await fetch(
          `/api/pessoas/busca?query=${encodeURIComponent(term)}`,
          { signal: controller.signal, credentials: "include" },
        );
        if (!resp.ok) {
          setResultadoComprador([]);
          return;
        }
        const data = (await resp.json()) as { ok: boolean; pessoas: PessoaResumo[] };
        setResultadoComprador(data.pessoas ?? []);
      } catch (e) {
        if (!controller.signal.aborted) {
          setResultadoComprador([]);
        }
      } finally {
        setBuscandoComprador(false);
      }
    }
    run();
    return () => controller.abort();
  }, [buscaComprador]);

  // busca beneficiario
  useEffect(() => {
    if (!itemSelecionandoAluno) {
      setResultadoAluno([]);
      return;
    }
    const term = buscaAluno.trim();
    if (term.length < 2) {
      setResultadoAluno([]);
      return;
    }
    const controller = new AbortController();
    async function run() {
      setBuscandoAluno(true);
      try {
        const resp = await fetch(
          `/api/pessoas/busca?query=${encodeURIComponent(term)}`,
          { signal: controller.signal, credentials: "include" },
        );
        if (!resp.ok) {
          setResultadoAluno([]);
          return;
        }
        const data = (await resp.json()) as { ok: boolean; pessoas: PessoaResumo[] };
        setResultadoAluno(data.pessoas ?? []);
      } catch (e) {
        if (!controller.signal.aborted) {
          setResultadoAluno([]);
        }
      } finally {
        setBuscandoAluno(false);
      }
    }
    run();
    return () => controller.abort();
  }, [buscaAluno, itemSelecionandoAluno]);

  // busca produtos
  useEffect(() => {
    const term = buscaProduto.trim();
    if (term.length < 2) {
      setResultadoProduto([]);
      return;
    }
    const controller = new AbortController();
    async function run() {
      setBuscandoProduto(true);
      try {
        const resp = await fetch(
          `/api/loja/produtos?search=${encodeURIComponent(term)}&pageSize=20`,
          { signal: controller.signal },
        );
        if (!resp.ok) {
          setResultadoProduto([]);
          return;
        }
        const data = (await resp.json()) as ApiResponse<{
          items: ProdutoResumo[];
          pagination: any;
        }>;
        if (data.ok && data.data?.items) setResultadoProduto(data.data.items);
      } catch (e) {
        if (!controller.signal.aborted) {
          setResultadoProduto([]);
        }
      } finally {
        setBuscandoProduto(false);
      }
    }
    run();
    return () => controller.abort();
  }, [buscaProduto]);

  const totalVenda = useMemo(
    () => itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitarioCentavos, 0),
    [itens],
  );

  // ======== FORMAS DE PAGAMENTO (CONTEXTO LOJA) =========
  // carregar formas de pagamento do contexto LOJA (centro_custo_id = 2)
  useEffect(() => {
    async function carregarFormasPagamento() {
      try {
        const res = await fetch(
          "/api/financeiro/formas-pagamento?centro_custo_id=2",
        );
        if (!res.ok) {
          console.error(
            "Erro ao carregar formas de pagamento do contexto LOJA:",
            await res.text(),
          );
          return;
        }
        const json = await res.json();
        const formas: FormaPagamentoContexto[] = json.formas ?? [];
        const ativas = formas.filter((f) => f.ativo);
        setFormasPagamentoCtx(ativas);

        if (!formaPagamentoCtxId && ativas.length > 0) {
          setFormaPagamentoCtxId(ativas[0].id);
          const fp0 = ativas[0];
          if (
            fp0.formas_pagamento?.tipo_base === "CARTAO" &&
            (fp0.cartao_maquina_id || fp0.cartao_maquinas?.id)
          ) {
            setCartaoMaquinaId(
              fp0.cartao_maquina_id ?? (fp0.cartao_maquinas?.id as number),
            );
          }
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar formas de pagamento (LOJA)", e);
      }
    }

    carregarFormasPagamento();
  }, [formaPagamentoCtxId]);

  const formaPagamentoSelecionada = useMemo(() => {
    if (!formaPagamentoCtxId || typeof formaPagamentoCtxId !== "number") return null;
    return (
      formasPagamentoCtx.find((f) => f.id === formaPagamentoCtxId) ?? null
    );
  }, [formasPagamentoCtx, formaPagamentoCtxId]);

  // forma_pagamento interna usada pela API /api/loja/vendas
  const formaPagamentoInterna = useMemo<
    "AVISTA" | "CREDITO" | "CREDIARIO_INTERNO" | "CARTAO_CONEXAO" | null
  >(() => {
    const tipoBase = formaPagamentoSelecionada?.formas_pagamento?.tipo_base;
    switch (tipoBase) {
      case "DINHEIRO":
        return "AVISTA";
      case "CARTAO":
        return "CREDITO";
      case "CREDIARIO":
        return "CREDIARIO_INTERNO";
      case "CARTAO_CONEXAO":
        return "CARTAO_CONEXAO";
      default:
        return null;
    }
  }, [formaPagamentoSelecionada]);

  const isCredito = formaPagamentoInterna === "CREDITO";
  const isCrediarioInterno = formaPagamentoInterna === "CREDIARIO_INTERNO";
  const isCartaoConexao = formaPagamentoInterna === "CARTAO_CONEXAO";

  // Descobrir tipo de conta (ALUNO / COLABORADOR) para Cartão Conexão
  const tipoContaConexao: "ALUNO" | "COLABORADOR" | null = useMemo(() => {
    if (!isCartaoConexao || !formaPagamentoSelecionada?.formas_pagamento?.codigo) {
      return null;
    }
    const codigo = formaPagamentoSelecionada.formas_pagamento.codigo;
    if (codigo === "CARTAO_CONEXAO_COLAB") return "COLABORADOR";
    return "ALUNO";
  }, [isCartaoConexao, formaPagamentoSelecionada]);
  // ======== CARTÃO — REGRAS/BANDEIRAS/MAQUININHAS (externo) =========
  const regraCartaoSelecionada = useMemo(() => {
    const maquina = cartaoMaquinaId ? Number(cartaoMaquinaId) : null;
    const bandeira = cartaoBandeiraId ? Number(cartaoBandeiraId) : null;
    if (!maquina || !bandeira) return null;

    return (
      cartaoRegras.find(
        (r) =>
          r.maquina_id === maquina &&
          r.bandeira_id === bandeira &&
          r.tipo_transacao === "CREDITO" &&
          r.ativo,
      ) ?? null
    );
  }, [cartaoRegras, cartaoMaquinaId, cartaoBandeiraId]);

  const parcelasDisponiveisCartaoExterno = useMemo(() => {
    if (!regraCartaoSelecionada) return [1];
    if (
      !regraCartaoSelecionada.permitir_parcelado ||
      !regraCartaoSelecionada.max_parcelas ||
      regraCartaoSelecionada.max_parcelas < 1
    ) {
      return [1];
    }
    return Array.from(
      { length: regraCartaoSelecionada.max_parcelas },
      (_v, idx) => idx + 1,
    );
  }, [regraCartaoSelecionada]);

  // carregar opcoes de cartao externo
  useEffect(() => {
    async function carregarCartao() {
      try {
        setCarregandoCartao(true);
        const [maqRes, bandRes, regrasRes] = await Promise.all([
          fetch("/api/financeiro/cartao/maquinas/opcoes"),
          fetch("/api/financeiro/cartao/bandeiras"),
          fetch("/api/financeiro/cartao/regras"),
        ]);

        if (maqRes.ok) {
          const json = await maqRes.json();
          setCartaoMaquinas(json.maquinas ?? []);
        }

        if (bandRes.ok) {
          const json = await bandRes.json();
          setCartaoBandeiras(
            (json.bandeiras ?? []).filter((b: BandeiraCartao) => b.ativo),
          );
        }

        if (regrasRes.ok) {
          const json = await regrasRes.json();
          setCartaoRegras(json.regras ?? []);
        }
      } catch (e) {
        console.error(
          "Erro ao carregar configurações de cartão na frente de caixa",
          e,
        );
      } finally {
        setCarregandoCartao(false);
      }
    }

    carregarCartao();
  }, []);

  // ======== Cartão Conexão — carregar regras de parcelamento =========
  useEffect(() => {
    async function carregarRegrasConexao() {
      try {
        setCarregandoRegrasConexao(true);
        const res = await fetch(
          "/api/financeiro/credito-conexao/regras-parcelas?ativo=true",
        );
        if (!res.ok) {
          console.error(
            "Erro ao carregar regras de parcelamento do Cartão Conexão:",
            await res.text(),
          );
          return;
        }
        const json = await res.json();
        const regras: RegraParcelamentoConexao[] = json.regras ?? [];
        setRegrasConexao(regras);
      } catch (e) {
        console.error("Erro inesperado ao carregar regras do Cartão Conexão", e);
      } finally {
        setCarregandoRegrasConexao(false);
      }
    }

    carregarRegrasConexao();
  }, []);

  // Parcelas disponíveis para Cartão Conexão, de acordo com valor e tipo de conta
  const parcelasDisponiveisConexao = useMemo(() => {
    if (!isCartaoConexao || !tipoContaConexao || totalVenda <= 0) {
      return [1];
    }

    const regrasFiltradas = regrasConexao.filter((r) => {
      if (!r.ativo) return false;
      if (r.tipo_conta !== tipoContaConexao) return false;
      if (r.valor_minimo_centavos > totalVenda) return false;
      return true;
    });

    const setParcelas = new Set<number>();

    // Sempre permitir 1x (sem juros) como fallback
    setParcelas.add(1);

    for (const regra of regrasFiltradas) {
      for (
        let n = regra.numero_parcelas_min;
        n <= regra.numero_parcelas_max;
        n++
      ) {
        if (n >= 1) setParcelas.add(n);
      }
    }

    const arr = Array.from(setParcelas);
    arr.sort((a, b) => a - b);
    return arr;
  }, [isCartaoConexao, tipoContaConexao, regrasConexao, totalVenda]);

  // Garantir que parcelasConexao esteja sempre em uma opção válida
  useEffect(() => {
    if (!isCartaoConexao) {
      setParcelasConexao(1);
      return;
    }
    if (!parcelasDisponiveisConexao.includes(parcelasConexao)) {
      setParcelasConexao(parcelasDisponiveisConexao[0] ?? 1);
    }
  }, [isCartaoConexao, parcelasDisponiveisConexao, parcelasConexao]);
  // ======== MANIPULAÇÃO DE ITENS =========
  function adicionarItem(produto: ProdutoResumo) {
    const idTemp = crypto.randomUUID();
    setItens((prev) => [
      ...prev,
      {
        idTemp,
        produto,
        quantidade: 1,
        precoUnitarioCentavos: produto.preco_venda_centavos || 0,
        beneficiario: null,
      },
    ]);
  }

  function atualizarItem(idTemp: string, partial: Partial<ItemCaixa>) {
    setItens((prev) =>
      prev.map((i) => (i.idTemp === idTemp ? { ...i, ...partial } : i)),
    );
  }

  function removerItem(idTemp: string) {
    setItens((prev) => prev.filter((i) => i.idTemp !== idTemp));
  }

  // ======== FINALIZAÇÃO DA VENDA =========

  async function handleFinalizarVenda() {
    resetMensagem();

    if (!comprador) {
      setMensagem("Selecione o comprador antes de finalizar a venda.");
      setMensagemTipo("error");
      return;
    }
    if (itens.length === 0) {
      setMensagem("Adicione ao menos um item.");
      setMensagemTipo("error");
      return;
    }

    if (!formaPagamentoSelecionada || !formaPagamentoInterna) {
      setMensagem("Selecione uma forma de pagamento válida.");
      setMensagemTipo("error");
      return;
    }

    if (isCrediarioInterno && !dataVencimento) {
      setMensagem("Informe a data de vencimento para crediário interno.");
      setMensagemTipo("error");
      return;
    }

    if (isCredito) {
      if (!cartaoMaquinaId || !cartaoBandeiraId) {
        setMensagem("Selecione a maquininha e a bandeira para pagamento no crédito.");
        setMensagemTipo("error");
        return;
      }
      if (!regraCartaoSelecionada) {
        setMensagem(
          "Não há regra de cartão de crédito configurada para essa maquininha/bandeira.",
        );
        setMensagemTipo("error");
        return;
      }
    }

    // Para Cartão Conexão, validar se há pelo menos uma opção de parcela
    if (isCartaoConexao && (!parcelasDisponiveisConexao.length || parcelasConexao < 1)) {
      setMensagem(
        "Não há opção de parcelamento disponível para o valor desta compra no Cartão Conexão.",
      );
      setMensagemTipo("error");
      return;
    }

    const payload = {
      cliente_pessoa_id: comprador.id,
      tipo_venda: tipoVenda,
      forma_pagamento: formaPagamentoInterna,
      forma_pagamento_codigo: formaPagamentoSelecionada.forma_pagamento_codigo,
      status_pagamento:
        formaPagamentoInterna === "AVISTA" || formaPagamentoInterna === "CREDITO"
          ? "PAGO"
          : "PENDENTE",
      data_vencimento: isCrediarioInterno ? dataVencimento : null,
      observacoes: observacoes || undefined,
      observacao_vendedor: observacaoVendedor || undefined,
      itens: itens.map((it) => ({
        produto_id: it.produto.id,
        quantidade: it.quantidade,
        preco_unitario_centavos: it.precoUnitarioCentavos,
        beneficiario_pessoa_id: it.beneficiario?.id ?? comprador?.id ?? null,
        observacoes: it.observacoes || null,
      })),
      cartao_maquina_id:
        isCredito && cartaoMaquinaId ? Number(cartaoMaquinaId) : null,
      cartao_bandeira_id:
        isCredito && cartaoBandeiraId ? Number(cartaoBandeiraId) : null,
      cartao_numero_parcelas: isCredito
        ? cartaoNumeroParcelas
        : isCartaoConexao
        ? parcelasConexao
        : null,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/loja/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: ApiResponse<any> = await res.json();
      if (!res.ok || !json.ok) {
        setMensagem(json.error || "Erro ao registrar venda.");
        setMensagemTipo("error");
        return;
      }
      const vendaId =
        json.data?.venda?.id || json.data?.id || json.data?.venda_id || null;
      setMensagemTipo("success");
      setMensagem("Venda registrada com sucesso.");
      if (vendaId) router.push(`/loja/vendas/${vendaId}`);
    } catch (err) {
      console.error("Erro ao finalizar venda:", err);
      setMensagem("Erro inesperado ao finalizar venda.");
      setMensagemTipo("error");
    } finally {
      setSaving(false);
    }
  }
  // ======== RENDER =========
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Frente de caixa — Loja v0</h1>
        <p className="text-sm text-gray-600">
          Tela de atendimento rápido da AJ Dance Store. Comprador = quem paga; aluno/usuário
          = quem vai usar o produto (definido por item).
        </p>
      </header>

      {mensagem && (
        <div
          className={`text-sm border rounded-md px-3 py-2 ${
            mensagemTipo === "success"
              ? "bg-green-50 border-green-300 text-green-800"
              : mensagemTipo === "error"
              ? "bg-red-50 border-red-300 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Comprador */}
        <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold">Comprador</h2>
          <p className="text-xs text-gray-500">
            Pessoa que está realizando a compra/pagamento.
          </p>
          {!comprador ? (
            <div className="space-y-2">
              <input
                value={buscaComprador}
                onChange={(e) => setBuscaComprador(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar comprador (2+ caracteres)"
              />
              {buscandoComprador && (
                <p className="text-[11px] text-gray-500">Buscando pessoas...</p>
              )}
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                {resultadoComprador.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setComprador(p);
                      setBuscaComprador("");
                      setResultadoComprador([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {p.nome_completo || p.nome || "Sem nome"} (ID {p.id})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mt-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <div className="font-semibold text-sm">
                  {comprador.nome_completo || comprador.nome || "Sem nome"}
                </div>
                {comprador.documento_principal && (
                  <div className="mt-0.5">Doc.: {comprador.documento_principal}</div>
                )}
                {comprador.telefone_principal && (
                  <div className="mt-0.5">Contato: {comprador.telefone_principal}</div>
                )}
                {comprador.email && (
                  <div className="mt-0.5">E-mail: {comprador.email}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setComprador(null)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Trocar comprador
              </button>
            </div>
          )}
        </section>
        {/* Itens */}
        <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Itens da venda</h2>
            <div className="flex items-center gap-2">
              <input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm"
                placeholder="Buscar produto (2+ caracteres)"
              />
              <span className="text-xs text-gray-500">
                Clique no produto para adicionar
              </span>
            </div>
          </div>
          {buscandoProduto && (
            <p className="text-[11px] text-gray-500">Buscando produtos...</p>
          )}
          <div className="grid md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {resultadoProduto.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => adicionarItem(p)}
                className="border rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <p className="font-semibold text-gray-800">{p.nome}</p>
                <p className="text-xs text-gray-500">
                  {p.codigo ? `(${p.codigo}) ` : ""}
                  {formatCurrency(p.preco_venda_centavos)}
                </p>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-left">Aluno (usuário)</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Preço unit.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-xs text-gray-500"
                    >
                      Nenhum item adicionado.
                    </td>
                  </tr>
                )}
                {itens.map((it) => (
                  <tr key={it.idTemp} className="border-t">
                    <td className="px-3 py-2">
                      <div className="text-gray-800">{it.produto.nome}</div>
                      <div className="text-[11px] text-gray-500">
                        {it.produto.codigo || ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      <div className="text-xs mb-1">
                        {it.beneficiario
                          ? `Aluno: ${(() => {
                              const name =
                                it.beneficiario.nome_completo ||
                                it.beneficiario.nome ||
                                it.beneficiario.id;
                              return name;
                            })()}`
                          : comprador
                          ? `Aluno: Comprador atual (${comprador.nome_completo || comprador.nome || comprador.id})`
                          : "Aluno: Nenhum aluno definido"}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <button
                          type="button"
                          className="px-2 py-0.5 border rounded-md text-[11px]"
                          onClick={() => setItemSelecionandoAluno(it.idTemp)}
                        >
                          Selecionar aluno
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={it.quantidade}
                        onChange={(e) =>
                          atualizarItem(it.idTemp, {
                            quantidade: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                        className="w-20 border rounded-md px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        className="w-24 border rounded-md px-2 py-1 text-xs text-right"
                        value={(it.precoUnitarioCentavos / 100)
                          .toFixed(2)
                          .replace(".", ",")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const cleaned = raw
                            .replace(/[^\d,]/g, "")
                            .replace(/\./g, "");
                          const normalized = cleaned.replace(",", ".");
                          const valor = parseFloat(normalized);
                          const centavos = Number.isNaN(valor)
                            ? 0
                            : Math.round(valor * 100);
                          setItens((prev) =>
                            prev.map((row) =>
                              row.idTemp === it.idTemp
                                ? { ...row, precoUnitarioCentavos: centavos }
                                : row,
                            ),
                          );
                        }}
                        placeholder="0,00"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-800">
                      {formatCurrency(it.precoUnitarioCentavos * it.quantidade)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removerItem(it.idTemp)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {itemSelecionandoAluno && (
            <div className="mt-3 border rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  Selecionar aluno/usuário para o item
                </p>
                <button
                  type="button"
                  className="text-[11px] text-gray-500 hover:underline"
                  onClick={() => {
                    setItemSelecionandoAluno(null);
                    setBuscaAluno("");
                    setResultadoAluno([]);
                  }}
                >
                  Fechar
                </button>
              </div>
              <input
                value={buscaAluno}
                onChange={(e) => setBuscaAluno(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar aluno/pessoa (2+ caracteres)"
              />
              {buscandoAluno && (
                <p className="text-[11px] text-gray-500">Buscando pessoas...</p>
              )}
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y bg-white">
                {resultadoAluno.map((p) => (
                  <button
                    key={`al-${p.id}`}
                    type="button"
                    onClick={() => {
                      setItens((prev) =>
                        prev.map((row) =>
                          row.idTemp === itemSelecionandoAluno
                            ? { ...row, beneficiario: p }
                            : row,
                        ),
                      );
                      setItemSelecionandoAluno(null);
                      setBuscaAluno("");
                      setResultadoAluno([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    {p.nome_completo || p.nome || "Sem nome"} (ID {p.id})
                  </button>
                ))}
                {!buscandoAluno &&
                  resultadoAluno.length === 0 &&
                  buscaAluno.trim().length >= 2 && (
                    <p className="text-xs text-gray-500 px-3 py-2">
                      Nenhuma pessoa encontrada para esta busca.
                    </p>
                  )}
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            Se você não escolher um aluno para o item, o sistema considera o comprador como
            usuário do produto.
          </p>
        </section>
      </div>

      {/* Pagamento e resumo */}
      <section className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Tipo de venda</label>
            <select
              value={tipoVenda}
              onChange={(e) =>
                setTipoVenda(e.target.value as "VENDA" | "CREDIARIO_INTERNO")
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="VENDA">Venda à vista</option>
              <option value="CREDIARIO_INTERNO">Crediário interno</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Forma de pagamento</label>
            <select
              value={formaPagamentoCtxId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : "";
                setFormaPagamentoCtxId(id);
                if (id && typeof id === "number") {
                  const f = formasPagamentoCtx.find((fp) => fp.id === id);
                  if (
                    f &&
                    f.formas_pagamento?.tipo_base === "CARTAO" &&
                    (f.cartao_maquina_id || f.cartao_maquinas?.id)
                  ) {
                    setCartaoMaquinaId(
                      f.cartao_maquina_id ?? (f.cartao_maquinas?.id as number),
                    );
                  }
                }
              }}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {formasPagamentoCtx.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.descricao_exibicao}
                </option>
              ))}
            </select>
          </div>

          {isCrediarioInterno && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Data de vencimento
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
        {/* Cartão Conexão — seleção de parcelas conforme regras */}
        {isCartaoConexao && (
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Parcelas (Cartão Conexão)
              </label>
              <select
                value={parcelasConexao}
                onChange={(e) => setParcelasConexao(Number(e.target.value) || 1)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                {parcelasDisponiveisConexao.map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
              {carregandoRegrasConexao && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Carregando regras de parcelamento...
                </p>
              )}
              {!carregandoRegrasConexao &&
                parcelasDisponiveisConexao.length === 1 &&
                parcelasDisponiveisConexao[0] === 1 && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    Parcelamento extra não disponível para o valor atual da compra.
                  </p>
                )}
            </div>
          </div>
        )}

        {/* Cartão externo (maquininha) */}
        {isCredito && (
          <div className="md:col-span-3 grid md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1">Maquininha *</label>
              <select
                value={cartaoMaquinaId}
                onChange={(e) =>
                  setCartaoMaquinaId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {cartaoMaquinas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bandeira *</label>
              <select
                value={cartaoBandeiraId}
                onChange={(e) =>
                  setCartaoBandeiraId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                {cartaoBandeiras.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Parcelas</label>
              <select
                value={cartaoNumeroParcelas}
                onChange={(e) =>
                  setCartaoNumeroParcelas(Number(e.target.value) || 1)
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
                disabled={!regraCartaoSelecionada}
              >
                {parcelasDisponiveisCartaoExterno.map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
              {carregandoCartao && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Carregando configurações de cartão...
                </p>
              )}
              {!carregandoCartao &&
                isCredito &&
                cartaoMaquinaId &&
                cartaoBandeiraId &&
                !regraCartaoSelecionada && (
                  <p className="mt-1 text-[11px] text-red-600">
                    Não há regra configurada para esta maquininha/bandeira (crédito).
                  </p>
                )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Observação do vendedor (interna)
            </label>
            <textarea
              value={observacaoVendedor}
              onChange={(e) => setObservacaoVendedor(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-t pt-3">
          <div className="text-sm text-gray-700">
            <p>
              <span className="font-semibold">Comprador:</span>{" "}
              {comprador
                ? comprador.nome_completo || comprador.nome || `ID ${comprador.id}`
                : "Selecione o comprador"}
            </p>
            <p>
              <span className="font-semibold">Total:</span>{" "}
              {formatCurrency(totalVenda)}
            </p>
          </div>

          <button
            type="button"
            disabled={
              saving ||
              !comprador ||
              itens.length === 0 ||
              !formaPagamentoSelecionada ||
              !formaPagamentoInterna
            }
            onClick={handleFinalizarVenda}
            className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Finalizar venda"}
          </button>
        </div>
      </section>
    </div>
  );
}

