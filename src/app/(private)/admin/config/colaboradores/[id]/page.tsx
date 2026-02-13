"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ConfigFinanceira = {
  id: number;
  colaborador_id: number;
  gera_folha: boolean;
  dia_fechamento: number;
  dia_pagamento: number;
  pagamento_no_mes_seguinte: boolean;
  politica_desconto_cartao: "DESCONTA_NA_FOLHA" | "NAO_DESCONTA" | "MANUAL";
  politica_corte_cartao: "POR_DIA_FECHAMENTO" | "SEM_CORTE";
  tipo_remuneracao: "MENSAL" | "HORISTA";
  salario_base_centavos: number;
  valor_hora_centavos: number;
  ativo: boolean;
};

type Resumo = {
  colaborador: { id: number; pessoa_id: number; tipo_vinculo_id: number | null; ativo: boolean };
  pessoa: { id: number; nome: string; cpf: string | null; telefone: string | null; email: string | null };
  config_financeira: ConfigFinanceira | null;
  cartao_conexao: {
    id: number;
    tipo_conta: string;
    descricao_exibicao: string | null;
    dia_fechamento: number;
    dia_vencimento: number | null;
    ativo: boolean;
  } | null;
  faturas_recentes: Array<{
    id: number;
    periodo_referencia: string;
    valor_total_centavos: number;
    status: string;
    data_fechamento: string;
    data_vencimento: string | null;
    folha_pagamento_id: number | null;
  }>;
};

type ConfigForm = {
  gera_folha: boolean;
  dia_fechamento: number;
  dia_pagamento: number;
  pagamento_no_mes_seguinte: boolean;
  politica_desconto_cartao: "DESCONTA_NA_FOLHA" | "NAO_DESCONTA" | "MANUAL";
  politica_corte_cartao: "POR_DIA_FECHAMENTO" | "SEM_CORTE";
  tipo_remuneracao: "MENSAL" | "HORISTA";
  salario_base_centavos: number;
  valor_hora_centavos: number;
};

function brlFromCentavos(v: number): string {
  const n = v / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function defaultConfigForm(): ConfigForm {
  return {
    gera_folha: false,
    dia_fechamento: 31,
    dia_pagamento: 5,
    pagamento_no_mes_seguinte: true,
    politica_desconto_cartao: "DESCONTA_NA_FOLHA",
    politica_corte_cartao: "POR_DIA_FECHAMENTO",
    tipo_remuneracao: "MENSAL",
    salario_base_centavos: 0,
    valor_hora_centavos: 0,
  };
}

function toForm(cfg: ConfigFinanceira | null): ConfigForm {
  if (!cfg) return defaultConfigForm();
  return {
    gera_folha: cfg.gera_folha,
    dia_fechamento: cfg.dia_fechamento,
    dia_pagamento: cfg.dia_pagamento,
    pagamento_no_mes_seguinte: cfg.pagamento_no_mes_seguinte,
    politica_desconto_cartao: cfg.politica_desconto_cartao,
    politica_corte_cartao: cfg.politica_corte_cartao,
    tipo_remuneracao: cfg.tipo_remuneracao ?? "MENSAL",
    salario_base_centavos: cfg.salario_base_centavos ?? 0,
    valor_hora_centavos: cfg.valor_hora_centavos ?? 0,
  };
}

export default function ColaboradorDetalhesPage({ params }: { params: { id: string } }) {
  const colaboradorId = useMemo(() => Number(params.id), [params.id]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<ConfigForm>(defaultConfigForm());

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setErro(null);
        const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/resumo-financeiro`, { cache: "no-store" });
        const j = (await r.json()) as Partial<Resumo> & { error?: string };
        if (!r.ok) throw new Error(j?.error ?? "falha_carregar");
        if (alive) {
          const next = j as Resumo;
          setResumo(next);
          setFormConfig(toForm(next.config_financeira));
        }
      } catch (e) {
        if (alive) setErro(e instanceof Error ? e.message : "erro_desconhecido");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (Number.isFinite(colaboradorId) && colaboradorId > 0) void run();
    return () => {
      alive = false;
    };
  }, [colaboradorId]);

  async function salvarConfig() {
    if (!resumo || !Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    setSavingConfig(true);
    setConfigMsg(null);

    const payload: ConfigForm = {
      gera_folha: formConfig.gera_folha,
      dia_fechamento: Math.max(1, Math.min(31, Math.trunc(formConfig.dia_fechamento || 31))),
      dia_pagamento: Math.max(1, Math.min(31, Math.trunc(formConfig.dia_pagamento || 5))),
      pagamento_no_mes_seguinte: formConfig.pagamento_no_mes_seguinte,
      politica_desconto_cartao: formConfig.politica_desconto_cartao,
      politica_corte_cartao: formConfig.politica_corte_cartao,
      tipo_remuneracao: formConfig.tipo_remuneracao,
      salario_base_centavos: Math.max(0, Math.trunc(formConfig.salario_base_centavos || 0)),
      valor_hora_centavos: Math.max(0, Math.trunc(formConfig.valor_hora_centavos || 0)),
    };

    try {
      const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/config-financeira`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => null)) as
        | { config_financeira?: ConfigFinanceira; error?: string }
        | null;

      if (!r.ok) throw new Error(j?.error ?? "falha_salvar_config");
      if (j?.config_financeira) {
        setResumo((prev) => (prev ? { ...prev, config_financeira: j.config_financeira ?? null } : prev));
        setFormConfig(toForm(j.config_financeira ?? null));
      }
      setConfigMsg("Perfil de pagamento atualizado.");
      setEditMode(false);
    } catch (e) {
      setConfigMsg(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Perfil do colaborador</h1>
              <p className="text-sm text-slate-600">
                Informacoes gerais, cartao conexao e perfil de pagamento.
              </p>
            </div>
            <div className="flex gap-2">
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/config/colaboradores">
                Voltar
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Carregando...</div>
        ) : erro ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm text-red-600">{erro}</div>
        ) : !resumo ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Sem dados.</div>
        ) : (
          <>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Identificacao</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Nome</div>
                  <div className="font-medium">{resumo.pessoa.nome}</div>
                  <div className="mt-2 text-xs text-slate-500">Contato</div>
                  <div className="text-sm text-slate-700">
                    {resumo.pessoa.telefone ?? "-"} - {resumo.pessoa.email ?? "-"}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="font-medium">{resumo.colaborador.ativo ? "Ativo" : "Inativo"}</div>
                  <div className="mt-2 text-xs text-slate-500">Pessoa ID</div>
                  <div className="text-sm text-slate-700">{resumo.pessoa.id}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Perfil de pagamento</h2>
                  <p className="text-sm text-slate-600">
                    Define regras da folha e tipo de remuneracao do colaborador.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    if (editMode) setFormConfig(toForm(resumo.config_financeira));
                    setEditMode((v) => !v);
                    setConfigMsg(null);
                  }}
                >
                  {editMode ? "Cancelar edicao" : "Editar configuracao"}
                </button>
              </div>

              {!editMode ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-slate-500">Gera folha automaticamente</div>
                    <div className="font-medium">{resumo.config_financeira?.gera_folha ? "Sim" : "Nao"}</div>

                    <div className="mt-3 text-xs text-slate-500">Fechamento / Pagamento</div>
                    <div className="text-sm text-slate-700">
                      Fecha dia {resumo.config_financeira?.dia_fechamento ?? "-"} - Paga dia{" "}
                      {resumo.config_financeira?.dia_pagamento ?? "-"}{" "}
                      {resumo.config_financeira?.pagamento_no_mes_seguinte ? "(mes seguinte)" : "(mesmo mes)"}
                    </div>

                    <div className="mt-3 text-xs text-slate-500">Tipo de remuneracao</div>
                    <div className="text-sm text-slate-700">{resumo.config_financeira?.tipo_remuneracao ?? "MENSAL"}</div>

                    {resumo.config_financeira?.tipo_remuneracao === "HORISTA" ? (
                      <>
                        <div className="mt-3 text-xs text-slate-500">Valor hora</div>
                        <div className="text-sm text-slate-700">
                          {brlFromCentavos(Number(resumo.config_financeira?.valor_hora_centavos ?? 0))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-3 text-xs text-slate-500">Salario base</div>
                        <div className="text-sm text-slate-700">
                          {brlFromCentavos(Number(resumo.config_financeira?.salario_base_centavos ?? 0))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-slate-500">Politica do Cartao Conexao</div>
                    <div className="text-sm text-slate-700">
                      {resumo.config_financeira?.politica_desconto_cartao ?? "-"} -{" "}
                      {resumo.config_financeira?.politica_corte_cartao ?? "-"}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Acoes rapidas</div>
                    <div className="flex gap-2">
                      <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/folha/colaboradores">
                        Ir para Folha
                      </Link>
                      {resumo.cartao_conexao?.id && resumo.faturas_recentes?.[0]?.id ? (
                        <Link
                          className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                          href={`/admin/financeiro/credito-conexao/faturas/${resumo.faturas_recentes[0].id}`}
                        >
                          Ver ultima fatura
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-500">Sem Cartao Conexao COLABORADOR</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formConfig.gera_folha}
                        onChange={(e) => setFormConfig((prev) => ({ ...prev, gera_folha: e.target.checked }))}
                      />
                      Gera folha automaticamente
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formConfig.pagamento_no_mes_seguinte}
                        onChange={(e) =>
                          setFormConfig((prev) => ({ ...prev, pagamento_no_mes_seguinte: e.target.checked }))
                        }
                      />
                      Pagamento no mes seguinte
                    </label>

                    <label className="text-sm">
                      Dia de fechamento
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        type="number"
                        min={1}
                        max={31}
                        value={formConfig.dia_fechamento}
                        onChange={(e) =>
                          setFormConfig((prev) => ({ ...prev, dia_fechamento: Number(e.target.value || 31) }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      Dia de pagamento
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        type="number"
                        min={1}
                        max={31}
                        value={formConfig.dia_pagamento}
                        onChange={(e) =>
                          setFormConfig((prev) => ({ ...prev, dia_pagamento: Number(e.target.value || 5) }))
                        }
                      />
                    </label>

                    <label className="text-sm">
                      Tipo de remuneracao
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={formConfig.tipo_remuneracao}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            tipo_remuneracao: e.target.value as "MENSAL" | "HORISTA",
                          }))
                        }
                      >
                        <option value="MENSAL">MENSAL</option>
                        <option value="HORISTA">HORISTA</option>
                      </select>
                    </label>

                    {formConfig.tipo_remuneracao === "HORISTA" ? (
                      <label className="text-sm">
                        Valor hora (centavos)
                        <input
                          className="mt-1 w-full rounded-md border px-3 py-2"
                          type="number"
                          min={0}
                          value={formConfig.valor_hora_centavos}
                          onChange={(e) =>
                            setFormConfig((prev) => ({ ...prev, valor_hora_centavos: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                    ) : (
                      <label className="text-sm">
                        Salario base (centavos)
                        <input
                          className="mt-1 w-full rounded-md border px-3 py-2"
                          type="number"
                          min={0}
                          value={formConfig.salario_base_centavos}
                          onChange={(e) =>
                            setFormConfig((prev) => ({ ...prev, salario_base_centavos: Number(e.target.value || 0) }))
                          }
                        />
                      </label>
                    )}

                    <label className="text-sm">
                      Politica desconto cartao
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={formConfig.politica_desconto_cartao}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            politica_desconto_cartao: e.target.value as ConfigForm["politica_desconto_cartao"],
                          }))
                        }
                      >
                        <option value="DESCONTA_NA_FOLHA">DESCONTA_NA_FOLHA</option>
                        <option value="NAO_DESCONTA">NAO_DESCONTA</option>
                        <option value="MANUAL">MANUAL</option>
                      </select>
                    </label>

                    <label className="text-sm md:col-span-2">
                      Politica corte cartao
                      <select
                        className="mt-1 w-full rounded-md border px-3 py-2"
                        value={formConfig.politica_corte_cartao}
                        onChange={(e) =>
                          setFormConfig((prev) => ({
                            ...prev,
                            politica_corte_cartao: e.target.value as ConfigForm["politica_corte_cartao"],
                          }))
                        }
                      >
                        <option value="POR_DIA_FECHAMENTO">POR_DIA_FECHAMENTO</option>
                        <option value="SEM_CORTE">SEM_CORTE</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
                      onClick={() => void salvarConfig()}
                      disabled={savingConfig}
                    >
                      {savingConfig ? "Salvando..." : "Salvar"}
                    </button>
                    {configMsg ? <span className="text-sm text-slate-700">{configMsg}</span> : null}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Cartao Conexao - Faturas recentes</h2>
              {!resumo.cartao_conexao ? (
                <div className="mt-3 text-sm text-slate-600">
                  Nenhuma conta do tipo COLABORADOR encontrada para esta pessoa.
                </div>
              ) : resumo.faturas_recentes.length === 0 ? (
                <div className="mt-3 text-sm text-slate-600">Nenhuma fatura recente.</div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Periodo</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                        <th className="px-3 py-2 text-left">Vinculada na folha</th>
                        <th className="px-3 py-2 text-right">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.faturas_recentes.map((f) => (
                        <tr key={f.id} className="border-t">
                          <td className="px-3 py-2">{f.periodo_referencia}</td>
                          <td className="px-3 py-2">{f.status}</td>
                          <td className="px-3 py-2 text-right">{brlFromCentavos(f.valor_total_centavos)}</td>
                          <td className="px-3 py-2">{f.folha_pagamento_id ? `Folha #${f.folha_pagamento_id}` : "-"}</td>
                          <td className="px-3 py-2 text-right">
                            <Link className="text-purple-700 hover:underline" href={`/admin/financeiro/credito-conexao/faturas/${f.id}`}>
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
