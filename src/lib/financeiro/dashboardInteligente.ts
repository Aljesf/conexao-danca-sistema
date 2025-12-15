import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { analisarSnapshotGPT } from "@/lib/ia/financeiro/analisarSnapshot";

export type TendenciaValor = {
  atual_centavos: number;
  anterior_centavos: number;
  variacao_percentual: number | null;
  direcao: "UP" | "DOWN" | "FLAT";
};

export type TendenciaResumo = {
  entradas: TendenciaValor;
  saidas: TendenciaValor;
  resultado: TendenciaValor;
};

export type SerieFluxoItem = {
  data: string;
  tipo: "historico" | "projecao";
  entradas_centavos: number;
  saidas_centavos: number;
  saldo_acumulado_centavos: number;
};

export type ResumoCentro = {
  centro_custo_id: number;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  receitas_30d_centavos: number;
  despesas_30d_centavos: number;
  resultado_30d_centavos: number;
  tendencia_resultado: TendenciaValor;
};

export type RegraAlerta = {
  codigo: string;
  titulo: string;
  severidade: "INFO" | "ALERTA" | "CRITICO";
  detalhe?: string | null;
};

export type SnapshotFinanceiro = {
  id?: number;
  created_at?: string;
  data_base: string;
  periodo_inicio: string;
  periodo_fim: string;
  centro_custo_id: number | null;
  caixa_hoje_centavos: number;
  entradas_previstas_30d_centavos: number;
  saidas_comprometidas_30d_centavos: number;
  folego_caixa_dias: number | null;
  tendencia: TendenciaResumo;
  resumo_por_centro: ResumoCentro[];
  serie_fluxo_caixa: SerieFluxoItem[];
  regras_alerta: RegraAlerta[];
};

export type AnaliseGpt = {
  id?: number;
  created_at?: string;
  snapshot_id?: number;
  model?: string | null;
  alertas: Array<{
    icone?: string | null;
    titulo_curto: string;
    severidade: "INFO" | "ALERTA" | "CRITICO";
    acao_pratica?: string | null;
  }>;
  texto_curto?: string | null;
  raw?: any;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isDev = process.env.NODE_ENV !== "production";

function devLog(...args: any[]) {
  if (isDev) console.log("[dashboardInteligente]", ...args);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[dashboardInteligente] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes."
  );
}

export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const tiposReceita = ["ENTRADA", "RECEITA"];
const tiposDespesa = ["SAIDA", "DESPESA"];

function dataHojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function variacao(atual: number, anterior: number): TendenciaValor {
  const safeAtual = Number(atual || 0);
  const safeAnterior = Number(anterior || 0);

  let variacao_percentual: number | null = null;
  if (safeAnterior === 0) {
    if (safeAtual === 0) {
      variacao_percentual = 0;
    } else {
      variacao_percentual = 100;
    }
  } else {
    variacao_percentual = ((safeAtual - safeAnterior) / Math.abs(safeAnterior)) * 100;
  }

  let direcao: "UP" | "DOWN" | "FLAT" = "FLAT";
  if (variacao_percentual > 5) direcao = "UP";
  else if (variacao_percentual < -5) direcao = "DOWN";

  return {
    atual_centavos: safeAtual,
    anterior_centavos: safeAnterior,
    variacao_percentual,
    direcao,
  };
}

function somaMovimentos(movs: any[]): { entradas: number; saidas: number } {
  return movs.reduce(
    (acc, m) => {
      const tipo = String(m?.tipo || "").toUpperCase();
      const valor = Number(m?.valor_centavos || 0) || 0;
      if (tiposReceita.includes(tipo)) acc.entradas += valor;
      else if (tiposDespesa.includes(tipo)) acc.saidas += valor;
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );
}

function filtrarPorJanela(
  movs: any[],
  inicio: string,
  fim: string
): any[] {
  return movs.filter((m) => {
    const data = String(m?.data_movimento || "").slice(0, 10);
    return data >= inicio && data <= fim;
  });
}

function filtrarPorCentro(movs: any[], centroId: number): any[] {
  return movs.filter((m) => Number(m?.centro_custo_id) === centroId);
}

async function carregarCentrosAtivos(
  supabase: SupabaseClient
): Promise<Array<{ id: number; codigo: string | null; nome: string | null }>> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id, codigo, nome, ativo")
    .eq("ativo", true);

  if (error) {
    console.error("[dashboardInteligente] Erro ao buscar centros_custo:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: Number(c.id),
    codigo: c.codigo ?? null,
    nome: c.nome ?? null,
  }));
}

export async function gerarSnapshot(
  supabase: SupabaseClient,
  opts?: { dataBase?: string }
): Promise<SnapshotFinanceiro> {
  const hoje = opts?.dataBase ?? dataHojeISO();
  const inicioJanela = addDays(hoje, -29);
  const inicioJanelaAnterior = addDays(inicioJanela, -30);
  const fimJanelaAnterior = addDays(inicioJanela, -1);

  const inicioSerieHistorica = addDays(hoje, -89);
  const fimSerieFutura = addDays(hoje, 30);

  // Movimentos ate hoje (para saldo e serie historica)
  const { data: movimentosAntes, error: errAntes } = await supabase
    .from("movimento_financeiro")
    .select("tipo, valor_centavos")
    .lt("data_movimento", `${inicioSerieHistorica}T00:00:00`);
  if (errAntes) throw errAntes;

  const { data: movimentos, error: errMov } = await supabase
    .from("movimento_financeiro")
    .select("tipo, valor_centavos, data_movimento, centro_custo_id")
    .gte("data_movimento", `${inicioSerieHistorica}T00:00:00`)
    .lte("data_movimento", `${hoje}T23:59:59`);
  if (errMov) throw errMov;

  // Entradas previstas e saídas comprometidas (30d futuros)
  const { data: cobrancas, error: errCob } = await supabase
    .from("cobrancas")
    .select("valor_centavos, status, vencimento, centro_custo_id")
    .neq("status", "RECEBIDO")
    .neq("status", "PAGO")
    .gte("vencimento", `${hoje}T00:00:00`)
    .lte("vencimento", `${fimSerieFutura}T23:59:59`);
  if (errCob) throw errCob;

  const { data: contasPagar, error: errPagar } = await supabase
    .from("contas_pagar")
    .select("valor_centavos, status, vencimento, centro_custo_id")
    .neq("status", "PAGO")
    .gte("vencimento", `${hoje}T00:00:00`)
    .lte("vencimento", `${fimSerieFutura}T23:59:59`);
  if (errPagar) throw errPagar;

  const movimentosTodos = [...(movimentosAntes || []), ...(movimentos || [])];
  const saldoMovimentos = somaMovimentos(movimentosTodos);
  const saldoMovimentosAntes = somaMovimentos(movimentosAntes || []);
  const caixa_hoje_centavos = saldoMovimentos.entradas - saldoMovimentos.saidas;

  const entradas_previstas_30d_centavos = (cobrancas || []).reduce((acc: number, c: any) => {
    const dataVenc = String(c?.vencimento || "").slice(0, 10);
    if (dataVenc >= hoje && dataVenc <= fimSerieFutura) {
      acc += Number(c?.valor_centavos || 0) || 0;
    }
    return acc;
  }, 0);

  const saidas_comprometidas_30d_centavos = (contasPagar || []).reduce((acc: number, c: any) => {
    const dataVenc = String(c?.vencimento || "").slice(0, 10);
    if (dataVenc >= hoje && dataVenc <= fimSerieFutura) {
      acc += Number(c?.valor_centavos || 0) || 0;
    }
    return acc;
  }, 0);

  const folego_caixa_dias =
    saidas_comprometidas_30d_centavos > 0
      ? Number((caixa_hoje_centavos / (saidas_comprometidas_30d_centavos / 30)).toFixed(1))
      : null;

  // Tendencia geral (30d atual vs 30d anterior) usando movimentos
  const movAtual = filtrarPorJanela(movimentos || [], inicioJanela, hoje);
  const movAnterior = filtrarPorJanela(movimentos || [], inicioJanelaAnterior, fimJanelaAnterior);
  const somaAtual = somaMovimentos(movAtual);
  const somaAnterior = somaMovimentos(movAnterior);

  const entradasTrend = variacao(somaAtual.entradas, somaAnterior.entradas);
  const saidasTrend = variacao(somaAtual.saidas, somaAnterior.saidas);
  const resultadoTrend = variacao(
    somaAtual.entradas - somaAtual.saidas,
    somaAnterior.entradas - somaAnterior.saidas
  );

  // Resumo por centro
  const centros = await carregarCentrosAtivos(supabase);
  const resumo_por_centro: ResumoCentro[] = centros.map((c) => {
    const movCentroAtual = filtrarPorJanela(
      filtrarPorCentro(movimentos || [], c.id),
      inicioJanela,
      hoje
    );
    const movCentroAnterior = filtrarPorJanela(
      filtrarPorCentro(movimentos || [], c.id),
      inicioJanelaAnterior,
      fimJanelaAnterior
    );
    const somaAtualCentro = somaMovimentos(movCentroAtual);
    const somaAnteriorCentro = somaMovimentos(movCentroAnterior);
    const resultadoAtual = somaAtualCentro.entradas - somaAtualCentro.saidas;
    const resultadoAnterior = somaAnteriorCentro.entradas - somaAnteriorCentro.saidas;

    return {
      centro_custo_id: c.id,
      centro_custo_codigo: c.codigo ?? null,
      centro_custo_nome: c.nome ?? null,
      receitas_30d_centavos: somaAtualCentro.entradas,
      despesas_30d_centavos: somaAtualCentro.saidas,
      resultado_30d_centavos: resultadoAtual,
      tendencia_resultado: variacao(resultadoAtual, resultadoAnterior),
    };
  });

  // Serie de fluxo de caixa (historico + projecao)
  const mapHistorico = new Map<string, { entradas: number; saidas: number }>();
  (movimentos || []).forEach((m: any) => {
    const data = String(m?.data_movimento || "").slice(0, 10);
    const entry = mapHistorico.get(data) || { entradas: 0, saidas: 0 };
    const tipo = String(m?.tipo || "").toUpperCase();
    const val = Number(m?.valor_centavos || 0) || 0;
    if (tiposReceita.includes(tipo)) entry.entradas += val;
    else if (tiposDespesa.includes(tipo)) entry.saidas += val;
    mapHistorico.set(data, entry);
  });

  const mapFuturo = new Map<string, { entradas: number; saidas: number }>();
  (cobrancas || []).forEach((c: any) => {
    const data = String(c?.vencimento || "").slice(0, 10);
    if (data > hoje && data <= fimSerieFutura) {
      const entry = mapFuturo.get(data) || { entradas: 0, saidas: 0 };
      entry.entradas += Number(c?.valor_centavos || 0) || 0;
      mapFuturo.set(data, entry);
    }
  });
  (contasPagar || []).forEach((c: any) => {
    const data = String(c?.vencimento || "").slice(0, 10);
    if (data > hoje && data <= fimSerieFutura) {
      const entry = mapFuturo.get(data) || { entradas: 0, saidas: 0 };
      entry.saidas += Number(c?.valor_centavos || 0) || 0;
      mapFuturo.set(data, entry);
    }
  });

  const serie_fluxo_caixa: SerieFluxoItem[] = [];
  // saldo acumulado inicia com movimentos antes da serie historica
  const saldoInicial = saldoMovimentosAntes.entradas - saldoMovimentosAntes.saidas;
  let saldoAcumulado = saldoInicial;

  let cursor = inicioSerieHistorica;
  while (cursor <= fimSerieFutura) {
    const historico = mapHistorico.get(cursor) || { entradas: 0, saidas: 0 };
    const futuro = mapFuturo.get(cursor) || { entradas: 0, saidas: 0 };
    const entradasDia = historico.entradas + futuro.entradas;
    const saidasDia = historico.saidas + futuro.saidas;
    saldoAcumulado += entradasDia - saidasDia;

    serie_fluxo_caixa.push({
      data: cursor,
      tipo: cursor > hoje ? "projecao" : "historico",
      entradas_centavos: entradasDia,
      saidas_centavos: saidasDia,
      saldo_acumulado_centavos: saldoAcumulado,
    });

    cursor = addDays(cursor, 1);
  }

  // Regras de alerta
  const regras_alerta: RegraAlerta[] = [];
  if (folego_caixa_dias !== null && folego_caixa_dias < 10) {
    regras_alerta.push({
      codigo: "FOLEGO_BAIXO",
      titulo: "Folego de caixa abaixo de 10 dias",
      severidade: "CRITICO",
      detalhe: `Folego estimado: ${folego_caixa_dias} dias`,
    });
  }
  const variacaoSaidas = saidasTrend.variacao_percentual ?? 0;
  if (variacaoSaidas > 20) {
    regras_alerta.push({
      codigo: "SAIDAS_ACELERANDO",
      titulo: "Saidas acelerando",
      severidade: "ALERTA",
      detalhe: `Saidas 30d variaram ${variacaoSaidas.toFixed(1)}% vs periodo anterior`,
    });
  }
  const variacaoEntradas = entradasTrend.variacao_percentual ?? 0;
  if (variacaoEntradas < -20) {
    regras_alerta.push({
      codigo: "ENTRADAS_QUEDA",
      titulo: "Entradas em queda",
      severidade: "ALERTA",
      detalhe: `Entradas 30d variaram ${variacaoEntradas.toFixed(1)}% vs periodo anterior`,
    });
  }

  const snapshot: SnapshotFinanceiro = {
    data_base: hoje,
    periodo_inicio: inicioJanela,
    periodo_fim: hoje,
    centro_custo_id: null,
    caixa_hoje_centavos,
    entradas_previstas_30d_centavos,
    saidas_comprometidas_30d_centavos,
    folego_caixa_dias,
    tendencia: {
      entradas: entradasTrend,
      saidas: saidasTrend,
      resultado: resultadoTrend,
    },
    resumo_por_centro,
    serie_fluxo_caixa,
    regras_alerta,
  };

  return snapshot;
}

async function salvarSnapshot(
  supabase: SupabaseClient,
  snapshot: SnapshotFinanceiro
): Promise<SnapshotFinanceiro> {
  const { data, error } = await supabase
    .from("financeiro_snapshots")
    .insert(snapshot)
    .select("*")
    .single();

  if (error || !data) {
    throw error || new Error("Falha ao salvar snapshot financeiro.");
  }

  devLog("Snapshot criado", { data_base: snapshot.data_base, id: (data as any)?.id });

  return data as SnapshotFinanceiro;
}

async function carregarAnaliseMaisRecente(
  supabase: SupabaseClient,
  snapshotId: number
): Promise<AnaliseGpt | null> {
  const { data, error } = await supabase
    .from("financeiro_analises_gpt")
    .select("id, created_at, snapshot_id, model, alertas, texto_curto, raw")
    .eq("snapshot_id", snapshotId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[dashboardInteligente] Falha ao carregar analise GPT:", error);
    return null;
  }

  return (data as AnaliseGpt) ?? null;
}

async function salvarAnalise(
  supabase: SupabaseClient,
  snapshotId: number,
  analise: AnaliseGpt
): Promise<AnaliseGpt | null> {
  const { data, error } = await supabase
    .from("financeiro_analises_gpt")
    .insert({
      snapshot_id: snapshotId,
      model: analise.model ?? null,
      alertas: analise.alertas ?? [],
      texto_curto: analise.texto_curto ?? null,
      raw: analise.raw ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[dashboardInteligente] Nao foi possivel salvar analise GPT:", error);
    return null;
  }

  return data as AnaliseGpt;
}

export async function obterSnapshotDoDia(
  supabase: SupabaseClient,
  opts?: { criarSeAusente?: boolean }
): Promise<{ snapshot: SnapshotFinanceiro; analise: AnaliseGpt | null }> {
  const hoje = dataHojeISO();
  const { data, error } = await supabase
    .from("financeiro_snapshots")
    .select("*")
    .is("centro_custo_id", null)
    .eq("data_base", hoje)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let snapshot = data as SnapshotFinanceiro | null;
  if (!snapshot && opts?.criarSeAusente) {
    const gerado = await gerarSnapshot(supabase, { dataBase: hoje });
    snapshot = await salvarSnapshot(supabase, gerado);
    devLog("Snapshot do dia criado on-demand", { data_base: hoje, id: snapshot.id });
  } else if (!snapshot && !opts?.criarSeAusente) {
    throw error || new Error("Snapshot do dia nao encontrado.");
  } else if (snapshot) {
    devLog("Snapshot do dia encontrado", { data_base: hoje, id: snapshot.id });
  }

  if (!snapshot) {
    throw new Error("Snapshot do dia nao encontrado.");
  }

  const analise = await carregarAnaliseMaisRecente(supabase, snapshot.id as number);
  return { snapshot, analise };
}

export async function gerarESalvarSnapshot(
  supabase: SupabaseClient,
  opts?: { dataBase?: string; comAnaliseGpt?: boolean }
): Promise<{ snapshot: SnapshotFinanceiro; analise: AnaliseGpt | null }> {
  const snapshotCalculado = await gerarSnapshot(supabase, { dataBase: opts?.dataBase });
  const snapshot = await salvarSnapshot(supabase, snapshotCalculado);

  if (opts?.comAnaliseGpt) {
    try {
      const analiseGpt = await analisarSnapshotGPT(snapshot);
      if (analiseGpt) {
        const analisePersistida = await salvarAnalise(supabase, snapshot.id as number, analiseGpt);
        devLog("Analise GPT gerada", {
          snapshot_id: snapshot.id,
          qtd_alertas: analisePersistida?.alertas?.length ?? 0,
        });
        return { snapshot, analise: analisePersistida };
      }
    } catch (err) {
      console.warn("[dashboardInteligente] Falha ao gerar analise GPT:", err);
      devLog("Analise GPT falhou", { snapshot_id: snapshot.id, motivo: String(err) });
    }
  }

  return { snapshot, analise: null };
}

export async function obterSnapshotPorData(
  supabase: SupabaseClient,
  dataBase: string
): Promise<{ snapshot: SnapshotFinanceiro | null; analise: AnaliseGpt | null }> {
  const { data, error } = await supabase
    .from("financeiro_snapshots")
    .select("*")
    .is("centro_custo_id", null)
    .eq("data_base", dataBase)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[dashboardInteligente] Erro ao carregar snapshot por data:", error);
    return { snapshot: null, analise: null };
  }

  if (!data) return { snapshot: null, analise: null };
  const analise = await carregarAnaliseMaisRecente(supabase, (data as any).id);
  return { snapshot: data as SnapshotFinanceiro, analise };
}
