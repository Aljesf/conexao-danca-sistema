import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type CicloCobranca = "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL";
type TerminoCobranca = "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA";
type RegraTotal = "PROPORCIONAL" | "FIXO";
type CicloFinanceiro = "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
type PoliticaPrimeiraCobranca = "NO_ATO" | "PERMITIR_ADIAR_PARA_CICLO";

type Body = {
  nome: string;
  ativo: boolean;
  ciclo_cobranca: CicloCobranca;
  numero_parcelas?: number | null;

  termino_cobranca?: TerminoCobranca | null;
  data_fim_manual?: string | null;

  regra_total_devido: RegraTotal;
  permite_prorrata: boolean;
  ciclo_financeiro: CicloFinanceiro;

  forma_liquidacao_padrao?: string | null;
  politica_primeira_cobranca?: PoliticaPrimeiraCobranca | null;

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

  const service =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";

  if (!url) throw new Error("Env ausente: NEXT_PUBLIC_SUPABASE_URL");
  if (!service) throw new Error("Env ausente: SUPABASE_SERVICE_ROLE_KEY (ou fallback SUPABASE_SERVICE_ROLE)");
  return createClient(url, service, { auth: { persistSession: false } });
}

function safeErrorDetails(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    return { message: e.message, name: e.name, stack: e.stack ?? null };
  }
  return { message: String(e) };
}

export async function POST(req: Request) {
  try {
    let supabaseAuth;
    try {
      const cookieStore = await cookies();
      supabaseAuth = createRouteHandlerClient({
        cookies: () => cookieStore,
      });
    } catch (e: unknown) {
      console.error("[planos-pagamento][POST] erro ao criar supabaseAuth", e);
      return serverError("Falha ao inicializar autenticação do Supabase (env/headers).", safeErrorDetails(e));
    }

    let user: { id: string } | null = null;
    try {
      const { data, error: userErr } = await supabaseAuth.auth.getUser();
      if (userErr || !data?.user) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
      user = { id: data.user.id };
    } catch (e: unknown) {
      console.error("[planos-pagamento][POST] erro ao obter usuário", e);
      return serverError("Falha ao validar sessão do usuário.", safeErrorDetails(e));
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return badRequest("JSON inválido.");
    }

    if (!body.nome?.trim()) return badRequest("Nome do plano é obrigatório.");

    const ciclo = body.ciclo_cobranca;
    if (!ciclo) return badRequest("ciclo_cobranca é obrigatório.");

    if (ciclo === "COBRANCA_EM_PARCELAS") {
      if (!body.numero_parcelas || body.numero_parcelas <= 0) {
        return badRequest("COBRANCA_EM_PARCELAS exige numero_parcelas > 0.");
      }
    }

    if (ciclo === "COBRANCA_MENSAL") {
      if (!body.termino_cobranca) return badRequest("COBRANCA_MENSAL exige termino_cobranca.");
      if (body.termino_cobranca === "DATA_ESPECIFICA" && !body.data_fim_manual) {
        return badRequest("DATA_ESPECIFICA exige data_fim_manual.");
      }
    }

    const politica: PoliticaPrimeiraCobranca = body.politica_primeira_cobranca ?? "NO_ATO";
    const forma = body.forma_liquidacao_padrao?.trim() || null;

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (e: unknown) {
      console.error("[planos-pagamento][POST] env service role ausente", e);
      return serverError("Configuração do servidor incompleta (service role).", safeErrorDetails(e));
    }

    if (forma) {
      const { data: fp, error: fpErr } = await admin
        .from("formas_pagamento")
        .select("codigo,ativo")
        .eq("codigo", forma)
        .maybeSingle();

      if (fpErr) {
        console.error("[planos-pagamento][POST] erro ao validar forma_pagamento", fpErr);
        return serverError("Falha ao validar forma de pagamento.", { fpErr });
      }
      if (!fp || !fp.ativo) {
        return badRequest("Forma de liquidação inválida ou inativa.", { codigo: forma });
      }
    }

    const payload: Record<string, unknown> = {
      titulo: body.nome.trim(),
      nome: body.nome.trim(),
      ativo: body.ativo ?? true,
      ciclo_cobranca: ciclo,
      numero_parcelas: ciclo === "COBRANCA_EM_PARCELAS" ? body.numero_parcelas ?? null : null,
      termino_cobranca: ciclo === "COBRANCA_MENSAL" ? body.termino_cobranca ?? null : null,
      data_fim_manual:
        ciclo === "COBRANCA_MENSAL" && body.termino_cobranca === "DATA_ESPECIFICA" ? body.data_fim_manual : null,
      regra_total_devido: body.regra_total_devido,
      permite_prorrata: !!body.permite_prorrata,
      ciclo_financeiro: body.ciclo_financeiro,
      forma_liquidacao_padrao: forma,
      politica_primeira_cobranca: politica,
      observacoes: body.observacoes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("matricula_planos_pagamento")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[planos-pagamento][POST] erro no insert", error);
      return serverError("Falha ao criar plano de pagamento.", { error });
    }

    return NextResponse.json({ ok: true, data, actor_user_id: user.id }, { status: 201 });
  } catch (e: unknown) {
    console.error("[planos-pagamento][POST] erro inesperado (catch final)", e);
    return serverError("Erro inesperado na API de planos de pagamento.", safeErrorDetails(e));
  }
}
