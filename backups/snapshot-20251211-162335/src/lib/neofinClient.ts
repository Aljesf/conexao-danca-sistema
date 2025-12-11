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
