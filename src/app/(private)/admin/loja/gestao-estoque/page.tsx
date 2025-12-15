"use client";

import React, { useEffect, useMemo, useState } from "react";

// Tipos basicos
type Produto = {
  id: number;
  codigo: string | null;
  nome: string;
  descricao?: string | null;
  categoria: string | null;
  categoria_subcategoria_id?: number | null;
  preco_venda_centavos: number;
  unidade: string | null;
  estoque_atual: number;
  ativo: boolean;
  observacoes?: string | null;

  // campos administrativos opcionais
  fornecedor_id?: number | null;
  fornecedor_nome?: string | null;
  data_cadastro?: string | null;
  data_atualizacao?: string | null;
};

type MovimentoEstoque = {
  id: number;
  tipo: string;
  origem: string;
  quantidade: number;
  saldo_antes: number | null;
  saldo_depois: number | null;
  referencia_id: number | null;
  observacao: string | null;
  created_at: string;
};

type FornecedorResumo = {
  id: number;
  nome: string;
};

type SubcategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  categoria_id?: number | null;
  centro_custo_id?: number | null;
  receita_categoria_id?: number | null;
  despesa_categoria_id?: number | null;
};

type CategoriaLoja = {
  id: number;
  nome: string;
  codigo?: string | null;
  ativo: boolean;
  subcategorias: SubcategoriaLoja[];
};

type Variante = {
  id: number;
  produto_id: number;
  sku: string;
  cor_id: number | null;
  numeracao_id: number | null;
  tamanho_id: number | null;
  estoque_atual: number;
  preco_venda_centavos: number | null;
  ativo: boolean;
};

type AtributosResp = {
  cores: Array<{ id: number; nome: string; codigo?: string | null; hex?: string | null; ativo: boolean }>;
  numeracoes: Array<{ id: number; tipo: string; valor: number; ativo: boolean }>;
  tamanhos: Array<{ id: number; tipo: string; nome: string; ordem: number; ativo: boolean }>;
  marcas: Array<{ id: number; nome: string; ativo: boolean }>;
  modelos: Array<{ id: number; nome: string; ativo: boolean }>;
};

type ApiResponse<T = any> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

function parseMoneyToCentavos(input: string): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const v = Number(normalized);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 100);
}

type VarianteCreatePayload = {
  produto_id: number;
  cor_id?: number | null;
  numeracao_id?: number | null;
  tamanho_id?: number | null;
  estoque_atual?: number;
  preco_venda_centavos?: number | null;
  ativo?: boolean;
  observacoes?: string | null;
};

type ProdutosListResponse = {
  items: Produto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type FiltrosState = {
  search: string;
  apenasAtivos: boolean;
  modoPreco: "TODOS" | "AGUARDANDO_PRECO" | "COM_PRECO";
};

type EditFormState = {
  id: number | null;
  nome: string;
  codigo: string;
  categoria: string;
  categoria_subcategoria_id: number | null;
  unidade: string;
  ativo: boolean;
  precoReais: string; // preco de venda (texto)
  precoCustoReais: string; // preco de custo (texto) - admin
  fornecedorId: number | null;
};

type CadastroAdminFormState = {
  nome: string;
  codigo: string;
  categoria: string;
  categoria_subcategoria_id: number | null;
  unidade: string;
  fornecedor_id: number | "";
  quantidade: number | "";
  precoCustoReais: string;
  precoVendaReais: string;
  observacoesProduto: string;
  observacoesEntrada: string;
};

function formatarReaisDeCentavos(
  valorCentavos: number | null | undefined
): string {
  if (valorCentavos == null || Number.isNaN(valorCentavos)) return "u";
  const valor = valorCentavos / 100;
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatarData(dateStr: string | null | undefined): string {
  if (!dateStr) return "u";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "u";
  return d.toLocaleString("pt-BR");
}

export default function GestaoEstoqueAdminPage() {
  const [aba, setAba] = useState<"REVISAR" | "CADASTRO">("REVISAR");

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorResumo[]>([]);
  const [carregandoFornecedores, setCarregandoFornecedores] = useState(false);
  const [categoriasLoja, setCategoriasLoja] = useState<CategoriaLoja[]>([]);
  const [erroCategoriasLoja, setErroCategoriasLoja] = useState("");
  const [categoriaSelecionadaId, setCategoriaSelecionadaId] = useState<number | "">("");
  const [categoriaCadastroSelecionadaId, setCategoriaCadastroSelecionadaId] = useState<number | "">("");
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>([]);
  const [loadingMovimentos, setLoadingMovimentos] = useState(false);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const [ajVarianteId, setAjVarianteId] = useState<string>("");
  const [ajOperacao, setAjOperacao] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [ajQuantidade, setAjQuantidade] = useState<string>("1");
  const [ajObs, setAjObs] = useState<string>("");

  // Variantes e atributos (Fase 1)
  const [atributos, setAtributos] = useState<AtributosResp | null>(null);
  const [loadingAtributos, setLoadingAtributos] = useState(false);
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [loadingVariantes, setLoadingVariantes] = useState(false);
  const [erroVariantes, setErroVariantes] = useState<string | null>(null);
  const [ultimaVarianteCriada, setUltimaVarianteCriada] = useState<Variante | null>(null);
  const [criandoPadrao, setCriandoPadrao] = useState(false);
  const [ultimoProdutoCriado, setUltimoProdutoCriado] = useState<Produto | null>(null);
  const [variantesProdutoCriado, setVariantesProdutoCriado] = useState<Variante[]>([]);
  const [loadingVariantesProdutoCriado, setLoadingVariantesProdutoCriado] = useState(false);

  const [isNovaVarianteOpen, setIsNovaVarianteOpen] = useState(false);
  const [nvCorId, setNvCorId] = useState<string>("");
  const [nvNumeracaoId, setNvNumeracaoId] = useState<string>("");
  const [nvTamanhoId, setNvTamanhoId] = useState<string>("");
  const [nvPreco, setNvPreco] = useState<string>("");
  const [nvAtivo, setNvAtivo] = useState(true);
  const [nvObs, setNvObs] = useState<string>("");

  const [isEditVarianteOpen, setIsEditVarianteOpen] = useState(false);
  const [editVarianteId, setEditVarianteId] = useState<number | null>(null);
  const [evCorId, setEvCorId] = useState<string>("");
  const [evNumeracaoId, setEvNumeracaoId] = useState<string>("");
  const [evTamanhoId, setEvTamanhoId] = useState<string>("");
  const [evEstoque, setEvEstoque] = useState<string>("0");
  const [evPreco, setEvPreco] = useState<string>("");
  const [evAtivo, setEvAtivo] = useState(true);
  const [evObs, setEvObs] = useState<string>("");
  const [histVarianteId, setHistVarianteId] = useState<string>("");

  const [loadingProdutos, setLoadingProdutos] = useState(false);
  // carregamento de fornecedores para selects

  const [savingEdicao, setSavingEdicao] = useState(false);
  const [savingCadastro, setSavingCadastro] = useState(false);

  const [filtros, setFiltros] = useState<FiltrosState>({
    search: "",
    apenasAtivos: true,
    modoPreco: "TODOS",
  });

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | null>(
    null
  );

  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(
    null
  );
  const [emEdicao, setEmEdicao] = useState(false);

  const [editForm, setEditForm] = useState<EditFormState>({
    id: null,
    nome: "",
    codigo: "",
    categoria: "",
    categoria_subcategoria_id: null,
    unidade: "UN",
    ativo: true,
    precoReais: "",
    precoCustoReais: "",
    fornecedorId: null,
  });

  const [cadastroForm, setCadastroForm] = useState<CadastroAdminFormState>({
    nome: "",
    codigo: "",
    categoria: "",
    categoria_subcategoria_id: null,
    unidade: "UN",
    fornecedor_id: "",
    quantidade: "",
    precoCustoReais: "",
    precoVendaReais: "",
    observacoesProduto: "",
    observacoesEntrada: "",
  });
  function resetMensagem() {
    setMensagem(null);
    setMensagemTipo(null);
  }

  async function carregarProdutos() {
    resetMensagem();
    setLoadingProdutos(true);
    try {
      const params = new URLSearchParams();
      params.set("modo", "admin");
      params.set("pageSize", "200");
      if (filtros.search.trim().length > 0) {
        params.set("search", filtros.search.trim());
      }
      if (filtros.apenasAtivos) {
        params.set("apenasAtivos", "true");
      }
      if (filtros.modoPreco === "AGUARDANDO_PRECO") {
        params.set("somenteComPreco", "false");
      } else if (filtros.modoPreco === "COM_PRECO") {
        params.set("somenteComPreco", "true");
      }

      const res = await fetch("/api/loja/produtos?" + params.toString(), {
        cache: "no-store",
      });
      const json: ApiResponse<ProdutosListResponse> = await res.json();

      if (!json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao carregar produtos.");
        return;
      }

      const items = json.data.items ?? [];
      setProdutos(items);

      // Atualiza selecao com dados recarregados (estoque somado pela API)
      if (produtoSelecionado?.id) {
        const atualizado = items.find((p) => Number(p.id) === Number(produtoSelecionado.id));
        if (atualizado) {
          setProdutoSelecionado(atualizado);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao carregar produtos.");
    } finally {
      setLoadingProdutos(false);
    }
  }

  async function carregarFornecedores() {
    try {
      setCarregandoFornecedores(true);
      const res = await fetch("/api/loja/fornecedores", { cache: "no-store" });
      const json: ApiResponse<any[]> = await res.json();

      if (!res.ok || json?.ok === false) {
        console.error("[GestaoEstoque] Erro ao buscar fornecedores:", json?.error);
        setFornecedores([]);
        return;
      }

      let itensBrutos: any[] = [];

      if (Array.isArray(json?.data)) {
        itensBrutos = json.data;
      } else if (Array.isArray(json?.items)) {
        itensBrutos = json.items;
      } else if (Array.isArray(json?.fornecedores)) {
        itensBrutos = json.fornecedores;
      } else if (Array.isArray(json)) {
        itensBrutos = json;
      }

      const lista: FornecedorResumo[] = itensBrutos.map((item) => ({
        id: item.id,
        nome:
          item.pessoa_nome ??
          item.nome ??
          item.razao_social ??
          item.codigo_interno ??
          `Fornecedor #${item.id}`,
      }));

      setFornecedores(lista);
    } catch (err) {
      console.error("[GestaoEstoque] Erro inesperado ao buscar fornecedores:", err);
    } finally {
      setCarregandoFornecedores(false);
    }
  }

  async function carregarCategoriasLoja() {
    try {
      setErroCategoriasLoja("");
      const res = await fetch("/api/loja/produtos/categorias", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Erro ao listar categorias da loja.");
      }
      setCategoriasLoja(json.categorias ?? []);
    } catch (err: any) {
      console.error("Erro inesperado ao carregar categorias/subcategorias:", err);
      setCategoriasLoja([]);
      setErroCategoriasLoja(err.message || "Erro ao listar categorias da loja.");
    }
  }

  async function carregarMovimentos(produtoId: number, varianteId?: number | null) {
    try {
      setLoadingMovimentos(true);
      const qs = new URLSearchParams();
      qs.set("produto_id", String(produtoId));
      if (varianteId && varianteId > 0) qs.set("variante_id", String(varianteId));

      const res = await fetch(`/api/loja/estoque/movimentos?${qs.toString()}`, { cache: "no-store" });
      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }

      if (!res.ok || !json?.ok || !Array.isArray(json?.movimentos)) {
        console.error("Erro ao carregar movimentos de estoque:", json?.error ?? raw);
        setMovimentos([]);
        return;
      }

      if (json.warning) {
        console.warn("[Movimentos estoque] aviso:", json.warning);
      }

      setMovimentos(json.movimentos);
    } catch (err) {
      console.error("Erro inesperado ao carregar movimentos de estoque:", err);
      setMovimentos([]);
    } finally {
      setLoadingMovimentos(false);
    }
  }

  async function carregarAtributos() {
    setLoadingAtributos(true);
    try {
      const res = await fetch("/api/loja/atributos", { cache: "no-store" });
      const json: ApiResponse<AtributosResp> = await res.json();
      if (!res.ok || json?.ok === false) {
        console.error("[GestaoEstoque] erro ao carregar atributos:", json?.error);
        setAtributos(null);
        return;
      }
      setAtributos(json.data ?? null);
    } catch (err) {
      console.error("[GestaoEstoque] erro inesperado ao carregar atributos:", err);
      setAtributos(null);
    } finally {
      setLoadingAtributos(false);
    }
  }

  async function carregarVariantes(produtoId: number) {
    setErroVariantes(null);
    setLoadingVariantes(true);
    try {
      const qs = new URLSearchParams();
      qs.set("produto_id", String(produtoId));
      const res = await fetch(`/api/loja/variantes?${qs.toString()}`, { cache: "no-store" });
      const json: ApiResponse<any> = await res.json().catch(() => null);
      const lista = (json?.variantes || json?.items || json?.data || []) as Variante[];

      if (!res.ok || json?.ok === false) {
        setErroVariantes(json?.error || "Erro ao carregar variantes.");
        setVariantes([]);
        setAjVarianteId("");
        return;
      }

      const arr = Array.isArray(lista) ? lista : [];
      setVariantes(arr);
      if (arr.length === 1) {
        setAjVarianteId(String(arr[0].id));
      } else if (!arr.some((v) => String(v.id) === ajVarianteId)) {
        setAjVarianteId("");
      }
    } catch (err) {
      console.error("[GestaoEstoque] erro ao carregar variantes:", err);
      setErroVariantes("Erro inesperado ao carregar variantes.");
      setVariantes([]);
      setAjVarianteId("");
    } finally {
      setLoadingVariantes(false);
    }
  }

  async function criarVariantePadrao() {
    if (!produtoSelecionado) return;
    setCriandoPadrao(true);
    try {
      const res = await fetch("/api/loja/variantes/padrao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoSelecionado.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.ok === false) {
        alert(json?.error || "Erro ao criar variante padrao.");
        return;
      }
      await carregarVariantes(produtoSelecionado.id);
    } finally {
      setCriandoPadrao(false);
    }
  }

  async function criarVarianteSelecionada() {
    if (!produtoSelecionado?.id) return;

    const precoCent = parseMoneyToCentavos(nvPreco);

    const payload: VarianteCreatePayload = {
      produto_id: produtoSelecionado.id,
      cor_id: nvCorId ? Number(nvCorId) : null,
      numeracao_id: nvNumeracaoId ? Number(nvNumeracaoId) : null,
      tamanho_id: nvTamanhoId ? Number(nvTamanhoId) : null,
      preco_venda_centavos: precoCent,
      ativo: nvAtivo,
      observacoes: nvObs?.trim() ? nvObs.trim() : null,
    };

    setLoadingVariantes(true);
    try {
      const resp = await fetch("/api/loja/variantes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg = data?.error || data?.message || "Falha ao criar variante.";
        alert(msg);
        return;
      }

      const novaVariante =
        data?.variante ||
        data?.data?.variante ||
        data?.data ||
        (Array.isArray(data?.variantes) ? data.variantes[data.variantes.length - 1] : null);

      if (novaVariante && typeof novaVariante.id !== "undefined") {
        setUltimaVarianteCriada(novaVariante as Variante);
      } else {
        setUltimaVarianteCriada(null);
      }

      setIsNovaVarianteOpen(false);
      setNvCorId("");
      setNvNumeracaoId("");
      setNvTamanhoId("");
      setNvPreco("");
      setNvAtivo(true);
      setNvObs("");

      await carregarVariantes(produtoSelecionado.id);
    } finally {
      setLoadingVariantes(false);
    }
  }

  function abrirEntradaRapida(varianteId: number) {
    setAjVarianteId(String(varianteId));
    setAjOperacao("ENTRADA");
    setAjQuantidade("1");
    setAjObs("");
    setIsAjusteOpen(true);
    setTimeout(() => {
      const el = document.getElementById("aj-quantidade-input") as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 50);
  }

  function abrirEdicaoVariante(v: any) {
    setEditVarianteId(Number(v.id));
    setEvCorId(v.cor_id ? String(v.cor_id) : "");
    setEvNumeracaoId(v.numeracao_id ? String(v.numeracao_id) : "");
    setEvTamanhoId(v.tamanho_id ? String(v.tamanho_id) : "");
    setEvEstoque(String(v.estoque_atual ?? 0));
    setEvPreco(
      typeof v.preco_venda_centavos === "number"
        ? (v.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
        : ""
    );
    setEvAtivo(Boolean(v.ativo));
    setEvObs(v.observacoes ?? "");
    setIsEditVarianteOpen(true);
  }

  async function salvarEdicaoVariante() {
    if (!produtoSelecionado?.id || !editVarianteId) return;

    const estoqueNum = Number((evEstoque ?? "0").trim());
    if (!Number.isFinite(estoqueNum) || estoqueNum < 0) {
      alert("Estoque invalido.");
      return;
    }

    const precoCent = parseMoneyToCentavos(evPreco);

    const payload: any = {
      id: editVarianteId,
      produto_id: produtoSelecionado.id,
      cor_id: evCorId ? Number(evCorId) : null,
      numeracao_id: evNumeracaoId ? Number(evNumeracaoId) : null,
      tamanho_id: evTamanhoId ? Number(evTamanhoId) : null,
      estoque_atual: Math.trunc(estoqueNum),
      preco_venda_centavos: precoCent,
      ativo: evAtivo,
      observacoes: evObs?.trim() ? evObs.trim() : null,
    };

    setLoadingVariantes(true);
    try {
      const resp = await fetch("/api/loja/variantes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        alert(data?.error || data?.message || "Falha ao salvar variante.");
        return;
      }

      setIsEditVarianteOpen(false);
      setEditVarianteId(null);
      await carregarVariantes(produtoSelecionado.id);
    } finally {
      setLoadingVariantes(false);
    }
  }

  async function garantirVariantePadrao(produtoId: number) {
    try {
      await fetch("/api/loja/variantes/padrao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId }),
      });
    } catch (err) {
      console.error("Falha ao garantir variante padrao:", err);
    }
  }

  async function carregarVariantesProdutoCriado(produtoId: number) {
    setLoadingVariantesProdutoCriado(true);
    try {
      const qs = new URLSearchParams();
      qs.set("produto_id", String(produtoId));
      const res = await fetch(`/api/loja/variantes?${qs.toString()}`, { cache: "no-store" });
      const json: ApiResponse<any> = await res.json().catch(() => null);
      const lista = (json?.variantes || json?.items || json?.data || []) as Variante[];
      if (!res.ok || json?.ok === false) {
        setVariantesProdutoCriado([]);
        return;
      }
      setVariantesProdutoCriado(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error("[GestaoEstoque] erro ao carregar variantes do produto criado:", err);
      setVariantesProdutoCriado([]);
    } finally {
      setLoadingVariantesProdutoCriado(false);
    }
  }

  async function executarAjusteManual() {
    if (!produtoSelecionado?.id) return;

    const varianteIdNum = ajVarianteId ? Number(ajVarianteId) : NaN;
    const qtd = Number((ajQuantidade ?? "").trim());

    if (!Number.isFinite(varianteIdNum) || varianteIdNum <= 0) {
      alert("Selecione uma variante.");
      return;
    }
    if (!Number.isFinite(qtd) || qtd <= 0) {
      alert("Quantidade invalida.");
      return;
    }

    setLoadingVariantes(true);
    try {
      const resp = await fetch("/api/loja/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produtoSelecionado.id,
          variante_id: varianteIdNum,
          operacao: ajOperacao,
          quantidade: Math.trunc(qtd),
          observacoes: ajObs?.trim() ? ajObs.trim() : null,
        }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        console.error("Falha ao registrar ajuste manual de variante:", json);
        alert(json?.error || json?.message || "Erro ao registrar ajuste manual.");
        return;
      }

      if (json?.warning) {
        console.warn("Ajuste aplicado, mas movimento pendente:", json.warning);
        // alert("Ajuste aplicado, mas movimento de estoque não foi registrado (pendente).");
      }

      setIsAjusteOpen(false);
      setAjQuantidade("1");
      setAjObs("");

      await carregarVariantes(produtoSelecionado.id);
      await carregarMovimentos(produtoSelecionado.id, histVarianteId ? Number(histVarianteId) : null);
      await carregarProdutos();
    } catch (err) {
      console.error("Erro inesperado ao registrar ajuste manual de variante:", err);
      alert("Erro inesperado ao registrar ajuste manual.");
    } finally {
      setLoadingVariantes(false);
    }
  }

  useEffect(() => {
    carregarProdutos();
    carregarFornecedores();
    carregarCategoriasLoja();
    carregarAtributos();
  }, []);

  const subcatToCatMap = useMemo(() => {
    const map: Record<number, number> = {};
    categoriasLoja.forEach((c) =>
      c.subcategorias.forEach((s) => {
        map[s.id] = c.id;
      })
    );
    return map;
  }, [categoriasLoja]);

  const subcategoriaNomeMap = useMemo(() => {
    const map: Record<number, string> = {};
    categoriasLoja.forEach((c) =>
      c.subcategorias.forEach((s) => {
        map[s.id] = `${c.nome} u ${s.nome}`;
      })
    );
    return map;
  }, [categoriasLoja]);

  useEffect(() => {
    if (editForm.categoria_subcategoria_id && subcatToCatMap[editForm.categoria_subcategoria_id]) {
      setCategoriaSelecionadaId(subcatToCatMap[editForm.categoria_subcategoria_id]);
    } else {
      setCategoriaSelecionadaId("");
    }
  }, [editForm.categoria_subcategoria_id, subcatToCatMap]);

  useEffect(() => {
    if (
      cadastroForm.categoria_subcategoria_id &&
      subcatToCatMap[cadastroForm.categoria_subcategoria_id]
    ) {
      setCategoriaCadastroSelecionadaId(subcatToCatMap[cadastroForm.categoria_subcategoria_id]);
    } else {
      setCategoriaCadastroSelecionadaId("");
    }
  }, [cadastroForm.categoria_subcategoria_id, subcatToCatMap]);

  const produtosFiltrados = useMemo(() => produtos, [produtos]);

  const coresMap = useMemo(() => {
    const map = new Map<number, string>();
    (atributos?.cores || []).forEach((c) => map.set(c.id, c.nome));
    return map;
  }, [atributos?.cores]);

  const numeracoesMap = useMemo(() => {
    const map = new Map<number, string>();
    (atributos?.numeracoes || []).forEach((n) => map.set(n.id, `${n.valor}`));
    return map;
  }, [atributos?.numeracoes]);

  const tamanhosMap = useMemo(() => {
    const map = new Map<number, string>();
    (atributos?.tamanhos || []).forEach((t) => map.set(t.id, t.nome));
    return map;
  }, [atributos?.tamanhos]);

  useEffect(() => {
    if (!produtoSelecionado) {
      setAjVarianteId("");
      return;
    }

    const varianteSelecionadaExiste = variantes.some((v) => String(v.id) === ajVarianteId);
    if (varianteSelecionadaExiste) return;

    if (variantes.length === 1) {
      setAjVarianteId(String(variantes[0].id));
    } else if (variantes.length === 0) {
      setAjVarianteId("");
    }
  }, [variantes, produtoSelecionado, ajVarianteId]);

  function selecionarProduto(p: Produto) {
    resetMensagem();
    setProdutoSelecionado(p);
    setHistVarianteId("");
    setEmEdicao(false);
    setVariantes([]);
    setIsAjusteOpen(false);
    setAjVarianteId("");
    setAjOperacao("ENTRADA");
    setAjQuantidade("1");
    setAjObs("");
    setUltimaVarianteCriada(null);
    setEditForm({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo ?? "",
      categoria: p.categoria ?? "",
      categoria_subcategoria_id: p.categoria_subcategoria_id ?? null,
      unidade: p.unidade ?? "UN",
      ativo: p.ativo,
      precoReais:
        p.preco_venda_centavos > 0
          ? (p.preco_venda_centavos / 100).toFixed(2).replace(".", ",")
          : "",
      precoCustoReais: "",
      fornecedorId: p.fornecedor_principal_id ?? null,
    });
    carregarMovimentos(p.id, null);
    carregarVariantes(p.id);
  }

  function limparSelecao() {
    resetMensagem();
    setProdutoSelecionado(null);
    setEmEdicao(false);
    setMovimentos([]);
    setVariantes([]);
    setIsAjusteOpen(false);
    setAjVarianteId("");
    setAjOperacao("ENTRADA");
    setAjQuantidade("1");
    setAjObs("");
    setUltimaVarianteCriada(null);
    setEditForm({
      id: null,
      nome: "",
      codigo: "",
      categoria: "",
      categoria_subcategoria_id: null,
      unidade: "UN",
      ativo: true,
      precoReais: "",
      precoCustoReais: "",
      fornecedorId: null,
    });
  }

  function handleEditChange<K extends keyof EditFormState>(
    field: K,
    value: EditFormState[K]
  ) {
    resetMensagem();
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCadastroChange<K extends keyof CadastroAdminFormState>(
    field: K,
    value: CadastroAdminFormState[K]
  ) {
    resetMensagem();
    setCadastroForm((prev) => ({ ...prev, [field]: value }));
  }
  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!editForm.id) {
      setMensagemTipo("error");
      setMensagem("Selecione um produto para editar.");
      return;
    }

    let precoVendaCentavos: number | null = null;
    if (editForm.precoReais.trim().length > 0) {
      const clean = editForm.precoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valor = parseFloat(clean);
      if (Number.isNaN(valor) || valor < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de venda invalido.");
        return;
      }
      precoVendaCentavos = Math.round(valor * 100);
    } else {
      precoVendaCentavos = 0;
    }

    let precoCustoCentavos: number | null = null;
    if (editForm.precoCustoReais.trim().length > 0) {
      const cleanCusto = editForm.precoCustoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valorCusto = parseFloat(cleanCusto);
      if (Number.isNaN(valorCusto) || valorCusto < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de custo invalido.");
        return;
      }
      precoCustoCentavos = Math.round(valorCusto * 100);
    }

    setSavingEdicao(true);

    try {
      const payload: any = {
        id: editForm.id,
        nome: editForm.nome.trim(),
        codigo: editForm.codigo.trim() || null,
        // Campo legado: nao usamos mais categoria texto para logica.
        categoria: null,
        // Campo oficial: subcategoria vinculada a tabela loja_produto_categoria_subcategoria
        categoria_subcategoria_id: editForm.categoria_subcategoria_id ?? null,
        unidade: editForm.unidade.trim() || "UN",
        ativo: editForm.ativo,
        preco_venda_centavos: precoVendaCentavos,
        fornecedor_principal_id: editForm.fornecedorId,
      };

      const res = await fetch("/api/loja/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Produto> = await res.json();

      if (!res.ok || !json.ok || !json.data) {
        setMensagemTipo("error");
        setMensagem(json.error || "Erro ao salvar produto.");
        return;
      }

      const produtoAtualizado = json.data;

      setProdutos((prev) => {
        const idx = prev.findIndex((p) => p.id === produtoAtualizado.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = produtoAtualizado;
          return clone;
        }
        return prev;
      });

      selecionarProduto(produtoAtualizado);

      // ============================================================
      // Registro de preco de custo por edicao
      // ------------------------------------------------------------
      // ATENCAO:
      // A rota /api/loja/produtos/custo ainda nao esta implementada
      // nesta versao da Loja v0. O registro de custo e feito apenas
      // pelo fluxo de entrada de estoque (/api/loja/estoque/entrada).
      //
      // Quando a API de custo estiver pronta, este bloco podera ser
      // reativado para registrar historicamente o novo preco de custo.
      //
      // if (precoCustoCentavos !== null) {
      //   const resCusto = await fetch("/api/loja/produtos/custo", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       produto_id: produtoAtualizado.id,
      //       preco_custo_centavos: precoCustoCentavos,
      //     }),
      //   });
      //
      //   const jsonCusto: ApiResponse = await resCusto.json();
      //   if (!resCusto.ok || !jsonCusto.ok) {
      //     console.error(
      //       "[GestaoEstoque] Falha ao registrar preco de custo:",
      //       jsonCusto.error
      //     );
      //   }
      // }

      setMensagemTipo("success");
      setMensagem("Produto atualizado com sucesso.");
    } catch (err) {
      console.error("[GestaoEstoque] Erro inesperado ao salvar produto:", err);
      setMensagemTipo("error");
      setMensagem("Ocorreu um erro ao salvar o produto. Verifique o console e tente novamente.");
    } finally {
      setSavingEdicao(false);
    }
  }

  async function salvarCadastroAdmin(e: React.FormEvent) {
    e.preventDefault();
    resetMensagem();

    if (!cadastroForm.nome.trim()) {
      setMensagemTipo("error");
      setMensagem("Informe o nome do produto.");
      return;
    }

    if (!cadastroForm.quantidade || cadastroForm.quantidade <= 0) {
      setMensagemTipo("error");
      setMensagem("Informe uma quantidade maior que zero.");
      return;
    }

    let precoCustoCentavos: number | null = null;
    if (cadastroForm.precoCustoReais.trim().length > 0) {
      const clean = cadastroForm.precoCustoReais
        .replace(/[^\d,.,]/g, "")
        .replace(".", "")
        .replace(",", ".");
      const valor = parseFloat(clean);
      if (Number.isNaN(valor) || valor < 0) {
        setMensagemTipo("error");
        setMensagem("Preco de custo invalido.");
        return;
      }
      precoCustoCentavos = Math.round(valor * 100);
    }

    if (!cadastroForm.precoVendaReais.trim()) {
      setMensagemTipo("error");
      setMensagem("Informe o preco de venda.");
      return;
    }
    const cleanVenda = cadastroForm.precoVendaReais
      .replace(/[^\d,.,]/g, "")
      .replace(".", "")
      .replace(",", ".");
    const valorVenda = parseFloat(cleanVenda);
    if (Number.isNaN(valorVenda) || valorVenda < 0) {
      setMensagemTipo("error");
      setMensagem("Preco de venda invalido.");
      return;
    }
    const precoVendaCentavos = Math.round(valorVenda * 100);

    setSavingCadastro(true);

    try {
      const payloadEntrada: any = {
        nome: cadastroForm.nome.trim(),
        quantidade: Number(cadastroForm.quantidade),
        unidade: cadastroForm.unidade.trim() || "UN",
        codigo: cadastroForm.codigo.trim() || undefined,
        categoria: undefined,
        categoria_subcategoria_id: cadastroForm.categoria_subcategoria_id ?? undefined,
        fornecedor_id:
          cadastroForm.fornecedor_id === ""
            ? undefined
            : Number(cadastroForm.fornecedor_id),
        observacoes_produto:
          cadastroForm.observacoesProduto.trim() || undefined,
        observacoes_entrada:
          cadastroForm.observacoesEntrada.trim() || undefined,
      };

      if (precoCustoCentavos !== null) {
        payloadEntrada.preco_custo_centavos = precoCustoCentavos;
      }

      const resEntrada = await fetch("/api/loja/estoque/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadEntrada),
      });
      const jsonEntrada: ApiResponse<any> = await resEntrada.json();

      if (!resEntrada.ok || !jsonEntrada.ok || !jsonEntrada.data?.produto) {
        setMensagemTipo("error");
        setMensagem(
          jsonEntrada.error ||
            "Erro ao criar produto/estoque na entrada administrativa."
        );
        return;
      }

      const produtoCriado: Produto = jsonEntrada.data.produto;

      const payloadPreco = {
        id: produtoCriado.id,
        preco_venda_centavos: precoVendaCentavos,
      };

      const resPreco = await fetch("/api/loja/produtos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPreco),
      });

      const jsonPreco: ApiResponse<Produto> = await resPreco.json();

      if (!resPreco.ok || !jsonPreco.ok || !jsonPreco.data) {
        setMensagemTipo("error");
        setMensagem(
          jsonPreco.error ||
            "Produto criado, mas houve erro ao definir o preco de venda."
        );
        setProdutos((prev) => [produtoCriado, ...prev]);
        return;
      }

      const produtoFinal = jsonPreco.data;

      setProdutos((prev) => [produtoFinal, ...prev]);
      setUltimoProdutoCriado(produtoFinal);
      await garantirVariantePadrao(produtoFinal.id);
      await carregarVariantesProdutoCriado(produtoFinal.id);

      setCadastroForm({
        nome: "",
        codigo: "",
        categoria: "",
        categoria_subcategoria_id: null,
        unidade: "UN",
        fornecedor_id: "",
        quantidade: "",
        precoCustoReais: "",
        precoVendaReais: "",
        observacoesProduto: "",
        observacoesEntrada: "",
      });

      setMensagemTipo("success");
      setMensagem("Produto criado com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao cadastrar produto:", err);
      setMensagemTipo("error");
      setMensagem("Erro inesperado ao cadastrar produto.");
    } finally {
      setSavingCadastro(false);
    }
  }

  const fornecedoresOrdenados = useMemo(() => {
    return [...fornecedores].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
  }, [fornecedores]);
  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-6 shadow-sm backdrop-blur space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Administracao do Sistema - Loja
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Gestao de Estoque (Admin)
              </h1>
              <p className="max-w-3xl text-[15px] text-slate-600">
                Revise produtos, defina precos e visualize as variantes do produto (Loja v1). Fase 1: apenas visualizacao/garantia de variante padrao.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-violet-100 bg-violet-50 p-1 text-sm font-medium text-violet-700 shadow-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Estruturado por atributos
              </span>
            </div>
          </header>

          <div className="inline-flex rounded-full border border-violet-100 bg-white/90 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                resetMensagem();
                setAba("REVISAR");
              }}
              className={
                "px-4 py-1.5 text-xs font-medium rounded-full transition " +
                (aba === "REVISAR"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-violet-50")
              }
            >
              Revisar produtos
            </button>
            <button
              type="button"
              onClick={() => {
                resetMensagem();
                setAba("CADASTRO");
              }}
              className={
                "px-4 py-1.5 text-xs font-medium rounded-full transition " +
                (aba === "CADASTRO"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-700 hover:bg-violet-50")
              }
            >
              Cadastro completo (Admin)
            </button>
          </div>

          {mensagem && (
            <div
              className={
                "text-sm border rounded-md px-3 py-2 " +
                (mensagemTipo === "success"
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-red-50 border-red-300 text-red-800")
              }
            >
              {mensagem}
            </div>
          )}

      {aba === "REVISAR" && (
        <>
          <section className="rounded-3xl border border-violet-100 bg-white/95 p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-medium mb-1">
                  Buscar por nome ou codigo
                </label>
                <input
                  type="text"
                  value={filtros.search}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                  placeholder="Nome ou codigo..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="apenasAtivos"
                  type="checkbox"
                  checked={filtros.apenasAtivos}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      apenasAtivos: e.target.checked,
                    }))
                  }
                  className="rounded border-slate-300"
                />
                <label
                  htmlFor="apenasAtivos"
                  className="text-xs font-medium text-slate-700"
                >
                  Apenas ativos
                </label>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-slate-700">
                  Filtro de preco:
                </span>
                <select
                  value={filtros.modoPreco}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      modoPreco: e.target.value as FiltrosState["modoPreco"],
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                >
                  <option value="TODOS">Todos</option>
                  <option value="AGUARDANDO_PRECO">Aguardando preco</option>
                  <option value="COM_PRECO">Com preco definido</option>
                </select>
              </div>

              <button
                type="button"
                onClick={carregarProdutos}
                disabled={loadingProdutos}
                className="inline-flex items-center justify-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
              >
                {loadingProdutos ? "Atualizando..." : "Atualizar lista"}
              </button>

              <a
                href="/admin/loja/cadastros"
                className="inline-flex items-center justify-center rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-medium text-violet-700 shadow-sm hover:bg-violet-100"
              >
                 Atributos do Produto
              </a>
            </div>

            <div className="text-xs text-slate-500">
              {produtosFiltrados.length} produto(s)
              {loadingAtributos && <span className="ml-2">carregando atributos...</span>}
            </div>
          </section>

          <section className="rounded-3xl border border-violet-100 bg-white/95 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Produtos</h2>
              <span className="text-xs text-slate-500">
                Clique em um produto para ver as variantes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Codigo</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-right">Estoque</th>
                    <th className="px-3 py-2 text-right">Preco venda</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-4 text-center text-xs text-gray-500"
                      >
                        Nenhum produto encontrado.
                      </td>
                    </tr>
                  )}

                  {produtosFiltrados.map((p) => {
                    const selecionado = editForm.id === p.id;
                    const aguardandoPreco = p.preco_venda_centavos === 0;

                    return (
                      <tr
                        key={p.id}
                        className={
                          "cursor-pointer " +
                          (selecionado ? "bg-violet-50/60" : "hover:bg-slate-50")
                        }
                        onClick={() => selecionarProduto(p)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              {p.nome}
                            </span>
                            {aguardandoPreco && (
                              <span className="text-[11px] text-amber-600">
                                Aguardando definicao de preco
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.codigo || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {(subcategoriaNomeMap[p.categoria_subcategoria_id ?? -1] ?? p.categoria) || "-"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {p.estoque_atual}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {p.preco_venda_centavos > 0
                            ? "R$ " +
                              (p.preco_venda_centavos / 100)
                                .toFixed(2)
                                .replace(".", ",")
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={
                              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium " +
                              (p.ativo
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200")
                            }
                          >
                            {p.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm space-y-4">
            <div>
              {produtoSelecionado ? (
                <div className="space-y-4">
                  <div className="border rounded-2xl p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h2 className="text-sm font-semibold">
                            {emEdicao ? "Editar produto" : "Detalhes do produto"}
                          </h2>
                        <p className="text-xs text-gray-500">
                          ID #{produtoSelecionado.id}
                          {produtoSelecionado.codigo ? ` - Codigo: ${produtoSelecionado.codigo}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setIsNovaVarianteOpen(true)}
                          disabled={!produtoSelecionado?.id}
                          className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
                        >
                          Criar variante
                        </button>
                        <button
                          type="button"
                          onClick={criarVariantePadrao}
                          disabled={criandoPadrao || !produtoSelecionado?.id}
                          className="px-3 py-1.5 text-xs rounded-full bg-violet-600 text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
                        >
                          {criandoPadrao ? "Criando..." : "Criar variante padrao"}
                        </button>
                        <button
                          type="button"
                          onClick={() => produtoSelecionado?.id && carregarVariantes(produtoSelecionado.id)}
                          disabled={!produtoSelecionado?.id}
                          className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
                        >
                          Recarregar variantes
                        </button>
                        {produtoSelecionado && (
                          <button
                            type="button"
                            onClick={() => setIsAjusteOpen(true)}
                            className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                          >
                            Ajuste manual
                          </button>
                        )}
                        {!emEdicao && (
                          <button
                            type="button"
                            onClick={() => setEmEdicao(true)}
                            className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                            disabled={!editForm.id}
                          >
                            Editar produto
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-violet-100 bg-white/95 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h4 className="text-sm font-semibold text-slate-800">Variantes</h4>
                        <span className="text-xs text-slate-500">{variantes.length} variante(s)</span>
                      </div>

                      {ultimaVarianteCriada &&
                        produtoSelecionado &&
                        ultimaVarianteCriada.produto_id === produtoSelecionado.id && (
                          <div className="mx-5 my-3 flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="font-semibold">Variante criada</div>
                              <div className="text-xs text-emerald-700">
                                SKU {ultimaVarianteCriada.sku || `#${ultimaVarianteCriada.id}`}{" "}
                                {[
                                  ultimaVarianteCriada.cor_id
                                    ? coresMap.get(ultimaVarianteCriada.cor_id) || `#${ultimaVarianteCriada.cor_id}`
                                    : null,
                                  ultimaVarianteCriada.numeracao_id
                                    ? numeracoesMap.get(ultimaVarianteCriada.numeracao_id) ||
                                      `#${ultimaVarianteCriada.numeracao_id}`
                                    : null,
                                  ultimaVarianteCriada.tamanho_id
                                    ? tamanhosMap.get(ultimaVarianteCriada.tamanho_id) ||
                                      `#${ultimaVarianteCriada.tamanho_id}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                                onClick={() => abrirEntradaRapida(Number(ultimaVarianteCriada.id))}
                              >
                                Entrada rapida
                              </button>
                              <a
                                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                href={
                                  produtoSelecionado
                                    ? `/admin/loja/compras?produto_id=${produtoSelecionado.id}&variante_id=${ultimaVarianteCriada.id}`
                                    : "#"
                                }
                              >
                                Ir para compras
                              </a>
                              <button
                                type="button"
                                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setUltimaVarianteCriada(null)}
                              >
                                Dispensar
                              </button>
                            </div>
                          </div>
                        )}

                      {isNovaVarianteOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold">Nova variante</h3>
                              <button
                                className="px-2 py-1 rounded-md border text-sm"
                                onClick={() => setIsNovaVarianteOpen(false)}
                                type="button"
                              >
                                Fechar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <label className="text-sm">
                                Cor
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={nvCorId}
                                  onChange={(e) => setNvCorId(e.target.value)}
                                >
                                  <option value="">(Sem cor)</option>
                                  {(atributos?.cores ?? []).map((c: any) => (
                                    <option key={`cor-${c.id}`} value={String(c.id)}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm">
                                Numeracao
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={nvNumeracaoId}
                                  onChange={(e) => setNvNumeracaoId(e.target.value)}
                                >
                                  <option value="">(Sem numeracao)</option>
                                  {(atributos?.numeracoes ?? []).map((n: any) => (
                                    <option key={`num-${n.id}`} value={String(n.id)}>
                                      {n.valor}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm">
                                Tamanho
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={nvTamanhoId}
                                  onChange={(e) => setNvTamanhoId(e.target.value)}
                                >
                                  <option value="">(Sem tamanho)</option>
                                  {(atributos?.tamanhos ?? []).map((t: any) => (
                                    <option key={`tam-${t.id}`} value={String(t.id)}>
                                      {t.nome}
                                    </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm">
                            Preco (R$)
                            <input
                              className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={nvPreco}
                                  onChange={(e) => setNvPreco(e.target.value)}
                                  placeholder="(vazio = herdar do produto)"
                                />
                              </label>

                              <label className="text-sm flex items-center gap-2 mt-6">
                                <input
                                  type="checkbox"
                                  checked={nvAtivo}
                                  onChange={(e) => setNvAtivo(e.target.checked)}
                                />
                                Ativo
                              </label>
                            </div>

                            <label className="text-sm block mt-3">
                              Observacoes
                              <textarea
                                className="mt-1 w-full rounded-md border px-2 py-2"
                                rows={3}
                                value={nvObs}
                                onChange={(e) => setNvObs(e.target.value)}
                                placeholder="Ex.: Lote especifico, detalhe do produto, etc."
                              />
                            </label>

                            <div className="flex justify-end gap-2 mt-4">
                              <button
                                className="px-3 py-2 rounded-md border text-sm"
                                onClick={() => setIsNovaVarianteOpen(false)}
                                type="button"
                              >
                                Cancelar
                              </button>
                              <button
                                className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm disabled:opacity-50"
                                disabled={!produtoSelecionado?.id}
                                onClick={criarVarianteSelecionada}
                                type="button"
                              >
                                Criar variante
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isEditVarianteOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold">Editar variante</h3>
                              <button
                                className="px-2 py-1 rounded-md border text-sm"
                                onClick={() => setIsEditVarianteOpen(false)}
                                type="button"
                              >
                                Fechar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <label className="text-sm">
                                Cor
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={evCorId}
                                  onChange={(e) => setEvCorId(e.target.value)}
                                >
                                  <option value="">(Sem cor)</option>
                                  {(atributos?.cores ?? []).map((c: any) => (
                                    <option key={`cor-${c.id}`} value={String(c.id)}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm">
                                Numeracao
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={evNumeracaoId}
                                  onChange={(e) => setEvNumeracaoId(e.target.value)}
                                >
                                  <option value="">(Sem numeracao)</option>
                                  {(atributos?.numeracoes ?? []).map((n: any) => (
                                    <option key={`num-${n.id}`} value={String(n.id)}>
                                      {n.valor}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm">
                                Tamanho
                                <select
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={evTamanhoId}
                                  onChange={(e) => setEvTamanhoId(e.target.value)}
                                >
                                  <option value="">(Sem tamanho)</option>
                                  {(atributos?.tamanhos ?? []).map((t: any) => (
                                    <option key={`tam-${t.id}`} value={String(t.id)}>
                                      {t.nome}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="text-sm">
                                Estoque
                                <input
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={evEstoque}
                                  onChange={(e) => setEvEstoque(e.target.value)}
                                  inputMode="numeric"
                                  placeholder="0"
                                />
                              </label>

                              <label className="text-sm">
                                Preco (R$)
                                <input
                                  className="mt-1 w-full rounded-md border px-2 py-2"
                                  value={evPreco}
                                  onChange={(e) => setEvPreco(e.target.value)}
                                  placeholder="(vazio = herdar do produto)"
                                />
                              </label>

                              <label className="text-sm flex items-center gap-2 mt-6">
                                <input
                                  type="checkbox"
                                  checked={evAtivo}
                                  onChange={(e) => setEvAtivo(e.target.checked)}
                                />
                                Ativo
                              </label>
                            </div>

                            <label className="text-sm block mt-3">
                              Observacoes
                              <textarea
                                className="mt-1 w-full rounded-md border px-2 py-2"
                                rows={3}
                                value={evObs}
                                onChange={(e) => setEvObs(e.target.value)}
                                placeholder="Ex.: Lote especifico, detalhe do produto, etc."
                              />
                            </label>

                            <div className="flex justify-end gap-2 mt-4">
                              <button
                                className="px-3 py-2 rounded-md border text-sm"
                                onClick={() => setIsEditVarianteOpen(false)}
                                type="button"
                              >
                                Cancelar
                              </button>
                              <button
                                className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm disabled:opacity-50"
                                disabled={!produtoSelecionado?.id}
                                onClick={salvarEdicaoVariante}
                                type="button"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {erroVariantes && (
                        <div className="px-5 py-3 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">
                          {erroVariantes}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr className="text-left">
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cor</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Numeracao</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tamanho</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Estoque</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Preco</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ativo</th>
                              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingVariantes && (
                              <tr>
                                <td colSpan={8} className="px-5 py-6 text-slate-500">
                                  Carregando variantes...
                                </td>
                              </tr>
                            )}

                            {!loadingVariantes && variantes.length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-5 py-8 text-slate-500">
                                  Nenhuma variante encontrada. Clique em "Criar variante padrao".
                                </td>
                              </tr>
                            )}

                            {!loadingVariantes &&
                              variantes.map((v) => (
                                <tr key={v.id} className="border-t border-slate-100">
                                  <td className="px-5 py-3 font-medium text-slate-900">{v.sku}</td>
                                  <td className="px-5 py-3 text-slate-700">{v.cor_id ? coresMap.get(v.cor_id) || `#${v.cor_id}` : "-"}</td>
                                  <td className="px-5 py-3 text-slate-700">{v.numeracao_id ? numeracoesMap.get(v.numeracao_id) || `#${v.numeracao_id}` : "-"}</td>
                                  <td className="px-5 py-3 text-slate-700">{v.tamanho_id ? tamanhosMap.get(v.tamanho_id) || `#${v.tamanho_id}` : "-"}</td>
                                  <td className="px-5 py-3 text-right text-slate-700">{v.estoque_atual}</td>
                                  <td className="px-5 py-3 text-right text-slate-700">
                                    {formatarReaisDeCentavos(
                                      v.preco_venda_centavos ?? produtoSelecionado.preco_venda_centavos
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span
                                      className={
                                        "inline-flex rounded-full px-3 py-1 text-xs font-medium border " +
                                        (v.ativo
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-slate-50 text-slate-600 border-slate-200")
                                      }
                                    >
                                      {v.ativo ? "Ativa" : "Inativa"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                                        onClick={() => abrirEntradaRapida(v.id)}
                                      >
                                        Entrada
                                      </button>
                                      <a
                                        className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                                        href={
                                          produtoSelecionado
                                            ? `/admin/loja/compras?produto_id=${produtoSelecionado.id}&variante_id=${v.id}`
                                            : "#"
                                        }
                                      >
                                        Comprar
                                      </a>
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                                        onClick={() => abrirEdicaoVariante(v)}
                                      >
                                        Editar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="font-medium text-gray-600">Nome</div>
                        <div className="text-gray-900">{produtoSelecionado.nome}</div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Categoria</div>
                        <div className="text-gray-900">
                          {(subcategoriaNomeMap[produtoSelecionado.categoria_subcategoria_id ?? -1] ?? produtoSelecionado.categoria) || "u"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Unidade</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.unidade || "u"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Estoque atual</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.estoque_atual}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Status</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.ativo ? "Ativo" : "Inativo"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Preco de venda</div>
                        <div className="text-gray-900">
                          {formatarReaisDeCentavos(
                            produtoSelecionado.preco_venda_centavos
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Fornecedor</div>
                        <div className="text-gray-900">
                          {produtoSelecionado.fornecedor_nome || "u"}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">Data de cadastro</div>
                        <div className="text-gray-900">
                          {formatarData(produtoSelecionado.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="font-medium text-gray-600">
                          Ultima atualizacao
                        </div>
                        <div className="text-gray-900">
                          {formatarData(produtoSelecionado.updated_at)}
                        </div>
                      </div>
                    </div>

                    {produtoSelecionado.observacoes && (
                      <div className="mt-3">
                        <div className="font-medium text-gray-600 text-xs">
                          Observacoes
                        </div>
                        <p className="text-xs text-gray-900 whitespace-pre-line">
                          {produtoSelecionado.observacoes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Historico de estoque</h3>
                      {loadingMovimentos && (
                        <span className="text-[11px] text-gray-500">Carregando...</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-xs text-slate-600">Variante:</label>
                      <select
                        className="border rounded-md px-2 py-1 text-xs bg-white"
                        value={histVarianteId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setHistVarianteId(v);
                          if (!produtoSelecionado?.id) return;
                          const idNum = v ? Number(v) : null;
                          carregarMovimentos(produtoSelecionado.id, idNum);
                        }}
                      >
                        <option value="">Todas (produto)</option>
                        {variantes.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.sku}
                          </option>
                        ))}
                      </select>
                    </div>

                    {movimentos.length === 0 ? (
                      <p className="text-xs text-gray-500">Nenhum movimento encontrado.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="px-3 py-2 text-left">Data</th>
                              <th className="px-3 py-2 text-left">Tipo</th>
                              <th className="px-3 py-2 text-left">Origem</th>
                              <th className="px-3 py-2 text-left">Variante</th>
                              <th className="px-3 py-2 text-right">Quantidade</th>
                              <th className="px-3 py-2 text-right">Saldo antes</th>
                              <th className="px-3 py-2 text-right">Saldo depois</th>
                              <th className="px-3 py-2 text-left">Referencia</th>
                              <th className="px-3 py-2 text-left">Obs.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {movimentos.map((mov) => (
                              <tr key={mov.id} className="border-t">
                                <td className="px-3 py-2">{formatarData(mov.created_at)}</td>
                                <td className="px-3 py-2">{mov.tipo}</td>
                                <td className="px-3 py-2">{mov.origem}</td>
                                <td className="px-3 py-2">{mov.variante_id ?? "-"}</td>
                                <td className="px-3 py-2 text-right">{mov.quantidade}</td>
                                <td className="px-3 py-2 text-right">{mov.saldo_antes ?? "-"}</td>
                                <td className="px-3 py-2 text-right">{mov.saldo_depois ?? "-"}</td>
                                <td className="px-3 py-2">{mov.referencia_id ?? "-"}</td>
                                <td className="px-3 py-2">
                                  {mov.observacao ? (
                                    <span className="text-gray-700">{mov.observacao}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {emEdicao && (
                    <form onSubmit={salvarEdicao} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Nome do produto
                            </label>
                            <input
                              type="text"
                              value={editForm.nome}
                              onChange={(e) =>
                                setEditForm((prev) => ({ ...prev, nome: e.target.value }))
                              }
                              className="w-full border rounded-md px-3 py-2 text-sm"
                              placeholder="Ex.: Sapatilha de meia ponta"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">
                                Codigo interno
                              </label>
                              <input
                                type="text"
                                value={editForm.codigo}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    codigo: e.target.value,
                                  }))
                                }
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                placeholder="Opcional"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium mb-1">
                                Unidade
                              </label>
                              <input
                                type="text"
                                value={editForm.unidade}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    unidade: e.target.value,
                                  }))
                                }
                                className="w-full border rounded-md px-3 py-2 text-sm"
                                placeholder="Ex.: UN, PAR"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            {erroCategoriasLoja && (
                              <p className="text-[11px] text-red-600">{erroCategoriasLoja}</p>
                            )}
                            {!erroCategoriasLoja && categoriasLoja.length === 0 && (
                              <p className="text-[11px] text-gray-500">
                                Nenhuma categoria cadastrada. Configure em{" "}
                                <a
                                  href="/admin/loja/categorias"
                                  className="underline"
                                >
                                  Administracao da Loja - Categorias
                                </a>
                                .
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">Categoria</label>
                                <select
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  value={categoriaSelecionadaId ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : "";
                                    setCategoriaSelecionadaId(value as any);
                                    setEditForm((prev) => ({
                                      ...prev,
                                      categoria_subcategoria_id: null,
                                    }));
                                  }}
                                  disabled={categoriasLoja.length === 0}
                                >
                                  <option value="">Selecione uma categoria</option>
                                  {categoriasLoja.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.nome}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">Subcategoria</label>
                                <select
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  value={editForm.categoria_subcategoria_id ?? ""}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      categoria_subcategoria_id: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    }))
                                  }
                                  disabled={!categoriaSelecionadaId || categoriasLoja.length === 0}
                                >
                                  <option value="">Selecione subcategoria</option>
                                  {categoriasLoja
                                    .find((cat) => cat.id === categoriaSelecionadaId)
                                    ?.subcategorias.map((sub) => (
                                      <option key={sub.id} value={sub.id}>
                                        {sub.nome}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">
                              Fornecedor principal
                            </label>
                            <select
                              value={editForm.fornecedorId ?? ""}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  fornecedorId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                          className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                              disabled={carregandoFornecedores}
                            >
                              <option value="">(Sem fornecedor definido)</option>
                              {fornecedoresOrdenados.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.nome}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Este fornecedor e usado como referencia principal para o produto.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input
                              id="editar-ativo"
                              type="checkbox"
                              checked={editForm.ativo}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  ativo: e.target.checked,
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor="editar-ativo"
                              className="text-xs font-medium select-none"
                            >
                              Produto ativo
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="border rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold uppercase tracking-wide">
                                Precos & Liberacao
                              </h3>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                Admin
                              </span>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Preco de venda (R$)
                                </label>
                                <input
                                  type="text"
                                  value={editForm.precoReais}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      precoReais: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  placeholder="Ex.: 120,00"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1">
                                  Preco de custo (R$) u apenas administrador
                                </label>
                                <input
                                  type="text"
                                  value={editForm.precoCustoReais}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      precoCustoReais: e.target.value,
                                    }))
                                  }
                                  className="w-full border rounded-md px-3 py-2 text-sm"
                                  placeholder="Opcional. Ex.: 80,00"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Este valor e administrativo. Ele registra um historico de custo e nao aparece para a equipe da Loja.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEmEdicao(false);
                            if (produtoSelecionado) {
                              selecionarProduto(produtoSelecionado);
                            }
                          }}
                          className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                          disabled={savingEdicao}
                        >
                          Cancelar edicao
                        </button>

                        <button
                          type="button"
                          onClick={limparSelecao}
                          className="px-3 py-1.5 text-xs border rounded-md hover:bg-gray-50"
                          disabled={savingEdicao}
                        >
                          Limpar selecao
                        </button>

                        <button
                          type="submit"
                          className="px-3 py-1.5 text-xs rounded-md border bg-white hover:bg-gray-50"
                          disabled={savingEdicao || !editForm.id}
                        >
                          Salvar alteracoes
                        </button>

                        <button
                          type="submit"
                          onClick={() =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    ativo: true,
                                  }
                                : prev
                            )
                          }
                          className="px-3 py-1.5 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          disabled={savingEdicao || !editForm.id}
                        >
                          Liberar produto
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Selecione um produto na lista para ver os detalhes.
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {aba === "CADASTRO" && (
        <section className="bg-white border rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-semibold">
            Cadastro completo de produto (Admin)
          </h2>
          <p className="text-xs text-gray-500">
            Use esta aba quando voce quiser cadastrar um produto completo,
            definindo fornecedor, estoque inicial, preco de custo e preco de
            venda de uma vez so. Esta acao e exclusiva do administrador.
          </p>

          <form className="space-y-4" onSubmit={salvarCadastroAdmin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Nome do produto *
                </label>
                <input
                  type="text"
                  value={cadastroForm.nome}
                  onChange={(e) =>
                    handleCadastroChange("nome", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: Sapatilha meia ponta infantil"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Codigo interno
                </label>
                <input
                  type="text"
                  value={cadastroForm.codigo}
                  onChange={(e) =>
                    handleCadastroChange("codigo", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: SAP-MP-INF-001"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Categoria
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={categoriaCadastroSelecionadaId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : "";
                    setCategoriaCadastroSelecionadaId(value as any);
                    handleCadastroChange("categoria_subcategoria_id", null);
                  }}
                  disabled={categoriasLoja.length === 0}
                >
                  <option value="">Selecione uma categoria</option>
                  {categoriasLoja.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Subcategoria</label>
                <select
                  value={cadastroForm.categoria_subcategoria_id ?? ""}
                  onChange={(e) =>
                    handleCadastroChange(
                      "categoria_subcategoria_id",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={!categoriaCadastroSelecionadaId || categoriasLoja.length === 0}
                >
                  <option value="">Selecione subcategoria</option>
                  {categoriasLoja
                    .find((cat) => cat.id === categoriaCadastroSelecionadaId)
                    ?.subcategorias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Selecione a subcategoria da loja para vincular o produto.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Unidade
                </label>
                <input
                  type="text"
                  value={cadastroForm.unidade}
                  onChange={(e) =>
                    handleCadastroChange("unidade", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="UN, PAR, KIT..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Fornecedor
                </label>
                <select
                  value={
                    cadastroForm.fornecedor_id === ""
                      ? ""
                      : String(cadastroForm.fornecedor_id)
                  }
                  onChange={(e) =>
                    handleCadastroChange(
                      "fornecedor_id",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  disabled={carregandoFornecedores}
                >
                  <option value="">
                    {carregandoFornecedores
                      ? "Carregando fornecedores..."
                      : "Opcional - selecione um fornecedor"}
                  </option>
                  {fornecedoresOrdenados.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Quantidade inicial *
                </label>
                <input
                  type="number"
                  min={1}
                  value={cadastroForm.quantidade}
                  onChange={(e) =>
                    handleCadastroChange(
                      "quantidade",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Preco de custo (R$)
                </label>
                <input
                  type="text"
                  value={cadastroForm.precoCustoReais}
                  onChange={(e) =>
                    handleCadastroChange("precoCustoReais", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: 50,00"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Opcional. Se informado junto com o fornecedor, alimenta o seu
                  historico de preco de custo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Preco de venda (R$) *
                </label>
                <input
                  type="text"
                  value={cadastroForm.precoVendaReais}
                  onChange={(e) =>
                    handleCadastroChange("precoVendaReais", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Ex.: 79,90"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Este e o preco final que aparecera no caixa.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Observacoes do produto
                </label>
                <textarea
                  value={cadastroForm.observacoesProduto}
                  onChange={(e) =>
                    handleCadastroChange("observacoesProduto", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Numeracao disponivel, cores, colecao, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1">
                  Observacoes da entrada
                </label>
                <textarea
                  value={cadastroForm.observacoesEntrada}
                  onChange={(e) =>
                    handleCadastroChange("observacoesEntrada", e.target.value)
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Ex.: Lote de teste, colecao, numeracoes..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingCadastro}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingCadastro ? "Cadastrando..." : "Cadastrar produto"}
              </button>
            </div>
          </form>

          {ultimoProdutoCriado && (
            <div className="mt-6 rounded-3xl border border-violet-100 bg-white/95 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Variantes do produto criado
                  </h3>
                  <p className="text-xs text-slate-600">
                    Produto #{ultimoProdutoCriado.id} - {ultimoProdutoCriado.nome}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/admin/loja/cadastros"
                    className="text-xs font-medium text-violet-700 underline"
                  >
                    Cadastros
                  </a>
                  <button
                    type="button"
                    onClick={() => carregarVariantesProdutoCriado(ultimoProdutoCriado.id)}
                    className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white hover:bg-slate-50"
                  >
                    Recarregar variantes
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SKU</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cor</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Numeracao</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tamanho</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Estoque</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 text-right">Preco</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingVariantesProdutoCriado && (
                      <tr>
                        <td colSpan={7} className="px-5 py-6 text-slate-500">
                          Carregando variantes...
                        </td>
                      </tr>
                    )}

                    {!loadingVariantesProdutoCriado && variantesProdutoCriado.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-slate-500">
                          Nenhuma variante encontrada. A variante padrao e criada automaticamente.
                        </td>
                      </tr>
                    )}

                    {!loadingVariantesProdutoCriado &&
                      variantesProdutoCriado.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-medium text-slate-900">{v.sku}</td>
                          <td className="px-5 py-3 text-slate-700">{v.cor_id ? coresMap.get(v.cor_id) || `#${v.cor_id}` : "-"}</td>
                          <td className="px-5 py-3 text-slate-700">{v.numeracao_id ? numeracoesMap.get(v.numeracao_id) || `#${v.numeracao_id}` : "-"}</td>
                          <td className="px-5 py-3 text-slate-700">{v.tamanho_id ? tamanhosMap.get(v.tamanho_id) || `#${v.tamanho_id}` : "-"}</td>
                          <td className="px-5 py-3 text-right text-slate-700">{v.estoque_atual}</td>
                          <td className="px-5 py-3 text-right text-slate-700">
                            {formatarReaisDeCentavos(
                              v.preco_venda_centavos ?? ultimoProdutoCriado.preco_venda_centavos
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-medium border " +
                                (v.ativo
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200")
                              }
                            >
                              {v.ativo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
        </div>
      </div>

    {isAjusteOpen && produtoSelecionado && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold">Ajuste manual de estoque (variante)</h3>
              <p className="text-xs text-gray-600">
                Produto #{produtoSelecionado.id} - {produtoSelecionado.nome}
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setIsAjusteOpen(false)}
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              Variante
              <select
                className="mt-1 w-full rounded-md border px-2 py-2"
                value={ajVarianteId}
                onChange={(e) => setAjVarianteId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {variantes.map((v) => {
                  const labelParts = [
                    v.sku ? String(v.sku) : `#${v.id}`,
                    v.cor_id ? coresMap.get(v.cor_id) : null,
                    v.numeracao_id ? numeracoesMap.get(v.numeracao_id) : null,
                    v.tamanho_id ? tamanhosMap.get(v.tamanho_id) : null,
                  ].filter(Boolean);

                  return (
                    <option key={`var-${v.id}`} value={String(v.id)}>
                      {labelParts.join(" — ") || `Variante #${v.id}`}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="text-sm">
              Operacao
              <select
                className="mt-1 w-full rounded-md border px-2 py-2"
                value={ajOperacao}
                onChange={(e) => setAjOperacao(e.target.value as "ENTRADA" | "SAIDA")}
              >
                <option value="ENTRADA">Entrada (somar)</option>
                <option value="SAIDA">Saida (subtrair)</option>
              </select>
            </label>

            <label className="text-sm">
              Quantidade
              <input
                id="aj-quantidade-input"
                className="mt-1 w-full rounded-md border px-2 py-2"
                value={ajQuantidade}
                onChange={(e) => setAjQuantidade(e.target.value)}
                inputMode="numeric"
                placeholder="1"
              />
            </label>

            <label className="text-sm">
              Observacoes
              <input
                className="mt-1 w-full rounded-md border px-2 py-2"
                value={ajObs}
                onChange={(e) => setAjObs(e.target.value)}
                placeholder="Ex.: Perda, correcao, inventario..."
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-3 py-2 rounded-md border text-sm"
              onClick={() => setIsAjusteOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-md bg-violet-600 text-white text-sm disabled:opacity-50"
              onClick={executarAjusteManual}
              disabled={!produtoSelecionado.id}
            >
              Aplicar ajuste
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
