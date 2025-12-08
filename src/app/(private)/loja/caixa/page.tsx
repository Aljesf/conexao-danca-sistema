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

type ApiResponse<T = any> = { ok?: boolean; error?: string; data?: T };

// NOTA SOBRE O MODELO DE PAPEIS NA LOJA v0:
// - "comprador" e a Pessoa que esta realizando a compra/pagamento (transacional).
// - "beneficiario" e a Pessoa que vai usar o produto (normalmente aluno), armazenada por item em loja_venda_itens.beneficiario_pessoa_id.
// - Exemplos possiveis:
//   * Pai compra para dois filhos (beneficiarios distintos em itens diferentes).
//   * Aluno compra para si mesmo (comprador = beneficiario).
//   * Cliente generico compra sem vincular beneficiario (beneficiario null).

export default function FrenteCaixaLojaPage() {
  const router = useRouter();

  const [comprador, setComprador] = useState<PessoaResumo | null>(null);
  const [itens, setItens] = useState<ItemCaixa[]>([]);
  const [tipoVenda, setTipoVenda] = useState<"VENDA" | "CREDIARIO_INTERNO">("VENDA");
  const [formaPagamento, setFormaPagamento] = useState<"AVISTA" | "CREDIARIO_INTERNO">(
    "AVISTA"
  );
  const [dataVencimento, setDataVencimento] = useState<string | "">("");
  const [observacoes, setObservacoes] = useState("");
  const [observacaoVendedor, setObservacaoVendedor] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [mensagemTipo, setMensagemTipo] = useState<"success" | "error" | "info" | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // buscas auxiliares (comprador)
  const [buscaComprador, setBuscaComprador] = useState("");
  const [resultadoComprador, setResultadoComprador] = useState<PessoaResumo[]>([]);
  const [buscandoComprador, setBuscandoComprador] = useState(false);

  // busca aluno/usuario por item
  const [itemSelecionandoAluno, setItemSelecionandoAluno] = useState<string | null>(
    null
  );
  const [buscaAluno, setBuscaAluno] = useState("");
  const [resultadoAluno, setResultadoAluno] = useState<PessoaResumo[]>([]);
  const [buscandoAluno, setBuscandoAluno] = useState(false);

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
          { signal: controller.signal, credentials: "include" }
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
          { signal: controller.signal, credentials: "include" }
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
          { signal: controller.signal }
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
    () =>
      itens.reduce(
        (sum, i) => sum + i.quantidade * i.precoUnitarioCentavos,
        0
      ),
    [itens]
  );

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
      prev.map((i) => (i.idTemp === idTemp ? { ...i, ...partial } : i))
    );
  }

  function removerItem(idTemp: string) {
    setItens((prev) => prev.filter((i) => i.idTemp !== idTemp));
  }

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
    if (formaPagamento === "CREDIARIO_INTERNO" && !dataVencimento) {
      setMensagem("Informe a data de vencimento para crediario interno.");
      setMensagemTipo("error");
      return;
    }

    const payload = {
      cliente_pessoa_id: comprador.id,
      tipo_venda: tipoVenda,
      forma_pagamento: formaPagamento,
      status_pagamento: formaPagamento === "AVISTA" ? "PAGO" : "PENDENTE",
      data_vencimento:
        formaPagamento === "CREDIARIO_INTERNO" ? dataVencimento : null,
      observacoes: observacoes || undefined,
      observacao_vendedor: observacaoVendedor || undefined,
      itens: itens.map((it) => ({
        produto_id: it.produto.id,
        quantidade: it.quantidade,
        preco_unitario_centavos: it.precoUnitarioCentavos,
        beneficiario_pessoa_id: it.beneficiario?.id ?? comprador?.id ?? null,
        observacoes: it.observacoes || null,
      })),
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Frente de caixa — Loja v0</h1>
        <p className="text-sm text-gray-600">
          Tela de atendimento rapido da AJ Dance Store. Comprador = quem paga; aluno/usuario = quem vai usar o produto (definido por item).
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
            Pessoa que esta realizando a compra/pagamento.
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
                          ? `Aluno: ${it.beneficiario.nome_completo || it.beneficiario.nome || it.beneficiario.id}`
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
                        value={(it.precoUnitarioCentavos / 100).toFixed(2).replace(".", ",")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const cleaned = raw.replace(/[^\d,]/g, "").replace(/\./g, "");
                          const normalized = cleaned.replace(",", ".");
                          const valor = parseFloat(normalized);
                          const centavos = Number.isNaN(valor)
                            ? 0
                            : Math.round(valor * 100);
                          setItens((prev) =>
                            prev.map((row) =>
                              row.idTemp === it.idTemp
                                ? { ...row, precoUnitarioCentavos: centavos }
                                : row
                            )
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
                Selecionar aluno/usuario para o item
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
                          : row
                      )
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
              {!buscandoAluno && resultadoAluno.length === 0 && buscaAluno.trim().length >= 2 && (
                <p className="text-xs text-gray-500 px-3 py-2">
                  Nenhuma pessoa encontrada para esta busca.
                </p>
              )}
            </div>
          </div>
        )}
        <p className="text-[11px] text-gray-500">
          Se voce nao escolher um aluno para o item, o sistema considera o comprador como usuario do produto.
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
              <option value="CREDIARIO_INTERNO">Crediario interno</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Forma de pagamento
            </label>
            <select
              value={formaPagamento}
              onChange={(e) =>
                setFormaPagamento(e.target.value as "AVISTA" | "CREDIARIO_INTERNO")
              }
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="AVISTA">Avista</option>
              <option value="CREDIARIO_INTERNO">Crediario interno</option>
            </select>
          </div>
          {formaPagamento === "CREDIARIO_INTERNO" && (
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

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Observacoes</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
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
            disabled={saving || !comprador || itens.length === 0}
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
