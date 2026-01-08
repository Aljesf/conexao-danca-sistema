import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError, zodToValidationError } from "@/lib/http/api-errors";

const BeneficiarioCreateSchema = z.object({
  pessoa_id: z.string().uuid(),
  relatorio_socioeconomico: z.string().min(10),
  dados_complementares: z.record(z.unknown()).optional(),
  observacoes: z.string().optional(),
});

export async function GET() {
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const bodyUnknown = await req.json();
    const body = BeneficiarioCreateSchema.parse(bodyUnknown);

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .insert({
        pessoa_id: body.pessoa_id,
        relatorio_socioeconomico: body.relatorio_socioeconomico,
        dados_complementares: (body.dados_complementares ?? null) as unknown,
        observacoes: body.observacoes ?? null,
        criado_por: userId,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return jsonError(zodToValidationError(err));
  }
}
