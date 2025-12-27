import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type CicloCobranca = "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL";
type TerminoCobranca = "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA";
type RegraTotal = "PROPORCIONAL" | "FIXO";
type CicloFinanceiro = "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

type Body = {
  nome: string;
  ativo: boolean;
  ciclo_cobranca: CicloCobranca;
  numero_parcelas?: number | null;

  termino_cobranca?: TerminoCobranca | null;
  data_fim_manual?: string | null; // YYYY-MM-DD

  regra_total_devido: RegraTotal;
  permite_prorrata: boolean;
  ciclo_financeiro: CicloFinanceiro;

  forma_liquidacao_padrao?: string | null;
  observacoes?: string | null;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  // 1) Usuário precisa estar logado (MVP)
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 2) Ler body
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("JSON inválido.");
  }

  // 3) Validações MVP (definitivas)
  if (!body.nome?.trim()) return badRequest("Nome do plano é obrigatório.");

  const ciclo = body.ciclo_cobranca;
  if (!ciclo) return badRequest("ciclo_cobranca é obrigatório.");

  if (ciclo === "COBRANCA_EM_PARCELAS") {
    if (!body.numero_parcelas || body.numero_parcelas <= 0) {
      return badRequest("COBRANCA_EM_PARCELAS exige numero_parcelas > 0.");
    }
  }

  if (ciclo === "COBRANCA_MENSAL") {
    if (!body.termino_cobranca) {
      return badRequest("COBRANCA_MENSAL exige termino_cobranca.");
    }
    if (body.termino_cobranca === "DATA_ESPECIFICA" && !body.data_fim_manual) {
      return badRequest("DATA_ESPECIFICA exige data_fim_manual.");
    }
    // Importante: FIM_ANO_LETIVO é permitido aqui SEM ano; ano será resolvido na MATRÍCULA.
  }

  // 4) Validar forma_liquidacao_padrao contra formas_pagamento.codigo (se informada)
  const forma = body.forma_liquidacao_padrao?.trim() || null;

  const admin = getSupabaseAdmin();

  if (forma) {
    const { data: fp, error: fpErr } = await admin
      .from("formas_pagamento")
      .select("codigo,ativo")
      .eq("codigo", forma)
      .maybeSingle();

    if (fpErr) return serverError("Falha ao validar forma de pagamento.", { fpErr });
    if (!fp || !fp.ativo) return badRequest("Forma de liquidação inválida ou inativa.", { codigo: forma });
  }

  // 5) Insert server-side (sem depender de RLS no browser)
  try {
    const payload: Record<string, unknown> = {
      nome: body.nome.trim(),
      ativo: body.ativo ?? true,

      ciclo_cobranca: ciclo,
      numero_parcelas: ciclo === "COBRANCA_EM_PARCELAS" ? body.numero_parcelas ?? null : null,

      termino_cobranca: ciclo === "COBRANCA_MENSAL" ? body.termino_cobranca ?? null : null,
      data_fim_manual: ciclo === "COBRANCA_MENSAL" && body.termino_cobranca === "DATA_ESPECIFICA" ? body.data_fim_manual : null,

      regra_total_devido: body.regra_total_devido,
      permite_prorrata: !!body.permite_prorrata,
      ciclo_financeiro: body.ciclo_financeiro,

      forma_liquidacao_padrao: forma,
      observacoes: body.observacoes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("matricula_planos_pagamento")
      .insert(payload)
      .select("id")
      .single();

    if (error) return serverError("Falha ao criar plano de pagamento.", { error });

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: unknown) {
    return serverError("Erro inesperado ao criar plano de pagamento.", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
