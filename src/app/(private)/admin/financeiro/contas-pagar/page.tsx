"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

// Segue modelo docs/modelo_financeiro.md. Integracao com Supabase para categorias e pessoas.

type StatusConta = "PENDENTE" | "PAGO" | "CANCELADO";
type Centro = "ESCOLA" | "LOJA" | "CAFE";
type MetodoPagamento = "PIX" | "DINHEIRO" | "CARTAO" | "TRANSFERENCIA";

type ContaFinanceira = {
  id: number;
  nome: string;
  centroCusto: Centro;
};

type CategoriaFinanceira = {
  id: number;
  tipo: string;
  codigo: string;
  nome: string;
  plano_conta_id?: number | null;
};

type PessoaItem = {
  id: number;
  nome: string;
  tipo_pessoa: string;
};

type ContaPagar = {
  id: number;
  descricao: string;
  observacoes?: string | null;
  valorCentavos: number;
  vencimento: string;
  status: StatusConta;
  centroCusto: Centro;
  categoriaId: number | null;
  categoriaCodigo?: string | null;
  categoriaNome?: string | null;
  pessoaId?: number | null;
  pessoaNome?: string | null;
  dataPagamento?: string;
};

type PagamentoForm = {
  valorPago: number;
  juros: number;
  desconto: number;
  contaFinanceiraId: number;
  metodoPagamento: MetodoPagamento;
  dataPagamento: string;
  observacoes: string;
};

type CredorComboboxProps = {
  pessoas: { id: number; nome: string; tipo_pessoa?: string | null }[];
  value: number | null;
  texto: string;
  onTextoChange: (texto: string) => void;
  onChange: (id: number | null, nome?: string) => void;
};

type CategoriaComboboxProps = {
  categorias: { id: number; codigo: string; nome: string; tipo: string }[];
  value: number | null;
  texto: string;
  onTextoChange: (texto: string) => void;
  onChange: (id: number | null, display?: string) => void;
};

const seedCategorias: CategoriaFinanceira[] = [
  { id: 1, tipo: "DESPESA", codigo: "SALARIO_PROFESSOR", nome: "Salario de professor", plano_conta_id: null },
  { id: 2, tipo: "DESPESA", codigo: "ALUGUEL", nome: "Aluguel", plano_conta_id: null },
  { id: 3, tipo: "DESPESA", codigo: "COMPRA_MERCADORIA", nome: "Compra de mercadoria", plano_conta_id: null },
];

const seedPessoas: PessoaItem[] = [
  { id: 1, nome: "Ana Souza", tipo_pessoa: "FISICA" },
  { id: 2, nome: "Empresa XYZ", tipo_pessoa: "JURIDICA" },
];

const seedContas: ContaPagar[] = [
  {
    id: 1,
    descricao: "Salario professor Ana",
    observacoes: "Folha de pagamento de outubro",
    valorCentavos: 280000,
    vencimento: "2025-10-05",
    status: "PENDENTE",
    centroCusto: "ESCOLA",
    categoriaId: 1,
    categoriaCodigo: "SALARIO_PROFESSOR",
    categoriaNome: "Salario de professor",
    pessoaId: 1,
    pessoaNome: "Ana Souza",
  },
  {
    id: 2,
    descricao: "Aluguel unidade",
    observacoes: null,
    valorCentavos: 120000,
    vencimento: "2025-10-10",
    status: "PENDENTE",
    centroCusto: "ESCOLA",
    categoriaId: 2,
    categoriaCodigo: "ALUGUEL",
    categoriaNome: "Aluguel",
  },
  {
    id: 3,
    descricao: "Reposicao estoque loja",
    observacoes: "Pedido de outubro",
    valorCentavos: 45000,
    vencimento: "2025-10-12",
    status: "PAGO",
    centroCusto: "LOJA",
    categoriaId: 3,
    categoriaCodigo: "COMPRA_MERCADORIA",
    categoriaNome: "Compra de mercadoria",
    dataPagamento: "2025-10-06",
  },
];

const contasFinanceiras: ContaFinanceira[] = [
  { id: 1, nome: "Bradesco 1234", centroCusto: "ESCOLA" },
  { id: 2, nome: "Caixa Escola", centroCusto: "ESCOLA" },
  { id: 3, nome: "Conta Loja", centroCusto: "LOJA" },
  { id: 4, nome: "Caixa Cafe", centroCusto: "CAFE" },
];

function formatBRL(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function CredorCombobox({ pessoas, value, texto, onTextoChange, onChange }: CredorComboboxProps) {
  const [open, setOpen] = useState(false);
  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return pessoas;
    return pessoas.filter((p) => p.nome.toLowerCase().includes(t));
  }, [pessoas, texto]);

  function handleSelect(pessoaId: number, nome: string) {
    onChange(pessoaId, nome);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        value={texto}
        placeholder="Opcional"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onTextoChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtradas.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Nenhum credor encontrado</div>
          )}
          {filtradas.map((pessoa) => (
            <button
              key={pessoa.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(pessoa.id, pessoa.nome)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                value === pessoa.id ? "bg-purple-50 text-purple-700" : "hover:bg-slate-50"
              }`}
            >
              <span>{pessoa.nome}</span>
              <span className="text-xs text-slate-500">{pessoa.tipo_pessoa}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriaCombobox({ categorias, value, texto, onTextoChange, onChange }: CategoriaComboboxProps) {
  const [open, setOpen] = useState(false);
  const filtradas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    if (!t) return categorias;
    return categorias.filter(
      (c) => c.codigo.toLowerCase().includes(t) || c.nome.toLowerCase().includes(t)
    );
  }, [categorias, texto]);

  function handleSelect(categoriaId: number, display: string) {
    onChange(categoriaId, display);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        value={texto}
        placeholder="Selecione ou busque a categoria"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onTextoChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtradas.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Nenhuma categoria encontrada</div>
          )}
          {filtradas.map((cat) => {
            const display = `${cat.codigo} \u2013 ${cat.nome}`;
            return (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(cat.id, display)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                  value === cat.id ? "bg-purple-50 text-purple-700" : "hover:bg-slate-50"
                }`}
              >
                <span className="font-medium text-slate-800">{cat.codigo}</span>
                <span className="text-xs text-slate-500">{cat.nome}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContasPagarPage() {
  const supabase = getSupabaseBrowser();

  const [lista, setLista] = useState<ContaPagar[]>(seedContas);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>(seedCategorias);
  const [pessoas, setPessoas] = useState<PessoaItem[]>(seedPessoas);
  const [filtros, setFiltros] = useState<{ status: StatusConta | "TODOS"; centro: Centro | "TODOS"; categoria: string }>({
    status: "TODOS",
    centro: "TODOS",
    categoria: "",
  });
  const [editing, setEditing] = useState<ContaPagar | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    observacoes: "",
    valorReais: "",
    vencimento: "",
    status: "PENDENTE" as StatusConta,
    centroCusto: "ESCOLA" as Centro,
    categoriaId: null as number | null,
    textoCategoria: "",
    pessoaId: null as number | null,
    textoCredor: "",
  });

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | null>(null);
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoForm>({
    valorPago: 0,
    juros: 0,
    desconto: 0,
    contaFinanceiraId: contasFinanceiras[0].id,
    metodoPagamento: "PIX",
    dataPagamento: today(),
    observacoes: "",
  });

  const categoriasDespesa = useMemo(
    () => categorias.filter((c) => c.tipo === "DESPESA"),
    [categorias]
  );

  useEffect(() => {
    let ativo = true;
    async function carregarCategorias() {
      try {
        const { data, error } = await supabase
          .from("categorias_financeiras")
          .select("id, tipo, codigo, nome, plano_conta_id")
          .eq("ativo", true)
          .order("codigo");

        if (error) throw error;
        if (data && ativo) {
          setCategorias(data as CategoriaFinanceira[]);
        }
      } catch (err) {
        console.error("Falha ao carregar categorias_financeiras", err);
      }
    }

    carregarCategorias();
    return () => {
      ativo = false;
    };
  }, [supabase]);

  useEffect(() => {
    let ativo = true;
    async function carregarPessoas() {
      try {
        const { data, error } = await supabase
          .from("pessoas")
          .select("id, nome, tipo_pessoa")
          .order("nome");

        if (error) throw error;
        if (data && ativo) {
          setPessoas(data as PessoaItem[]);
        }
      } catch (err) {
        console.error("Falha ao carregar pessoas", err);
      }
    }

    carregarPessoas();
    return () => {
      ativo = false;
    };
  }, [supabase]);

  function reset() {
    setEditing(null);
    setForm({
      titulo: "",
      observacoes: "",
      valorReais: "",
      vencimento: "",
      status: "PENDENTE",
      centroCusto: "ESCOLA",
      categoriaId: null,
      textoCategoria: "",
      pessoaId: null,
      textoCredor: "",
    });
  }

  function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.vencimento) return;

    const categoriaId = form.categoriaId ?? null;
    const pessoaId = form.pessoaId ?? null;
    const categoriaSelecionada = categoriaId ? categorias.find((c) => c.id === categoriaId) : undefined;
    const pessoaSelecionada = pessoaId ? pessoas.find((p) => p.id === pessoaId) : undefined;
    const valorCentavos = Math.round(Number(form.valorReais || 0) * 100);

    const payload = {
      centro_custo_id: form.centroCusto,
      categoria_id: categoriaId,
      pessoa_id: pessoaId,
      descricao: form.titulo.trim(),
      observacoes: form.observacoes.trim() ? form.observacoes.trim() : null,
      valor_centavos: valorCentavos,
      vencimento: form.vencimento,
      status: form.status,
      metodo_pagamento: null,
    };

    if (editing) {
      setLista((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                descricao: payload.descricao,
                observacoes: payload.observacoes,
                valorCentavos: payload.valor_centavos,
                vencimento: payload.vencimento,
                status: payload.status,
                centroCusto: payload.centro_custo_id as Centro,
                categoriaId: payload.categoria_id,
                categoriaCodigo: categoriaSelecionada?.codigo || null,
                categoriaNome: categoriaSelecionada?.nome || null,
                pessoaId: payload.pessoa_id ?? null,
                pessoaNome: pessoaSelecionada?.nome || null,
              }
            : c
        )
      );
    } else {
      const novo: ContaPagar = {
        id: lista.length ? Math.max(...lista.map((c) => c.id)) + 1 : 1,
        descricao: payload.descricao,
        observacoes: payload.observacoes,
        valorCentavos: payload.valor_centavos,
        vencimento: payload.vencimento,
        status: payload.status,
        centroCusto: payload.centro_custo_id as Centro,
        categoriaId: payload.categoria_id,
        categoriaCodigo: categoriaSelecionada?.codigo || null,
        categoriaNome: categoriaSelecionada?.nome || null,
        pessoaId: payload.pessoa_id ?? null,
        pessoaNome: pessoaSelecionada?.nome || null,
      };
      setLista((prev) => [novo, ...prev]);
    }

    // TODO: substituir mocks por insercao real no Supabase (contas_pagar).
    reset();
  }

  function editar(item: ContaPagar) {
    setEditing(item);
    setForm({
      titulo: item.descricao,
      observacoes: item.observacoes || "",
      valorReais: (item.valorCentavos / 100).toFixed(2),
      vencimento: item.vencimento,
      status: item.status,
      centroCusto: item.centroCusto,
      categoriaId: item.categoriaId ?? null,
      textoCategoria: item.categoriaCodigo
        ? `${item.categoriaCodigo}${item.categoriaNome ? ` - ${item.categoriaNome}` : ""}`
        : "",
      pessoaId: item.pessoaId ?? null,
      textoCredor: item.pessoaNome || "",
    });
  }

  function abrirPagamento(conta: ContaPagar) {
    const contaFinanceiraDefault = contasFinanceiras.find((c) => c.centroCusto === conta.centroCusto) || contasFinanceiras[0];
    setContaSelecionada(conta);
    setPagamentoForm({
      valorPago: conta.valorCentavos / 100,
      juros: 0,
      desconto: 0,
      contaFinanceiraId: contaFinanceiraDefault.id,
      metodoPagamento: "PIX",
      dataPagamento: today(),
      observacoes: "",
    });
    setModalPagamentoAberto(true);
  }

  async function confirmarPagamento() {
    if (!contaSelecionada) return;
    const valorPagoCentavos = Math.round(Number(pagamentoForm.valorPago) * 100);
    const jurosCentavos = Math.round(Number(pagamentoForm.juros) * 100);
    const descontoCentavos = Math.round(Number(pagamentoForm.desconto) * 100);
    const valorLancamento = valorPagoCentavos + jurosCentavos - descontoCentavos;
    const dataPagamento = pagamentoForm.dataPagamento;
    const contaFinanceiraId = pagamentoForm.contaFinanceiraId;
    const centroCustoId = contaSelecionada.centroCusto;

    try {
      // TODO: Integrar Supabase conforme instrucoes do backend.
      // 1) contas_pagar_pagamentos
      // 2) atualizar contas_pagar (status/data_pagamento)
      // 3) inserir em movimento_financeiro com origem CONTA_PAGAR

      setLista((prev) =>
        prev.map((c) => (c.id === contaSelecionada.id ? { ...c, status: "PAGO", dataPagamento } : c))
      );
      setModalPagamentoAberto(false);
      setContaSelecionada(null);
      alert("Pagamento registrado com sucesso (mock)."); // substituir por toast quando disponivel
    } catch (error) {
      console.error(error);
      alert("Falha ao registrar pagamento. Tente novamente.");
    }
  }

  function marcarPago(id: number) {
    const item = lista.find((c) => c.id === id);
    if (item) abrirPagamento(item);
  }

  const filtradas = useMemo(() => {
    return lista.filter((c) => {
      const statusOk = filtros.status === "TODOS" || c.status === filtros.status;
      const centroOk = filtros.centro === "TODOS" || c.centroCusto === filtros.centro;
      const catFiltro = filtros.categoria.trim().toLowerCase();
      const catOk =
        !catFiltro ||
        (c.categoriaCodigo ?? "").toLowerCase().includes(catFiltro) ||
        (c.categoriaNome ?? "").toLowerCase().includes(catFiltro);
      return statusOk && centroOk && catOk;
    });
  }, [lista, filtros]);

  const totais = useMemo(() => {
    return filtradas.reduce(
      (acc, c) => {
        if (c.status !== "PAGO") acc.aberto += c.valorCentavos;
        return acc;
      },
      { aberto: 0 }
    );
  }, [filtradas]);

  const contasFinanceirasPorCentro = (centro: Centro) => contasFinanceiras.filter((c) => c.centroCusto === centro);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Contas a pagar</h1>
          <p className="text-sm text-slate-600">
            Base na tabela <strong>contas_pagar</strong>, relacionando centros de custo, categorias e pessoas.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Despesas da instituicao."
          items={[
            "Cadastre salarios, compras, impostos e despesas gerais.",
            "Marcar uma conta como PAGA lanca automaticamente uma saida no caixa.",
            "Cada despesa deve ter categoria e centro de custo.",
            "Use observacoes para registrar notas fiscais ou acordos.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtros</h3>
          <p className="text-sm text-slate-600">Status, centro de custo e categoria.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-sm text-slate-700">
              Status
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value as StatusConta | "TODOS" })}
              >
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Centro de custo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.centro}
                onChange={(e) => setFiltros({ ...filtros, centro: e.target.value as Centro | "TODOS" })}
              >
                <option value="TODOS">Todos</option>
                <option value="ESCOLA">Escola</option>
                <option value="LOJA">Loja</option>
                <option value="CAFE">Cafe</option>
              </select>
            </label>
            <label className="md:col-span-2 text-sm text-slate-700">
              Categoria
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filtros.categoria}
                onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                placeholder="SALARIO_PROFESSOR, ALUGUEL..."
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Em aberto (filtrados)</p>
              <p className="text-xl font-semibold text-slate-800">{formatBRL(totais.aberto)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-600">Total lancamentos</p>
              <p className="text-xl font-semibold text-slate-800">{filtradas.length} contas</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">{editing ? "Editar conta" : "Nova conta"}</h3>
          <p className="text-sm text-slate-600">Formulario completo conforme modelo financeiro.</p>
          <form onSubmit={salvar} className="mt-3 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2 text-sm text-slate-700">
              Titulo da conta
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: Conta de luz, Salario professor Ana, Montagem de palco..."
                required
              />
            </label>
            <label className="md:col-span-2 text-sm text-slate-700">
              Descricao detalhada
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Ex.: Conta de luz - mes 10/2025; estrutura de som para espetaculo X; detalhes adicionais..."
              />
            </label>
            <div className="md:col-span-2 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-inner md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="font-semibold text-slate-800">Vencimento</span>
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                  value={form.vencimento}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                  required
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="font-semibold text-slate-800">Valor (R$)</span>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
                  <span className="text-sm text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full flex-1 bg-transparent text-sm text-slate-800 outline-none"
                    value={form.valorReais}
                    onChange={(e) => setForm({ ...form, valorReais: e.target.value })}
                    required
                  />
                </div>
              </label>
            </div>
            <label className="text-sm text-slate-700">
              Centro de custo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.centroCusto}
                onChange={(e) => setForm({ ...form, centroCusto: e.target.value as Centro })}
              >
                <option value="ESCOLA">Escola</option>
                <option value="LOJA">Loja</option>
                <option value="CAFE">Cafe</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Categoria
              <CategoriaCombobox
                categorias={categoriasDespesa}
                value={form.categoriaId}
                texto={form.textoCategoria}
                onTextoChange={(texto) => setForm({ ...form, textoCategoria: texto, categoriaId: null })}
                onChange={(id, display) => setForm({ ...form, categoriaId: id, textoCategoria: display || "" })}
              />
            </label>
            <label className="md:col-span-2 text-sm text-slate-700">
              Credor (professor / fornecedor / outro)
              <CredorCombobox
                pessoas={pessoas}
                value={form.pessoaId}
                texto={form.textoCredor}
                onTextoChange={(texto) => setForm({ ...form, textoCredor: texto, pessoaId: null })}
                onChange={(id, nome) => setForm({ ...form, pessoaId: id, textoCredor: nome || "" })}
              />
            </label>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow">
                {editing ? "Salvar alteracoes" : "Adicionar conta"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Contas cadastradas</h3>
          <p className="text-sm text-slate-600">Altere status para "Pago" para atualizar rapidamente.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Titulo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Vencimento</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Centro</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Categoria</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Pessoa</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-800">
                      <div className="font-semibold text-slate-900">{c.descricao}</div>
                      {c.observacoes ? <div className="text-xs text-slate-500">Obs.: {c.observacoes}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.vencimento}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatBRL(c.valorCentavos)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          c.status === "PAGO"
                            ? "bg-green-50 text-green-700"
                            : c.status === "CANCELADO"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.centroCusto}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {c.categoriaCodigo || "-"}
                      {c.categoriaNome ? <span className="text-xs text-slate-500"> - {c.categoriaNome}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{c.pessoaNome || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => editar(c)}
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          Editar
                        </button>
                        {c.status === "PENDENTE" && (
                          <button
                            onClick={() => marcarPago(c.id)}
                            className="rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white shadow"
                          >
                            Registrar pagamento
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalPagamentoAberto && contaSelecionada && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-800">Registrar pagamento</h4>
                <p className="text-sm text-slate-600">
                  {contaSelecionada.descricao} - {contaSelecionada.categoriaCodigo || "Sem categoria"}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalPagamentoAberto(false);
                  setContaSelecionada(null);
                }}
                className="text-sm font-semibold text-slate-500"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="text-sm text-slate-700">
                Valor original
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900">
                  {formatBRL(contaSelecionada.valorCentavos)}
                </div>
              </div>
              <label className="text-sm text-slate-700">
                Valor pago (R$)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.valorPago}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, valorPago: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm text-slate-700">
                Juros/multa (R$)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.juros}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, juros: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm text-slate-700">
                Desconto (R$)
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.desconto}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, desconto: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm text-slate-700">
                Conta financeira
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.contaFinanceiraId}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, contaFinanceiraId: Number(e.target.value) })}
                >
                  {contasFinanceirasPorCentro(contaSelecionada.centroCusto).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Centro de custo
                <input
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={contaSelecionada.centroCusto}
                />
              </label>
              <label className="text-sm text-slate-700">
                Metodo de pagamento
                <select
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.metodoPagamento}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, metodoPagamento: e.target.value as MetodoPagamento })}
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">DINHEIRO</option>
                  <option value="CARTAO">CARTAO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Data do pagamento
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={pagamentoForm.dataPagamento}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, dataPagamento: e.target.value })}
                />
              </label>
              <label className="md:col-span-2 text-sm text-slate-700">
                Observacoes
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  rows={3}
                  value={pagamentoForm.observacoes}
                  onChange={(e) => setPagamentoForm({ ...pagamentoForm, observacoes: e.target.value })}
                  placeholder="Notas sobre este pagamento"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalPagamentoAberto(false);
                  setContaSelecionada(null);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPagamento}
                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow"
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
