"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CicloPoliticaCard } from "./CicloPoliticaCard";

type TipoConta = "ALUNO" | "COLABORADOR";

type RegraParcelamento = {
  id?: number;
  tipo_conta: TipoConta;
  numero_parcelas_min: number;
  numero_parcelas_max: number;
  valor_minimo_centavos: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  ativo: boolean;
};

export default function Page() {
  const [regras, setRegras] = useState<RegraParcelamento[]>([]);
  const [loadingRegras, setLoadingRegras] = useState(false);
  const [savingRegra, setSavingRegra] = useState(false);
  const [erroRegra, setErroRegra] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [form, setForm] = useState<RegraParcelamento>({
    tipo_conta: "ALUNO",
    numero_parcelas_min: 2,
    numero_parcelas_max: 2,
    valor_minimo_centavos: 0,
    taxa_percentual: 0,
    taxa_fixa_centavos: 0,
    ativo: true,
  });

  function resetForm() {
    setForm({
      tipo_conta: "ALUNO",
      numero_parcelas_min: 2,
      numero_parcelas_max: 2,
      valor_minimo_centavos: 0,
      taxa_percentual: 0,
      taxa_fixa_centavos: 0,
      ativo: true,
    });
    setEditandoId(null);
    setErroRegra(null);
  }

  async function carregarRegras() {
    try {
      setLoadingRegras(true);
      setErroRegra(null);

      const res = await fetch("/api/financeiro/credito-conexao/regras-parcelas?ativo=true");
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      setRegras(json.regras ?? []);
    } catch (e: unknown) {
      console.error("Erro ao carregar regras de parcelamento", e);
      setErroRegra("Erro ao carregar regras de parcelamento.");
    } finally {
      setLoadingRegras(false);
    }
  }

  useEffect(() => {
    carregarRegras();
  }, []);

  function editarRegra(regra: RegraParcelamento) {
    setEditandoId(regra.id ?? null);
    setForm({
      id: regra.id,
      tipo_conta: regra.tipo_conta,
      numero_parcelas_min: regra.numero_parcelas_min,
      numero_parcelas_max: regra.numero_parcelas_max,
      valor_minimo_centavos: regra.valor_minimo_centavos,
      taxa_percentual: regra.taxa_percentual,
      taxa_fixa_centavos: regra.taxa_fixa_centavos,
      ativo: regra.ativo,
    });
    setErroRegra(null);
  }

  function formatCurrencyFromCentavos(c: number) {
    return (c / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  async function salvarRegra(e: FormEvent) {
    e.preventDefault();
    try {
      setSavingRegra(true);
      setErroRegra(null);

      const payload = {
        id: editandoId ?? undefined,
        tipo_conta: form.tipo_conta,
        numero_parcelas_min: Number(form.numero_parcelas_min) || 1,
        numero_parcelas_max: Number(form.numero_parcelas_max) || 1,
        valor_minimo_centavos: Number(form.valor_minimo_centavos) || 0,
        taxa_percentual: Number(form.taxa_percentual) || 0,
        taxa_fixa_centavos: Number(form.taxa_fixa_centavos) || 0,
        ativo: form.ativo,
      };

      const res = await fetch("/api/financeiro/credito-conexao/regras-parcelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Erro ao salvar regra de parcelamento", await res.text());
        setErroRegra("Erro ao salvar regra de parcelamento.");
        return;
      }

      await carregarRegras();
      resetForm();
    } catch (e: unknown) {
      console.error("Erro ao salvar regra de parcelamento", e);
      setErroRegra("Erro ao salvar regra de parcelamento.");
    } finally {
      setSavingRegra(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cartao Conexao - Configuracoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Defina o ciclo institucional do Cartao Conexao (fechamento e vencimento) e mantenha as regras de
              parcelamento. Este painel governa a emissao de faturas mensais e a politica declarativa de atraso.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entenda esta tela</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-slate-900">Ciclo do cartao</span>: define o dia de fechamento e o dia
                de vencimento por tipo de conta (Aluno/Colaborador).
              </li>
              <li>
                <span className="font-medium text-slate-900">Multa e juros</span>: sao parametros institucionais
                declarativos nesta fase (nao aplicados automaticamente).
              </li>
              <li>
                <span className="font-medium text-slate-900">Parcelamento</span>: define taxas minimas/maximas e
                condicoes para compras parceladas no Cartao Conexao.
              </li>
            </ul>
          </CardContent>
        </Card>

        <CicloPoliticaCard />

        <Card>
          <CardHeader>
            <CardTitle>Regras de parcelamento</CardTitle>
          </CardHeader>
          <CardContent>
            {erroRegra && <div className="text-sm text-red-600">{erroRegra}</div>}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
            <div className="border rounded-xl bg-white shadow-sm">
              {loadingRegras ? (
                <div className="p-4 text-sm text-gray-600">Carregando regras...</div>
              ) : regras.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">Nenhuma regra cadastrada.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Parcelas</th>
                        <th className="px-3 py-2 text-left">Valor minimo</th>
                        <th className="px-3 py-2 text-left">Taxa %</th>
                        <th className="px-3 py-2 text-left">Taxa fixa</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-center">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regras.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-3 py-2">{r.tipo_conta}</td>
                          <td className="px-3 py-2">
                            {r.numero_parcelas_min === r.numero_parcelas_max
                              ? `${r.numero_parcelas_min}x`
                              : `${r.numero_parcelas_min}x ate ${r.numero_parcelas_max}x`}
                          </td>
                          <td className="px-3 py-2">
                            {formatCurrencyFromCentavos(r.valor_minimo_centavos)}
                          </td>
                          <td className="px-3 py-2">{r.taxa_percentual.toFixed(2)} %</td>
                          <td className="px-3 py-2">
                            {formatCurrencyFromCentavos(r.taxa_fixa_centavos)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                r.ativo
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {r.ativo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => editarRegra(r)}
                              className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border rounded-xl bg-white shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  {editandoId ? `Editar regra #${editandoId}` : "Nova regra de parcelamento"}
                </h2>
                {editandoId && (
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={resetForm}
                  >
                    Limpar / Nova
                  </button>
                )}
              </div>

              <form className="space-y-3" onSubmit={salvarRegra}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Tipo de conta *
                    </label>
                    <select
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.tipo_conta}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tipo_conta: e.target.value as TipoConta,
                        }))
                      }
                    >
                      <option value="ALUNO">Aluno (responsaveis/alunos)</option>
                      <option value="COLABORADOR">Colaborador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Valor minimo (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.valor_minimo_centavos != null ? form.valor_minimo_centavos / 100 : ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          valor_minimo_centavos: e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Parcelas minimas
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.numero_parcelas_min}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          numero_parcelas_min: Number(e.target.value) || 1,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Parcelas maximas
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.numero_parcelas_max}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          numero_parcelas_max: Number(e.target.value) || 1,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Taxa %</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.taxa_percentual}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          taxa_percentual: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Taxa fixa (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full border rounded-md px-2 py-1 text-sm"
                      value={form.taxa_fixa_centavos / 100}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          taxa_fixa_centavos: e.target.value
                            ? Math.round(Number(e.target.value) * 100)
                            : 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="regra-ativa"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.ativo}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ativo: e.target.checked,
                      }))
                    }
                  />
                  <label htmlFor="regra-ativa" className="text-xs text-gray-700">
                    Regra ativa
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingRegra}
                    className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingRegra ? "Salvando..." : "Salvar regra"}
                  </button>
                </div>
              </form>
            </div>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
