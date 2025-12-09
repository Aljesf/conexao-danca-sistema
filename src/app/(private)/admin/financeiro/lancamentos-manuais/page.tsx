"use client";

import { useMemo, useState } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type CentroCusto = { id: number; nome: string };
type ContaFinanceira = { id: number; centroCustoId: number; nome: string };
type TipoMovimento = "RECEITA" | "DESPESA";
type Categoria = { id: number; nome: string; tipo: TipoMovimento };

type AjusteManual = {
  id: number;
  dataMovimento: string;
  tipo: TipoMovimento;
  centroCustoId: number;
  contaFinanceiraId: number;
  categoriaId?: number | null;
  valorCentavos: number;
  descricao: string;
  usuarioId?: number | null;
};

const centros: CentroCusto[] = [
  { id: 1, nome: "Escola" },
  { id: 2, nome: "Loja" },
  { id: 3, nome: "Café" },
];

const contasFinanceiras: ContaFinanceira[] = [
  { id: 1, centroCustoId: 1, nome: "Caixa Escola" },
  { id: 2, centroCustoId: 1, nome: "Bradesco 1234" },
  { id: 3, centroCustoId: 2, nome: "Conta Loja" },
  { id: 4, centroCustoId: 3, nome: "Caixa Café" },
];

const categorias: Categoria[] = [
  { id: 1, nome: "Mensalidade", tipo: "RECEITA" },
  { id: 2, nome: "Venda loja", tipo: "RECEITA" },
  { id: 3, nome: "Salário professor", tipo: "DESPESA" },
  { id: 4, nome: "Reposição estoque", tipo: "DESPESA" },
];

const seedAjustes: AjusteManual[] = [
  {
    id: 1,
    dataMovimento: "2025-10-05T09:00",
    tipo: "DESPESA",
    centroCustoId: 1,
    contaFinanceiraId: 1,
    categoriaId: 3,
    valorCentavos: 2500,
    descricao: "Diferença de caixa manhã",
    usuarioId: null,
  },
  {
    id: 2,
    dataMovimento: "2025-10-05T12:00",
    tipo: "RECEITA",
    centroCustoId: 3,
    contaFinanceiraId: 4,
    categoriaId: 2,
    valorCentavos: 4500,
    descricao: "Reembolso insumo café",
    usuarioId: null,
  },
];

function formatBRL(v: number) {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function LancamentosManuaisPage() {
  const [ajustes, setAjustes] = useState<AjusteManual[]>(seedAjustes);
  const [form, setForm] = useState({
    centroCustoId: centros[0].id,
    contaFinanceiraId: contasFinanceiras.find((c) => c.centroCustoId === centros[0].id)?.id ?? 0,
    tipo: "RECEITA" as TipoMovimento,
    categoriaId: undefined as number | undefined,
    valorReais: "0,00",
    dataMovimento: new Date().toISOString().slice(0, 16),
    descricao: "",
  });

  const contasDoCentro = useMemo(
    () => contasFinanceiras.filter((c) => c.centroCustoId === form.centroCustoId),
    [form.centroCustoId]
  );

  const categoriasDoTipo = useMemo(() => categorias.filter((c) => c.tipo === form.tipo), [form.tipo]);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao.trim()) return;
    const valorCentavos = Math.round(Number(form.valorReais.replace(/\./g, "").replace(",", ".")) * 100);
    const novo: AjusteManual = {
      id: ajustes.length ? Math.max(...ajustes.map((a) => a.id)) + 1 : 1,
      dataMovimento: form.dataMovimento,
      tipo: form.tipo,
      centroCustoId: form.centroCustoId,
      contaFinanceiraId: form.contaFinanceiraId,
      categoriaId: form.categoriaId ?? null,
      valorCentavos,
      descricao: form.descricao,
      usuarioId: null, // TODO: preencher com o ID do usuário logado quando o contexto de autenticação estiver disponível.
    };
    setAjustes((prev) => [novo, ...prev]);
    setForm({
      ...form,
      valorReais: "0,00",
      descricao: "",
    });
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Lançamentos manuais / Ajustes de caixa</h1>
          <p className="text-sm text-slate-600">
            Registre correções pontuais no caixa (diferenças, reembolsos, consumo de professor, sangria de caixa). Os
            lançamentos são gravados na tabela movimento_financeiro com origem = AJUSTE_MANUAL.
          </p>
        </div>

        <FinanceHelpCard
          subtitle="Ajustes e correções de caixa."
          items={[
            "Registre pequenos gastos, consumos internos e diferenças de caixa.",
            "Informe centro de custo e conta financeira (ex.: Caixa Escola).",
            "Escolha RECEITA ou DESPESA corretamente.",
            "Descreva claramente o motivo do ajuste.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Novo lançamento manual</h3>
          <p className="text-sm text-slate-600">Preencha o formulário para inserir no movimento_financeiro.</p>
          <form onSubmit={salvar} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Centro de custo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.centroCustoId}
                onChange={(e) => {
                  const novoCentro = Number(e.target.value);
                  const conta = contasFinanceiras.find((c) => c.centroCustoId === novoCentro);
                  setForm((prev) => ({
                    ...prev,
                    centroCustoId: novoCentro,
                    contaFinanceiraId: conta?.id ?? 0,
                  }));
                }}
              >
                {centros.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Conta financeira
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.contaFinanceiraId}
                onChange={(e) => setForm({ ...form, contaFinanceiraId: Number(e.target.value) })}
              >
                {contasDoCentro.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Tipo
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.tipo}
                onChange={(e) => {
                  const novoTipo = e.target.value as TipoMovimento;
                  setForm({
                    ...form,
                    tipo: novoTipo,
                    categoriaId: categorias.find((c) => c.tipo === novoTipo)?.id,
                  });
                }}
              >
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Categoria (opcional)
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.categoriaId ?? ""}
                onChange={(e) =>
                  setForm({ ...form, categoriaId: e.target.value ? Number(e.target.value) : undefined })
                }
              >
                <option value="">Sem categoria</option>
                {categoriasDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Valor (R$)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.valorReais}
                onChange={(e) => setForm({ ...form, valorReais: e.target.value })}
                placeholder="0,00"
              />
            </label>

            <label className="text-sm text-slate-700">
              Data do movimento
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={form.dataMovimento}
                onChange={(e) => setForm({ ...form, dataMovimento: e.target.value })}
              />
            </label>

            <label className="md:col-span-2 text-sm text-slate-700">
              Descrição
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                rows={3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: diferença de caixa, consumo de professor, reembolso"
              />
            </label>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow"
              >
                Salvar lançamento
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    valorReais: "0,00",
                    descricao: "",
                  })
                }
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Últimos ajustes manuais</h3>
          <p className="text-sm text-slate-600">Itens inseridos com origem = AJUSTE_MANUAL no movimento_financeiro.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Data</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Centro</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Conta financeira</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Valor</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Descrição</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ajustes.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{a.dataMovimento}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          a.tipo === "RECEITA" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {a.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{centros.find((c) => c.id === a.centroCustoId)?.nome}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {contasFinanceiras.find((c) => c.id === a.contaFinanceiraId)?.nome}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{formatBRL(a.valorCentavos)}</td>
                    <td className="px-3 py-2 text-slate-700">{a.descricao}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {a.usuarioId ? `Usuário #${a.usuarioId}` : "A definir"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
