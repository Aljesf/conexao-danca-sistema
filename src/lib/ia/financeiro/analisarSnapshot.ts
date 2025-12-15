import OpenAI from "openai";
import { AnaliseGpt, SnapshotFinanceiro } from "@/lib/financeiro/dashboardInteligente";

export type FinanceiroAlerta = {
  severidade: "CRITICO" | "ALERTA" | "INFO";
  titulo: string;
  por_que_importa: string;
  acao_pratica: string;
  sinal: "↑" | "↓" | "→";
};

export type FinanceiroAnalise = {
  texto_curto: string;
  alertas: FinanceiroAlerta[];
  meta?: {
    fonte: "GPT" | "REGRAS";
    model?: string | null;
    created_at?: string | null;
    erro_tipo?: "SEM_CHAVE" | "ERRO" | "PARSER";
    erro_msg?: string | null;
  };
};

const DEFAULT_MODEL = process.env.FINANCEIRO_GPT_MODEL || "gpt-4.1-mini";

export const PROMPT_FINANCEIRO_CONSULTOR = `
Você é o Consultor Financeiro Interno do Sistema Conexão Dança (Escola, Loja e Café).

Objetivo: orientar decisões em até 30 segundos com base SOMENTE no snapshot recebido.
Este dashboard não é contábil. É um painel de decisão (saúde, risco e ação).

Regras:
- Não repetir números do snapshot.
- Não inventar fatos ou dados.
- Priorizar consequência > variação.
- Quando houver 'base zero' ou pouco histórico, diga isso sem usar porcentagens confusas.
- Se dados estiverem insuficientes, declarar 'dados insuficientes' e sugerir ação preventiva (ex.: registrar lançamentos, alimentar movimento, revisar cobranças).

Foco da leitura:
- Pressão de caixa (fôlego, risco de curto prazo).
- Qualidade do crescimento (crescer sem liquidez é risco).
- Concentração de risco (quando poucos itens/pessoas/centros puxam o resultado).
- Centro de custo: comparar cada centro consigo mesmo; não comparar centros entre si.
- Cartão Conexão: se existir no snapshot, tratar como ativo financeiro sensível (crescimento saudável vs risco).

Formato obrigatório de saída (JSON estrito):
{
  "texto_curto": "Resumo executivo em 1 parágrafo, sem números",
  "alertas": [
    {
      "severidade": "CRITICO|ALERTA|INFO",
      "titulo": "Título curto",
      "por_que_importa": "1 linha",
      "acao_pratica": "1 linha",
      "sinal": "↑|↓|→"
    }
  ]
}

Máximo de 3 alertas. Priorize por severidade (CRITICO > ALERTA > INFO).`;

function baseAlertas(
  snapshot: SnapshotFinanceiro,
  meta?: Partial<FinanceiroAnalise["meta"]>
): FinanceiroAnalise {
  const alertas = (snapshot.regras_alerta || []).slice(0, 3).map((r) => ({
    severidade: r.severidade === "CRITICO" ? "CRITICO" : "ALERTA",
    titulo: r.titulo,
    por_que_importa: r.detalhe ?? "Alertas calculados pelo motor interno.",
    acao_pratica: "Revisar movimentos e alimentar dados se faltando.",
    sinal: "→" as const,
  }));

  return {
    texto_curto:
      "Leitura gerada por regras internas (GPT indisponível no momento). Para uma análise mais rica, alimente o movimento financeiro e registre cobranças/recebimentos.",
    alertas,
    meta: {
      fonte: "REGRAS",
      model: meta?.model ?? null,
      created_at: new Date().toISOString(),
      erro_tipo: meta?.erro_tipo,
      erro_msg: meta?.erro_msg,
    },
  };
}

function sanitizeAnalise(parsed: any, fallback: FinanceiroAnalise): FinanceiroAnalise {
  const safeAlertas: FinanceiroAlerta[] = Array.isArray(parsed?.alertas)
    ? parsed.alertas.filter((a: any) => a && typeof a === "object")
    : [];
  const normalized = safeAlertas.slice(0, 3).map((a) => {
    const severidade =
      a?.severidade === "CRITICO" || a?.severidade === "ALERTA" || a?.severidade === "INFO"
        ? a.severidade
        : "INFO";
    const sinal = a?.sinal === "↑" || a?.sinal === "↓" ? a.sinal : "→";
    return {
      severidade,
      titulo: typeof a?.titulo === "string" && a.titulo.trim() ? a.titulo.trim() : "Alerta",
      por_que_importa:
        typeof a?.por_que_importa === "string" && a.por_que_importa.trim()
          ? a.por_que_importa.trim()
          : "Importancia nao informada.",
      acao_pratica:
        typeof a?.acao_pratica === "string" && a.acao_pratica.trim()
          ? a.acao_pratica.trim()
          : "Revisar dados e planos de acao.",
      sinal,
    };
  });

  const texto_curto_raw =
    typeof parsed?.texto_curto === "string" && parsed.texto_curto.trim() ? parsed.texto_curto.trim() : "";
  const texto_curto = texto_curto_raw || fallback.texto_curto;

  const meta = {
    fonte: "GPT" as const,
    model: parsed?.meta?.model ?? DEFAULT_MODEL,
    created_at: new Date().toISOString(),
  };

  return { texto_curto, alertas: normalized.length ? normalized : fallback.alertas, meta };
}

function tryParseJson(output: string): any | null {
  if (!output) return null;

  try {
    return JSON.parse(output);
  } catch {
    const first = output.indexOf("{");
    const last = output.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) {
      return null;
    }

    try {
      return JSON.parse(output.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

function getResponseOutputText(resp: any): string {
  if (!resp) return "";
  if (typeof resp.output_text === "string") return resp.output_text;

  const out = Array.isArray(resp.output) ? resp.output : [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text;
      if (typeof c?.type === "string" && c.type === "output_text" && typeof c?.text === "string") {
        return c.text;
      }
    }
  }
  return "";
}

function sanitizeErrorMessage(err: any): string {
  if (!err) return "erro_desconhecido";
  const raw =
    typeof err === "string"
      ? err
      : err?.message || err?.error || err?.statusText || err?.code || JSON.stringify(err);
  return String(raw).slice(0, 180);
}

export async function analisarSnapshotGPT(snapshot: SnapshotFinanceiro): Promise<AnaliseGpt | null> {
  const hasOpenaiKey = !!process.env.OPENAI_API_KEY;
  const model = DEFAULT_MODEL;
  const fallbackDefault = baseAlertas(snapshot);

  if (!hasOpenaiKey) {
    const fallback = baseAlertas(snapshot, {
      model: null,
      erro_tipo: "SEM_CHAVE",
      erro_msg: "OPENAI_API_KEY ausente no servidor",
    });
    return {
      model: null,
      alertas: fallback.alertas,
      texto_curto: fallback.texto_curto,
      meta: fallback.meta,
      raw: { error: "OPENAI_API_KEY ausente no servidor" },
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
      model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: PROMPT_FINANCEIRO_CONSULTOR }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(payload) }],
        },
      ],
      text: {
        format: { type: "json_object" },
      },
    });

    const text = getResponseOutputText(response);
    const parsedRaw = text ? tryParseJson(text) : null;

    if (!parsedRaw) {
      const fallback = baseAlertas(snapshot, {
        model,
        erro_tipo: "PARSER",
        erro_msg: "Falha ao parsear resposta GPT",
      });
      return {
        model,
        alertas: fallback.alertas,
        texto_curto: fallback.texto_curto,
        meta: fallback.meta,
        raw: { response, output_text: text, parse_error: true },
      };
    }

    const normalized = sanitizeAnalise(parsedRaw, fallbackDefault);

    return {
      model,
      alertas: normalized.alertas,
      texto_curto: normalized.texto_curto,
      meta: normalized.meta,
      raw: response,
    };
  } catch (err) {
    const extra =
      err && typeof err === "object"
        ? ` status=${(err as any)?.status ?? "?"} code=${(err as any)?.code ?? "?"} message=${(err as any)?.message ?? "?"}`
        : "";
    const motivo = sanitizeErrorMessage(`${extra} ${sanitizeErrorMessage(err)}`.trim());
    if (process.env.NODE_ENV !== "production") {
      console.error("[analisarSnapshotGPT] Erro na chamada GPT:", err);
    } else {
      console.warn("[analisarSnapshotGPT] Erro na chamada GPT:", motivo);
    }
    const fallback = baseAlertas(snapshot, { model, erro_tipo: "ERRO", erro_msg: motivo });
    return {
      model,
      alertas: fallback.alertas,
      texto_curto: fallback.texto_curto,
      meta: fallback.meta,
      raw: { error: motivo },
    };
  }
}
