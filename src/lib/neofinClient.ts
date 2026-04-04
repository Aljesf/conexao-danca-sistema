import {
  extractNeofinBillingDetails,
  findMatchingNeofinBillingCandidate,
  firstNonEmptyString,
  looksLikeNeofinBillingNumber,
  normalizeNeofinIdentifier,
} from "@/lib/neofinBilling";

const NEOFIN_BASE_URL = process.env.NEOFIN_BASE_URL ?? "https://api.sandbox.neofin.services";

const NEOFIN_API_KEY = process.env.NEOFIN_API_KEY;
const NEOFIN_SECRET_KEY = process.env.NEOFIN_SECRET_KEY;

export type NeofinResult = {
  ok: boolean;
  status: number;
  body: unknown | null;
  message?: string | null;
};

type UpsertNeofinBillingInput = {
  integrationIdentifier: string;
  amountCentavos: number;
  dueDate: string;
  description: string;
  billingType?: string;
  address?: {
    city?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  discountBeforePayment?: number;
  discountBeforePaymentDueDate?: number;
  fees?: number;
  fine?: number;
  installments?: number;
  installmentType?: string;
  customer: {
    nome: string;
    cpf: string;
    email?: string | null;
    telefone?: string | null;
  };
};

type GetNeofinBillingInput = {
  identifier: string;
};

function missingCredentialsResult(): NeofinResult {
  console.error("[Neofin] NEOFIN_API_KEY ou NEOFIN_SECRET_KEY nao configuradas no servidor.");
  return {
    ok: false,
    status: 500,
    body: null,
    message: "Credenciais da Neofin nao configuradas no servidor.",
  };
}

function cleanText(value: string | null | undefined, fallback: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function onlyDigits(value: string | null | undefined): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

function getNeofinHeaders(contentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    "api-key": NEOFIN_API_KEY ?? "",
    "secret-key": NEOFIN_SECRET_KEY ?? "",
  };

  if (contentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function readJsonResponse(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestNeofin(
  url: string,
  init: RequestInit,
  logLabel: string,
): Promise<NeofinResult> {
  try {
    const response = await fetch(url, init);
    const body = await readJsonResponse(response);

    if (!response.ok) {
      console.error(`[Neofin] ${logLabel}:`, response.status, JSON.stringify(body));
      return {
        ok: false,
        status: response.status,
        body,
        message:
          (body &&
          typeof body === "object" &&
          "message" in (body as Record<string, unknown>) &&
          typeof (body as Record<string, unknown>).message === "string")
            ? String((body as Record<string, unknown>).message)
            : null,
      };
    }

    return {
      ok: true,
      status: response.status,
      body,
      message:
        (body &&
        typeof body === "object" &&
        "message" in (body as Record<string, unknown>) &&
        typeof (body as Record<string, unknown>).message === "string")
          ? String((body as Record<string, unknown>).message)
          : null,
    };
  } catch (error) {
    console.error(`[Neofin] ${logLabel} - erro de rede:`, error);
    return {
      ok: false,
      status: 500,
      body: null,
      message: error instanceof Error ? error.message : "Falha de rede ao chamar a Neofin.",
    };
  }
}

async function getNeofinBillingByBillingId(identifier: string): Promise<NeofinResult> {
  return requestNeofin(
    `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(identifier)}`,
    { headers: getNeofinHeaders(false) },
    "erro_ao_consultar_cobranca_por_billing_id",
  );
}

async function getNeofinBillingByIntegrationIdentifier(identifier: string): Promise<NeofinResult> {
  return requestNeofin(
    `${NEOFIN_BASE_URL}/billing/integration/${encodeURIComponent(identifier)}`,
    { headers: getNeofinHeaders(false) },
    "erro_ao_consultar_cobranca_por_integration_identifier",
  );
}

export async function listNeofinBillings(
  params: { integrationIdentifier?: string | null } = {},
): Promise<NeofinResult> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    return missingCredentialsResult();
  }

  const url = new URL(`${NEOFIN_BASE_URL}/billing/`);
  if (params.integrationIdentifier) {
    url.searchParams.set("integration_identifier", params.integrationIdentifier);
  }

  return requestNeofin(
    url.toString(),
    { headers: getNeofinHeaders(false) },
    "erro_ao_listar_billings",
  );
}

export async function findRecentNeofinBillingByIntegrationIdentifier(
  integrationIdentifier: string,
): Promise<NeofinResult> {
  const normalized = integrationIdentifier.trim();
  if (!normalized) {
    return {
      ok: false,
      status: 400,
      body: null,
      message: "Identificador de integracao vazio para busca na Neofin.",
    };
  }

  const attempts = [
    await listNeofinBillings({ integrationIdentifier: normalized }),
    await listNeofinBillings(),
  ];

  for (const attempt of attempts) {
    if (!attempt.ok) continue;
    const match = findMatchingNeofinBillingCandidate(attempt.body, {
      identifier: normalized,
      integrationIdentifier: normalized,
    });

    if (match) {
      const rawIntegration =
        normalizeNeofinIdentifier(match.integration_identifier)
        ?? normalizeNeofinIdentifier(match.integrationIdentifier);
      const rawId = normalizeNeofinIdentifier(
        firstNonEmptyString(match.id, match.billing_id, match.billing_number, match.charge_id),
      );
      const exactIntegration = rawIntegration === normalized;
      const exactId = rawId === normalized;

      if (exactIntegration || exactId) {
        return {
          ok: true,
          status: 200,
          body: match,
          message: "Billing localizado por integration_identifier.",
        };
      }
    }
  }

  return {
    ok: false,
    status: 404,
    body: null,
    message: "Billing nao encontrado na Neofin para o integration_identifier informado.",
  };
}

export async function upsertNeofinBilling(
  input: UpsertNeofinBillingInput,
): Promise<NeofinResult> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    return missingCredentialsResult();
  }

  const dueDateTimestamp = Math.floor(new Date(input.dueDate).getTime() / 1000);
  const url = `${NEOFIN_BASE_URL}/billing/`;
  const address = input.address ?? {};

  const payload = {
    billings: [
      {
        customer_document: input.customer.cpf,
        customer_name: input.customer.nome,
        customer_mail: input.customer.email ?? "",
        customer_phone: input.customer.telefone ?? "",
        address_city: cleanText(address.city, "Salinopolis"),
        address_complement: typeof address.complement === "string" ? address.complement.trim() : "",
        address_neighborhood: cleanText(address.neighborhood, "Centro"),
        address_number: cleanText(address.number, "S/N"),
        address_state: cleanText(address.state, "PA"),
        address_street: cleanText(address.street, "Nao informado"),
        address_zip_code: onlyDigits(address.zipCode) || "68721000",
        amount: input.amountCentavos,
        due_date: dueDateTimestamp,
        original_due_date: dueDateTimestamp,
        discount_before_payment: input.discountBeforePayment ?? 0,
        discount_before_payment_due_date: input.discountBeforePaymentDueDate ?? 0,
        description: input.description,
        fees: input.fees ?? 0.0333,
        fine: input.fine ?? 2,
        installment_type: cleanText(input.installmentType, "monthly"),
        installments: input.installments ?? 1,
        nfe_number: "",
        recipients: [],
        type: input.billingType ?? "bolepix",
        integration_identifier: input.integrationIdentifier,
        boleto_base64: "",
        code: "",
        hash: "",
        ignore_existing_customer_upsert: false,
        payee_name: "",
        payee_document: "",
        by_mail: false,
        by_whatsapp: true,
      },
    ],
  };

  return requestNeofin(
    url,
    {
      method: "POST",
      headers: getNeofinHeaders(true),
      body: JSON.stringify(payload),
    },
    "erro_ao_enfileirar_cobranca",
  );
}

export async function getNeofinBilling(
  input: GetNeofinBillingInput,
): Promise<NeofinResult> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    return missingCredentialsResult();
  }

  const identifier = input.identifier.trim();
  if (!identifier) {
    return {
      ok: false,
      status: 400,
      body: null,
      message: "Identificador vazio para consulta na Neofin.",
    };
  }

  if (looksLikeNeofinBillingNumber(identifier)) {
    return getNeofinBillingByBillingId(identifier);
  }

  const primary = await getNeofinBillingByIntegrationIdentifier(identifier);

  if (primary.ok) {
    return primary;
  }

  if (primary.status !== 404) {
    return primary;
  }

  const recent = await findRecentNeofinBillingByIntegrationIdentifier(identifier);
  if (!recent.ok) {
    return recent;
  }

  const details = extractNeofinBillingDetails(recent.body, {
    identifier,
    integrationIdentifier: identifier,
  });

  if (details.billingId && details.billingId !== identifier && looksLikeNeofinBillingNumber(details.billingId)) {
    const resolved = await getNeofinBillingByBillingId(details.billingId);

    if (resolved.ok) {
      return resolved;
    }
  }

  return recent;
}

function extractBillingId(candidate: unknown, fallback?: string | null): string | null {
  const details = extractNeofinBillingDetails(candidate, { identifier: fallback ?? null });
  return details.billingId ?? fallback ?? null;
}

type MarkPaidArgs = {
  integrationIdentifier: string;
  paidAt: string;
  paidAmountCentavos?: number;
  paymentMethod?: string;
  note?: string;
};

export async function markNeofinBillingAsPaid(
  args: MarkPaidArgs,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; details?: unknown }> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    console.error("[Neofin] NEOFIN_API_KEY ou NEOFIN_SECRET_KEY nao configuradas no servidor.");
    return { ok: false, error: "credenciais_neofin_ausentes" };
  }

  const paidDate = new Date(args.paidAt);
  if (Number.isNaN(paidDate.getTime())) {
    return { ok: false, error: "data_pagamento_invalida" };
  }

  const paidAtIso = args.paidAt.includes("T") ? args.paidAt : `${args.paidAt}T00:00:00`;

  let targetId = args.integrationIdentifier;
  try {
    const lookup = await getNeofinBilling({ identifier: args.integrationIdentifier });
    if (lookup.ok) {
      const resolved = extractBillingId(lookup.body, args.integrationIdentifier);
      if (resolved) {
        targetId = resolved;
      }
    }
  } catch (lookupError) {
    console.warn("[Neofin] Falha ao resolver billing antes de marcar pago:", lookupError);
  }

  const payload = {
    status: "paid",
    paid_at: paidAtIso,
    paid_amount: args.paidAmountCentavos ?? undefined,
    payment_method: args.paymentMethod ?? undefined,
    note: args.note ?? undefined,
    integration_identifier: args.integrationIdentifier,
  };

  const patchUrl = `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(targetId)}`;
  const patch = await requestNeofin(
    patchUrl,
    {
      method: "PATCH",
      headers: getNeofinHeaders(true),
      body: JSON.stringify(payload),
    },
    "erro_ao_marcar_cobranca_como_paga",
  );

  if (patch.ok) {
    return { ok: true, data: patch.body ?? null };
  }

  if (patch.status !== 404) {
    return {
      ok: false,
      error: patch.message ?? "erro_marcar_pago_neofin",
      details: { status: patch.status, body: patch.body },
    };
  }

  const post = await requestNeofin(
    `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(targetId)}/paid`,
    {
      method: "POST",
      headers: getNeofinHeaders(true),
      body: JSON.stringify(payload),
    },
    "erro_ao_marcar_cobranca_como_paga_post",
  );

  if (post.ok) {
    return { ok: true, data: post.body ?? null };
  }

  return {
    ok: false,
    error: post.message ?? "erro_marcar_pago_neofin",
    details: { status: post.status, body: post.body },
  };
}
