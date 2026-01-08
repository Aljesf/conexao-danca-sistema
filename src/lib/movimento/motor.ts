import { createClient } from "@supabase/supabase-js";

type CreditoTipo = "CR_REGULAR" | "CR_LIVRE" | "CR_PROJETO";

type MotorInput = {
  competencia: string; // YYYY-MM
  /**
   * MVP: valores base por origem_recurso (ex.: "RECEITAS_CURSO_REGULAR": 10000)
   * Quando integrarmos com o financeiro, este map vira opcional e será calculado automaticamente.
   */
  valoresBasePorOrigemRecurso?: Record<string, number>;
};

type MotorResult = {
  competencia: string;
  lotesCriados: number;
  log: string;
};

type RegraRow = {
  id: string;
  descricao: string | null;
  origem_recurso: string;
  reais_por_credito: number;
  tipo_credito_gerado: CreditoTipo;
  limite_mensal: number | null;
  reserva_percentual: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  ativa: boolean | null;
};

type AlocacaoRow = {
  id: string;
  regra_id: string;
  tipo_credito_gerado: CreditoTipo;
  percentual: number;
  reais_por_credito_override: number | null;
  proposito_padrao: string | null;
  curso_id_destino: string | null;
  projeto_id_destino: string | null;
  filtros: Record<string, unknown> | null;
  ativo: boolean | null;
};

type CronogramaExternoRow = {
  id: string;
  fonte_id: string;
  competencia: string;
  quantidade_creditos: number;
  confirmado: boolean;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SERVICE_ROLE_NAO_CONFIGURADO");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function floorCreditos(valorBase: number, reaisPorCredito: number): number {
  if (reaisPorCredito <= 0) return 0;
  return Math.floor(valorBase / reaisPorCredito);
}

export async function executarMotorMensalMovimento(input: MotorInput): Promise<MotorResult> {
  const supabase = getServiceClient();
  const { competencia, valoresBasePorOrigemRecurso } = input;

  const logs: string[] = [];
  let lotesCriados = 0;

  // 1) Garantir registro de execução (idempotência por competencia)
  {
    const { data: existing } = await supabase
      .from("movimento_execucoes_mensais")
      .select("id, status")
      .eq("competencia", competencia)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase
        .from("movimento_execucoes_mensais")
        .insert({ competencia, status: "PENDENTE" });
      if (insErr) throw insErr;
    }
  }

  // 2) Regras ativas vigentes
  const { data: regras, error: regrasErr } = await supabase
    .from("movimento_regras_geracao")
    .select(
      "id, descricao, origem_recurso, reais_por_credito, tipo_credito_gerado, limite_mensal, reserva_percentual, vigencia_inicio, vigencia_fim, ativa"
    )
    .eq("ativa", true);

  if (regrasErr) throw regrasErr;

  // 3) Alocações ativas por regra
  const { data: alocacoes, error: alocErr } = await supabase
    .from("movimento_regras_geracao_alocacoes")
    .select(
      "id, regra_id, tipo_credito_gerado, percentual, reais_por_credito_override, proposito_padrao, curso_id_destino, projeto_id_destino, filtros, ativo"
    )
    .eq("ativo", true);

  if (alocErr) throw alocErr;

  const alocPorRegra = new Map<string, AlocacaoRow[]>();
  for (const a of (alocacoes ?? []) as AlocacaoRow[]) {
    const list = alocPorRegra.get(a.regra_id) ?? [];
    list.push(a);
    alocPorRegra.set(a.regra_id, list);
  }

  // 4) Geração INSTITUCIONAL_AUTOMATICA: cria lotes por alocação
  for (const regra of (regras ?? []) as RegraRow[]) {
    // MVP: valor base vem do payload por origem_recurso; se não vier, assume 0 e registra log
    const valorBase = Number(valoresBasePorOrigemRecurso?.[regra.origem_recurso] ?? 0);
    if (!valorBase || valorBase <= 0) {
      logs.push(
        `Regra ${regra.id}: valor_base=0 para origem_recurso="${regra.origem_recurso}" (MVP sem integração financeira).`
      );
      continue;
    }

    const alocs = alocPorRegra.get(regra.id) ?? [];
    if (alocs.length === 0) {
      // fallback: gera lote único do tipo_credito_gerado com regra.reais_por_credito
      const qtd = floorCreditos(valorBase, Number(regra.reais_por_credito));
      if (qtd > 0) {
        const { error: loteErr } = await supabase.from("movimento_creditos_lotes").insert({
          competencia,
          origem: "INSTITUCIONAL_AUTOMATICA",
          regra_id: regra.id,
          tipo_credito: regra.tipo_credito_gerado,
          valor_base: valorBase,
          quantidade_total: qtd,
          proposito: regra.descricao ?? null,
          status: "ABERTO",
        });
        if (loteErr) throw loteErr;
        lotesCriados += 1;
        logs.push(`Regra ${regra.id}: lote único criado (${qtd}).`);
      } else {
        logs.push(
          `Regra ${regra.id}: valor_base insuficiente para 1 crédito (reais_por_credito=${regra.reais_por_credito}).`
        );
      }
      continue;
    }

    // Distribui valor_base por percentual das alocações
    for (const aloc of alocs) {
      const valorAloc = (valorBase * Number(aloc.percentual)) / 100;
      const reaisPorCredito = Number(aloc.reais_por_credito_override ?? regra.reais_por_credito);
      const qtd = floorCreditos(valorAloc, reaisPorCredito);

      if (qtd <= 0) {
        logs.push(
          `Regra ${regra.id}/Aloc ${aloc.id}: valor_aloc insuficiente (valor=${valorAloc.toFixed(
            2
          )} / rpc=${reaisPorCredito}).`
        );
        continue;
      }

      const { error: loteErr } = await supabase.from("movimento_creditos_lotes").insert({
        competencia,
        origem: "INSTITUCIONAL_AUTOMATICA",
        regra_id: regra.id,
        regra_alocacao_id: aloc.id,
        tipo_credito: aloc.tipo_credito_gerado,
        valor_base: valorAloc,
        quantidade_total: qtd,
        proposito: aloc.proposito_padrao ?? null,
        curso_id_destino: aloc.curso_id_destino ?? null,
        projeto_id_destino: aloc.projeto_id_destino ?? null,
        filtros: aloc.filtros ?? null,
        status: "ABERTO",
      });

      if (loteErr) throw loteErr;
      lotesCriados += 1;
      logs.push(`Regra ${regra.id}/Aloc ${aloc.id}: lote criado (${qtd}).`);
    }
  }

  // 5) Geração EXTERNA confirmada (cronograma)
  const { data: externos, error: extErr } = await supabase
    .from("movimento_fontes_externas_cronograma")
    .select("id, fonte_id, competencia, quantidade_creditos, confirmado")
    .eq("competencia", competencia)
    .eq("confirmado", true);

  if (extErr) throw extErr;

  for (const e of (externos ?? []) as CronogramaExternoRow[]) {
    // MVP: externo gera CR_REGULAR por padrão (ajustamos depois com um campo tipo_credito no cronograma)
    const { error: loteErr } = await supabase.from("movimento_creditos_lotes").insert({
      competencia,
      origem: "EXTERNA",
      fonte_externa_id: e.fonte_id,
      tipo_credito: "CR_REGULAR",
      valor_base: null,
      quantidade_total: e.quantidade_creditos,
      status: "ABERTO",
    });
    if (loteErr) throw loteErr;
    lotesCriados += 1;
    logs.push(`Externo fonte=${e.fonte_id}: lote criado (${e.quantidade_creditos}).`);
  }

  // 6) Marcar execução
  const logFinal = logs.join("\n");
  const { error: updErr } = await supabase
    .from("movimento_execucoes_mensais")
    .update({ status: "EXECUTADO", executado_em: new Date().toISOString(), log_execucao: logFinal })
    .eq("competencia", competencia);

  if (updErr) throw updErr;

  return { competencia, lotesCriados, log: logFinal };
}
