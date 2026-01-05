"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type ConfigRow = {
  tipo_conta: TipoConta;
  dia_fechamento: number;
  dia_vencimento: number;
  tolerancia_dias: number;
  multa_percentual: number;
  juros_dia_percentual: number;
  ativo: boolean;
};

export default function ConfiguracoesCreditoConexaoPage() {
  const [regras, setRegras] = useState<RegraParcelamento[]>([]);
  const [loadingRegras, setLoadingRegras] = useState(false);
  const [savingRegra, setSavingRegra] = useState(false);
  const [erroRegra, setErroRegra] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TipoConta>("ALUNO");
  const [configs, setConfigs] = useState<Record<TipoConta, ConfigRow | null>>({
    ALUNO: null,
    COLABORADOR: null,
  });
  const [erroConfig, setErroConfig] = useState<string | null>(null);

  const currentConfig = useMemo(() => configs[activeTab], [configs, activeTab]);

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

  useEffect(() => {
    void (async () => {
      setLoadingConfig(true);
      setErroConfig(null);
      try {
        const res = await fetch("/api/admin/credito-conexao/configuracoes");
        const json = (await res.json()) as { ok?: boolean; data?: ConfigRow[] };
        const data = json.data ?? [];
        const aluno = data.find((x) => x.tipo_conta === "ALUNO") ?? null;
        const colab = data.find((x) => x.tipo_conta === "COLABORADOR") ?? null;
        setConfigs({ ALUNO: aluno, COLABORADOR: colab });
      } catch (e: unknown) {
        console.error("Erro ao carregar configuracoes do cartao", e);
        setErroConfig("Erro ao carregar configuracoes do cartao.");
      } finally {
        setLoadingConfig(false);
      }
    })();
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

  async function salvarConfig(tipo: TipoConta) {
    const cfg = configs[tipo];
    if (!cfg) return;
    setSavingConfig(true);
    setErroConfig(null);
    try {
      const res = await fetch("/api/admin/credito-conexao/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const json = (await res.json()) as { ok?: boolean; data?: ConfigRow; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setErroConfig(`Falha ao salvar: ${json.error ?? "erro_desconhecido"}`);
        return;
      }
      setConfigs((prev) => ({ ...prev, [tipo]: json.data! }));
    } catch (e: unknown) {
      console.error("Erro ao salvar configuracoes do cartao", e);
      setErroConfig("Erro ao salvar configuracoes do cartao.");
    } finally {
      setSavingConfig(false);
    }
  }

  function updateConfigField<K extends keyof ConfigRow>(tipo: TipoConta, key: K, value: ConfigRow[K]) {
    setConfigs((prev) => {
      const cur = prev[tipo];
      if (!cur) return prev;
      return { ...prev, [tipo]: { ...cur, [key]: value } };
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cartao Conexao - Configuracoes</h1>
        <p className="text-sm text-gray-600">
          Ajuste o ciclo do cartao e a politica institucional de atraso, alem das regras de parcelamento.
        </p>
      </div>

      {erroConfig && <div className="text-sm text-red-600">{erroConfig}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Ciclo e Politica do Cartao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Multa e juros nao sao aplicados automaticamente ainda; servem como politica institucional e base para fase futura.
          </div>
          {loadingConfig || !currentConfig ? (
            <div className="mt-4 text-sm text-muted-foreground">Carregando configuracoes...</div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALUNO")}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    activeTab === "ALUNO" ? "bg-slate-900 text-white" : "bg-white"
                  }`}
                >
                  ALUNO
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("COLABORADOR")}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    activeTab === "COLABORADOR" ? "bg-slate-900 text-white" : "bg-white"
                  }`}
                >
                  COLABORADOR
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Dia de fechamento</div>
                  <Input
                    type="number"
                    value={currentConfig.dia_fechamento}
                    onChange={(e) => updateConfigField(activeTab, "dia_fechamento", Number(e.target.value))}
                    min={1}
                    max={31}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Dia de vencimento</div>
                  <Input
                    type="number"
                    value={currentConfig.dia_vencimento}
                    onChange={(e) => updateConfigField(activeTab, "dia_vencimento", Number(e.target.value))}
                    min={1}
                    max={31}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Tolerancia (dias)</div>
                  <Input
                    type="number"
                    value={currentConfig.tolerancia_dias}
                    onChange={(e) => updateConfigField(activeTab, "tolerancia_dias", Number(e.target.value))}
                    min={0}
                    max={30}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Multa (%)</div>
                  <Input
                    type="number"
                    value={currentConfig.multa_percentual}
                    onChange={(e) => updateConfigField(activeTab, "multa_percentual", Number(e.target.value))}
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Juros ao dia (%)</div>
                  <Input
                    type="number"
                    value={currentConfig.juros_dia_percentual}
                    onChange={(e) => updateConfigField(activeTab, "juros_dia_percentual", Number(e.target.value))}
                    min={0}
                    step="0.01"
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={() => void salvarConfig(activeTab)} disabled={savingConfig}>
                    {savingConfig ? "Salvando..." : "Salvar configuracoes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {erroRegra && <div className="text-sm text-red-600">{erroRegra}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Regras de parcelamento</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
}
