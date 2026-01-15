import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";

const AseUpdateSchema = z
  .object({
    responsavel_legal_pessoa_id: z
      .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
      .nullable()
      .optional(),
    data_analise: z.string().optional(),
    contexto: z.enum(["ASE_18_PLUS", "ASE_MENOR"]).optional(),
    respostas_json: z.record(z.unknown()).optional(),
    status: z.enum(["RASCUNHO", "CONCLUIDA", "REVISADA"]).optional(),
    resultado_status: z.enum(["NECESSITA_APOIO", "APOIO_PARCIAL", "SEM_APOIO"]).nullable().optional(),
    observacao_institucional: z.string().nullable().optional(),
    data_sugerida_revisao: z.string().nullable().optional(),
  })
  .strict();

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("movimento_analises_socioeconomicas")
      .select("*")
      .eq("id", ctx.params.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await req.json();
    const body = AseUpdateSchema.parse(bodyUnknown);

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.contexto !== "undefined") payload.contexto = body.contexto;
    if (typeof body.data_analise !== "undefined") payload.data_analise = body.data_analise;
    if (typeof body.respostas_json !== "undefined") payload.respostas_json = body.respostas_json;
    if (typeof body.status !== "undefined") payload.status = body.status;
    if (typeof body.resultado_status !== "undefined") payload.resultado_status = body.resultado_status;
    if (typeof body.observacao_institucional !== "undefined") {
      payload.observacao_institucional = body.observacao_institucional;
    }
    if (typeof body.data_sugerida_revisao !== "undefined") {
      payload.data_sugerida_revisao = body.data_sugerida_revisao;
    }
    if (typeof body.responsavel_legal_pessoa_id !== "undefined") {
      payload.responsavel_legal_pessoa_id =
        body.responsavel_legal_pessoa_id == null
          ? null
          : typeof body.responsavel_legal_pessoa_id === "string"
            ? Number(body.responsavel_legal_pessoa_id)
            : body.responsavel_legal_pessoa_id;
    }

    if (Object.keys(payload).length === 1) {
      return NextResponse.json({ ok: false, codigo: "VALIDACAO_INVALIDA" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("movimento_analises_socioeconomicas")
      .update(payload)
      .eq("id", ctx.params.id)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}
