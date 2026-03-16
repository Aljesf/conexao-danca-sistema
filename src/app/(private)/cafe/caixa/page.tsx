"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

type ProdutoOption = {
  id: number;
  nome: string;
  preco_venda_centavos: number;
};

type ColaboradorOption = {
  id: number;
  pessoa_id: number | null;
  nome: string;
};

type ComandaItem = {
  produto_id: number;
  quantidade: number;
  descricao_snapshot: string | null;
  valor_total_centavos: number;
};

type Comanda = {
  id: number;
  data_operacao: string;
  data_competencia: string | null;
  colaborador_pessoa_id: number | null;
  colaborador_nome: string | null;
  tipo_quitacao: "IMEDIATA" | "PARCIAL" | "CONTA_INTERNA_COLABORADOR";
  status_pagamento: "PENDENTE" | "PARCIAL" | "PAGO" | "FATURADO" | "CANCELADO";
  valor_total_centavos: number;
  valor_pago_centavos: number;
  valor_em_aberto_centavos: number;
  cobranca_id: number | null;
  observacoes_internas: string | null;
  cafe_venda_itens?: ComandaItem[];
  fatura?: { id?: number; periodo_referencia?: string | null; status?: string | null } | null;
};

type ItemForm = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
};

const STATUS_OPTIONS = ["", "PENDENTE", "PARCIAL", "PAGO", "FATURADO", "CANCELADO"] as const;

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

export default function CafeCaixaPage() {
  const [produtos, setProdutos] = useState<ProdutoOption[]>([]);
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [modo, setModo] = useState<"DIA" | "RETROATIVO">("DIA");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dataOperacao, setDataOperacao] = useState(todayIso());
  const [colaboradorPessoaId, setColaboradorPessoaId] = useState<string>("");
  const [tipoQuitacao, setTipoQuitacao] = useState<"IMEDIATA" | "PARCIAL" | "CONTA_INTERNA_COLABORADOR">("IMEDIATA");
  const [competencia, setCompetencia] = useState(competenciaFromDate(todayIso()));
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("DINHEIRO");
  const [valorPagoCentavos, setValorPagoCentavos] = useState("0");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [produtoId, setProdutoId] = useState<string>("");
  const [quantidade, setQuantidade] = useState("1");

  const [filtroDataInicial, setFiltroDataInicial] = useState(todayIso());
  const [filtroDataFinal, setFiltroDataFinal] = useState(todayIso());
  const [filtroColaboradorPessoaId, setFiltroColaboradorPessoaId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCompetencia, setFiltroCompetencia] = useState(competenciaFromDate(todayIso()));

  const [baixaId, setBaixaId] = useState<number | null>(null);
  const [baixaValorCentavos, setBaixaValorCentavos] = useState("");
  const [baixaMetodo, setBaixaMetodo] = useState("DINHEIRO");

  const [contaInternaId, setContaInternaId] = useState<number | null>(null);
  const [contaInternaCompetencia, setContaInternaCompetencia] = useState(competenciaFromDate(todayIso()));
  const [contaInternaColaboradorPessoaId, setContaInternaColaboradorPessoaId] = useState("");

  const totalItensCentavos = useMemo(
    () => itens.reduce((acc, item) => acc + item.valor_unitario_centavos * item.quantidade, 0),
    [itens],
  );

  async function carregarBases() {
    const [produtosRes, colaboradoresRes] = await Promise.all([
      fetch("/api/cafe/produtos?pageSize=200", { cache: "no-store" }),
      fetch("/api/admin/colaboradores/opcoes", { cache: "no-store" }),
    ]);

    const produtosJson = (await produtosRes.json().catch(() => null)) as
      | { data?: { items?: ProdutoOption[] } }
      | null;
    const colaboradoresJson = (await colaboradoresRes.json().catch(() => null)) as
      | { data?: ColaboradorOption[] }
      | null;

    setProdutos(produtosJson?.data?.items ?? []);
    setColaboradores(colaboradoresJson?.data ?? []);
  }

  async function carregarComandas() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroDataInicial) params.set("data_inicial", filtroDataInicial);
      if (filtroDataFinal) params.set("data_final", filtroDataFinal);
      if (filtroColaboradorPessoaId) params.set("colaborador_pessoa_id", filtroColaboradorPessoaId);
      if (filtroStatus) params.set("status_pagamento", filtroStatus);
      if (filtroCompetencia) params.set("competencia", filtroCompetencia);

      const res = await fetch(`/api/cafe/caixa?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { data?: Comanda[]; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "falha_carregar_comandas");
      setComandas(json?.data ?? []);
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_carregar_comandas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarBases().then(() => carregarComandas());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modo === "DIA") {
      const hoje = todayIso();
      setDataOperacao(hoje);
      if (tipoQuitacao === "CONTA_INTERNA_COLABORADOR") {
        setCompetencia(competenciaFromDate(hoje));
      }
    }
  }, [modo, tipoQuitacao]);

  function limparFormulario() {
    setEditingId(null);
    setModo("DIA");
    setDataOperacao(todayIso());
    setColaboradorPessoaId("");
    setTipoQuitacao("IMEDIATA");
    setCompetencia(competenciaFromDate(todayIso()));
    setObservacoesInternas("");
    setMetodoPagamento("DINHEIRO");
    setValorPagoCentavos("0");
    setItens([]);
  }

  function adicionarItem() {
    const produto = produtos.find((item) => item.id === Number(produtoId));
    const qty = Number(quantidade);
    if (!produto || !Number.isFinite(qty) || qty <= 0) return;
    setItens((current) => [
      ...current,
      {
        produto_id: produto.id,
        nome: produto.nome,
        quantidade: qty,
        valor_unitario_centavos: produto.preco_venda_centavos,
      },
    ]);
    setProdutoId("");
    setQuantidade("1");
  }

  async function salvarComanda() {
    if (!editingId && itens.length === 0) {
      setMensagem("Adicione ao menos um item na comanda.");
      return;
    }

    setSaving(true);
    setMensagem(null);
    try {
      const payload = editingId
        ? {
            data_operacao: dataOperacao,
            colaborador_pessoa_id: colaboradorPessoaId ? Number(colaboradorPessoaId) : null,
            data_competencia: tipoQuitacao === "CONTA_INTERNA_COLABORADOR" ? competencia : null,
            observacoes_internas: observacoesInternas,
            observacoes: observacoesInternas,
          }
        : {
            data_operacao: dataOperacao,
            colaborador_pessoa_id: colaboradorPessoaId ? Number(colaboradorPessoaId) : null,
            tipo_quitacao: tipoQuitacao,
            data_competencia: tipoQuitacao === "CONTA_INTERNA_COLABORADOR" ? competencia : null,
            observacoes_internas: observacoesInternas,
            observacoes: observacoesInternas,
            metodo_pagamento: metodoPagamento,
            valor_pago_centavos: Number(valorPagoCentavos || "0"),
            itens: itens.map((item) => ({
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              valor_unitario_centavos: item.valor_unitario_centavos,
              descricao_snapshot: item.nome,
            })),
          };

      const res = await fetch(editingId ? `/api/cafe/caixa/${editingId}` : "/api/cafe/caixa", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "falha_salvar_comanda");
      limparFormulario();
      await carregarComandas();
      setMensagem(editingId ? "Comanda atualizada." : "Comanda registrada.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_salvar_comanda");
    } finally {
      setSaving(false);
    }
  }

  async function editarComanda(id: number) {
    setMensagem(null);
    const res = await fetch(`/api/cafe/caixa/${id}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { data?: Comanda; error?: string } | null;
    if (!res.ok || !json?.data) {
      setMensagem(json?.error ?? "falha_buscar_comanda");
      return;
    }

    const comanda = json.data;
    setEditingId(comanda.id);
    setModo(comanda.data_operacao === todayIso() ? "DIA" : "RETROATIVO");
    setDataOperacao(comanda.data_operacao);
    setColaboradorPessoaId(comanda.colaborador_pessoa_id ? String(comanda.colaborador_pessoa_id) : "");
    setTipoQuitacao(comanda.tipo_quitacao);
    setCompetencia(comanda.data_competencia ?? competenciaFromDate(comanda.data_operacao));
    setObservacoesInternas(comanda.observacoes_internas ?? "");
    setItens(
      (comanda.cafe_venda_itens ?? []).map((item) => ({
        produto_id: item.produto_id,
        nome: item.descricao_snapshot ?? `Produto #${item.produto_id}`,
        quantidade: item.quantidade,
        valor_unitario_centavos:
          item.quantidade > 0 ? Math.round(item.valor_total_centavos / item.quantidade) : 0,
      })),
    );
  }

  async function registrarBaixa() {
    if (!baixaId) return;
    setSaving(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/cafe/caixa/${baixaId}/baixas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_centavos: Number(baixaValorCentavos || "0"),
          metodo_pagamento: baixaMetodo,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "falha_registrar_baixa");
      setBaixaId(null);
      setBaixaValorCentavos("");
      await carregarComandas();
      setMensagem("Baixa registrada.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_registrar_baixa");
    } finally {
      setSaving(false);
    }
  }

  async function enviarContaInterna() {
    if (!contaInternaId) return;
    setSaving(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/cafe/caixa/${contaInternaId}/enviar-conta-interna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_pessoa_id: Number(contaInternaColaboradorPessoaId || "0"),
          data_competencia: contaInternaCompetencia,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "falha_enviar_conta_interna");
      setContaInternaId(null);
      await carregarComandas();
      setMensagem("Saldo enviado para a conta interna.");
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "falha_enviar_conta_interna");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Caixa do Ballet Cafe"
        subtitle="Lance vendas do dia ou retroativas, trabalhe com baixa parcial e envie saldo para a conta interna do colaborador por competencia."
      >
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/cafe">
            Voltar ao modulo
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/credito-conexao/faturas">
            Faturas da conta interna
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Venda do dia usa a data atual. Lancamento retroativo libera a data operacional e a competencia.",
          "Conta interna do colaborador nao gera recebimento imediato: a comanda entra na cobranca canonica da competencia.",
          "Baixas reais alimentam recebimento e movimento financeiro sem criar um financeiro paralelo para o cafe.",
        ]}
      />

      <SystemSectionCard
        title="Lancamento de comanda"
        description="Card principal da operacao do caixa, com data da operacao, colaborador opcional, tipo de quitacao e itens."
        footer={
          <>
            <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" onClick={limparFormulario}>
              Limpar
            </button>
            <button
              type="button"
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
              disabled={saving}
              onClick={() => void salvarComanda()}
            >
              {saving ? "Salvando..." : editingId ? "Salvar ajustes" : "Registrar comanda"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>Modo de operacao</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-2 ${modo === "DIA" ? "bg-slate-900 text-white" : "bg-white"}`}
                onClick={() => setModo("DIA")}
              >
                Venda do dia
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-2 ${modo === "RETROATIVO" ? "bg-slate-900 text-white" : "bg-white"}`}
                onClick={() => setModo("RETROATIVO")}
              >
                Lancamento retroativo
              </button>
            </div>
          </label>

          <label className="space-y-1 text-sm">
            <span>Data da operacao</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="date"
              value={dataOperacao}
              onChange={(event) => setDataOperacao(event.target.value)}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Colaborador</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={colaboradorPessoaId}
              onChange={(event) => setColaboradorPessoaId(event.target.value)}
            >
              <option value="">Sem colaborador</option>
              {colaboradores.map((item) => (
                <option key={item.id} value={item.pessoa_id ?? ""}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Tipo de quitacao</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={tipoQuitacao}
              onChange={(event) => setTipoQuitacao(event.target.value as typeof tipoQuitacao)}
            >
              <option value="IMEDIATA">Pagamento imediato</option>
              <option value="PARCIAL">Pagamento parcial</option>
              <option value="CONTA_INTERNA_COLABORADOR">Enviar para conta interna do colaborador</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Competencia</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={competencia}
              onChange={(event) => setCompetencia(event.target.value)}
              placeholder="YYYY-MM"
              disabled={tipoQuitacao !== "CONTA_INTERNA_COLABORADOR"}
            />
          </label>

          <label className="space-y-1 text-sm">
            <span>Metodo de pagamento</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={metodoPagamento}
              onChange={(event) => setMetodoPagamento(event.target.value)}
              disabled={tipoQuitacao === "CONTA_INTERNA_COLABORADOR"}
            >
              <option value="DINHEIRO">DINHEIRO</option>
              <option value="PIX">PIX</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span>Valor pago na abertura (centavos)</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="number"
              min={0}
              value={valorPagoCentavos}
              onChange={(event) => setValorPagoCentavos(event.target.value)}
              disabled={editingId !== null}
            />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span>Observacoes internas</span>
          <textarea
            className="min-h-24 w-full rounded-md border px-3 py-2"
            value={observacoesInternas}
            onChange={(event) => setObservacoesInternas(event.target.value)}
            placeholder="Contexto operacional, retroatividade, observacoes do caixa."
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr_auto]">
              <label className="space-y-1 text-sm">
                <span>Produto</span>
                <select className="w-full rounded-md border px-3 py-2" value={produtoId} onChange={(event) => setProdutoId(event.target.value)}>
                  <option value="">Selecione</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} - {brl(produto.preco_venda_centavos)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Quantidade</span>
                <input className="w-full rounded-md border px-3 py-2" type="number" min={1} value={quantidade} onChange={(event) => setQuantidade(event.target.value)} />
              </label>

              <div className="flex items-end">
                <button type="button" className="w-full rounded-md border px-3 py-2 text-sm hover:bg-slate-50" onClick={adicionarItem}>
                  Adicionar item
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Unitario</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-slate-500" colSpan={5}>
                        Nenhum item adicionado.
                      </td>
                    </tr>
                  ) : (
                    itens.map((item, index) => (
                      <tr key={`${item.produto_id}-${index}`} className="border-t">
                        <td className="px-3 py-2">{item.nome}</td>
                        <td className="px-3 py-2 text-right">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right">{brl(item.valor_unitario_centavos)}</td>
                        <td className="px-3 py-2 text-right">{brl(item.valor_unitario_centavos * item.quantidade)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:underline"
                            onClick={() => setItens((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Resumo da operacao</div>
            <div className="mt-3 text-2xl font-semibold">{brl(totalItensCentavos)}</div>
            <div className="mt-2 text-sm text-slate-600">
              {editingId
                ? "Itens exibidos para referencia. A edicao operacional altera data, observacoes e vinculo antes do faturamento."
                : "O total considera os itens atuais da comanda."}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Valor pago informado</span>
                <strong>{brl(Number(valorPagoCentavos || "0"))}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Saldo previsto</span>
                <strong>{brl(Math.max(totalItensCentavos - Number(valorPagoCentavos || "0"), 0))}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Competencia sugerida</span>
                <strong>{competencia}</strong>
              </div>
            </div>
          </div>
        </div>
      </SystemSectionCard>

      <SystemSectionCard title="Comandas recentes" description="Lista operacional com filtros e acoes rapidas de edicao, baixa e envio para conta interna.">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span>Data inicial</span>
            <input className="w-full rounded-md border px-3 py-2" type="date" value={filtroDataInicial} onChange={(event) => setFiltroDataInicial(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Data final</span>
            <input className="w-full rounded-md border px-3 py-2" type="date" value={filtroDataFinal} onChange={(event) => setFiltroDataFinal(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Colaborador</span>
            <select className="w-full rounded-md border px-3 py-2" value={filtroColaboradorPessoaId} onChange={(event) => setFiltroColaboradorPessoaId(event.target.value)}>
              <option value="">Todos</option>
              {colaboradores.map((item) => (
                <option key={item.id} value={item.pessoa_id ?? ""}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Status</span>
            <select className="w-full rounded-md border px-3 py-2" value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status || "todos"} value={status}>
                  {status || "Todos"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Competencia</span>
            <input className="w-full rounded-md border px-3 py-2" value={filtroCompetencia} onChange={(event) => setFiltroCompetencia(event.target.value)} placeholder="YYYY-MM" />
          </label>
        </div>

        <div className="flex justify-end">
          <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => void carregarComandas()}>
            Atualizar lista
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Comanda</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Colaborador</th>
                <th className="px-3 py-2 text-left">Quitacao</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Aberto</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={8}>
                    Carregando...
                  </td>
                </tr>
              ) : comandas.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={8}>
                    Nenhuma comanda encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                comandas.map((comanda) => (
                  <tr key={comanda.id} className="border-t">
                    <td className="px-3 py-2 font-medium">#{comanda.id}</td>
                    <td className="px-3 py-2">{comanda.data_operacao}</td>
                    <td className="px-3 py-2">{comanda.colaborador_nome ?? "-"}</td>
                    <td className="px-3 py-2">{comanda.tipo_quitacao}</td>
                    <td className="px-3 py-2">{comanda.status_pagamento}</td>
                    <td className="px-3 py-2 text-right">{brl(comanda.valor_total_centavos)}</td>
                    <td className="px-3 py-2 text-right">{brl(comanda.valor_em_aberto_centavos)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="rounded border px-2 py-1 text-xs hover:bg-slate-50" onClick={() => void editarComanda(comanda.id)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => {
                            setBaixaId(comanda.id);
                            setBaixaValorCentavos(String(comanda.valor_em_aberto_centavos));
                            setBaixaMetodo("DINHEIRO");
                          }}
                        >
                          Dar baixa
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => {
                            setContaInternaId(comanda.id);
                            setContaInternaCompetencia(comanda.data_competencia ?? competenciaFromDate(comanda.data_operacao));
                            setContaInternaColaboradorPessoaId(comanda.colaborador_pessoa_id ? String(comanda.colaborador_pessoa_id) : "");
                          }}
                        >
                          Conta interna
                        </button>
                        {comanda.cobranca_id ? (
                          <Link className="rounded border px-2 py-1 text-xs hover:bg-slate-50" href={`/admin/governanca/cobrancas/${comanda.cobranca_id}`}>
                            Cobranca
                          </Link>
                        ) : null}
                        {comanda.fatura?.id ? (
                          <Link className="rounded border px-2 py-1 text-xs hover:bg-slate-50" href={`/admin/financeiro/credito-conexao/faturas/${comanda.fatura.id}`}>
                            Fatura
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SystemSectionCard>

      {baixaId ? (
        <SystemSectionCard title={`Baixa da comanda #${baixaId}`} description="Use este bloco para baixa parcial ou total com pagamento real.">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Valor da baixa (centavos)</span>
              <input className="w-full rounded-md border px-3 py-2" type="number" min={1} value={baixaValorCentavos} onChange={(event) => setBaixaValorCentavos(event.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span>Metodo</span>
              <select className="w-full rounded-md border px-3 py-2" value={baixaMetodo} onChange={(event) => setBaixaMetodo(event.target.value)}>
                <option value="DINHEIRO">DINHEIRO</option>
                <option value="PIX">PIX</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setBaixaId(null)}>
              Cancelar
            </button>
            <button type="button" className="rounded-md bg-black px-4 py-2 text-sm text-white" onClick={() => void registrarBaixa()}>
              Confirmar baixa
            </button>
          </div>
        </SystemSectionCard>
      ) : null}

      {contaInternaId ? (
        <SystemSectionCard title={`Enviar saldo da comanda #${contaInternaId} para conta interna`} description="Converte apenas o saldo em aberto em divida por competencia do colaborador.">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Colaborador</span>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={contaInternaColaboradorPessoaId}
                onChange={(event) => setContaInternaColaboradorPessoaId(event.target.value)}
              >
                <option value="">Selecione</option>
                {colaboradores.map((item) => (
                  <option key={item.id} value={item.pessoa_id ?? ""}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Competencia</span>
              <input className="w-full rounded-md border px-3 py-2" value={contaInternaCompetencia} onChange={(event) => setContaInternaCompetencia(event.target.value)} placeholder="YYYY-MM" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => setContaInternaId(null)}>
              Cancelar
            </button>
            <button type="button" className="rounded-md bg-black px-4 py-2 text-sm text-white" onClick={() => void enviarContaInterna()}>
              Confirmar envio
            </button>
          </div>
        </SystemSectionCard>
      ) : null}

      {mensagem ? (
        <SystemSectionCard title="Retorno operacional">
          <div className="text-sm text-slate-700">{mensagem}</div>
        </SystemSectionCard>
      ) : null}
    </SystemPage>
  );
}
