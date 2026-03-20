import type { SupabaseClient } from "@supabase/supabase-js";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";
import { calcularDataVencimento } from "@/lib/financeiro/creditoConexao/vencimento";
import {
  ensureFaturaAberta,
  recalcularComprasFatura,
  vincularLancamentoNaFatura,
} from "@/lib/financeiro/creditoConexaoFaturas";
import { processarCobrancaCanonicaFatura } from "@/lib/credito-conexao/processarCobrancaCanonicaFatura";

type ContaRow = {
  id: number;
  pessoa_titular_id: number | null;
  tipo_conta: string | null;
  descricao_exibicao: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  dia_vencimento_preferido: number | null;
  ativo: boolean | null;
};

type ConfigTipoContaRow = {
  tipo_conta: string;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  ativo: boolean | null;
};

type ConfigGlobalRow = {
  dia_fechamento_faturas: number | null;
};

type ConfigCobrancaRow = {
  provider_ativo: string | null;
};

type FaturaAbertaRow = {
  id: number;
  periodo_referencia: string;
  status: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  cobranca_id: number | null;
};

type LancamentoPendenteRow = {
  id: number;
  competencia: string | null;
  valor_centavos: number | null;
};

type ResultadoConta = {
  conta_conexao_id: number;
  descricao_conta: string | null;
  dia_fechamento_resolvido: number;
  dia_vencimento_resolvido: number;
  origem_configuracao_fechamento: "conta" | "tipo_conta" | "global" | "padrao";
  status: "processada" | "sem_acao" | "erro";
  motivo?: string;
  periodos: Array<{
    competencia: string;
    elegivel: boolean;
    acao: "processada" | "reutilizada" | "sem_valor" | "fora_do_dia" | "sem_lancamentos" | "ja_fechada" | "erro";
    fatura_id: number | null;
    cobranca_id: number | null;
    neofin_charge_id: string | null;
    neofin_invoice_id: string | null;
    detalhe?: string | null;
  }>;
};

export type ProcessarFechamentoAutomaticoMensalInput = {
  supabase: SupabaseClient;
  hoje?: Date;
  force?: boolean;
  dryRun?: boolean;
  contaConexaoId?: number | null;
};

export type ProcessarFechamentoAutomaticoMensalOutput = {
  ok: true;
  dry_run: boolean;
  data_execucao: string;
  competencia_atual: string;
  contas_avaliadas: number;
  contas_processadas: number;
  periodos_processados: number;
  erros: number;
  resultados: ResultadoConta[];
};

const COMPETENCIA_RE = /^\d{4}-\d{2}$/;

function localNow(base?: Date): Date {
  const now = base ?? new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
}

function getCompetencia(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function compareCompetencia(a: string, b: string): number {
  return a.localeCompare(b);
}

function clampDiaFechamento(value: number, maxDay: number): number {
  const inteiro = Math.trunc(value);
  if (inteiro < 1) return 1;
  if (inteiro > maxDay) return maxDay;
  return inteiro;
}

function clampDiaVencimento(value: number): number {
  const inteiro = Math.trunc(value);
  if (inteiro < 1) return 1;
  if (inteiro > 28) return 28;
  return inteiro;
}

function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isCompetencia(value: string | null | undefined): value is string {
  return typeof value === "string" && COMPETENCIA_RE.test(value.trim());
}

function normalizeCompetencias(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(isCompetencia).map((value) => value.trim()))).sort(compareCompetencia);
}

function resolveDiaFechamento(
  conta: ContaRow,
  cfgTipo: ConfigTipoContaRow | null,
  cfgGlobal: ConfigGlobalRow | null,
  today: Date,
): { dia: number; origem: ResultadoConta["origem_configuracao_fechamento"] } {
  const maxDay = lastDayOfMonth(today);
  if (typeof conta.dia_fechamento === "number" && Number.isFinite(conta.dia_fechamento)) {
    return { dia: clampDiaFechamento(conta.dia_fechamento, maxDay), origem: "conta" };
  }
  if (typeof cfgTipo?.dia_fechamento === "number" && Number.isFinite(cfgTipo.dia_fechamento)) {
    return { dia: clampDiaFechamento(cfgTipo.dia_fechamento, maxDay), origem: "tipo_conta" };
  }
  if (typeof cfgGlobal?.dia_fechamento_faturas === "number" && Number.isFinite(cfgGlobal.dia_fechamento_faturas)) {
    return { dia: clampDiaFechamento(cfgGlobal.dia_fechamento_faturas, maxDay), origem: "global" };
  }
  return { dia: 1, origem: "padrao" };
}

function resolveDiaVencimento(conta: ContaRow, cfgTipo: ConfigTipoContaRow | null): number {
  const preferred =
    conta.dia_vencimento_preferido ??
    conta.dia_vencimento ??
    cfgTipo?.dia_vencimento ??
    12;
  return clampDiaVencimento(Number(preferred));
}

async function carregarConfiguracoes(supabase: SupabaseClient) {
  const [{ data: cfgTipo }, { data: cfgGlobal }, { data: cfgCobranca }] = await Promise.all([
    supabase
      .from("credito_conexao_configuracoes")
      .select("tipo_conta,dia_fechamento,dia_vencimento,ativo")
      .eq("tipo_conta", "ALUNO")
      .maybeSingle<ConfigTipoContaRow>(),
    supabase
      .from("financeiro_config")
      .select("dia_fechamento_faturas")
      .eq("id", 1)
      .maybeSingle<ConfigGlobalRow>(),
    supabase
      .from("financeiro_config_cobranca")
      .select("provider_ativo")
      .is("unidade_id", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle<ConfigCobrancaRow>(),
  ]);

  return {
    cfgTipo: cfgTipo ?? null,
    cfgGlobal: cfgGlobal ?? null,
    providerCode: (cfgCobranca?.provider_ativo ?? "NEOFIN") as CobrancaProviderCode,
  };
}

async function listarContasAlvo(
  supabase: SupabaseClient,
  contaConexaoId?: number | null,
): Promise<ContaRow[]> {
  let query = supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta,descricao_exibicao,dia_fechamento,dia_vencimento,dia_vencimento_preferido,ativo")
    .eq("tipo_conta", "ALUNO")
    .eq("ativo", true)
    .order("id", { ascending: true });

  if (typeof contaConexaoId === "number" && Number.isFinite(contaConexaoId)) {
    query = query.eq("id", contaConexaoId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ContaRow[];
}

async function listarFaturasAbertasDaConta(
  supabase: SupabaseClient,
  contaConexaoId: number,
  competenciaAtual: string,
): Promise<FaturaAbertaRow[]> {
  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .select("id,periodo_referencia,status,data_vencimento,valor_total_centavos,cobranca_id")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("status", "ABERTA")
    .lte("periodo_referencia", competenciaAtual)
    .order("periodo_referencia", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FaturaAbertaRow[];
}

async function listarCompetenciasPendentesDaConta(
  supabase: SupabaseClient,
  contaConexaoId: number,
  competenciaAtual: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("credito_conexao_lancamentos")
    .select("competencia")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("status", "PENDENTE_FATURA")
    .lte("competencia", competenciaAtual);

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCompetencias(
    ((data ?? []) as Array<{ competencia?: string | null }>).map((row) => row.competencia ?? null),
  );
}

async function listarLancamentosPendentesPeriodo(
  supabase: SupabaseClient,
  contaConexaoId: number,
  competencia: string,
): Promise<LancamentoPendenteRow[]> {
  const { data, error } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id,competencia,valor_centavos")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("competencia", competencia)
    .eq("status", "PENDENTE_FATURA")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as LancamentoPendenteRow[];
}

export async function processarFechamentoAutomaticoMensal(
  input: ProcessarFechamentoAutomaticoMensalInput,
): Promise<ProcessarFechamentoAutomaticoMensalOutput> {
  const hoje = localNow(input.hoje);
  const competenciaAtual = getCompetencia(hoje);
  const force = input.force === true;
  const dryRun = input.dryRun === true;
  const { cfgTipo, cfgGlobal, providerCode } = await carregarConfiguracoes(input.supabase);
  const contas = await listarContasAlvo(input.supabase, input.contaConexaoId);

  const resultados: ResultadoConta[] = [];
  let contasProcessadas = 0;
  let periodosProcessados = 0;
  let erros = 0;

  for (const conta of contas) {
    const fechamento = resolveDiaFechamento(conta, cfgTipo, cfgGlobal, hoje);
    const diaVencimento = resolveDiaVencimento(conta, cfgTipo);
    const reachedDay = force || hoje.getDate() >= fechamento.dia;

    const [faturasAbertas, competenciasPendentes] = await Promise.all([
      listarFaturasAbertasDaConta(input.supabase, conta.id, competenciaAtual),
      listarCompetenciasPendentesDaConta(input.supabase, conta.id, competenciaAtual),
    ]);

    const periodos = normalizeCompetencias([
      ...faturasAbertas.map((row) => row.periodo_referencia),
      ...competenciasPendentes,
    ]);

    if (periodos.length === 0) {
      resultados.push({
        conta_conexao_id: conta.id,
        descricao_conta: conta.descricao_exibicao ?? null,
        dia_fechamento_resolvido: fechamento.dia,
        dia_vencimento_resolvido: diaVencimento,
        origem_configuracao_fechamento: fechamento.origem,
        status: "sem_acao",
        motivo: "sem_faturas_ou_lancamentos_pendentes",
        periodos: [],
      });
      continue;
    }

    const resultadoConta: ResultadoConta = {
      conta_conexao_id: conta.id,
      descricao_conta: conta.descricao_exibicao ?? null,
      dia_fechamento_resolvido: fechamento.dia,
      dia_vencimento_resolvido: diaVencimento,
      origem_configuracao_fechamento: fechamento.origem,
      status: "sem_acao",
      periodos: [],
    };
    let contaTeveAcao = false;

    for (const competencia of periodos) {
      const faturaAberta = faturasAbertas.find((row) => row.periodo_referencia === competencia) ?? null;
      const lancamentosPendentes = competenciasPendentes.includes(competencia)
        ? await listarLancamentosPendentesPeriodo(input.supabase, conta.id, competencia)
        : [];
      const periodoAtrasado = compareCompetencia(competencia, competenciaAtual) < 0;
      const elegivel = force || periodoAtrasado || reachedDay;

      if (!elegivel) {
        resultadoConta.periodos.push({
          competencia,
          elegivel: false,
          acao: "fora_do_dia",
          fatura_id: faturaAberta?.id ?? null,
          cobranca_id: faturaAberta?.cobranca_id ?? null,
          neofin_charge_id: null,
          neofin_invoice_id: null,
          detalhe: `Conta configurada para fechamento no dia ${fechamento.dia}.`,
        });
        continue;
      }

      if (dryRun) {
        const acaoDryRun =
          faturaAberta ? "reutilizada" : lancamentosPendentes.length > 0 ? "processada" : "sem_lancamentos";
        if (acaoDryRun === "reutilizada" || acaoDryRun === "processada") {
          resultadoConta.status = "processada";
          contaTeveAcao = true;
        }
        resultadoConta.periodos.push({
          competencia,
          elegivel: true,
          acao: acaoDryRun,
          fatura_id: faturaAberta?.id ?? null,
          cobranca_id: faturaAberta?.cobranca_id ?? null,
          neofin_charge_id: null,
          neofin_invoice_id: null,
          detalhe: faturaAberta
            ? "Fatura aberta existente sera reaproveitada."
            : lancamentosPendentes.length > 0
              ? "Periodo possui lancamentos pendentes e pode gerar/reusar fatura."
              : "Nenhum lancamento pendente encontrado para o periodo.",
        });
        continue;
      }

      try {
        let faturaAtual = faturaAberta;
        if (!faturaAtual && lancamentosPendentes.length === 0) {
          resultadoConta.periodos.push({
            competencia,
            elegivel: true,
            acao: "sem_lancamentos",
            fatura_id: null,
            cobranca_id: null,
            neofin_charge_id: null,
            neofin_invoice_id: null,
            detalhe: "Sem fatura aberta e sem lancamentos pendentes para fechar.",
          });
          continue;
        }

        if (!faturaAtual) {
          const ensured = await ensureFaturaAberta(input.supabase, conta.id, competencia);
          const { data: ensuredRow, error: ensuredErr } = await input.supabase
            .from("credito_conexao_faturas")
            .select("id,periodo_referencia,status,data_vencimento,valor_total_centavos,cobranca_id")
            .eq("id", ensured.fatura.id)
            .maybeSingle<FaturaAbertaRow>();

          if (ensuredErr || !ensuredRow) {
            throw new Error(ensuredErr?.message ?? "falha_recarregar_fatura_gerada");
          }

          faturaAtual = ensuredRow;
        }

        if (lancamentosPendentes.length > 0) {
          for (const lancamento of lancamentosPendentes) {
            const vinculo = await vincularLancamentoNaFatura(input.supabase, faturaAtual.id, lancamento.id);
            if (!vinculo.ok) {
              throw new Error("falha_vincular_lancamento_na_fatura");
            }
          }

          const lancamentoIds = lancamentosPendentes
            .map((row) => Number(row.id))
            .filter((id) => Number.isFinite(id));

          if (lancamentoIds.length > 0) {
            const { error: updateErr } = await input.supabase
              .from("credito_conexao_lancamentos")
              .update({ status: "FATURADO" })
              .in("id", lancamentoIds);

            if (updateErr) {
              throw new Error(updateErr.message);
            }
          }
        }

        const totalRecalculado = await recalcularComprasFatura(input.supabase, faturaAtual.id);
        if (totalRecalculado <= 0) {
          resultadoConta.periodos.push({
            competencia,
            elegivel: true,
            acao: "sem_valor",
            fatura_id: faturaAtual.id,
            cobranca_id: faturaAtual.cobranca_id ?? null,
            neofin_charge_id: null,
            neofin_invoice_id: null,
            detalhe: "Fatura sem valor total elegivel apos recalculo.",
          });
          continue;
        }

        const vencimentoEfetivo =
          typeof faturaAtual.data_vencimento === "string" && /^\d{4}-\d{2}-\d{2}$/.test(faturaAtual.data_vencimento)
            ? faturaAtual.data_vencimento
            : calcularDataVencimento({
                competenciaAnoMes: competencia,
                diaPreferido: diaVencimento,
                forcarUltimoVencimentoDia12: true,
              });

        const resultado = await processarCobrancaCanonicaFatura({
          supabase: input.supabase,
          fatura: {
            id: faturaAtual.id,
            status: faturaAtual.status,
            valor_total_centavos: totalRecalculado,
          },
          conta: {
            pessoa_titular_id: conta.pessoa_titular_id,
          },
          competencia,
          vencimentoEfetivo,
          providerCode,
          force: force || periodoAtrasado,
        });

        if (!resultado.ok) {
          resultadoConta.periodos.push({
            competencia,
            elegivel: true,
            acao: "erro",
            fatura_id: faturaAtual.id,
            cobranca_id: faturaAtual.cobranca_id ?? null,
            neofin_charge_id: null,
            neofin_invoice_id: null,
            detalhe:
              typeof resultado.body.detail === "string"
                ? resultado.body.detail
                : typeof resultado.body.error === "string"
                  ? resultado.body.error
                  : "falha_processar_cobranca_canonica",
          });
          erros += 1;
          resultadoConta.status = "erro";
          continue;
        }

        periodosProcessados += 1;
        resultadoConta.status = "processada";
        contaTeveAcao = true;
        resultadoConta.periodos.push({
          competencia,
          elegivel: true,
          acao: resultado.data.message.toLowerCase().includes("ja existe") ? "reutilizada" : "processada",
          fatura_id: resultado.data.fatura_id,
          cobranca_id: resultado.data.cobranca_id,
          neofin_charge_id: resultado.data.neofin_charge_id,
          neofin_invoice_id: resultado.data.neofin_invoice_id,
          detalhe: resultado.data.message,
        });
      } catch (error) {
        erros += 1;
        resultadoConta.status = "erro";
        resultadoConta.periodos.push({
          competencia,
          elegivel: true,
          acao: "erro",
          fatura_id: faturaAberta?.id ?? null,
          cobranca_id: faturaAberta?.cobranca_id ?? null,
          neofin_charge_id: null,
          neofin_invoice_id: null,
          detalhe: error instanceof Error ? error.message : "erro_interno_fechamento_mensal",
        });
      }
    }

    if (contaTeveAcao) {
      contasProcessadas += 1;
    }
    resultados.push(resultadoConta);
  }

  return {
    ok: true,
    dry_run: dryRun,
    data_execucao: hoje.toISOString(),
    competencia_atual: competenciaAtual,
    contas_avaliadas: contas.length,
    contas_processadas: contasProcessadas,
    periodos_processados: periodosProcessados,
    erros,
    resultados,
  };
}
