"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SystemContextCard } from "@/components/system/SystemContextCard";
import { SystemHelpCard } from "@/components/system/SystemHelpCard";
import { SystemPage } from "@/components/system/SystemPage";
import { SystemSectionCard } from "@/components/system/SystemSectionCard";

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
  colaborador: { id: number; pessoa_id: number; tipo_vinculo_id: number | null; ativo: boolean; pessoa_nome?: string | null };
  pessoa: { id: number; nome: string; cpf: string | null; telefone: string | null; email: string | null; foto_url?: string | null };
  periodo_atual?: string | null;
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
    cobranca_id?: number | null;
  }>;
  conta_interna?: {
    existe: boolean;
    id: number | null;
    tipo_conta: string;
    situacao_atual: string;
    dia_fechamento: number | null;
    dia_vencimento: number | null;
  };
  saldo_em_aberto_total_centavos?: number;
  total_faturado_mes_centavos?: number;
  itens_em_aberto_por_origem?: {
    cafe: { quantidade: number; total_centavos: number };
    loja: { quantidade: number; total_centavos: number };
    escola: { quantidade: number; total_centavos: number };
    outros?: { quantidade: number; total_centavos: number };
  };
  competencias_em_aberto?: string[];
  ultima_importacao_para_folha?: {
    referencia_id: number | null;
    competencia: string | null;
    status: string | null;
  } | null;
  status_configuracao_pagamento?: {
    possui_config_financeira: boolean;
    gera_folha: boolean;
    possui_conta_interna: boolean;
    politica_desconto_cartao: string | null;
    politica_corte_cartao: string | null;
  };
  ultimos_lancamentos?: Array<{
    id: number;
    descricao: string | null;
    origem_sistema: string | null;
    valor_centavos: number;
    data_lancamento: string | null;
    status: string | null;
    cobranca_id: number | null;
  }>;
  faturas_abertas?: Array<{
    id: number;
    periodo_referencia: string;
    valor_total_centavos: number;
    status: string;
    folha_pagamento_id: number | null;
    cobranca_id?: number | null;
  }>;
  faturas_fechadas_recentes?: Array<{
    id: number;
    periodo_referencia: string;
    valor_total_centavos: number;
    status: string;
    folha_pagamento_id: number | null;
    cobranca_id?: number | null;
  }>;
  folhas_recentes?: Array<{
    id: number;
    competencia_ano_mes: string;
    status: string;
    data_fechamento: string | null;
    data_pagamento: string | null;
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

export default function ColaboradorDetalhesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const colaboradorId = useMemo(() => Number(params?.id), [params?.id]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingContaInterna, setCreatingContaInterna] = useState(false);
  const [startingFolha, setStartingFolha] = useState(false);
  const [msgAcao, setMsgAcao] = useState<string | null>(null);
  const [configMsg, setConfigMsg] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState<ConfigForm>(defaultConfigForm());
  const [uploadingFoto, setUploadingFoto] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setErro(null);
        const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/financeiro-resumo`, { cache: "no-store" });
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

  async function recarregarResumo() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/financeiro-resumo`, { cache: "no-store" });
    const j = (await r.json()) as Partial<Resumo> & { error?: string };
    if (!r.ok) throw new Error(j?.error ?? "falha_carregar");
    const next = j as Resumo;
    setResumo(next);
    setFormConfig(toForm(next.config_financeira));
  }

  async function uploadFotoPessoa(file: File) {
    if (!resumo?.pessoa?.id) return;
    setUploadingFoto(true);
    setConfigMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const r = await fetch(`/api/pessoas/${resumo.pessoa.id}/foto`, { method: "POST", body: form });
      const j = (await r.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!r.ok) throw new Error(j?.error ?? "falha_upload_foto");

      await recarregarResumo();
      setConfigMsg("Foto atualizada.");
    } catch (e) {
      setConfigMsg(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setUploadingFoto(false);
    }
  }

  function competenciaAtualYYYYMM(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  async function criarContaInternaColaborador() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    setCreatingContaInterna(true);
    setMsgAcao(null);
    try {
      const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/criar-conta-colaborador`, {
        method: "POST",
      });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) throw new Error(j?.error ?? "falha_criar_conta_colaborador");
      await recarregarResumo();
      setMsgAcao("Conta interna (COLABORADOR) criada/validada com sucesso.");
    } catch (e) {
      setMsgAcao(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setCreatingContaInterna(false);
    }
  }

  async function iniciarGeracaoFolhaMesAtual() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;

    const competencia = resumo?.periodo_atual || competenciaAtualYYYYMM();
    setStartingFolha(true);
    setMsgAcao(null);

    try {
      const r1 = await fetch("/api/financeiro/folha/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia,
          dia_pagamento: 5,
          pagamento_no_mes_seguinte: true,
        }),
      });
      const j1 = (await r1.json().catch(() => null)) as { folha?: { id: number }; error?: string } | null;
      if (!r1.ok) throw new Error(j1?.error ?? "falha_abrir_folha");

      const r2 = await fetch("/api/financeiro/folha/gerar-espelho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia_base: competencia,
          meses: 1,
          importar_cartao: true,
        }),
      });
      const j2 = (await r2.json().catch(() => null)) as
        | { folhas?: Array<{ id: number; competencia?: string }>; error?: string; imported_cartao_total?: number }
        | null;
      if (!r2.ok) throw new Error(j2?.error ?? "falha_gerar_espelho");

      const folhasResp = Array.isArray(j2?.folhas) ? j2.folhas : [];
      const folhaDoMes = folhasResp.find((f) => String(f.competencia ?? "") === competencia);
      const folhaId = folhaDoMes?.id ?? j1?.folha?.id;
      if (!folhaId || !Number.isFinite(folhaId)) {
        setMsgAcao("Folha criada, mas nao consegui resolver o ID para abrir o detalhe. Abra manualmente na tela de Folha.");
        return;
      }

      setMsgAcao(
        `Folha da competencia ${competencia} iniciada. Itens de conta interna importados: ${Number(j2?.imported_cartao_total ?? 0)}.`,
      );
      router.push(`/admin/financeiro/folha/colaboradores/${folhaId}`);
    } catch (e) {
      setMsgAcao(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setStartingFolha(false);
    }
  }

  return (
    <SystemPage>
      <SystemContextCard
        title="Perfil do colaborador"
        subtitle="Informacoes gerais, conta interna e perfil de pagamento."
      >
        <div className="flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/config/colaboradores">
            Voltar
          </Link>
        </div>
      </SystemContextCard>

      <SystemHelpCard
        items={[
          "Use Alterar foto para identificar professores e equipe rapidamente.",
          "Conta interna mostra a conta do Credito Conexao (COLABORADOR) e suas faturas.",
          "Se o colaborador nao apareceu na folha, use Iniciar geracao da folha (mes atual).",
        ]}
      />

      {loading ? (
        <SystemSectionCard title="Carregando">
          <div className="text-sm text-slate-700">Carregando...</div>
        </SystemSectionCard>
      ) : erro ? (
        <SystemSectionCard title="Erro">
          <div className="text-sm text-red-600">{erro}</div>
        </SystemSectionCard>
      ) : !resumo ? (
        <SystemSectionCard title="Sem dados">
          <div className="text-sm text-slate-700">Sem dados.</div>
        </SystemSectionCard>
      ) : (
        <>
          <SystemSectionCard title="Identificacao" description="Dados basicos e foto do colaborador.">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full border bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-700">
                    {resumo.pessoa.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resumo.pessoa.foto_url} alt={resumo.pessoa.nome ?? "Foto"} className="h-full w-full object-cover" />
                    ) : (
                      (resumo.pessoa.nome ?? "CD")
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-500">Nome</div>
                    <div className="font-medium truncate">{resumo.pessoa.nome}</div>

                    <div className="mt-2 text-xs text-slate-500">Contato</div>
                    <div className="text-sm text-slate-700">
                      {resumo.pessoa.telefone ?? "-"} - {resumo.pessoa.email ?? "-"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-center">
                      {uploadingFoto ? "Enviando..." : "Alterar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFoto}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadFotoPessoa(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Status</div>
                <div className="font-medium">{resumo.colaborador.ativo ? "Ativo" : "Inativo"}</div>
                <div className="mt-2 text-xs text-slate-500">Pessoa ID</div>
                <div className="text-sm text-slate-700">{resumo.pessoa.id}</div>
              </div>
            </div>
          </SystemSectionCard>

          <SystemSectionCard title="Perfil de pagamento" description="Define regras da folha e tipo de remuneracao do colaborador.">
            <div className="flex flex-wrap items-center justify-end gap-2">
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Politica da conta interna</div>
                  <div className="text-sm text-slate-700">
                    {resumo.config_financeira?.politica_desconto_cartao ?? "-"} -{" "}
                    {resumo.config_financeira?.politica_corte_cartao ?? "-"}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Conta interna:{" "}
                    <span className="font-medium">
                      {resumo.cartao_conexao
                        ? `#${resumo.cartao_conexao.id} (${resumo.cartao_conexao.tipo_conta})`
                        : "Nao criada"}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">Acoes rapidas</div>
                  {msgAcao ? <div className="mt-2 text-xs text-slate-600">{msgAcao}</div> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {!resumo.cartao_conexao ? (
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                        disabled={creatingContaInterna}
                        onClick={() => void criarContaInternaColaborador()}
                      >
                        {creatingContaInterna ? "Criando conta interna..." : "Criar conta interna"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                      disabled={startingFolha}
                      onClick={() => void iniciarGeracaoFolhaMesAtual()}
                    >
                      {startingFolha ? "Iniciando..." : "Iniciar geracao da folha (mes atual)"}
                    </button>
                    <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/folha/colaboradores">
                      Abrir modulo de folha
                    </Link>
                    <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/credito-conexao/faturas">
                      Ver faturas da conta interna
                    </Link>
                    {resumo.cartao_conexao?.id && resumo.faturas_recentes?.[0]?.id ? (
                      <Link
                        className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                        href={`/admin/financeiro/credito-conexao/faturas/${resumo.faturas_recentes[0].id}`}
                      >
                        Ver ultima fatura
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
          </SystemSectionCard>

          <SystemSectionCard
            title="Conta interna / Despesas — Faturas recentes"
            description="Faturas do colaborador no Credito Conexao."
          >
            {!resumo.cartao_conexao ? (
              <div className="mt-3 space-y-3">
                <div className="text-sm text-slate-600">
                  Este colaborador ainda nao possui conta interna vinculada.
                </div>
                <button
                  type="button"
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                  disabled={creatingContaInterna}
                  onClick={() => void criarContaInternaColaborador()}
                >
                  {creatingContaInterna ? "Criando conta interna..." : "Criar conta interna"}
                </button>
              </div>
            ) : resumo.faturas_recentes.length === 0 ? (
              <div className="mt-3 text-sm text-slate-600">Nenhuma fatura recente.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
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
          </SystemSectionCard>

          <SystemSectionCard
            title="Conta interna e debitos"
            description="Painel gerencial do colaborador com saldo aberto, competencias, faturas e ultimos lancamentos."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Conta interna</div>
                <div className="mt-1 text-lg font-semibold">
                  {resumo.conta_interna?.existe ? "Ativa" : "Nao criada"}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {resumo.conta_interna?.tipo_conta ?? "COLABORADOR"} - {resumo.conta_interna?.situacao_atual ?? "NAO_CRIADA"}
                </div>
                {!resumo.conta_interna?.existe ? (
                  <button
                    type="button"
                    className="mt-3 rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                    disabled={creatingContaInterna}
                    onClick={() => void criarContaInternaColaborador()}
                  >
                    {creatingContaInterna ? "Criando conta interna..." : "Criar conta interna"}
                  </button>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Resumo financeiro</div>
                <div className="mt-1 text-lg font-semibold">
                  {brlFromCentavos(Number(resumo.saldo_em_aberto_total_centavos ?? 0))}
                </div>
                <div className="mt-2 text-sm text-slate-600">Em aberto total</div>
                <div className="mt-3 text-sm text-slate-700">
                  Faturado no mes: {brlFromCentavos(Number(resumo.total_faturado_mes_centavos ?? 0))}
                </div>
                <div className="text-sm text-slate-700">
                  Competencias abertas: {resumo.competencias_em_aberto?.join(", ") || "-"}
                </div>
                <div className="text-sm text-slate-700">
                  Ultima importacao folha: {resumo.ultima_importacao_para_folha?.competencia ?? "-"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Configuracao de pagamento</div>
                <div className="mt-1 text-lg font-semibold">
                  {resumo.status_configuracao_pagamento?.possui_config_financeira ? "Configurada" : "Pendente"}
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  Gera folha: {resumo.status_configuracao_pagamento?.gera_folha ? "Sim" : "Nao"}
                </div>
                <div className="text-sm text-slate-700">
                  Desconto cartao: {resumo.status_configuracao_pagamento?.politica_desconto_cartao ?? "-"}
                </div>
                <div className="text-sm text-slate-700">
                  Corte cartao: {resumo.status_configuracao_pagamento?.politica_corte_cartao ?? "-"}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold">Debitos por origem</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Cafe</span>
                    <strong>{brlFromCentavos(Number(resumo.itens_em_aberto_por_origem?.cafe.total_centavos ?? 0))}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Loja</span>
                    <strong>{brlFromCentavos(Number(resumo.itens_em_aberto_por_origem?.loja.total_centavos ?? 0))}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Escola</span>
                    <strong>{brlFromCentavos(Number(resumo.itens_em_aberto_por_origem?.escola.total_centavos ?? 0))}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold">Competencias e faturas</div>
                <div className="space-y-3">
                  {(resumo.faturas_abertas ?? []).length === 0 && (resumo.faturas_fechadas_recentes ?? []).length === 0 ? (
                    <div className="text-sm text-slate-600">Nenhuma fatura disponivel.</div>
                  ) : (
                    [...(resumo.faturas_abertas ?? []), ...(resumo.faturas_fechadas_recentes ?? [])].slice(0, 8).map((fatura) => (
                      <div key={fatura.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">{fatura.periodo_referencia}</div>
                          <div className="text-slate-600">{fatura.status}</div>
                        </div>
                        <div className="text-right">
                          <div>{brlFromCentavos(Number(fatura.valor_total_centavos ?? 0))}</div>
                          <div className="mt-1 flex flex-wrap justify-end gap-2">
                            <Link className="underline" href={`/admin/financeiro/credito-conexao/faturas/${fatura.id}`}>
                              Abrir detalhes
                            </Link>
                            {fatura.folha_pagamento_id ? (
                              <Link className="underline" href={`/admin/financeiro/folha/colaboradores/${fatura.folha_pagamento_id}`}>
                                Ver espelho
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-semibold">Ultimos lancamentos</div>
              {(resumo.ultimos_lancamentos ?? []).length === 0 ? (
                <div className="text-sm text-slate-600">Nenhum lancamento recente.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Origem</th>
                        <th className="px-3 py-2 text-left">Descricao</th>
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(resumo.ultimos_lancamentos ?? []).map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.origem_sistema ?? "-"}</td>
                          <td className="px-3 py-2">{item.descricao ?? "-"}</td>
                          <td className="px-3 py-2">{item.data_lancamento ?? "-"}</td>
                          <td className="px-3 py-2 text-right">{brlFromCentavos(Number(item.valor_centavos ?? 0))}</td>
                          <td className="px-3 py-2">{item.status ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SystemSectionCard>
        </>
      )}
    </SystemPage>
  );
}

