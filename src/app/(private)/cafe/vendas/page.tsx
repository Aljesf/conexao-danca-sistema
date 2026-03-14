"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PessoaLookup, { PessoaLookupItem } from "@/components/PessoaLookup";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";
import { useRouter } from "next/navigation";
import { useCafeCategorias } from "@/lib/cafe/useCafeCategorias";

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
  categoria?: string | null;
  categoria_id?: number | null;
  subcategoria_id?: number | null;
  unidade_venda?: string | null;
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

type ApiResponse<T = unknown> = { ok?: boolean; error?: string; data?: T };

type ApiPagination = {
  page?: number;
  pageSize?: number;
  total?: number;
};

type VendaCreateResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  details?: {
    code?: string;
    message?: string;
  };
  redirect_url?: string | null;
  venda?: {
    id?: number | null;
  } | null;
  data?: {
    venda?: {
      id?: number | null;
    } | null;
    id?: number | null;
    venda_id?: number | null;
    redirect_url?: string | null;
  } | null;
};

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

type TipoContaConexao = "ALUNO" | "COLABORADOR";

type FormaPagamentoSelectOption = {
  value: string;
  ctxId: number;
  label: string;
  tipoContaConexao: TipoContaConexao | null;
};

function parseFormaPagamentoSelectValue(value: string): {
  ctxId: number | null;
  tipoContaConexao: TipoContaConexao | null;
} {
  if (!value) return { ctxId: null, tipoContaConexao: null };
  const [ctxIdRaw, tipoContaRaw] = value.split("|");
  const ctxId = Number(ctxIdRaw);
  if (!Number.isFinite(ctxId)) return { ctxId: null, tipoContaConexao: null };
  if (tipoContaRaw === "COLABORADOR") return { ctxId, tipoContaConexao: "COLABORADOR" };
  if (tipoContaRaw === "ALUNO") return { ctxId, tipoContaConexao: "ALUNO" };
  return { ctxId, tipoContaConexao: null };
}

function isFormaPagamentoCartaoConexao(f: FormaPagamentoContexto): boolean {
  const tipoBase = (f.formas_pagamento?.tipo_base ?? "").toUpperCase();
  const codigo = (f.formas_pagamento?.codigo ?? f.forma_pagamento_codigo ?? "").toUpperCase();
  return tipoBase === "CARTAO_CONEXAO" || codigo.startsWith("CARTAO_CONEXAO");
}

// NOTA SOBRE O MODELO DE PAPEIS NO CAFE v0:
// - "comprador" e a pessoa que esta realizando a compra/pagamento.
// - "beneficiario" e a pessoa que vai usar o produto (normalmente aluno),
//   armazenada por item em cafe_venda_itens.beneficiario_pessoa_id.

export default function FrenteCaixaCafePage() {
  const router = useRouter();
  const { categorias, loading: catsLoading } = useCafeCategorias();

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
  const [formaPagamentoCtxId, setFormaPagamentoCtxId] = useState<string>("");

  // cartao externo (maquininha)
  const [cartaoMaquinas, setCartaoMaquinas] = useState<MaquinaCartaoOpcao[]>([]);
  const [cartaoBandeiras, setCartaoBandeiras] = useState<BandeiraCartao[]>([]);
  const [cartaoRegras, setCartaoRegras] = useState<RegraCartao[]>([]);
  const [cartaoMaquinaId, setCartaoMaquinaId] = useState<number | "">("");
  const [cartaoBandeiraId, setCartaoBandeiraId] = useState<number | "">("");
  const [cartaoNumeroParcelas, setCartaoNumeroParcelas] = useState<number>(1);
  const [carregandoCartao, setCarregandoCartao] = useState(false);

  // Cartao Conexao - regras de parcelamento
  const [regrasConexao, setRegrasConexao] = useState<RegraParcelamento[]>([]);
  const [carregandoRegrasConexao, setCarregandoRegrasConexao] = useState(false);
  const [parcelasConexao, setParcelasConexao] = useState<number>(1);
  const [contasConexao, setContasConexao] = useState<ContaConexao[]>([]);
  const [contaConexaoId, setContaConexaoId] = useState<number | "">("");
  const [taxaCartaoConexaoCentavos, setTaxaCartaoConexaoCentavos] = useState(0);
  const [totalFinalCentavos, setTotalFinalCentavos] = useState(0);
  const [avisoTaxa, setAvisoTaxa] = useState<string | null>(null);

  // cadastro rapido de pessoa (comprador/beneficiario)
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
  const [catalogoProdutos, setCatalogoProdutos] = useState<ProdutoResumo[]>([]);
  const [carregandoCatalogoProdutos, setCarregandoCatalogoProdutos] = useState(false);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(null);

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

  const cafeFieldClassName =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
  const cafePrimaryButtonClassName =
    "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60";

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
          if (ativas.length > 0) {
            const def = ativas.find((t) => t.is_default) ?? ativas[0];
            setTabelaPrecoId((atual) =>
              atual === "" || !ativas.some((t) => t.id === atual) ? def.id : atual,
            );
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
      } catch {
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

  // catalogo de produtos para navegacao rapida no PDV
  useEffect(() => {
    const tabelaParam =
      tabelaPrecoId && typeof tabelaPrecoId === "number"
        ? `&tabela_preco_id=${tabelaPrecoId}`
        : "";
    const controller = new AbortController();

    async function run() {
      setCarregandoCatalogoProdutos(true);
      try {
        const response = await fetch(`/api/cafe/produtos?page=1&pageSize=200${tabelaParam}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setCatalogoProdutos([]);
          return;
        }
        const payload = (await response.json()) as ApiResponse<{
          items: ProdutoResumo[];
          pagination: ApiPagination;
        }>;
        if (payload.ok && Array.isArray(payload.data?.items)) {
          setCatalogoProdutos(payload.data.items);
        } else {
          setCatalogoProdutos([]);
        }
      } catch {
        if (!controller.signal.aborted) {
          setCatalogoProdutos([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoCatalogoProdutos(false);
        }
      }
    }

    void run();
    return () => controller.abort();
  }, [tabelaPrecoId]);

  useEffect(() => {
    if (categoriaId !== null || categorias.length === 0) return;
    setCategoriaId(categorias[0]!.id);
    setSubcategoriaId(null);
  }, [categorias, categoriaId]);

  const subcategoriasSelecionadas = useMemo(() => {
    if (categoriaId === null) return [];
    const categoria = categorias.find((item) => item.id === categoriaId);
    return categoria?.subcategorias ?? [];
  }, [categorias, categoriaId]);

  const produtosFiltrados = useMemo(() => {
    const term = buscaProduto.trim().toLowerCase();
    const categoriaSelecionada = categorias.find((item) => item.id === categoriaId) ?? null;
    const categoriaSlugSelecionada = categoriaSelecionada?.slug ?? null;
    const categoriaNomeSelecionada = categoriaSelecionada?.nome.toLowerCase() ?? null;

    return catalogoProdutos.filter((produto) => {
      if (categoriaId !== null) {
        if (typeof produto.categoria_id === "number") {
          if (produto.categoria_id !== categoriaId) return false;
        } else if (categoriaSlugSelecionada || categoriaNomeSelecionada) {
          const categoriaLegacy = String(produto.categoria ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");

          if (
            categoriaSlugSelecionada &&
            categoriaLegacy !== categoriaSlugSelecionada &&
            categoriaLegacy !== categoriaNomeSelecionada
          ) {
            return false;
          }
        }
      }

      if (subcategoriaId !== null) {
        if (typeof produto.subcategoria_id !== "number" || produto.subcategoria_id !== subcategoriaId) {
          return false;
        }
      }

      if (!term) return true;

      const nome = (produto.nome ?? "").toLowerCase();
      const codigo = String(produto.codigo ?? "").toLowerCase();
      return nome.includes(term) || codigo.includes(term);
    });
  }, [buscaProduto, catalogoProdutos, categorias, categoriaId, subcategoriaId]);

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
          const fp0 = ativas[0];
          setFormaPagamentoCtxId(
            isFormaPagamentoCartaoConexao(fp0) ? `${fp0.id}|ALUNO` : String(fp0.id),
          );
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

  function getRotuloFormaPagamento(f: FormaPagamentoContexto): string {
    const codigo = (f.formas_pagamento?.codigo ?? f.forma_pagamento_codigo ?? "").toUpperCase();
    if (codigo === "CARTAO_CONEXAO_COLAB") {
      return "Cartao Conexao Colaborador";
    }
    if (codigo === "CARTAO_CONEXAO_ALUNO" || codigo === "CARTAO_CONEXAO") {
      return "Cartao Conexao Aluno";
    }
    return f.descricao_exibicao;
  }

  const formasPagamentoOpcoes = useMemo<FormaPagamentoSelectOption[]>(() => {
    return formasPagamentoCtx.flatMap((f) => {
      if (isFormaPagamentoCartaoConexao(f)) {
        return [
          {
            value: `${f.id}|ALUNO`,
            ctxId: f.id,
            label: "Cartao Conexao Aluno",
            tipoContaConexao: "ALUNO",
          },
          {
            value: `${f.id}|COLABORADOR`,
            ctxId: f.id,
            label: "Cartao Conexao Colaborador",
            tipoContaConexao: "COLABORADOR",
          },
        ];
      }
      return [
        {
          value: String(f.id),
          ctxId: f.id,
          label: getRotuloFormaPagamento(f),
          tipoContaConexao: null,
        },
      ];
    });
  }, [formasPagamentoCtx]);

  const formaPagamentoSelecionadaOpcao = useMemo(() => {
    if (!formaPagamentoCtxId) return null;
    return formasPagamentoOpcoes.find((f) => f.value === formaPagamentoCtxId) ?? null;
  }, [formaPagamentoCtxId, formasPagamentoOpcoes]);

  const formaPagamentoSelecionada = useMemo(() => {
    if (!formaPagamentoSelecionadaOpcao?.ctxId) return null;
    return (
      formasPagamentoCtx.find((f) => f.id === formaPagamentoSelecionadaOpcao.ctxId) ??
      null
    );
  }, [formasPagamentoCtx, formaPagamentoSelecionadaOpcao]);

  // forma_pagamento interna usada pela API /api/cafe/vendas
  const formaPagamentoInterna = useMemo<
    "AVISTA" | "CREDITO" | "CREDIARIO_INTERNO" | "CARTAO_CONEXAO" | null
  >(() => {
    if (bloqueiaCobranca) return null;
    if (formaPagamentoSelecionadaOpcao?.tipoContaConexao) {
      return "CARTAO_CONEXAO";
    }
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
  }, [bloqueiaCobranca, formaPagamentoSelecionada, formaPagamentoSelecionadaOpcao]);

  const isCredito = formaPagamentoInterna === "CREDITO";
  const isCrediarioInterno = formaPagamentoInterna === "CREDIARIO_INTERNO";
  const isCartaoConexao =
    Boolean(formaPagamentoSelecionadaOpcao?.tipoContaConexao) ||
    (!!formaPagamentoSelecionada && isFormaPagamentoCartaoConexao(formaPagamentoSelecionada));
  const mostraTaxaCartao = !bloqueiaCobranca && isCartaoConexao;
  const totalExibido = bloqueiaCobranca ? 0 : totalFinalCentavos || subtotalCentavos;

  // Descobrir tipo de conta (ALUNO / COLABORADOR) para Cartao Conexao
  const tipoContaConexao: TipoContaConexao | null = useMemo(() => {
    if (!isCartaoConexao) {
      return null;
    }
    return formaPagamentoSelecionadaOpcao?.tipoContaConexao ?? null;
  }, [isCartaoConexao, formaPagamentoSelecionadaOpcao]);
  // ======== CARTAO - REGRAS/BANDEIRAS/MAQUININHAS (externo) =========
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
          "Erro ao carregar configuracoes de cartao na frente de caixa",
          e,
        );
      } finally {
        setCarregandoCartao(false);
      }
    }

    carregarCartao();
  }, []);

  // ======== Cartao Conexao - carregar regras de parcelamento =========
  useEffect(() => {
    async function carregarRegrasConexao() {
      try {
        setCarregandoRegrasConexao(true);
        const res = await fetch(
          "/api/financeiro/credito-conexao/regras-parcelas?ativo=true",
        );
      if (!res.ok) {
        console.error(
          "Erro ao carregar regras de parcelamento do Cartao Conexao:",
          await res.text(),
        );
        return;
      }
      const json = await res.json();
      const regras: RegraParcelamento[] = json.regras ?? [];
      setRegrasConexao(regras);
    } catch (e) {
      console.error("Erro inesperado ao carregar regras do Cartao Conexao", e);
    } finally {
      setCarregandoRegrasConexao(false);
      }
    }

    carregarRegrasConexao();
  }, []);

  // Parcelas disponiveis para Cartao Conexao, de acordo com valor e tipo de conta
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

  // Garantir que parcelasConexao esteja sempre em uma opcao valida
  useEffect(() => {
    if (!isCartaoConexao) {
      setParcelasConexao(1);
      return;
    }
    if (!parcelasDisponiveisConexao.includes(parcelasConexao)) {
      setParcelasConexao(parcelasDisponiveisConexao[0] ?? 1);
    }
  }, [isCartaoConexao, parcelasDisponiveisConexao, parcelasConexao]);

  // Carrega contas de Credito Conexao do comprador para selecionar na venda
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
        const json = (await resp.json()) as { contas?: unknown[] };
        if (cancelado) return;

        const contasRaw = Array.isArray(json.contas) ? json.contas : [];
        const contas: ContaConexao[] = contasRaw
          .filter(
            (row): row is ContaConexao =>
              typeof row === "object" &&
              row !== null &&
              "id" in row &&
              "pessoa_titular_id" in row &&
              "tipo_conta" in row,
          )
          .filter((conta) => conta.pessoa_titular_id === comprador.id && (conta.ativo ?? true));
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

  // Recalcular taxa e total final conforme tipo de operacao e pagamento
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
        "Sem regra de taxa para este parcelamento (ver Configuracoes Credito Conexao).",
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

  // ======== FINALIZACAO DA VENDA =========

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
      setMensagem("Selecione uma forma de pagamento valida.");
      setMensagemTipo("error");
      return;
    }

    if (!bloqueiaCobranca && isCrediarioInterno && !dataVencimento) {
      setMensagem("Informe a data de vencimento para crediario interno.");
      setMensagemTipo("error");
      return;
    }

    if (!bloqueiaCobranca && isCredito) {
      if (!cartaoMaquinaId || !cartaoBandeiraId) {
        setMensagem("Selecione a maquininha e a bandeira para pagamento no credito.");
        setMensagemTipo("error");
        return;
      }
      if (!regraCartaoSelecionada) {
        setMensagem(
          "Nao ha regra de cartao de credito configurada para essa maquininha/bandeira.",
        );
        setMensagemTipo("error");
        return;
      }
    }

    // Para Cartao Conexao, validar se ha pelo menos uma opcao de parcela
    if (
      !bloqueiaCobranca &&
      isCartaoConexao &&
      (!parcelasDisponiveisConexao.length || parcelasConexao < 1)
    ) {
      setMensagem(
        "Nao ha opcao de parcelamento disponivel para o valor desta compra no Cartao Conexao.",
      );
      setMensagemTipo("error");
      return;
    }

    if (!bloqueiaCobranca && isCartaoConexao && !tipoContaConexao) {
      setMensagem(
        "Selecione Cartao Conexao Aluno ou Cartao Conexao Colaborador antes de finalizar.",
      );
      setMensagemTipo("error");
      return;
    }

    if (
      !bloqueiaCobranca &&
      isCartaoConexao &&
      (!contaConexaoId || Number(contaConexaoId) <= 0)
    ) {
      setMensagem("Selecione uma conta de Credito Conexao antes de finalizar.");
      setMensagemTipo("error");
      return;
    }

    const cartaoConexaoTipoContaPayload =
      !bloqueiaCobranca && isCartaoConexao ? tipoContaConexao : null;

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
      !bloqueiaCobranca &&
      isCartaoConexao &&
      contaConexaoId &&
      cartaoConexaoTipoContaPayload
        ? {
            conta_conexao_id: Number(contaConexaoId),
            parcelas: parcelasConexao,
            tipo_conta: cartaoConexaoTipoContaPayload,
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
      cartao_conexao_tipo_conta: cartaoConexaoTipoContaPayload,
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
      let json: VendaCreateResponse = {};
      try {
        json = rawText ? (JSON.parse(rawText) as VendaCreateResponse) : {};
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
      const redirectUrl = json.redirect_url || json.data?.redirect_url || null;
      const isCafeVendasSubRoute =
        typeof redirectUrl === "string" &&
        (redirectUrl.startsWith("/cafe/vendas/") || redirectUrl.includes("/cafe/vendas/"));
      setMensagemTipo("success");
      setMensagem(
        vendaId
          ? `Venda registrada com sucesso (ID: ${vendaId}).`
          : "Venda registrada com sucesso.",
      );
      if (isCafeVendasSubRoute) {
        router.replace("/cafe/vendas");
      } else if (redirectUrl) {
        router.push(redirectUrl);
      } else if (vendaId) {
        router.replace("/cafe/vendas");
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
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Operacao"
        title="Ballet Cafe - Caixa / Vendas"
        description="Frente de caixa do Ballet Cafe. Comprador e quem paga; aluno ou usuario e quem vai consumir o item."
        actions={
          <Link
            href="/cafe/admin"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Ir para gestao do Cafe
          </Link>
        }
      />

      <SectionCard
        title="Operacao do dia"
        description="Centralize aqui a venda no caixa e use a gestao do contexto Cafe para manter produtos, insumos, precos e abastecimento."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Venda
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Selecione comprador, itens e forma de pagamento para concluir a operacao.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Catalogo
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Produtos e categorias sao mantidos em <span className="font-medium">Gestao do Cafe</span>.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Abastecimento
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Compras e insumos ficam separados da operacao para evitar mistura com administracao global.
            </p>
          </div>
        </div>
      </SectionCard>

      {mensagem && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            mensagemTipo === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : mensagemTipo === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {mensagem}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Comprador */}
        <section className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)]">
          <h2 className="text-sm font-semibold">Comprador</h2>
          <p className="text-xs text-gray-500">
            Pessoa que esta realizando a compra/pagamento.
          </p>
          {!comprador ? (
            <div className="space-y-2">
              <input
                value={buscaComprador}
                onChange={(e) => setBuscaComprador(e.target.value)}
                className={cafeFieldClassName}
                placeholder="Buscar comprador (2+ caracteres)"
              />
              {buscandoComprador && (
                <p className="text-[11px] text-gray-500">Buscando pessoas...</p>
              )}
              <div className="max-h-48 overflow-y-auto rounded-[18px] border border-slate-200 divide-y divide-slate-100 bg-white">
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
        <section className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Itens da venda</h2>
            <div className="flex items-center gap-2">
              <input
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
                placeholder="Buscar produto"
              />
              <span className="text-xs text-gray-500">
                Clique no produto para adicionar
              </span>
            </div>
          </div>

          <div className="rounded-[20px] border border-[#efe5d6] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f0_100%)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-medium text-slate-700">Categorias</div>
              {(catsLoading || carregandoCatalogoProdutos) && (
                <div className="text-[11px] text-slate-500">Carregando...</div>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categorias.map((categoria) => {
                const active = categoria.id === categoriaId;
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => {
                      setCategoriaId(categoria.id);
                      setSubcategoriaId(null);
                    }}
                    className={[
                      "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs",
                      active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {categoria.nome}
                  </button>
                );
              })}
            </div>

            {subcategoriasSelecionadas.length > 0 && (
              <div className="mt-1 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSubcategoriaId(null)}
                  className={[
                    "whitespace-nowrap rounded-full border px-3 py-1 text-[11px]",
                    subcategoriaId === null
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Todas
                </button>
                {subcategoriasSelecionadas.map((subcategoria) => (
                  <button
                    key={subcategoria.id}
                    type="button"
                    onClick={() => setSubcategoriaId(subcategoria.id)}
                    className={[
                      "whitespace-nowrap rounded-full border px-3 py-1 text-[11px]",
                      subcategoriaId === subcategoria.id
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {subcategoria.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {produtosFiltrados.map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => adicionarProdutoAoCarrinho(produto)}
                className="rounded-[20px] border border-slate-200/80 bg-white px-3.5 py-3 text-left text-sm shadow-[0_12px_30px_-24px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:bg-slate-50 active:scale-[0.99]"
              >
                <p className="font-semibold text-gray-800">{produto.nome}</p>
                <p className="text-xs text-gray-500">
                  {produto.codigo ? `(${produto.codigo}) ` : ""}
                  {produto.unidade_venda ?? "un"}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatCurrency(produto.preco_venda_centavos)}
                </p>
              </button>
            ))}
          </div>
          {produtosFiltrados.length === 0 && !carregandoCatalogoProdutos && (
            <div className="rounded-lg border border-dashed p-3 text-center text-xs text-slate-500">
              Nenhum produto encontrado para este filtro.
            </div>
          )}

          <div className="overflow-hidden rounded-[20px] border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Produto</th>
                  <th className="px-3 py-2 text-left">Aluno (usuario)</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right">Preco unit.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-center">Acoes</th>
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
                  <tr key={it.idTemp} className="border-t border-slate-100">
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
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                        className="w-20 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-right text-sm shadow-sm shadow-slate-200/60 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        className="w-24 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-right text-xs shadow-sm shadow-slate-200/60 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
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
          </div>
          {itemSelecionandoAluno && (
            <div className="mt-3 space-y-2 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  Selecionar aluno/usuario para o item
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
                  Cadastrar novo usuario (beneficiario)
                </button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-gray-500">
            Se voce nao escolher um aluno para o item, o sistema considera o comprador como
            usuario do produto.
          </p>
        </section>
      </div>

      {/* Pagamento e resumo */}
      <section className="space-y-4 rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)]">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo de operacao</label>
            <select
              value={tipoOperacao}
              onChange={(e) => setTipoOperacao(e.target.value as TipoOperacaoCafe)}
              className={cafeFieldClassName}
            >
              <option value="VENDA">Venda</option>
              <option value="ENTREGA_ADMIN">Entrega administrativa (sem cobranca)</option>
            </select>
            {bloqueiaCobranca && (
              <p className="text-[11px] text-amber-700 mt-1">
                Operacao sem cobranca financeira.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Tabela de preco</label>
            <select
              value={tabelaPrecoId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : "";
                setTabelaPrecoId(id);
              }}
              className={cafeFieldClassName}
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
                const selectedValue = e.target.value;
                setFormaPagamentoCtxId(selectedValue);
                const parsed = parseFormaPagamentoSelectValue(selectedValue);
                if (parsed.ctxId) {
                  const f = formasPagamentoCtx.find((fp) => fp.id === parsed.ctxId);
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
              className={cafeFieldClassName}
              disabled={bloqueiaCobranca}
            >
              <option value="">Selecione...</option>
              {formasPagamentoOpcoes.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
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
                className={cafeFieldClassName}
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
                className={cafeFieldClassName}
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
                  className={cafeFieldClassName}
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


        {/* Cartao externo (maquininha) */}
        {isCredito && (
          <div className="md:col-span-3 grid md:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium mb-1">Maquininha *</label>
              <select
                value={cartaoMaquinaId}
                onChange={(e) =>
                  setCartaoMaquinaId(e.target.value ? Number(e.target.value) : "")
                }
                className={cafeFieldClassName}
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
                className={cafeFieldClassName}
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
                className={cafeFieldClassName}
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
                  Carregando configuracoes de cartao...
                </p>
              )}
              {!carregandoCartao &&
                isCredito &&
                cartaoMaquinaId &&
                cartaoBandeiraId &&
                !regraCartaoSelecionada && (
                  <p className="mt-1 text-[11px] text-red-600">
                    Nao ha regra configurada para esta maquininha/bandeira (credito).
                  </p>
                )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Observacoes</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className={cafeFieldClassName}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Observacao do vendedor (interna)
            </label>
            <textarea
              value={observacaoVendedor}
              onChange={(e) => setObservacaoVendedor(e.target.value)}
              className={cafeFieldClassName}
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
            className={cafePrimaryButtonClassName}
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
      const payload: {
        tipo_pessoa: "FISICA" | "JURIDICA";
        nome: string;
        cpf: string;
        cnpj: string;
        razao_social: string;
        nome_fantasia: string;
        telefone: string;
        email: string;
        endereco: {
          logradouro: string;
          numero: string;
          complemento: string;
          bairro: string;
          cidade: string;
          uf: string;
          cep: string;
          referencia: string;
        };
      } = {
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
    } catch (e: unknown) {
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
              Cadastro rapido - {contexto === "COMPRADOR" ? "Comprador" : "Beneficiario"}
            </h3>
            <p className="text-xs text-gray-600">
              Dados completos para boleto (endereco recomendavel).
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            >
              <option value="FISICA">Pessoa fisica</option>
              <option value="JURIDICA">Pessoa juridica</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              {tipoPessoa === "FISICA" ? "Nome completo" : "Nome/Apelido"}
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          {tipoPessoa === "FISICA" ? (
            <div>
              <label className="block text-xs font-medium mb-1">CPF</label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Razao social</label>
                <input
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
                  disabled={salvando}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Nome fantasia</label>
                <input
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Numero</label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Complemento</label>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Bairro</label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Cidade</label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">UF</label>
            <input
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              maxLength={2}
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CEP</label>
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Referencia</label>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70"
              disabled={salvando}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
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














