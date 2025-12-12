// src/lib/neofinClient.ts

const NEOFIN_BASE_URL =
  process.env.NEOFIN_BASE_URL ?? "https://api.sandbox.neofin.services";

const NEOFIN_API_KEY = process.env.NEOFIN_API_KEY;
const NEOFIN_SECRET_KEY = process.env.NEOFIN_SECRET_KEY;

export type NeofinResult = {
  ok: boolean;
  status: number;
  body: any | null;
  message?: string | null;
};

type UpsertNeofinBillingInput = {
  integrationIdentifier: string;
  amountCentavos: number;
  dueDate: string; // "YYYY-MM-DD"
  description: string;
  customer: {
    nome: string;
    cpf: string;
    email?: string | null;
    telefone?: string | null;
  };
};

/**
 * Função única usada para criar/atualizar cobrança na Neofin.
 * É com **esse nome** que os endpoints importam:
 *   import { upsertNeofinBilling } from "@/lib/neofinClient";
 */
export async function upsertNeofinBilling(
  input: UpsertNeofinBillingInput
): Promise<NeofinResult> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    console.error(
      "[Neofin] NEOFIN_API_KEY ou NEOFIN_SECRET_KEY não configuradas no .env"
    );
    return {
      ok: false,
      status: 500,
      body: null,
      message: "Credenciais da Neofin não configuradas no servidor.",
    };
  }

  const { integrationIdentifier, amountCentavos, dueDate, description, customer } =
    input;

  const url = `${NEOFIN_BASE_URL}/billing/`;

  // Convertendo a data de vencimento para timestamp em segundos (como o swagger sugere)
  const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);

  const payload = {
    billings: [
      {
        customer_document: customer.cpf,
        customer_name: customer.nome,
        customer_mail: customer.email ?? "",
        customer_phone: customer.telefone ?? "",

        // Endereço básico (pode ser refinado depois)
        address_city: "Salinópolis",
        address_complement: "",
        address_neighborhood: "Centro",
        address_number: "S/N",
        address_state: "PA",
        address_street: "Não informado",
        address_zip_code: "00000000",

        amount: amountCentavos,
        due_date: dueDateTimestamp,
        original_due_date: dueDateTimestamp,
        discount_before_payment: 0,
        discount_before_payment_due_date: 0,
        description,
        fees: 0,
        fine: 0,
        installment_type: "custom",
        installments: 1,
        nfe_number: "",
        recipients: [],
        type: "generic",
        integration_identifier: integrationIdentifier,
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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": NEOFIN_API_KEY,
        "secret-key": NEOFIN_SECRET_KEY,
      },
      body: JSON.stringify(payload),
    });

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      console.error(
        "[Neofin] Erro ao enfileirar cobrança:",
        res.status,
        JSON.stringify(body)
      );
      return {
        ok: false,
        status: res.status,
        body,
        message: body?.message ?? "Erro ao enviar cobrança para a Neofin.",
      };
    }

    return {
      ok: true,
      status: res.status,
      body,
      message: body?.message ?? "Billings successfully queued.",
    };
  } catch (err: any) {
    console.error("[Neofin] Erro de rede:", err);
    return {
      ok: false,
      status: 500,
      body: null,
      message: err?.message ?? "Falha de rede ao chamar a Neofin.",
    };
  }
}

type GetNeofinBillingInput = {
  identifier: string;
};

/**
 * Consulta detalhes de um billing/charge na Neofin usando o identificador fornecido.
 * Tenta primeiro como path param (`/billing/{id}`) e, em caso de 404, tenta como query
 * string (`/billing?integration_identifier={id}`) para dar suporte a identificadores
 * de integraÇõÇœo customizados.
 */
export async function getNeofinBilling(
  input: GetNeofinBillingInput
): Promise<NeofinResult> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    console.error(
      "[Neofin] NEOFIN_API_KEY ou NEOFIN_SECRET_KEY nÇœo configuradas no .env"
    );
    return {
      ok: false,
      status: 500,
      body: null,
      message: "Credenciais da Neofin nÇœo configuradas no servidor.",
    };
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

  const headers = {
    "api-key": NEOFIN_API_KEY,
    "secret-key": NEOFIN_SECRET_KEY,
  };

  const primaryUrl = `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(
    identifier
  )}`;
  const fallbackUrl = `${NEOFIN_BASE_URL}/billing/?integration_identifier=${encodeURIComponent(
    identifier
  )}`;

  const tryFetch = async (url: string) => {
    const res = await fetch(url, { headers });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { res, body };
  };

  try {
    let { res, body } = await tryFetch(primaryUrl);

    if (res.status === 404) {
      ({ res, body } = await tryFetch(fallbackUrl));
    }

    if (!res.ok) {
      console.error(
        "[Neofin] Erro ao consultar cobranÇõa:",
        res.status,
        JSON.stringify(body)
      );
      return {
        ok: false,
        status: res.status,
        body,
        message: body?.message ?? "Erro ao consultar cobranÇõa na Neofin.",
      };
    }

    return {
      ok: true,
      status: res.status,
      body,
      message: body?.message ?? null,
    };
  } catch (err: any) {
    console.error("[Neofin] Erro de rede ao consultar cobranÇõa:", err);
    return {
      ok: false,
      status: 500,
      body: null,
      message: err?.message ?? "Falha de rede ao chamar a Neofin.",
    };
  }
}

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function extractBillingId(candidate: any, fallback?: string | null): string | null {
  if (!candidate) return fallback ?? null;

  if (Array.isArray(candidate)) {
    const first = candidate.find((c) => c && typeof c === "object");
    if (first) return extractBillingId(first, fallback);
  }

  const id =
    firstNonEmptyString(
      (candidate as any)?.id,
      (candidate as any)?.billing_id,
      (candidate as any)?.charge_id,
      (candidate as any)?.integration_identifier,
      (candidate as any)?.integrationIdentifier
    ) ?? null;

  return id ?? (fallback ?? null);
}

type MarkPaidArgs = {
  integrationIdentifier: string;
  paidAt: string; // YYYY-MM-DD ou ISO
  paidAmountCentavos?: number;
  paymentMethod?: string;
  note?: string;
};

export async function markNeofinBillingAsPaid(
  args: MarkPaidArgs
): Promise<{ ok: true; data: any } | { ok: false; error: string; details?: any }> {
  if (!NEOFIN_API_KEY || !NEOFIN_SECRET_KEY) {
    console.error(
      "[Neofin] NEOFIN_API_KEY ou NEOFIN_SECRET_KEY nÇœo configuradas no .env"
    );
    return {
      ok: false,
      error: "credenciais_neofin_ausentes",
    };
  }

  const paidDate = new Date(args.paidAt);
  if (Number.isNaN(paidDate.getTime())) {
    return { ok: false, error: "data_pagamento_invalida" };
  }

  const paidAtIso =
    typeof args.paidAt === "string" && args.paidAt.includes("T")
      ? args.paidAt
      : `${args.paidAt}T00:00:00`;

  // Resolver o ID real da cobranÇõa na Neofin (caso diferente do integrationIdentifier)
  let targetId = args.integrationIdentifier;
  try {
    const lookup = await getNeofinBilling({ identifier: args.integrationIdentifier });
    if (lookup.ok) {
      const resolved = extractBillingId(lookup.body, args.integrationIdentifier);
      if (resolved) {
        targetId = resolved;
      }
    }
  } catch (lookupErr) {
    console.warn("[Neofin] Falha ao resolver billing antes de marcar pago:", lookupErr);
  }

  const headers = {
    "Content-Type": "application/json",
    "api-key": NEOFIN_API_KEY,
    "secret-key": NEOFIN_SECRET_KEY,
  };

  const payload = {
    status: "paid",
    paid_at: paidAtIso,
    paid_amount: args.paidAmountCentavos ?? undefined,
    payment_method: args.paymentMethod ?? undefined,
    note: args.note ?? undefined,
    integration_identifier: args.integrationIdentifier,
  };

  const attempt = async (url: string, method: "PATCH" | "POST") => {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { res, body };
  };

  const patchUrl = `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(targetId)}`;
  const postUrl = `${NEOFIN_BASE_URL}/billing/${encodeURIComponent(targetId)}/paid`;

  try {
    let { res, body } = await attempt(patchUrl, "PATCH");

    if (!res.ok && res.status === 404) {
      ({ res, body } = await attempt(postUrl, "POST"));
    }

    if (!res.ok) {
      console.error(
        "[Neofin] Erro ao marcar cobranÇõa como paga:",
        res.status,
        JSON.stringify(body)
      );
      return {
        ok: false,
        error: body?.message ?? "erro_marcar_pago_neofin",
        details: { status: res.status, body },
      };
    }

    return { ok: true, data: body ?? null };
  } catch (err: any) {
    console.error("[Neofin] Erro de rede ao marcar pago:", err);
    return { ok: false, error: "falha_rede_neofin", details: err?.message ?? String(err) };
  }
}
