"use client";

import { useEffect, useMemo, useState } from "react";
import PessoaLookup, { PessoaLookupItem } from "@/components/PessoaLookup";
import { useRouter } from "next/navigation";

type PessoaResumo = {
  id: number;
  nome?: string | null;
  nome_completo?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
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

type TabelaPreco = {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  is_default: boolean;
  ordem: number;
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

type CentroCustoResumo = {
  id: number;
  nome?: string | null;
  codigo?: string | null;
  ativo?: boolean;
  contextos_aplicaveis?: string[] | null;
};

type ApiResponse<T = any> = { ok?: boolean; error?: string; data?: T };

type RegraParcelamento = {
  id: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  numero_parcelas_min: number;
  numero_parcelas_max: number;
  valor_minimo_centavos: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  ativo: boolean;
};

type ContaConexao = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  descricao_exibicao?: string | null;
  ativo: boolean;
};

type TipoOperacaoCafe = "VENDA" | "ENTREGA_ADMIN";

// NOTA SOBRE O MODELO DE PAPEIS NO CAFE v0:
// - "comprador" é a Pessoa que está realizando a compra/pagamento.
// - "beneficiario" é a Pessoa que vai usar o produto (normalmente aluno), armazenada por item em cafe_venda_itens.beneficiario_pessoa_id.

export default function FrenteCaixaCafePage() {
  const router = useRouter();

  const [comprador, setComprador] = useState<PessoaResumo | null>(null);
  const [itens, setItens] = useState<ItemCaixa[]>([]);
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacaoCafe>("VENDA");
  const [centroCustoCafeId, setCentroCustoCafeId] = useState<number | null>(null);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>([]);
  const [tabelaPrecoId, setTabelaPrecoId] = useState<number | "">("");
  const [carregandoTabelasPreco, setCarregandoTabelasPreco] = useState(false);

  // formas de pagamento por contexto (centro CAFE)
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

  // Cartão Conexão - regras de parcelamento
  const [regrasConexao, setRegrasConexao] = useState<RegraParcelamento[]>([]);
  const [carregandoRegrasConexao, setCarregandoRegrasConexao] = useState(false);
  const [parcelasConexao, setParcelasConexao] = useState<number>(1);
  const [contasConexao, setContasConexao] = useState<ContaConexao[]>([]);
  const [contaConexaoId, setContaConexaoId] = useState<number | "">("");
  const [taxaCartaoConexaoCentavos, setTaxaCartaoConexaoCentavos] = useState(0);
  const [totalFinalCentavos, setTotalFinalCentavos] = useState(0);
  const [avisoTaxa, setAvisoTaxa] = useState<string | null>(null);

  // cadastro rápido de pessoa (comprador/beneficiário)
  const [showCadastroRapido, setShowCadastroRapido] = useState(false);
  const [cadastroContexto, setCadastroContexto] = useState<"COMPRADOR" | "BENEFICIARIO">(
    "COMPRADOR",
  );
  const [cadastroItemId, setCadastroItemId] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelado = false;

    async function carregarCentroCustoCafe() {
      try {
        const res = await fetch("/api/financeiro/centros-custo", {
          credentials: "include",
        });
        if (!res.ok) {
          console.error(
            "Erro ao carregar centros de custo:",
            await res.text(),
          );
          return;
        }

        const json = await res.json();
        const lista = Array.isArray(json) ? json : json.data ?? [];
        const ativos = (lista as CentroCustoResumo[]).filter(
          (c) => c?.ativo ?? true,
        );
        const upper = (value: unknown) => {
          if (typeof value !== "string") return "";
          return value
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase();
        };
        const matchesCafe = (c: CentroCustoResumo) => {
          const codigo = upper(c.codigo);
          const nome = upper(c.nome);
          const contextos = Array.isArray(c.contextos_aplicaveis)
            ? c.contextos_aplicaveis.map((ctx) => upper(ctx))
            : [];

          if (codigo === "CAF") return true;
          if (codigo.includes("CAFE")) return true;
          if (nome.includes("CAFE")) return true;
          if (contextos.includes("CAFE")) return true;
          return false;
        };

        const preferCafe = (c: CentroCustoResumo) => upper(c.codigo) === "CAF";
        const cafe =
          ativos.find(preferCafe) ??
          ativos.find(matchesCafe) ??
          (lista as CentroCustoResumo[]).find(matchesCafe);

        if (!cafe) {
          console.warn("Centro de custo do cafe nao encontrado.");
          return;
        }

        if (!cancelado) {
          setCentroCustoCafeId(cafe.id);
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar centros de custo:", e);
      }
    }

    carregarCentroCustoCafe();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function carregarTabelasPreco() {
      setCarregandoTabelasPreco(true);
      try {
        const res = await fetch("/api/cafe/tabelas-preco");
        if (!res.ok) {
          console.error("Erro ao carregar tabelas de preco:", await res.text());
          return;
        }

        const json = await res.json();
        const lista = Array.isArray(json?.data) ? json.data : [];
        const ativas = (lista as TabelaPreco[]).filter((t) => t?.ativo ?? true);
        if (!cancelado) {
          setTabelasPreco(ativas);
          if (!tabelaPrecoId && ativas.length > 0) {
            const def = ativas.find((t) => t.is_default) ?? ativas[0];
            setTabelaPrecoId(def.id);
          }
        }
      } catch (e) {
        console.error("Erro inesperado ao carregar tabelas de preco:", e);
      } finally {
        if (!cancelado) setCarregandoTabelasPreco(false);
      }
    }

    carregarTabelasPreco();
    return () => {
      cancelado = true;
    };
  }, []);
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
        const data = (await resp.json()) as { items?: PessoaResumo[] };
        setResultadoComprador(Array.isArray(data.items) ? data.items : []);
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

  // busca produtos
  useEffect(() => {
    const term = buscaProduto.trim();
    if (term.length < 2) {
      setResultadoProduto([]);
      return;
    }
    const tabelaParam =
      tabelaPrecoId && typeof tabelaPrecoId === "number"
        ? `&tabela_preco_id=${tabelaPrecoId}`
        : "";
    const controller = new AbortController();
    async function run() {
      setBuscandoProduto(true);
      try {
        const resp = await fetch(
          `/api/cafe/produtos?search=${encodeURIComponent(term)}&pageSize=20${tabelaParam}`,
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
  }, [buscaProduto, tabelaPrecoId]);

  const totalVenda = useMemo(
    () => itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitarioCentavos, 0),
    [itens],
  );
  const subtotalCentavos = useMemo(
    () => (tipoOperacao === "ENTREGA_ADMIN" ? 0 : totalVenda),
    [tipoOperacao, totalVenda],
  );
  const bloqueiaCobranca = tipoOperacao === "ENTREGA_ADMIN";

  // ======== FORMAS DE PAGAMENTO (CONTEXTO CAFE) =========
  // carregar formas de pagamento do contexto CAFE
  useEffect(() => {
    async function carregarFormasPagamento() {
      if (!centroCustoCafeId) return;
      try {
        const res = await fetch(
          `/api/financeiro/formas-pagamento?centro_custo_id=${centroCustoCafeId}`,
        );
        if (!res.ok) {
          console.error(
            "Erro ao carregar formas de pagamento do contexto CAFE:",
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
        console.error("Erro inesperado ao carregar formas de pagamento (CAFE)", e);
      }
    }

    carregarFormasPagamento();
  }, [centroCustoCafeId, formaPagamentoCtxId]);

  const formaPagamentoSelecionada = useMemo(() => {
    if (!formaPagamentoCtxId || typeof formaPagamentoCtxId !== "number") return null;
    return (
      formasPagamentoCtx.find((f) => f.id === formaPagamentoCtxId) ?? null
    );
  }, [formasPagamentoCtx, formaPagamentoCtxId]);

  // forma_pagamento interna usada pela API /api/cafe/vendas
  const formaPagamentoInterna = useMemo<
    "AVISTA" | "CREDITO" | "CREDIARIO_INTERNO" | "CARTAO_CONEXAO" | null
  >(() => {
    if (bloqueiaCobranca) return null;
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
  }, [bloqueiaCobranca, formaPagamentoSelecionada]);

  const isCredito = formaPagamentoInterna === "CREDITO";
  const isCrediarioInterno = formaPagamentoInterna === "CREDIARIO_INTERNO";
  const isCartaoConexao = formaPagamentoInterna === "CARTAO_CONEXAO";
  const mostraTaxaCartao = !bloqueiaCobranca && isCartaoConexao;
  const totalExibido = bloqueiaCobranca ? 0 : totalFinalCentavos || subtotalCentavos;

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
      const regras: RegraParcelamento[] = json.regras ?? [];
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
    if (!isCartaoConexao || !tipoContaConexao || subtotalCentavos <= 0) {
      return [1];
    }

    const regrasFiltradas = regrasConexao.filter((r) => {
      if (!r.ativo) return false;
      if (r.tipo_conta !== tipoContaConexao) return false;
      if (r.valor_minimo_centavos > subtotalCentavos) return false;
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
  }, [isCartaoConexao, tipoContaConexao, regrasConexao, subtotalCentavos]);

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

  // Carrega contas de Crédito Conexão do comprador para selecionar na venda
  useEffect(() => {
    if (!isCartaoConexao || !comprador?.id || !tipoContaConexao) {
      setContasConexao([]);
      setContaConexaoId("");
      return;
    }

    let cancelado = false;
    async function carregarContasConexao() {
      try {
        const resp = await fetch(
          `/api/financeiro/credito-conexao/contas?tipo_conta=${tipoContaConexao}`,
          { credentials: "include" },
        );
        const json = await resp.json();
        if (cancelado) return;

        const contas: ContaConexao[] = (json.contas ?? []).filter(
          (c: any) => c?.pessoa_titular_id === comprador.id && (c?.ativo ?? true),
        );
        setContasConexao(contas);

        if (contas.length === 1) {
          setContaConexaoId(contas[0].id);
        } else if (contas.length > 1) {
          const atualValido = contas.some((c) => c.id === contaConexaoId);
          if (!atualValido) {
            setContaConexaoId(contas[0].id);
          }
        } else {
          setContaConexaoId("");
        }
      } catch (err) {
        if (cancelado) return;
        console.error(err);
        setContasConexao([]);
        setContaConexaoId("");
      }
    }

    carregarContasConexao();
    return () => {
      cancelado = true;
    };
  }, [isCartaoConexao, comprador?.id, tipoContaConexao, contaConexaoId]);

  // Recalcular taxa e total final conforme tipo de operação e pagamento
  useEffect(() => {
    if (bloqueiaCobranca) {
      setTaxaCartaoConexaoCentavos(0);
      setTotalFinalCentavos(0);
      setAvisoTaxa(null);
      return;
    }

    if (!isCartaoConexao) {
      setTaxaCartaoConexaoCentavos(0);
      setTotalFinalCentavos(subtotalCentavos);
      setAvisoTaxa(null);
      return;
    }

    const regra = regrasConexao.find((r) => {
      if (!r.ativo) return false;
      if (r.tipo_conta !== tipoContaConexao) return false;
      if (parcelasConexao < r.numero_parcelas_min || parcelasConexao > r.numero_parcelas_max)
        return false;
      if (subtotalCentavos < (r.valor_minimo_centavos || 0)) return false;
      return true;
    });

    if (!regra) {
      setTaxaCartaoConexaoCentavos(0);
      setTotalFinalCentavos(subtotalCentavos);
      setAvisoTaxa(
        "Sem regra de taxa para este parcelamento (ver Configurações Crédito Conexão).",
      );
      return;
    }

    const percent = Number(regra.taxa_percentual || 0);
    const pct = Math.round(subtotalCentavos * (percent / 100));
    const fixa = Number(regra.taxa_fixa_centavos || 0);
    const taxa = pct + fixa;
    setTaxaCartaoConexaoCentavos(taxa);
    setTotalFinalCentavos(subtotalCentavos + taxa);
    setAvisoTaxa(null);
  }, [
    bloqueiaCobranca,
    isCartaoConexao,
    regrasConexao,
    tipoContaConexao,
    parcelasConexao,
    subtotalCentavos,
  ]);
  // ======== MANIPULACAO DE ITENS =========
  function adicionarProdutoAoCarrinho(produto: ProdutoResumo) {
    const idTemp = crypto.randomUUID();
    const preco = Number(produto.preco_venda_centavos || 0);
    const item: ItemCaixa = {
      idTemp,
      produto,
      quantidade: 1,
      precoUnitarioCentavos: preco,
      beneficiario: null,
    };

    setItens((prev) => [...prev, item]);
  }

  function atualizarItem(idTemp: string, partial: Partial<ItemCaixa>) {
    setItens((prev) =>
      prev.map((i) => (i.idTemp === idTemp ? { ...i, ...partial } : i)),
    );
  }

  function removerItem(idTemp: string) {
    setItens((prev) => prev.filter((i) => i.idTemp !== idTemp));
  }

  function abrirCadastroRapido(
    contexto: "COMPRADOR" | "BENEFICIARIO",
    itemId?: string | null,
  ) {
    setCadastroContexto(contexto);
    setCadastroItemId(itemId ?? null);
    setShowCadastroRapido(true);
  }

  function handleCadastroRapidoSuccess(pessoa: PessoaResumo) {
    if (cadastroContexto === "COMPRADOR") {
      setComprador(pessoa);
      setBuscaComprador("");
      setResultadoComprador([]);
    } else if (cadastroContexto === "BENEFICIARIO" && cadastroItemId) {
      setItens((prev) =>
        prev.map((row) =>
          row.idTemp === cadastroItemId ? { ...row, beneficiario: pessoa } : row,
        ),
      );
      setItemSelecionandoAluno(null);
    }
    setShowCadastroRapido(false);
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

    if (!bloqueiaCobranca && (!formaPagamentoSelecionada || !formaPagamentoInterna)) {
      setMensagem("Selecione uma forma de pagamento válida.");
      setMensagemTipo("error");
      return;
    }

    if (!bloqueiaCobranca && isCrediarioInterno && !dataVencimento) {
      setMensagem("Informe a data de vencimento para crediário interno.");
      setMensagemTipo("error");
      return;
    }

    if (!bloqueiaCobranca && isCredito) {
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
    if (
      !bloqueiaCobranca &&
      isCartaoConexao &&
      (!parcelasDisponiveisConexao.length || parcelasConexao < 1)
    ) {
      setMensagem(
        "Não há opção de parcelamento disponível para o valor desta compra no Cartão Conexão.",
      );
      setMensagemTipo("error");
      return;
    }

    if (
      !bloqueiaCobranca &&
      isCartaoConexao &&
      (!contaConexaoId || Number(contaConexaoId) <= 0)
    ) {
      setMensagem("Selecione uma conta de Crédito Conexão antes de finalizar.");
      setMensagemTipo("error");
      return;
    }

    const valor_total_centavos = bloqueiaCobranca ? 0 : totalFinalCentavos;
    const forma_pagamento = bloqueiaCobranca ? "SEM_COBRANCA" : formaPagamentoInterna;
    const forma_pagamento_codigo = bloqueiaCobranca
      ? null
      : formaPagamentoSelecionada?.forma_pagamento_codigo;
    const status_pagamento =
      bloqueiaCobranca ||
      formaPagamentoInterna === "AVISTA" ||
      formaPagamentoInterna === "CREDITO"
        ? "PAGO"
        : "PENDENTE";

    const dados_cartao_externo =
      !bloqueiaCobranca && isCredito && cartaoMaquinaId && cartaoBandeiraId
        ? {
            maquina_id: Number(cartaoMaquinaId),
            bandeira_id: Number(cartaoBandeiraId),
            parcelas: cartaoNumeroParcelas,
          }
        : null;

    const dados_cartao_conexao =
      !bloqueiaCobranca && isCartaoConexao && contaConexaoId
        ? {
            conta_conexao_id: Number(contaConexaoId),
            parcelas: parcelasConexao,
            tipo_conta: tipoContaConexao,
            taxa_cartao_conexao_centavos: taxaCartaoConexaoCentavos,
          }
        : null;

    const payload = {
      comprador_pessoa_id: comprador.id,
      forma_pagamento,
      forma_pagamento_codigo,
      status_pagamento,
      data_vencimento: isCrediarioInterno ? dataVencimento : null,
      observacoes: observacoes || undefined,
      observacao_vendedor: observacaoVendedor || undefined,
      centro_custo_id: centroCustoCafeId ?? undefined,
      tabela_preco_id:
        tabelaPrecoId && typeof tabelaPrecoId === "number" ? tabelaPrecoId : null,
      itens: itens.map((it) => ({
        produto_id: it.produto.id,
        quantidade: it.quantidade,
        preco_unitario_centavos: it.precoUnitarioCentavos,
        beneficiario_pessoa_id: it.beneficiario?.id ?? comprador?.id ?? null,
        observacoes: it.observacoes || null,
      })),
      dados_cartao_externo,
      dados_cartao_conexao,
      valor_total_centavos,
      taxa_cartao_conexao_centavos:
        !bloqueiaCobranca && isCartaoConexao ? taxaCartaoConexaoCentavos : 0,
      cartao_conexao_tipo_conta:
        !bloqueiaCobranca && isCartaoConexao ? tipoContaConexao : null,
      numero_parcelas: !bloqueiaCobranca
        ? isCartaoConexao
          ? parcelasConexao
          : isCredito
          ? cartaoNumeroParcelas
          : 1
        : 1,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/cafe/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let json: any = {};
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch {
        json = {};
      }

      if (!res.ok || !json?.ok) {
        const msg =
          json?.error ||
          json?.message ||
          (rawText ? rawText.slice(0, 300) : "Erro ao registrar venda.");
        const detCode = json?.details?.code ? ` (code: ${json.details.code})` : "";
        const detMsg = json?.details?.message ? ` | ${json.details.message}` : "";
        setMensagem(msg + detCode + detMsg);
        setMensagemTipo("error");
        return;
      }
      const vendaId =
        json.data?.venda?.id || json.venda?.id || json.data?.id || json.data?.venda_id || null;
      const redirectUrl =
        json.redirect_url ||
        json.data?.redirect_url ||
        (vendaId ? `/cafe/vendas/${vendaId}` : null);
      setMensagemTipo("success");
      setMensagem("Venda registrada com sucesso.");
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (vendaId) {
        router.push(`/cafe/vendas/${vendaId}`);
      } else {
        console.warn("Venda registrada, mas URL de redirecionamento ausente.", json);
      }
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
        <h1 className="text-2xl font-semibold">Ballet Café - Vendas</h1>
        <p className="text-sm text-gray-600">
          Frente de caixa do Ballet Café. Comprador = quem paga; aluno/usuário
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
                {!buscandoComprador &&
                  resultadoComprador.length === 0 &&
                  buscaComprador.trim().length >= 2 && (
                    <div className="p-2">
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:underline"
                        onClick={() => abrirCadastroRapido("COMPRADOR")}
                      >
                        Cadastrar novo comprador
                      </button>
                    </div>
                  )}
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
          <div className="grid md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {resultadoProduto.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => adicionarProdutoAoCarrinho(p)}
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
                        {it.produto.codigo ? `(${it.produto.codigo})` : ""}
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
                  }}
                >
                  Fechar
                </button>
              </div>
              <PessoaLookup
                label=""
                placeholder="Buscar aluno/pessoa (2+ caracteres)"
                hint=""
                value={null}
                onChange={(pessoa: PessoaLookupItem | null) => {
                  if (!pessoa) return;
                  setItens((prev) =>
                    prev.map((row) =>
                      row.idTemp === itemSelecionandoAluno
                        ? { ...row, beneficiario: pessoa as PessoaResumo }
                        : row,
                    ),
                  );
                  setItemSelecionandoAluno(null);
                }}
                allowCreate={false}
              />

              <div className="pt-1">
                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:underline"
                  onClick={() => abrirCadastroRapido("BENEFICIARIO", itemSelecionandoAluno)}
                >
                  Cadastrar novo usuário (beneficiário)
                </button>
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
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Tipo de operação</label>
            <select
              value={tipoOperacao}
              onChange={(e) => setTipoOperacao(e.target.value as TipoOperacaoCafe)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="VENDA">Venda</option>
              <option value="ENTREGA_ADMIN">Entrega administrativa (sem cobrança)</option>
            </select>
            {bloqueiaCobranca && (
              <p className="text-[11px] text-amber-700 mt-1">
                Operação sem cobrança financeira.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tabela de preco</label>
            <select
              value={tabelaPrecoId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : "";
                setTabelaPrecoId(id);
              }}
              className="w-full border rounded-md px-3 py-2 text-sm"
              disabled={carregandoTabelasPreco}
            >
              <option value="">Selecione...</option>
              {tabelasPreco.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
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
              disabled={bloqueiaCobranca}
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

        {/* Cartao Conexao - selecao de parcelas conforme regras */}
        {isCartaoConexao && (
          <div className="grid md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                Parcelas (Cartao Conexao)
              </label>
              <select
                value={parcelasConexao}
                onChange={(e) => setParcelasConexao(Number(e.target.value) || 1)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                disabled={bloqueiaCobranca}
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
                    Parcelamento extra nao disponivel para o valor atual da compra.
                  </p>
                )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Conta Credito Conexao
              </label>
              {contasConexao.length > 0 ? (
                <select
                  value={contaConexaoId}
                  onChange={(e) =>
                    setContaConexaoId(e.target.value ? Number(e.target.value) : "")
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={bloqueiaCobranca}
                >
                  <option value="">Selecione...</option>
                  {contasConexao.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descricao_exibicao || `Conta #${c.id}`} - {c.tipo_conta}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[12px] text-red-600">
                  Nenhuma conta ativa de Credito Conexao para este comprador/tipo.
                </p>
              )}
            </div>
          </div>
        )}
        {isCartaoConexao && avisoTaxa && (
          <div className="mt-1 text-[11px] text-amber-700">{avisoTaxa}</div>
        )}


        {/* Cartão externo (maquininha) */}
        {isCredito && (
          <div className="md:col-span-3 grid md:grid-cols-4 gap-3 mt-3">
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
              <span className="font-semibold">Subtotal:</span>{" "}
              {formatCurrency(subtotalCentavos)}
            </p>
            {mostraTaxaCartao && (
              <p>
                <span className="font-semibold">Taxa Cartao Conexao:</span>{" "}
                {formatCurrency(taxaCartaoConexaoCentavos)}
              </p>
            )}
            <p>
              <span className="font-semibold">Total:</span>{" "}
              {formatCurrency(totalExibido)}
            </p>
            {mostraTaxaCartao && avisoTaxa && (
              <p className="text-[11px] text-amber-700">{avisoTaxa}</p>
            )}
          </div>

          <button
            type="button"
            disabled={
              saving ||
              !comprador ||
              itens.length === 0 ||
              (!bloqueiaCobranca &&
                (!formaPagamentoSelecionada || !formaPagamentoInterna))
            }
            onClick={handleFinalizarVenda}
            className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Finalizar venda"}
          </button>
        </div>
      </section>
      <CadastroPessoaRapidaModal
        open={showCadastroRapido}
        contexto={cadastroContexto}
        onClose={() => setShowCadastroRapido(false)}
        onSuccess={handleCadastroRapidoSuccess}
      />
    </div>
  );
}

type CadastroPessoaRapidaModalProps = {
  open: boolean;
  contexto: "COMPRADOR" | "BENEFICIARIO";
  onClose: () => void;
  onSuccess: (p: PessoaResumo) => void;
};

function CadastroPessoaRapidaModal({
  open,
  contexto,
  onClose,
  onSuccess,
}: CadastroPessoaRapidaModalProps) {
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">("FISICA");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cep, setCep] = useState("");
  const [referencia, setReferencia] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNome("");
      setCpf("");
      setCnpj("");
      setRazaoSocial("");
      setNomeFantasia("");
      setTelefone("");
      setEmail("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setUf("");
      setCep("");
      setReferencia("");
      setErro(null);
      setTipoPessoa("FISICA");
    }
  }, [open]);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const payload: any = {
        tipo_pessoa: tipoPessoa,
        nome: nome || razaoSocial || nomeFantasia,
        cpf,
        cnpj,
        razao_social: razaoSocial,
        nome_fantasia: nomeFantasia,
        telefone,
        email,
        endereco: {
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          cep,
          referencia,
        },
      };

      const res = await fetch("/api/pessoas/rapido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErro(json.error || "Falha ao cadastrar pessoa.");
        return;
      }
      const pessoa = json.data?.pessoa as PessoaResumo;
      if (pessoa?.id) {
        onSuccess(pessoa);
      } else {
        setErro("Cadastro retornou resposta inesperada.");
      }
    } catch (e: any) {
      setErro("Erro inesperado ao cadastrar pessoa.");
      console.error(e);
    } finally {
      setSalvando(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-5 space-y-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Cadastro rápido — {contexto === "COMPRADOR" ? "Comprador" : "Beneficiário"}
            </h3>
            <p className="text-xs text-gray-600">
              Dados completos para boleto (endereço recomendável).
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={onClose}
            disabled={salvando}
          >
            Fechar
          </button>
        </div>

        {erro && <div className="text-sm text-red-600">{erro}</div>}

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Tipo de pessoa</label>
            <select
              value={tipoPessoa}
              onChange={(e) => setTipoPessoa(e.target.value as "FISICA" | "JURIDICA")}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            >
              <option value="FISICA">Pessoa física</option>
              <option value="JURIDICA">Pessoa jurídica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              {tipoPessoa === "FISICA" ? "Nome completo" : "Nome/Apelido"}
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          {tipoPessoa === "FISICA" ? (
            <div>
              <label className="block text-xs font-medium mb-1">CPF</label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                disabled={salvando}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">CNPJ</label>
                <input
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Razão social</label>
                <input
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nome fantasia</label>
                <input
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  disabled={salvando}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Telefone</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Logradouro</label>
            <input
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Número</label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Complemento</label>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Bairro</label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">UF</label>
            <input
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              maxLength={2}
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CEP</label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Referência</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}














