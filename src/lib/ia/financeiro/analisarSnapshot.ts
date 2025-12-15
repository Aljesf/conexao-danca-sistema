import OpenAI from "openai";
import { AnaliseGpt, SnapshotFinanceiro } from "@/lib/financeiro/dashboardInteligente";

type AlertSchema = {
  severidade: "CRITICO" | "ALERTA" | "INFO";
  titulo: string;
  por_que_importa: string;
  acao_pratica: string;
  sinal: "\u2191" | "\u2193" | "\u2192";
};

type GptOutput = {
  alertas?: AlertSchema[];
  texto_curto?: string;
};

const DEFAULT_MODEL = process.env.FINANCEIRO_GPT_MODEL || "gpt-5";

function baseAlertas(snapshot: SnapshotFinanceiro): AlertSchema[] {
  return (snapshot.regras_alerta || []).slice(0, 3).map((r) => ({
    severidade: r.severidade === "CRITICO" ? "CRITICO" : "ALERTA",
    titulo: r.titulo,
    por_que_importa: r.detalhe ?? "Alertas calculados pelo motor interno.",
    acao_pratica: "Revisar movimentos e alimentar dados se faltando.",
    sinal: "\u2192",
  }));
}

export async function analisarSnapshotGPT(snapshot: SnapshotFinanceiro): Promise<AnaliseGpt | null> {
  const fallbackAlertas = baseAlertas(snapshot);

  if (!process.env.OPENAI_API_KEY) {
    return {
      model: null,
      alertas: fallbackAlertas,
      texto_curto: "Analise GPT desativada (OPENAI_API_KEY ausente); exibindo alertas calculados.",
      raw: {},
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const tendencia = snapshot.tendencia;
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
    tendencia,
    resumo_por_centro: resumoCentros,
    serie_stats: serieStats,
    contexto_centros: resumoCentros.map((c) => c.nome),
    regras_alerta: snapshot.regras_alerta,
  };

  const instructions = `
    Voce atua como consultor interno (nao contábil). Objetivo: fornecer leitura executiva em 30 segundos.
    Regras:
    - Responder exclusivamente em JSON no formato:
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
      ]
    }
    - Maximo 3 alertas, priorizar severidade (CRITICO > ALERTA > INFO).
    - Nao inventar fatos fora do snapshot; nao sugerir ilegalidades; nao criar lancamentos.
    - Se dados escassos (muitos zeros), gerar alertas INFO orientando a alimentar dados/registrar movimentos.
    - Linguagem direta e executiva, sem porcentagens absurdas por base zero.
  `;

  try {
    const response = await client.responses.create({
      model: DEFAULT_MODEL,
      input: [
        { role: "system", content: [{ type: "text", text: instructions }] },
        { role: "user", content: [{ type: "text", text: JSON.stringify(payload) }] },
      ],
      response_format: { type: "json_object" },
    });

    const text = (response as any)?.output_text ?? "";
    let parsed: GptOutput | null = null;
    try {
      parsed = text ? (JSON.parse(text) as GptOutput) : null;
    } catch (err) {
      console.warn("[analisarSnapshotGPT] Falha ao fazer parse da saida GPT:", err, text);
    }

    const alertas = (parsed?.alertas || []).slice(0, 3);
    return {
      model: DEFAULT_MODEL,
      alertas: alertas.length ? alertas : fallbackAlertas,
      texto_curto: parsed?.texto_curto ?? "Analise automatica indisponivel; usando alertas calculados.",
      raw: response,
    };
  } catch (err) {
    console.warn("[analisarSnapshotGPT] Erro na chamada GPT:", err);
    return {
      model: DEFAULT_MODEL,
      alertas: fallbackAlertas,
      texto_curto: "Analise automatica nao disponivel; exibindo alertas calculados.",
      raw: { error: String(err) },
    };
  }
}
