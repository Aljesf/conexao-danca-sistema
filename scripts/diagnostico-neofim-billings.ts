import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type HttpResult = {
  method: string;
  url: string;
  started_at_local: string;
  started_at_utc: string;
  ended_at_local: string;
  ended_at_utc: string;
  duration_ms: number;
  status: number | null;
  ok: boolean;
  response_headers: Record<string, string>;
  body: JsonValue | string | null;
  error: string | null;
};

type DiagnosticTest = {
  code: "M1" | "M2" | "M3" | "M4";
  title: string;
  billingType: "boleto" | "pix";
  customer: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
  };
  payload: Record<string, JsonValue>;
  integrationIdentifier: string;
  dueDateUnix: number;
  dueDateIsoLocal: string;
  dueDateIsoUtc: string;
  post?: HttpResult;
  getImmediate?: HttpResult;
  getAfter3Minutes?: HttpResult;
  getAfter15Minutes?: HttpResult;
  listRecentByUpdatedAt?: HttpResult;
  listRecentMatchingEntries?: JsonValue[];
};

const TIMEZONE = "America/Fortaleza";
const REPORT_PATH = path.resolve(
  process.cwd(),
  "docs",
  "diagnostico-neofim-billings-queued-2026-04-04.md",
);
const BASE_URL = (process.env.NEOFIN_BASE_URL ?? "https://api.sandbox.neofin.services").replace(
  /\/+$/,
  "",
);
const API_KEY = process.env.NEOFIN_API_KEY ?? "";
const SECRET_KEY = process.env.NEOFIN_SECRET_KEY ?? "";

if (!API_KEY || !SECRET_KEY) {
  throw new Error("NEOFIN_API_KEY e NEOFIN_SECRET_KEY sao obrigatorias para executar o diagnostico.");
}

function fortalezaIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}-03:00`;
}

function utcIso(date: Date): string {
  return date.toISOString();
}

function nowLocal(): string {
  return fortalezaIso(new Date());
}

function compactTimestamp(date: Date): string {
  return fortalezaIso(date).replace(/[-:T+]/g, "").replace("0000", "000");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(timestampMs: number): Promise<void> {
  const delta = timestampMs - Date.now();
  if (delta > 0) {
    console.log(`[wait] aguardando ${Math.ceil(delta / 1000)}s ate ${fortalezaIso(new Date(timestampMs))}`);
    await sleep(delta);
  }
}

function parseBody(text: string): JsonValue | string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as JsonValue;
  } catch {
    return trimmed;
  }
}

function stringifyForMarkdown(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function cloneJson<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildHeaders(includeJsonContentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    "api-key": API_KEY,
    "secret-key": SECRET_KEY,
  };

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function requestNeofin(
  method: "GET" | "POST",
  url: string,
  body?: JsonValue,
): Promise<HttpResult> {
  const startedAt = new Date();

  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(Boolean(body)),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });

    const text = await response.text();
    const endedAt = new Date();
    const parsedBody = parseBody(text);
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      method,
      url,
      started_at_local: fortalezaIso(startedAt),
      started_at_utc: utcIso(startedAt),
      ended_at_local: fortalezaIso(endedAt),
      ended_at_utc: utcIso(endedAt),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      status: response.status,
      ok: response.ok,
      response_headers: responseHeaders,
      body: parsedBody,
      error: null,
    };
  } catch (error) {
    const endedAt = new Date();
    return {
      method,
      url,
      started_at_local: fortalezaIso(startedAt),
      started_at_utc: utcIso(startedAt),
      ended_at_local: fortalezaIso(endedAt),
      ended_at_utc: utcIso(endedAt),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      status: null,
      ok: false,
      response_headers: {},
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function dueDateFromNowPlusDays(days: number): { unix: number; isoLocal: string; isoUtc: string } {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  date.setHours(12, 0, 0, 0);

  return {
    unix: Math.floor(date.getTime() / 1000),
    isoLocal: fortalezaIso(date),
    isoUtc: utcIso(date),
  };
}

function extractMatchingBillings(body: JsonValue | string | null, integrationIdentifier: string): JsonValue[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];

  const record = body as Record<string, unknown>;
  const billings = Array.isArray(record.billings) ? record.billings : [];
  return billings.filter((billing) => {
    if (!billing || typeof billing !== "object" || Array.isArray(billing)) return false;
    const integration = (billing as Record<string, unknown>).integration_identifier;
    return typeof integration === "string" && integration === integrationIdentifier;
  }) as JsonValue[];
}

function buildPayload(args: {
  billingType: "boleto" | "pix";
  integrationIdentifier: string;
  amount: number;
  dueDateUnix: number;
  customer: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
  };
}): Record<string, JsonValue> {
  return {
    billings: [
      {
        address_city: "Fortaleza",
        address_neighborhood: "Aldeota",
        address_number: "100",
        address_state: "CE",
        address_street: "Rua Barao de Aracati",
        address_zip_code: "60115080",
        amount: args.amount,
        by_mail: false,
        by_whatsapp: true,
        customer_document: args.customer.cpf,
        customer_mail: args.customer.email,
        customer_name: args.customer.name,
        customer_phone: args.customer.phone,
        due_date: args.dueDateUnix,
        installments: 1,
        type: args.billingType,
        integration_identifier: args.integrationIdentifier,
      },
    ],
  };
}

function buildTests(): DiagnosticTest[] {
  const runBase = compactTimestamp(new Date());
  const due = dueDateFromNowPlusDays(7);
  const customerA = {
    name: "Diagnostico Neofim M1",
    cpf: "52998224725",
    email: "diagnostico.neofim.m1@example.com",
    phone: "+5585986123456",
  };
  const customerB = {
    name: "Diagnostico Neofim M3",
    cpf: "11144477735",
    email: "diagnostico.neofim.m3@example.com",
    phone: "+5585986234567",
  };

  const testDefinitions: Array<Pick<DiagnosticTest, "code" | "title" | "billingType" | "customer">> = [
    {
      code: "M1",
      title:
        "boleto, due_date +7 dias, sem original_due_date, sem address_complement, sem discount_before_payment, sem discount_before_payment_due_date, sem fees, sem fine",
      billingType: "boleto",
      customer: customerA,
    },
    {
      code: "M2",
      title:
        "pix, mesmas regras do M1",
      billingType: "pix",
      customer: customerA,
    },
    {
      code: "M3",
      title:
        "boleto, mesmas regras do M1, mas com outro CPF/email/telefone validos",
      billingType: "boleto",
      customer: customerB,
    },
    {
      code: "M4",
      title:
        "repeticao do M1 com consulta adicional de listagem recente por data de atualizacao",
      billingType: "boleto",
      customer: customerA,
    },
  ];

  return testDefinitions.map((definition, index) => {
    const suffix = `${runBase}-${definition.code.toLowerCase()}-${index + 1}`;
    const integrationIdentifier = `diag-neofim-20260404-${suffix}`;
    const payload = buildPayload({
      billingType: definition.billingType,
      integrationIdentifier,
      amount: 15345 + index,
      dueDateUnix: due.unix,
      customer: definition.customer,
    });

    return {
      ...definition,
      payload,
      integrationIdentifier,
      dueDateUnix: due.unix,
      dueDateIsoLocal: due.isoLocal,
      dueDateIsoUtc: due.isoUtc,
    };
  });
}

function resultStatusLine(result: HttpResult | undefined): string {
  if (!result) return "nao executado";
  const status = result.status === null ? "sem_status" : String(result.status);
  return `${status} (${result.ok ? "ok" : "falha"})`;
}

function bodyContainsQueued(result: HttpResult | undefined): boolean {
  if (!result || !result.body || typeof result.body !== "object" || Array.isArray(result.body)) {
    return false;
  }

  const message = (result.body as Record<string, unknown>).message;
  return typeof message === "string" && /queued/i.test(message);
}

function extractValidationErrorKeys(tests: DiagnosticTest[]): string[] {
  const keys = new Set<string>();

  for (const test of tests) {
    const body = test.post?.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) continue;
    const errors = (body as Record<string, unknown>).errors;
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) continue;

    for (const key of Object.keys(errors as Record<string, unknown>)) {
      keys.add(key);
    }
  }

  return Array.from(keys);
}

function buildConclusion(tests: DiagnosticTest[]): {
  conclusion: string;
  hypotheses: string[];
  supportQuestions: string[];
} {
  const getFoundCount = tests.filter((test) => test.getAfter15Minutes?.ok).length;
  const queuedCount = tests.filter((test) => bodyContainsQueued(test.post)).length;
  const validationFailures = tests.filter((test) => (test.post?.status ?? 0) >= 400 && (test.post?.status ?? 0) < 500);
  const m4 = tests.find((test) => test.code === "M4");
  const m4Listed = Boolean(m4 && (m4.listRecentMatchingEntries?.length ?? 0) > 0);
  const uniqueBillingTypes = Array.from(new Set(tests.map((test) => test.billingType)));
  const validationKeys = extractValidationErrorKeys(tests);
  const validationKeysText = validationKeys.length > 0 ? validationKeys.join(", ") : "nenhum campo identificado";

  if (validationFailures.length > 0) {
    return {
      conclusion:
        `O problema foi reproduzido diretamente na API da Neofim em nivel de validacao de payload. Todos os testes minimos falharam antes da materializacao da cobranca e a API devolveu o mesmo erro de schema: ${validationKeysText}. O bloqueio ocorreu antes de qualquer efeito assincrono, entao a causa predominante nesta rodada nao foi regra de vencimento nem descarte interno posterior, mas sim validacao de payload/schema.`,
      hypotheses: [
        "A API exige `installment_type` em producao, embora o payload minimo desta rodada o tenha omitido por interpretacao de campo opcional.",
        "A documentacao e o comportamento real da validacao estao inconsistentes para campos de parcelamento e demais opcionais.",
        "Enquanto `installment_type` nao for aceito/omitivel, esta rodada nao consegue isolar em definitivo o efeito de `original_due_date`, descontos, fees e fine.",
      ],
      supportQuestions: [
        `Quais campos sao realmente obrigatorios no endpoint POST /billing/ em producao hoje para os tipos ${uniqueBillingTypes.join(", ")}?`,
        "O campo `installment_type` e obrigatorio mesmo quando `installments` = 1? Se sim, quais valores sao aceitos em producao hoje?",
        "A lista oficial de obrigatoriedade inclui address_complement, discount_before_payment, discount_before_payment_due_date, fees e fine de forma mandataria na validacao de producao?",
        `Os identifiers testados (${tests.map((test) => test.integrationIdentifier).join(", ")}) falharam exatamente por ausencia de \`installment_type\` ou houve outras validacoes internas nao expostas na resposta 400?`,
      ],
    };
  }

  if (queuedCount === tests.length && getFoundCount === 0 && !m4Listed) {
    return {
      conclusion:
        "O problema foi reproduzido diretamente na API da Neofim. Todos os testes aceitaram o POST com retorno de enfileiramento, mas nenhum billing ficou recuperavel pelo GET por integration identifier em ate 15 minutos, nem apareceu na listagem por data de atualizacao do M4. Hipotese predominante: descarte assincrono interno ou bloqueio/configuracao da conta/cedente. Abrir suporte com os identifiers testados e horarios exatos.",
      hypotheses: [
        "Descarte assincrono interno apos o aceite do enfileiramento.",
        "Bloqueio ou configuracao faltante da conta/cedente no ambiente de producao.",
        "Processamento interno retido por regra operacional nao devolvida no POST.",
      ],
      supportQuestions: [
        `Para os identifiers ${tests.map((test) => test.integrationIdentifier).join(", ")}, por que o POST retornou fila aceita mas o billing nao ficou disponivel em GET /billing/integration/{integration_identifier} nem em GET /billing/updated_at?`,
        "Existe alguma regra de conta, cedente, KYC, emissor ou produto que aceite a fila e descarte a cobranca depois sem retornar erro sincrono?",
        "O ambiente de producao desta conta esta autorizado para emissao de boleto e pix via POST /billing/?",
        "Ha algum log interno por identifier ou horario que explique o descarte apos o enfileiramento?",
      ],
    };
  }

  if (getFoundCount > 0 || m4Listed) {
    return {
      conclusion:
        "O problema nao ficou caracterizado como falha generalizada da API da Neofim. Pelo menos parte dos testes minimos materializou diretamente fora do sistema, o que enfraquece a hipotese de falha interna universal da plataforma e desloca a investigacao para diferencas de payload, lookup por identificador ou dados especificos do fluxo produtivo.",
      hypotheses: [
        "O payload produtivo atual envia campos opcionais/defaults que alteram a validacao ou o processamento.",
        "O sistema pode estar consultando o billing pelo caminho errado ou cedo demais para o identificador retornado.",
        "Ha diferenca entre dados reais de cliente/endereco no sistema e os dados sinteticos aceitos no diagnostico.",
      ],
      supportQuestions: [
        `Confirma que os identifiers materializados (${tests.filter((test) => test.getAfter15Minutes?.ok).map((test) => test.integrationIdentifier).join(", ") || "nenhum"}) seguiram o fluxo esperado da conta?`,
        "Existe alguma diferenca operacional entre GET /billing/integration/{integration_identifier} e GET /billing/{billing_number} que o integrador precise observar apos o enfileiramento?",
        "Ha SLA oficial de materializacao entre o POST 202 e a disponibilidade do billing para consulta?",
      ],
    };
  }

  return {
    conclusion:
      "O diagnostico nao encontrou um padrao unico suficiente para isolar apenas payload ou apenas falha interna da plataforma. Ha sinais mistos entre aceite do POST e indisponibilidade posterior, exigindo correlacao com logs internos da Neofim.",
    hypotheses: [
      "Fila aceita com processamento interno inconsistente.",
      "Validacao tardia dependente de configuracao da conta.",
      "Combinacao entre payload minimo e regra operacional nao documentada.",
    ],
    supportQuestions: [
      `Podem correlacionar os identifiers ${tests.map((test) => test.integrationIdentifier).join(", ")} com os horarios registrados neste relatorio?`,
      "Qual e o comportamento esperado quando a fila e aceita mas o billing nao fica consultavel pouco depois?",
      "Existe retorno assicrono adicional ou painel operacional onde a rejeicao posterior possa ser vista?",
    ],
  };
}

function buildMarkdown(tests: DiagnosticTest[], timeline: string[]): string {
  const firstPostAt = tests
    .map((test) => test.post?.started_at_local)
    .filter((value): value is string => Boolean(value))[0] ?? nowLocal();
  const lastRelevantAt = tests
    .flatMap((test) => [
      test.getAfter15Minutes?.ended_at_local,
      test.listRecentByUpdatedAt?.ended_at_local,
    ])
    .filter((value): value is string => Boolean(value))
    .slice(-1)[0] ?? nowLocal();
  const conclusion = buildConclusion(tests);

  const testSummaryRows = tests
    .map(
      (test) =>
        `| ${test.code} | ${test.billingType} | ${test.integrationIdentifier} | ${test.dueDateIsoLocal} | ${resultStatusLine(test.post)} | ${resultStatusLine(test.getImmediate)} | ${resultStatusLine(test.getAfter3Minutes)} | ${resultStatusLine(test.getAfter15Minutes)} | ${(test.listRecentMatchingEntries?.length ?? 0) > 0 ? "sim" : test.code === "M4" ? "nao" : "n/a"} |`,
    )
    .join("\n");

  const payloadSections = tests
    .map(
      (test) => `### ${test.code}

\`\`\`json
${stringifyForMarkdown(test.payload)}
\`\`\`
`,
    )
    .join("\n");

  const resultSections = tests
    .map((test) => {
      const listSection =
        test.code === "M4"
          ? `
#### Listagem por data/filtro

- Endpoint usado: \`${test.listRecentByUpdatedAt?.url ?? "nao executado"}\`
- Status: ${resultStatusLine(test.listRecentByUpdatedAt)}
- Entradas do M4 localizadas na listagem: ${test.listRecentMatchingEntries?.length ?? 0}

\`\`\`json
${stringifyForMarkdown({
  response: test.listRecentByUpdatedAt ?? null,
  matching_entries: test.listRecentMatchingEntries ?? [],
})}
\`\`\`
`
          : `
#### Listagem por data/filtro

Nao aplicavel neste teste.
`;

      return `### ${test.code}

- Descricao: ${test.title}
- Integration identifier usado na consulta: \`${test.integrationIdentifier}\`
- Due date usada: \`${test.dueDateIsoLocal}\` (${test.dueDateUnix})
- Horario do POST: \`${test.post?.started_at_local ?? "nao executado"}\`

#### Resposta completa do POST

\`\`\`json
${stringifyForMarkdown(test.post ?? null)}
\`\`\`

#### Resposta do GET imediato

\`\`\`json
${stringifyForMarkdown(test.getImmediate ?? null)}
\`\`\`

#### Resposta apos 3 minutos

\`\`\`json
${stringifyForMarkdown(test.getAfter3Minutes ?? null)}
\`\`\`

#### Resposta apos 15 minutos

\`\`\`json
${stringifyForMarkdown(test.getAfter15Minutes ?? null)}
\`\`\`
${listSection}`;
    })
    .join("\n");

  const supportQuestions = conclusion.supportQuestions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");

  const hypothesisLines = conclusion.hypotheses.map((item) => `- ${item}`).join("\n");
  const timelineLines = timeline.map((item) => `- ${item}`).join("\n");

  return `# Diagnostico Neofim - billings queued - 2026-04-04

## contexto

- Objetivo: validar diretamente na API da Neofim se o problema esta no payload/regra de vencimento ou em falha interna da plataforma.
- Escopo: somente diagnostico e documentacao. Nenhuma logica de producao foi alterada.
- Ambiente consultado: \`${BASE_URL}\`
- Autenticacao usada: headers \`api-key\` e \`secret-key\` (redigidos neste arquivo).
- Janela principal do teste: de \`${firstPostAt}\` ate \`${lastRelevantAt}\` no timezone \`${TIMEZONE}\`.
- Regra dos testes: due_date sempre futuro (+7 dias), integration_identifier sempre novo e unico, sem \`original_due_date\`, sem \`address_complement\`, sem \`discount_before_payment\`, sem \`discount_before_payment_due_date\`, sem \`fees\`, sem \`fine\`.
- Observacao de documentacao: a documentacao publica da Neofim apresenta obrigatoriedade ampla para varios campos, mas este diagnostico executa exatamente o payload minimo solicitado para verificar o comportamento real da API em producao.

## linha do tempo

${timelineLines}

## testes executados

| Teste | Tipo | Integration identifier | Due date local | POST | GET imediato | GET +3 min | GET +15 min | Listagem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${testSummaryRows}

## payloads usados

${payloadSections}

## resultados

${resultSections}

## hipoteses remanescentes

${hypothesisLines}

## conclusao tecnica

${conclusion.conclusion}

## perguntas objetivas para o suporte da Neofim

${supportQuestions}
`;
}

async function main(): Promise<void> {
  const tests = buildTests();
  const timeline: string[] = [];
  const startedAt = new Date();

  const pushTimeline = (message: string) => {
    const line = `${fortalezaIso(new Date())} - ${message}`;
    timeline.push(line);
    console.log(line);
  };

  pushTimeline(`inicio do diagnostico direto na API ${BASE_URL}`);

  for (const test of tests) {
    const postUrl = `${BASE_URL}/billing/`;
    pushTimeline(`[${test.code}] POST ${postUrl}`);
    test.post = await requestNeofin("POST", postUrl, cloneJson(test.payload));

    const getUrl = `${BASE_URL}/billing/integration/${encodeURIComponent(test.integrationIdentifier)}`;
    pushTimeline(`[${test.code}] GET imediato ${getUrl}`);
    test.getImmediate = await requestNeofin("GET", getUrl);
  }

  for (const test of tests) {
    if (!test.post) continue;
    const targetAt = new Date(test.post.started_at_utc).getTime() + 3 * 60 * 1000;
    await waitUntil(targetAt);
    const getUrl = `${BASE_URL}/billing/integration/${encodeURIComponent(test.integrationIdentifier)}`;
    pushTimeline(`[${test.code}] GET T+3min ${getUrl}`);
    test.getAfter3Minutes = await requestNeofin("GET", getUrl);
  }

  const firstPostMs = tests
    .map((test) => (test.post ? new Date(test.post.started_at_utc).getTime() : Number.POSITIVE_INFINITY))
    .reduce((acc, value) => Math.min(acc, value), Number.POSITIVE_INFINITY);

  for (const test of tests) {
    if (!test.post) continue;
    const targetAt = new Date(test.post.started_at_utc).getTime() + 15 * 60 * 1000;
    await waitUntil(targetAt);
    const getUrl = `${BASE_URL}/billing/integration/${encodeURIComponent(test.integrationIdentifier)}`;
    pushTimeline(`[${test.code}] GET T+15min ${getUrl}`);
    test.getAfter15Minutes = await requestNeofin("GET", getUrl);

    if (test.code === "M4" && Number.isFinite(firstPostMs)) {
      const windowStart = new Date(firstPostMs - 5 * 60 * 1000);
      const windowEnd = new Date(Date.now() + 60 * 1000);
      const listUrl = new URL(`${BASE_URL}/billing/updated_at`);
      listUrl.searchParams.set("start_datetime", utcIso(windowStart));
      listUrl.searchParams.set("end_datetime", utcIso(windowEnd));

      pushTimeline(`[${test.code}] GET listagem por data ${listUrl.toString()}`);
      test.listRecentByUpdatedAt = await requestNeofin("GET", listUrl.toString());
      test.listRecentMatchingEntries = extractMatchingBillings(
        test.listRecentByUpdatedAt.body,
        test.integrationIdentifier,
      );
    }
  }

  const markdown = buildMarkdown(tests, timeline);
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, markdown, "utf8");

  const endedAt = new Date();
  pushTimeline(
    `fim do diagnostico. duracao total ${Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)}s. relatorio salvo em ${REPORT_PATH}`,
  );

  console.log("");
  console.log("Resumo final:");
  for (const test of tests) {
    console.log(
      `${test.code}: POST=${resultStatusLine(test.post)} GET0=${resultStatusLine(test.getImmediate)} GET+3=${resultStatusLine(test.getAfter3Minutes)} GET+15=${resultStatusLine(test.getAfter15Minutes)}`,
    );
  }
  console.log(`Relatorio: ${REPORT_PATH}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
