import OpenAI from "openai";
import { AnaliseGpt, SnapshotFinanceiro } from "@/lib/financeiro/dashboardInteligente";

export type FinanceiroAlerta = {
  severidade: "CRITICO" | "ALERTA" | "INFO";
  titulo: string;
  por_que_importa: string;
  acao_pratica: string;
  sinal: "\u2191" | "\u2193" | "\u2192";
};

export type FinanceiroAnalise = {
  texto_curto: string;
  alertas: FinanceiroAlerta[];
  meta?: {
    fonte: "GPT" | "REGRAS";
    model?: string | null;
    created_at?: string | null;
  };
};

const DEFAULT_MODEL = process.env.FINANCEIRO_GPT_MODEL || "gpt-5";

export const PROMPT_FINANCEIRO_CONSULTOR = `
Voce atua como consultor financeiro interno (nao contábil). Objetivo: leitura executiva em 30 segundos.
Proibido inventar dados, criar lançamentos, sugerir ilegalidades ou repetir números do input.
Foque em inadimplencia, folego de caixa, tendencia de entradas/saidas, riscos de travamento/crescimento, cartao conexao quando relevante.
Responda EXCLUSIVAMENTE em JSON no formato:
{
  "texto_curto": "string (1 paragrafo, tom gestor/investidor, sem repetir numeros)",
  "alertas": [
    {
      "severidade": "CRITICO|ALERTA|INFO",
      "titulo": "string curta",
      "por_que_importa": "1 linha",
      "acao_pratica": "1 linha",
      "sinal": "\\u2191|\\u2193|\\u2192"
    }
  ],
  "meta": { "fonte": "GPT", "model": "nome_do_modelo" }
}
Maximo 3 alertas; priorizar severidade (CRITICO > ALERTA > INFO). Se dados escassos, use INFO pedindo para alimentar dados/registrar movimentos.
`;

function baseAlertas(snapshot: SnapshotFinanceiro): FinanceiroAnalise {
  const alertas = (snapshot.regras_alerta || []).slice(0, 3).map((r) => ({
    severidade: r.severidade === "CRITICO" ? "CRITICO" : "ALERTA",
    titulo: r.titulo,
    por_que_importa: r.detalhe ?? "Alertas calculados pelo motor interno.",
    acao_pratica: "Revisar movimentos e alimentar dados se faltando.",
    sinal: "\u2192" as const,
  }));

  return {
    texto_curto: "Analise calculada por regras internas; alimente dados para melhor leitura.",
    alertas,
    meta: { fonte: "REGRAS", model: null, created_at: new Date().toISOString() },
  };
}

function sanitizeAnalise(parsed: any, fallback: FinanceiroAnalise): FinanceiroAnalise {
  const safeAlertas: FinanceiroAlerta[] = Array.isArray(parsed?.alertas) ? parsed.alertas : [];
  const normalized = safeAlertas.slice(0, 3).map((a) => {
    const severidade =
      a?.severidade === "CRITICO" || a?.severidade === "ALERTA" || a?.severidade === "INFO"
        ? a.severidade
        : "INFO";
    const sinal = a?.sinal === "\u2191" || a?.sinal === "\u2193" ? a.sinal : "\u2192";
    return {
      severidade,
      titulo: typeof a?.titulo === "string" ? a.titulo : "Alerta",
      por_que_importa:
        typeof a?.por_que_importa === "string"
          ? a.por_que_importa
          : "Importancia nao informada.",
      acao_pratica:
        typeof a?.acao_pratica === "string"
          ? a.acao_pratica
          : "Revisar dados e planos de acao.",
      sinal,
    };
  });

  const texto_curto =
    typeof parsed?.texto_curto === "string" && parsed.texto_curto.trim()
      ? parsed.texto_curto.trim()
      : fallback.texto_curto;

  const meta = {
    fonte: "GPT" as const,
    model: parsed?.meta?.model ?? DEFAULT_MODEL,
    created_at: new Date().toISOString(),
  };

  return { texto_curto, alertas: normalized.length ? normalized : fallback.alertas, meta };
}

function tryParseJson(output: string): any | null {
  try {
    return JSON.parse(output);
  } catch {
    const first = output.indexOf("{");
    const last = output.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(output.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function analisarSnapshotGPT(snapshot: SnapshotFinanceiro): Promise<AnaliseGpt | null> {
  const fallback = baseAlertas(snapshot);

  if (!process.env.OPENAI_API_KEY) {
    return {
      model: null,
      alertas: fallback.alertas,
      texto_curto: fallback.texto_curto,
      meta: fallback.meta,
      raw: {},
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const resumoCentros = (snapshot.resumo_por_centro || []).map((c) => ({
    nome: c.centro_custo_nome ?? c.centro_custo_codigo ?? `Centro ${c.centro_custo_id}`,
    resultado_30d_centavos: c.resultado_30d_centavos,
    tendencia: c.tendencia_resultado,
  }));

  const serie = snapshot.serie_fluxo_caixa || [];
  const serieStats = serie.length
    ? {
        min_saldo: Math.min(...serie.map((s) => s.saldo_acumulado_centavos)),
        max_saldo: Math.max(...serie.map((s) => s.saldo_acumulado_centavos)),
        ultimo_saldo: serie[serie.length - 1].saldo_acumulado_centavos,
      }
    : null;

  const payload = {
    caixa_hoje_centavos: snapshot.caixa_hoje_centavos,
    entradas_previstas_30d_centavos: snapshot.entradas_previstas_30d_centavos,
    saidas_comprometidas_30d_centavos: snapshot.saidas_comprometidas_30d_centavos,
    folego_caixa_dias: snapshot.folego_caixa_dias,
    tendencia: snapshot.tendencia,
    resumo_por_centro: resumoCentros,
    serie_stats: serieStats,
    regras_alerta: snapshot.regras_alerta,
  };

  try {
    const response = await client.responses.create({
      model: DEFAULT_MODEL,
      input: [
        { role: "system", content: [{ type: "text", text: PROMPT_FINANCEIRO_CONSULTOR }] },
        { role: "user", content: [{ type: "text", text: JSON.stringify(payload) }] },
      ],
      response_format: { type: "json_object" },
    });

    const text = (response as any)?.output_text ?? "";
    const parsedRaw = text ? tryParseJson(text) : null;
    const normalized = parsedRaw ? sanitizeAnalise(parsedRaw, fallback) : fallback;

    return {
      model: DEFAULT_MODEL,
      alertas: normalized.alertas,
      texto_curto: normalized.texto_curto,
      meta: normalized.meta,
      raw: response,
    };
  } catch (err) {
    console.warn("[analisarSnapshotGPT] Erro na chamada GPT:", err);
    return {
      model: DEFAULT_MODEL,
      alertas: fallback.alertas,
      texto_curto: fallback.texto_curto,
      meta: fallback.meta,
      raw: { error: String(err) },
    };
  }
}
