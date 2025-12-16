"use client";

import React, { useEffect, useMemo, useState } from "react";

type TipoOperacao = "VENDA" | "ENTREGA_ADMIN";

type Pessoa = {
  id: number;
  nome: string;
  email?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
};

type Produto = {
  id: number;
  nome: string;
  codigo?: string | null;
  preco_venda_centavos: number;
  estoque_atual?: number;
};

type ItemVenda = {
  produto: Produto;
  quantidade: number;
  preco_unit_centavos: number;
  beneficiario_pessoa_id?: number | null;
};

type RegraParcelamento = {
  id?: number;
  tipo_conta: "ALUNO" | "COLABORADOR";
  numero_parcelas_min: number;
  numero_parcelas_max: number;
  valor_minimo_centavos: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  ativo: boolean;
};

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  return JSON.parse(t);
}

async function jpost<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  return JSON.parse(t);
}

export default function LojaCaixaPage() {
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacao>("VENDA");

  // comprador
  const [compradorQ, setCompradorQ] = useState("");
  const [compradorSugestoes, setCompradorSugestoes] = useState<Pessoa[]>([]);
  const [comprador, setComprador] = useState<Pessoa | null>(null);

  // produtos
  const [produtoQ, setProdutoQ] = useState("");
  const [produtoSugestoes, setProdutoSugestoes] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemVenda[]>([]);

  // Cartão Conexão (taxas)
  const [regras, setRegras] = useState<RegraParcelamento[]>([]);
  const [loadingRegras, setLoadingRegras] = useState(false);
  const [tipoContaConexao, setTipoContaConexao] = useState<"ALUNO" | "COLABORADOR">("ALUNO");
  const [parcelas, setParcelas] = useState<number>(1);

  const [taxaCentavos, setTaxaCentavos] = useState(0);
  const [avisoTaxa, setAvisoTaxa] = useState<string | null>(null);

  // forma pagamento (MVP: mantém opções principais; amanhã você ajusta conforme dicionário)
  const [formaPagamento, setFormaPagamento] = useState<
    "CARTAO_CONEXAO" | "CARTAO" | "PIX" | "DINHEIRO"
  >("CARTAO_CONEXAO");

  const subtotalCentavos = useMemo(() => {
    if (tipoOperacao === "ENTREGA_ADMIN") return 0;
    return itens.reduce((sum, it) => sum + it.quantidade * it.preco_unit_centavos, 0);
  }, [itens, tipoOperacao]);

  const totalFinalCentavos = useMemo(() => {
    if (tipoOperacao === "ENTREGA_ADMIN") return 0;
    if (formaPagamento !== "CARTAO_CONEXAO") return subtotalCentavos;
    return subtotalCentavos + taxaCentavos;
  }, [subtotalCentavos, taxaCentavos, formaPagamento, tipoOperacao]);

  // carregar regras
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingRegras(true);
      try {
        const data: any = await jget(
          "/api/financeiro/credito-conexao/regras-parcelas?ativo=true",
        );
        if (active) setRegras(data.regras ?? []);
      } catch (e) {
        console.error("Falha ao carregar regras de parcelamento (Cartão Conexão)", e);
        if (active) setRegras([]);
      } finally {
        if (active) setLoadingRegras(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // calcular taxa
  useEffect(() => {
    if (tipoOperacao === "ENTREGA_ADMIN" || formaPagamento !== "CARTAO_CONEXAO") {
      setTaxaCentavos(0);
      setAvisoTaxa(null);
      return;
    }

    const regra = regras.find((r) => {
      if (!r.ativo) return false;
      if (r.tipo_conta !== tipoContaConexao) return false;
      if (parcelas < r.numero_parcelas_min || parcelas > r.numero_parcelas_max) return false;
      if (subtotalCentavos < (r.valor_minimo_centavos || 0)) return false;
      return true;
    });

    if (!regra) {
      setTaxaCentavos(0);
      setAvisoTaxa("Sem regra de taxa para este parcelamento (ver Configurações Crédito Conexão).");
      return;
    }

    const percent = Number(regra.taxa_percentual || 0);
    const pct = Math.round(subtotalCentavos * (percent / 100));
    const fixa = Number(regra.taxa_fixa_centavos || 0);
    setTaxaCentavos(pct + fixa);
    setAvisoTaxa(null);
  }, [regras, tipoContaConexao, parcelas, subtotalCentavos, formaPagamento, tipoOperacao]);

  // buscas
  async function buscarComprador() {
    const q = compradorQ.trim();
    if (q.length < 2) return setCompradorSugestoes([]);
    try {
      const data: any = await jget(`/api/pessoas/busca?q=${encodeURIComponent(q)}`);
      setCompradorSugestoes(data.pessoas ?? data.items ?? data.resultados ?? []);
    } catch (e) {
      console.error(e);
      setCompradorSugestoes([]);
    }
  }

  async function buscarProdutos() {
    const q = produtoQ.trim();
    if (q.length < 2) return setProdutoSugestoes([]);
    try {
      const data: any = await jget(`/api/loja/produtos?q=${encodeURIComponent(q)}&ativo=true`);
      setProdutoSugestoes(data.produtos ?? data.items ?? []);
    } catch (e) {
      console.error(e);
      setProdutoSugestoes([]);
    }
  }

  function adicionarProduto(p: Produto) {
    setItens((prev) => {
      const idx = prev.findIndex((x) => x.produto.id === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantidade: copy[idx].quantidade + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          produto: p,
          quantidade: 1,
          preco_unit_centavos: p.preco_venda_centavos,
          beneficiario_pessoa_id: comprador?.id ?? null,
        },
      ];
    });
    setProdutoQ("");
    setProdutoSugestoes([]);
  }

  async function finalizar() {
    if (!comprador) {
      alert("Selecione o comprador.");
      return;
    }

    if (tipoOperacao === "ENTREGA_ADMIN") {
      if (!confirm("Confirmar ENTREGA ADMINISTRATIVA (sem cobrança)?")) return;
    } else if (itens.length === 0) {
      alert("Adicione pelo menos um item.");
      return;
    }

    const tipo_venda =
      tipoOperacao === "ENTREGA_ADMIN"
        ? "ENTREGA_FIGURINO"
        : "VENDA";

    const payload: any = {
      cliente_pessoa_id: comprador.id,
      tipo_operacao: tipoOperacao,
      tipo_venda,
      itens: itens.map((it) => ({
        produto_id: it.produto.id,
        quantidade: it.quantidade,
        preco_unitario_centavos: tipoOperacao === "ENTREGA_ADMIN" ? 0 : it.preco_unit_centavos,
        beneficiario_pessoa_id: it.beneficiario_pessoa_id ?? null,
      })),
      valor_total_centavos: totalFinalCentavos,
      forma_pagamento: tipoOperacao === "ENTREGA_ADMIN" ? "SEM_COBRANCA" : formaPagamento,
      numero_parcelas: formaPagamento === "CARTAO_CONEXAO" ? parcelas : 1,
      taxa_cartao_conexao_centavos: formaPagamento === "CARTAO_CONEXAO" ? taxaCentavos : 0,
      cartao_conexao_tipo_conta: formaPagamento === "CARTAO_CONEXAO" ? tipoContaConexao : null,
    };

    try {
      await jpost("/api/loja/vendas", payload);
      alert("Operação registrada com sucesso.");
      setItens([]);
      setTaxaCentavos(0);
      setAvisoTaxa(null);
    } catch (e: any) {
      console.error(e);
      alert("Erro ao finalizar: " + (e?.message || "falha"));
    }
  }

  const bloqueiaCobranca = tipoOperacao === "ENTREGA_ADMIN";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Frente de caixa</h1>
        <p className="text-sm text-gray-600">
          Comprador = quem paga. Beneficiário = quem vai usar o produto (por item).
        </p>
      </div>

      {/* Tipo de operação */}
      <div className="border rounded-xl bg-white shadow-sm p-4 space-y-2">
        <div className="text-sm font-semibold">Tipo de operação</div>
        <select
          className="border rounded-md px-2 py-1 text-sm"
          value={tipoOperacao}
          onChange={(e) => setTipoOperacao(e.target.value as TipoOperacao)}
        >
          <option value="VENDA">Venda</option>
          <option value="ENTREGA_ADMIN">Entrega administrativa (sem cobrança)</option>
        </select>
        {bloqueiaCobranca ? (
          <div className="text-xs text-amber-700">
            Operação sem cobrança financeira. Total será R$ 0,00.
          </div>
        ) : null}
      </div>

      {/* Comprador */}
      <div className="border rounded-xl bg-white shadow-sm p-4 space-y-3">
        <div className="text-sm font-semibold">Comprador</div>
        {comprador ? (
          <div className="text-sm">
            <div className="font-semibold">{comprador.nome}</div>
            <div className="text-xs text-gray-600">{comprador.email || ""}</div>
            <button className="text-xs text-blue-700 mt-2" onClick={() => setComprador(null)}>
              Trocar comprador
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                className="border rounded-md px-2 py-1 text-sm flex-1"
                placeholder="Buscar comprador (2+ caracteres)"
                value={compradorQ}
                onChange={(e) => setCompradorQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarComprador()}
              />
              <button className="border rounded-md px-3 py-1 text-sm" onClick={buscarComprador}>
                Buscar
              </button>
            </div>

            {compradorSugestoes.length ? (
              <div className="border rounded-md p-2 space-y-1 max-h-52 overflow-auto">
                {compradorSugestoes.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left text-sm hover:bg-gray-50 rounded-md px-2 py-1"
                    onClick={() => {
                      setComprador(p);
                      setCompradorSugestoes([]);
                    }}
                  >
                    {p.nome} {p.email ? `— ${p.email}` : ""}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Itens */}
      <div className="border rounded-xl bg-white shadow-sm p-4 space-y-3">
        <div className="text-sm font-semibold">Itens da operação</div>

        {!bloqueiaCobranca ? (
          <>
            <div className="flex gap-2 items-center">
              <input
                className="border rounded-md px-2 py-1 text-sm flex-1"
                placeholder="Buscar produto (2+ caracteres)"
                value={produtoQ}
                onChange={(e) => setProdutoQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarProdutos()}
              />
              <button className="border rounded-md px-3 py-1 text-sm" onClick={buscarProdutos}>
                Buscar
              </button>
            </div>

            {produtoSugestoes.length ? (
              <div className="border rounded-md p-2 space-y-1 max-h-52 overflow-auto">
                {produtoSugestoes.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left text-sm hover:bg-gray-50 rounded-md px-2 py-1"
                    onClick={() => adicionarProduto(p)}
                  >
                    {p.nome} — {brl(p.preco_venda_centavos)}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="text-left py-2">Produto</th>
                    <th className="text-left py-2">Qtd</th>
                    <th className="text-left py-2">Preço</th>
                    <th className="text-left py-2">Total</th>
                    <th className="text-right py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it) => (
                    <tr key={it.produto.id} className="border-t">
                      <td className="py-2">{it.produto.nome}</td>
                      <td className="py-2">
                        <input
                          className="border rounded-md px-2 py-1 w-20"
                          type="number"
                          min={1}
                          value={it.quantidade}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            setItens((prev) =>
                              prev.map((x) =>
                                x.produto.id === it.produto.id ? { ...x, quantidade: v } : x,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="py-2">{brl(it.preco_unit_centavos)}</td>
                      <td className="py-2">{brl(it.quantidade * it.preco_unit_centavos)}</td>
                      <td className="py-2 text-right">
                        <button
                          className="text-xs text-red-600"
                          onClick={() =>
                            setItens((prev) => prev.filter((x) => x.produto.id !== it.produto.id))
                          }
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!itens.length ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-gray-600">
                        Nenhum item adicionado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            Em entrega administrativa, não há itens cobrados. (Se precisar registrar itens, isso
            vira uma fase futura de “entrega rastreável”.)
          </div>
        )}
      </div>

      {/* Pagamento */}
      <div className="border rounded-xl bg-white shadow-sm p-4 space-y-3">
        <div className="text-sm font-semibold">Pagamento</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-gray-600 mb-1">Forma de pagamento</div>
            <select
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={formaPagamento}
              disabled={bloqueiaCobranca}
              onChange={(e) => setFormaPagamento(e.target.value as any)}
            >
              <option value="CARTAO_CONEXAO">Cartão Conexão</option>
              <option value="CARTAO">Cartão</option>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Tipo de conta (Cartão Conexão)</div>
            <select
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={tipoContaConexao}
              disabled={bloqueiaCobranca || formaPagamento !== "CARTAO_CONEXAO"}
              onChange={(e) => setTipoContaConexao(e.target.value as any)}
            >
              <option value="ALUNO">Aluno</option>
              <option value="COLABORADOR">Colaborador</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-gray-600 mb-1">Parcelas (Cartão Conexão)</div>
            <select
              className="border rounded-md px-2 py-1 text-sm w-full"
              value={parcelas}
              disabled={bloqueiaCobranca || formaPagamento !== "CARTAO_CONEXAO"}
              onChange={(e) => setParcelas(Number(e.target.value) || 1)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
        </div>

        {formaPagamento === "CARTAO_CONEXAO" && !bloqueiaCobranca ? (
          <div className="text-xs text-gray-600">
            {loadingRegras ? (
              "Carregando regras de taxa..."
            ) : avisoTaxa ? (
              <span className="text-amber-700">{avisoTaxa}</span>
            ) : (
              "Taxa aplicada conforme Configurações Crédito Conexão."
            )}
          </div>
        ) : null}
      </div>

      {/* Resumo */}
      <div className="border rounded-xl bg-white shadow-sm p-4">
        <div className="text-sm font-semibold mb-2">Resumo</div>
        <div className="text-sm">
          Subtotal: <b>{brl(subtotalCentavos)}</b>
        </div>
        {formaPagamento === "CARTAO_CONEXAO" && !bloqueiaCobranca ? (
          <div className="text-sm">
            Taxa do parcelamento: <b>{brl(taxaCentavos)}</b>
          </div>
        ) : null}
        <div className="text-sm mt-1">
          Total final: <b>{brl(totalFinalCentavos)}</b>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            onClick={finalizar}
          >
            Finalizar operação
          </button>
        </div>
      </div>
    </div>
  );
}
