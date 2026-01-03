import OpenAI from "openai";
import type { AiAnalyzeResp, AiVarSuggestion } from "@/lib/documentos/ai.types";

const DEFAULT_MODEL =
  process.env.DOCUMENTOS_GPT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";

const PROMPT = `
You are an assistant that converts a contract text into a structured JSON for the Conexao Dados system.

Return ONLY a JSON object with the following shape:
{
  "titulo_sugerido": "string",
  "tipo_documento_codigo": "string|null",
  "template_html": "string",
  "variaveis": [
    {
      "codigo": "ALUNO_NOME",
      "descricao": "Nome do aluno",
      "tipo": "TEXTO|MONETARIO|DATA|BOOLEAN|OUTRO",
      "formato": "string|null",
      "obrigatoria": true
    }
  ]
}

Rules:
- Use {{CODIGO}} placeholders in template_html (uppercase and underscore).
- Keep HTML simple (p, strong, table, ul, li, br).
- Do not wrap the JSON in markdown fences.
- If tipo_documento_codigo is unknown, use null.
`;

function normalizeCodigo(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  return value.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function normalizeTipo(raw: unknown): AiVarSuggestion["tipo"] {
  const val = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (val === "MONETARIO" || val === "DATA" || val === "BOOLEAN" || val === "OUTRO") return val;
  return "TEXTO";
}

function normalizeVar(raw: unknown): AiVarSuggestion | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const codigo = normalizeCodigo(rec.codigo);
  if (!codigo) return null;
  const descricao =
    typeof rec.descricao === "string" && rec.descricao.trim()
      ? rec.descricao.trim()
      : codigo;
  const tipo = normalizeTipo(rec.tipo);
  const formato =
    typeof rec.formato === "string" && rec.formato.trim() ? rec.formato.trim() : null;
  const obrigatoria = Boolean(rec.obrigatoria);
  return { codigo, descricao, tipo, formato, obrigatoria };
}

function normalizeResponse(raw: unknown): AiAnalyzeResp {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const titulo =
    typeof rec.titulo_sugerido === "string" && rec.titulo_sugerido.trim()
      ? rec.titulo_sugerido.trim()
      : "Modelo gerado por IA";
  const tipoCodigo =
    typeof rec.tipo_documento_codigo === "string" && rec.tipo_documento_codigo.trim()
      ? rec.tipo_documento_codigo.trim()
      : null;
  const template =
    typeof rec.template_html === "string" && rec.template_html.trim()
      ? rec.template_html
      : "<p></p>";
  const variaveisRaw = Array.isArray(rec.variaveis) ? rec.variaveis : [];
  const variaveis = variaveisRaw
    .map((v) => normalizeVar(v))
    .filter((v): v is AiVarSuggestion => Boolean(v));
  return {
    titulo_sugerido: titulo,
    tipo_documento_codigo: tipoCodigo,
    template_html: template,
    variaveis,
  };
}

function tryParseJson(output: string): unknown | null {
  if (!output) return null;
  try {
    return JSON.parse(output);
  } catch {
    const first = output.indexOf("{");
    const last = output.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
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
      if (c?.type === "output_text" && typeof c?.text === "string") {
        return c.text;
      }
    }
  }
  return "";
}

export async function iaAnalisarContrato(texto: string): Promise<AiAnalyzeResp> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao definida no servidor.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    input: [
      { role: "system", content: [{ type: "input_text", text: PROMPT }] },
      { role: "user", content: [{ type: "input_text", text: texto }] },
    ],
    text: { format: { type: "json_object" } },
  });

  const outputText = getResponseOutputText(response);
  const parsed = outputText ? tryParseJson(outputText) : null;
  if (!parsed) {
    throw new Error("Falha ao parsear resposta da IA.");
  }

  return normalizeResponse(parsed);
}
