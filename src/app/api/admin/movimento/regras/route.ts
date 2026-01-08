import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("SERVICE_ROLE_NAO_CONFIGURADO");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

const RegraCreateSchema = z.object({
  descricao: z.string().min(1),
  origem_recurso: z.string().min(1),
  reais_por_credito: z.number().positive(),
  tipo_credito_gerado: z.enum(["CR_REGULAR", "CR_LIVRE", "CR_PROJETO"]).default("CR_REGULAR"),
  limite_mensal: z.number().int().positive().optional(),
  reserva_percentual: z.number().int().min(0).max(100).optional(),
  vigencia_inicio: z.string().min(7), // YYYY-MM
  vigencia_fim: z.string().min(7).optional(),
  ativa: z.boolean().optional(),
  centro_custo_id: z.string().uuid().optional(),
  filtros: z.record(z.unknown()).optional(),
  observacoes: z.string().optional(),
});

export async function GET() {
  try {
    await requireMovimentoAdmin();
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("movimento_regras_geracao")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INESPERADO";
    const status = msg === "NAO_AUTENTICADO" ? 401 : msg === "SEM_PERMISSAO_MOVIMENTO_ADMIN" ? 403 : 500;
    return NextResponse.json({ ok: false, codigo: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireMovimentoAdmin();
    const supabase = getServiceClient();

    const bodyUnknown = await req.json();
    const body = RegraCreateSchema.parse(bodyUnknown);

    const { data, error } = await supabase
      .from("movimento_regras_geracao")
      .insert({
        descricao: body.descricao,
        origem_recurso: body.origem_recurso,
        reais_por_credito: body.reais_por_credito,
        tipo_credito_gerado: body.tipo_credito_gerado,
        limite_mensal: body.limite_mensal ?? null,
        reserva_percentual: body.reserva_percentual ?? null,
        vigencia_inicio: body.vigencia_inicio,
        vigencia_fim: body.vigencia_fim ?? null,
        ativa: body.ativa ?? true,
        centro_custo_id: body.centro_custo_id ?? null,
        filtros: body.filtros ?? null,
        observacoes: body.observacoes ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INESPERADO";
    const status =
      msg === "NAO_AUTENTICADO" ? 401 :
      msg === "SEM_PERMISSAO_MOVIMENTO_ADMIN" ? 403 :
      msg.startsWith("ZodError") ? 400 : 500;
    return NextResponse.json({ ok: false, codigo: msg }, { status });
  }
}
