import OpenAI from "openai";
import type {
  SuporteAnaliseIa,
  SuporteAnaliseIaModo,
  SuporteTicketAnexo,
  SuporteTicketTipo,
} from "./constants";

const DEFAULT_MODEL =
  process.env.SUPORTE_GPT_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";

type SupportTicketForAi = {
  id: number;
  codigo?: string | null;
  tipo: SuporteTicketTipo;
  titulo: string | null;
  descricao: string;
  contexto_slug: string | null;
  contexto_nome: string | null;
  rota_path: string | null;
  url_completa: string | null;
  pagina_titulo: string | null;
  erro_mensagem: string | null;
  erro_stack?: string | null;
  dados_contexto_json: Record<string, unknown>;
  dados_tecnicos_json?: Record<string, unknown>;
};

type AnalyzeSupportTicketInput = {
  ticket: SupportTicketForAi;
  attachments: SuporteTicketAnexo[];
  modo: SuporteAnaliseIaModo;
};

type RawAiAnalysis = {
  markdown?: unknown;
  resumo?: unknown;
  natureza_problema?: unknown;
  impacto_estimado?: unknown;
  area_sistema?: unknown;
  hipoteses?: unknown;
  sinais_detectados?: unknown;
  sugestoes_investigacao?: unknown;
  limitacoes?: unknown;
  fontes_utilizadas?: unknown;
};

type NormalizedSupportAnalysis = {
  markdown: string;
  text: string;
  json: SuporteAnaliseIa;
};

const PROMPT_BASE = `
Voce e o analista tecnico do modulo de suporte do Sistema Conexao Danca.

Objetivo:
- produzir leitura diagnostica do ticket;
- usar descricao do usuario, contexto da tela, sinais tecnicos e anexos quando existirem;
- nao resolver, nao corrigir, nao responder o usuario e nao tomar acao operacional.

Regras obrigatorias:
- nao resolva;
- nao invente;
- nao conclua sem evidencia;
- produza leitura diagnostica, nao resposta operacional;
- se faltarem dados, declare a limitacao explicitamente;
- seja objetivo, tecnico e rastreavel;
- retorne somente JSON valido.

Formato obrigatorio:
{
  "markdown": "string",
  "resumo": "string",
  "natureza_problema": "string",
  "impacto_estimado": "string",
  "area_sistema": "string",
  "hipoteses": ["string"],
  "sinais_detectados": ["string"],
  "sugestoes_investigacao": ["string"],
  "limitacoes": ["string"],
  "fontes_utilizadas": ["string"]
}

O markdown deve seguir esta estrutura, sem cercas de codigo:
## Resumo do problema
## O que o usuario relatou
## O que foi detectado no contexto da tela
## O que foi detectado nos anexos
## Hipoteses principais
## Sinais tecnicos relevantes
## Proximos pontos de investigacao
## Limitacoes da analise
`;

function getDefaultModel() {
  return DEFAULT_MODEL;
}

function isDeepAnalysisEnabled() {
  return process.env.SUPORTE_IA_APROFUNDADA_ENABLED === "1";
}

function normalizeString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return normalized.length ? normalized : fallback;
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

function getResponseOutputText(response: unknown): string {
  if (!response || typeof response !== "object") return "";

  const record = response as Record<string, unknown>;
  if (typeof record.output_text === "string") {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const partRecord = part as Record<string, unknown>;
      if (typeof partRecord.text === "string" && partRecord.text.trim()) {
        return partRecord.text;
      }
    }
  }

  return "";
}

function buildModeInstructions(modo: SuporteAnaliseIaModo, deepAnalysisEnabled: boolean) {
  if (modo === "aprofundada") {
    if (deepAnalysisEnabled) {
      return [
        "Modo solicitado: leitura tecnica aprofundada.",
        "Voce pode usar todo o contexto tecnico salvo no ticket para produzir um laudo tecnico mais detalhado.",
        "Priorize sinais tecnicos, contexto tecnico salvo, ultimo erro capturado e correlacao com anexos.",
        "Nao altere dados, nao corrija nada e nao responda o usuario.",
      ].join("\n");
    }

    return [
      "Modo solicitado: leitura tecnica aprofundada.",
      "O backend nao liberou enriquecimento tecnico adicional nesta execucao.",
      "Use apenas o contexto salvo no ticket e declare essa limitacao na analise.",
      "Nao altere dados, nao corrija nada e nao responda o usuario.",
    ].join("\n");
  }

  return [
    "Modo solicitado: leitura inicial contextual.",
    "Priorize descricao do usuario, contexto da tela e sinais operacionais visiveis.",
    "Nao altere dados, nao corrija nada e nao responda o usuario.",
  ].join("\n");
}

function buildScreenContextSummary(ticket: SupportTicketForAi) {
  const root = ticket.dados_contexto_json;
  const nested =
    root.screen_context && typeof root.screen_context === "object"
      ? (root.screen_context as Record<string, unknown>)
      : {};

  return {
    contexto_nome: ticket.contexto_nome,
    contexto_slug: ticket.contexto_slug,
    rota_path: ticket.rota_path,
    url_completa: ticket.url_completa,
    pagina_titulo: ticket.pagina_titulo,
    resumo_legivel:
      normalizeNullableString(root.screen_context_summary) ??
      normalizeNullableString(root.resumo_legivel_tela) ??
      normalizeNullableString(nested.resumoLegivel),
    entity_label:
      normalizeNullableString(root.entity_label) ??
      normalizeNullableString(nested.entityLabel),
    aluno_nome:
      normalizeNullableString(root.aluno_nome) ??
      normalizeNullableString(nested.alunoNome),
    responsavel_nome:
      normalizeNullableString(root.responsavel_nome) ??
      normalizeNullableString(nested.responsavelNome),
    turma_nome:
      normalizeNullableString(root.turma_nome) ??
      normalizeNullableString(nested.turmaNome),
    observacoes_contexto:
      normalizeNullableString(root.observacoes_contexto) ??
      normalizeNullableString(nested.observacoesContexto),
  };
}

function buildAttachmentSummary(attachments: SuporteTicketAnexo[]) {
  return attachments.map((attachment) => ({
    nome_arquivo: attachment.nome_arquivo,
    mime_type: attachment.mime_type,
    tamanho_bytes: attachment.tamanho_bytes,
    largura: attachment.largura,
    altura: attachment.altura,
    origem_upload: attachment.origem_upload,
    public_url: attachment.public_url,
  }));
}

function buildTechnicalPayload(
  ticket: SupportTicketForAi,
  modo: SuporteAnaliseIaModo,
  deepAnalysisEnabled: boolean,
) {
  const dadosTecnicos = ticket.dados_tecnicos_json ?? {};

  if (modo === "aprofundada") {
    return {
      enriquecimento_backend_habilitado: deepAnalysisEnabled,
      erro_mensagem: ticket.erro_mensagem,
      erro_stack_resumido: normalizeNullableString(ticket.erro_stack)?.slice(0, 4000) ?? null,
      dados_tecnicos_json: dadosTecnicos,
    };
  }

  return {
    erro_mensagem: ticket.erro_mensagem,
    dados_tecnicos_resumo:
      dadosTecnicos && Object.keys(dadosTecnicos).length > 0
        ? Object.fromEntries(Object.entries(dadosTecnicos).slice(0, 12))
        : {},
  };
}

function buildMarkdownFallback(analysis: Omit<SuporteAnaliseIa, "meta">, ticket: SupportTicketForAi) {
  const contextSummary = buildScreenContextSummary(ticket);
  const contextoTela = [
    contextSummary.contexto_nome,
    contextSummary.rota_path,
    contextSummary.pagina_titulo,
    contextSummary.entity_label,
    contextSummary.aluno_nome,
    contextSummary.responsavel_nome,
    contextSummary.turma_nome,
    contextSummary.resumo_legivel,
  ]
    .filter(Boolean)
    .join(" | ");

  return [
    "## Resumo do problema",
    analysis.resumo,
    "",
    "## O que o usuario relatou",
    ticket.descricao,
    "",
    "## O que foi detectado no contexto da tela",
    contextoTela || "Nenhum contexto adicional legivel foi identificado.",
    "",
    "## O que foi detectado nos anexos",
    analysis.fontes_utilizadas.find((item) => item.toLowerCase().includes("anexo"))
      ? "Ha anexos considerados nesta leitura."
      : "Nenhum anexo de imagem utilizavel foi considerado nesta leitura.",
    "",
    "## Hipoteses principais",
    ...analysis.hipoteses.map((item) => `- ${item}`),
    "",
    "## Sinais tecnicos relevantes",
    ...analysis.sinais_detectados.map((item) => `- ${item}`),
    "",
    "## Proximos pontos de investigacao",
    ...analysis.sugestoes_investigacao.map((item) => `- ${item}`),
    "",
    "## Limitacoes da analise",
    ...analysis.limitacoes.map((item) => `- ${item}`),
  ].join("\n");
}

function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^#+\s*/gm, "")
    .replace(/^- /gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAnalysis(params: {
  raw: unknown;
  model: string;
  modo: SuporteAnaliseIaModo;
  attachments: SuporteTicketAnexo[];
  deepAnalysisEnabled: boolean;
  ticket: SupportTicketForAi;
}): NormalizedSupportAnalysis {
  const { raw, model, modo, attachments, deepAnalysisEnabled, ticket } = params;
  const record =
    raw && typeof raw === "object" ? (raw as RawAiAnalysis) : ({} satisfies RawAiAnalysis);

  const jsonWithoutMeta: Omit<SuporteAnaliseIa, "meta"> = {
    resumo: normalizeString(record.resumo, "Dados insuficientes para resumir o ticket."),
    natureza_problema: normalizeString(
      record.natureza_problema,
      "Natureza do problema ainda nao determinada com seguranca.",
    ),
    impacto_estimado: normalizeString(
      record.impacto_estimado,
      "Impacto ainda nao determinado com seguranca.",
    ),
    area_sistema: normalizeString(record.area_sistema, "Analise geral"),
    hipoteses: normalizeStringArray(record.hipoteses, [
      "Reproduzir o problema com mais contexto operacional e tecnico.",
    ]),
    sinais_detectados: normalizeStringArray(record.sinais_detectados, [
      "Nao ha sinais tecnicos suficientes para afirmar a causa neste momento.",
    ]),
    sugestoes_investigacao: normalizeStringArray(record.sugestoes_investigacao, [
      "Revisar a tela, o contexto tecnico salvo e a sequencia exata de passos informada pelo usuario.",
    ]),
    limitacoes: normalizeStringArray(record.limitacoes, [
      deepAnalysisEnabled
        ? "A analise depende apenas dos dados disponiveis no ticket e nos anexos salvos."
        : "O backend nao liberou enriquecimento tecnico adicional nesta execucao.",
    ]),
    fontes_utilizadas: normalizeStringArray(record.fontes_utilizadas, [
      "descricao do usuario",
      "contexto da tela salvo no ticket",
      attachments.length > 0 ? "anexos do ticket" : "sem anexos de imagem utilizaveis",
    ]),
  };

  const json: SuporteAnaliseIa = {
    ...jsonWithoutMeta,
    meta: {
      fonte: "OPENAI",
      model,
      createdAt: new Date().toISOString(),
      modo,
      status: "concluida",
      attachmentsConsiderados: attachments.length,
      imagensConsideradas: attachments.filter(
        (attachment) => attachment.mime_type.startsWith("image/") && Boolean(attachment.public_url),
      ).length,
      leituraTecnicaAprofundada: modo === "aprofundada" && deepAnalysisEnabled,
    },
  };

  const markdown =
    normalizeNullableString(record.markdown) ?? buildMarkdownFallback(jsonWithoutMeta, ticket);

  return {
    markdown,
    text: markdownToPlainText(markdown),
    json,
  };
}

export async function analisarTicketComIA({
  ticket,
  attachments,
  modo,
}: AnalyzeSupportTicketInput): Promise<NormalizedSupportAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao definida no servidor.");
  }

  const deepAnalysisEnabled = isDeepAnalysisEnabled();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const screenContext = buildScreenContextSummary(ticket);
  const attachmentSummary = buildAttachmentSummary(attachments);
  const imageInputs = attachments
    .filter((attachment) => attachment.mime_type.startsWith("image/") && Boolean(attachment.public_url))
    .slice(0, 3)
    .map((attachment) => ({
      type: "input_image" as const,
      image_url: attachment.public_url,
      detail: "low" as const,
    }));

  const userPayload = {
    modo,
    ticket: {
      id: ticket.id,
      codigo: ticket.codigo ?? null,
      tipo: ticket.tipo,
      titulo: ticket.titulo,
      descricao: ticket.descricao,
      erro_mensagem: ticket.erro_mensagem,
    },
    contexto_tela: screenContext,
    contexto_tecnico: buildTechnicalPayload(ticket, modo, deepAnalysisEnabled),
    anexos: attachmentSummary,
  };

  const response = await client.responses.create({
    model: getDefaultModel(),
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [PROMPT_BASE, buildModeInstructions(modo, deepAnalysisEnabled)].join("\n\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(userPayload),
          },
          ...imageInputs,
        ],
      },
    ],
    text: {
      format: { type: "json_object" },
    },
  });

  const outputText = getResponseOutputText(response);
  const parsed = outputText ? tryParseJson(outputText) : null;
  if (!parsed) {
    throw new Error("Falha ao parsear resposta da analise de IA do suporte.");
  }

  return normalizeAnalysis({
    raw: parsed,
    model: getDefaultModel(),
    modo,
    attachments,
    deepAnalysisEnabled,
    ticket,
  });
}

export function buildAnalysisText(analysis: Pick<NormalizedSupportAnalysis, "json">) {
  const payload = analysis.json;
  return [
    `Resumo: ${payload.resumo}`,
    `Natureza do problema: ${payload.natureza_problema}`,
    `Area do sistema: ${payload.area_sistema}`,
    `Impacto estimado: ${payload.impacto_estimado}`,
    `Hipoteses: ${payload.hipoteses.join(" | ")}`,
    `Sinais detectados: ${payload.sinais_detectados.join(" | ")}`,
    `Sugestoes de investigacao: ${payload.sugestoes_investigacao.join(" | ")}`,
    `Limitacoes: ${payload.limitacoes.join(" | ")}`,
  ].join("\n");
}

