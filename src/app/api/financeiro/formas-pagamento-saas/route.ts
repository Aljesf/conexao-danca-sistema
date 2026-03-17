import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import {
  listarFormasPagamentoCentrais,
  upsertFormaPagamentoSaas,
} from "@/lib/financeiro/formas-pagamento-saas";

const FormaPagamentoSchema = z.object({
  codigo: z.string().trim().min(1),
  nome: z.string().trim().min(1),
  tipo_fluxo: z.enum([
    "DINHEIRO",
    "PIX",
    "CARTAO",
    "CREDIARIO",
    "CONTA_INTERNA_ALUNO",
    "CONTA_INTERNA_COLABORADOR",
  ]),
  exige_troco: z.boolean(),
  exige_maquininha: z.boolean(),
  exige_bandeira: z.boolean(),
  exige_conta_interna: z.boolean(),
  contextos: z.array(z.string().trim().min(1)).default([]),
  centros_custo_ids: z.array(z.number().int().positive()).default([]),
  ativo: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const itens = await listarFormasPagamentoCentrais(supabase);
    return NextResponse.json({ ok: true, erro_controlado: null, itens }, { status: 200 });
  } catch (error) {
    console.error("[FORMAS_PAGAMENTO_SAAS][GET][ERRO]", error);
    return NextResponse.json(
      {
        ok: false,
        erro_controlado: "falha_listar_formas_pagamento_saas",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
        itens: [],
      },
      { status: 200 },
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json().catch(() => null);
    const parsed = FormaPagamentoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          detalhe: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    await upsertFormaPagamentoSaas({
      supabase,
      payload: {
        ...parsed.data,
        contextos: parsed.data.contextos.map((item) => item.trim().toUpperCase()),
      },
    });

    const itens = await listarFormasPagamentoCentrais(supabase);
    return NextResponse.json({ ok: true, erro_controlado: null, itens }, { status: 200 });
  } catch (error) {
    console.error("[FORMAS_PAGAMENTO_SAAS][POST][ERRO]", error);
    return NextResponse.json(
      {
        error: "falha_salvar_forma_pagamento_saas",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }
}
