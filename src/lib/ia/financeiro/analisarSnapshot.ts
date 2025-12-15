import OpenAI from "openai";
import { AnaliseGpt, SnapshotFinanceiro } from "@/lib/financeiro/dashboardInteligente";

type AlertSchema = {
  icone?: string | null;
  titulo_curto: string;
  severidade: "INFO" | "ALERTA" | "CRITICO";
  acao_pratica?: string | null;
};

type GptOutput = {
  alertas?: AlertSchema[];
  texto_curto?: string;
};

const DEFAULT_MODEL = process.env.FINANCEIRO_GPT_MODEL || "gpt-5";

export async function analisarSnapshotGPT(snapshot: SnapshotFinanceiro): Promise<AnaliseGpt | null> {
  const regrasComoAlertas: AlertSchema[] = (snapshot.regras_alerta || []).slice(0, 3).map((r) => ({
    icone: null,
    titulo_curto: r.titulo,
    severidade: r.severidade === "CRITICO" ? "CRITICO" : "ALERTA",
    acao_pratica: r.detalhe ?? null,
  }));

  if (!process.env.OPENAI_API_KEY) {
    return {
      model: null,
      alertas: regrasComoAlertas,
      texto_curto: "Analise GPT desativada (OPENAI_API_KEY ausente); exibindo alertas calculados.",
      raw: {},
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const payload = {
    caixa_hoje_centavos: snapshot.caixa_hoje_centavos,
    entradas_previstas_30d_centavos: snapshot.entradas_previstas_30d_centavos,
    saidas_comprometidas_30d_centavos: snapshot.saidas_comprometidas_30d_centavos,
    folego_caixa_dias: snapshot.folego_caixa_dias,
    tendencia: snapshot.tendencia,
    resumo_por_centro: (snapshot.resumo_por_centro || []).map((c) => ({
      nome: c.centro_custo_nome ?? c.centro_custo_codigo ?? `Centro ${c.centro_custo_id}`,
      resultado_30d_centavos: c.resultado_30d_centavos,
      tendencia_resultado: c.tendencia_resultado,
    })),
    regras_alerta: snapshot.regras_alerta,
  };

  const instructions = `
    Voce é um consultor financeiro interno (nao contábil). Analise o snapshot abaixo e responda EXCLUSIVAMENTE em JSON.
    Campos esperados:
    {
      "alertas": [
        {
          "icone": "🔥" | "⚠️" | "ℹ️" | null,
          "titulo_curto": string,
          "severidade": "INFO" | "ALERTA" | "CRITICO",
          "acao_pratica": string | null
        }
      ],
      "texto_curto": "um paragrafo curto com leitura executiva"
    }
    Maximo 3 alertas, focar em risco de liquidez, tendencia de entradas/saidas e resultados por centro.
    Nao invente numeros; use apenas o JSON fornecido.
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
      alertas: alertas.length ? alertas : regrasComoAlertas,
      texto_curto: parsed?.texto_curto ?? null,
      raw: response,
    };
  } catch (err) {
    console.warn("[analisarSnapshotGPT] Erro na chamada GPT:", err);
    return {
      model: DEFAULT_MODEL,
      alertas: regrasComoAlertas,
      texto_curto: "Analise automatica nao disponivel; exibindo alertas calculados.",
      raw: { error: String(err) },
    };
  }
}
