import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const PayloadSchema = z.object({
  nome: z.string().min(1),
  faixa_etaria_sugerida: z.string().nullable().optional(),
  pre_requisito_nivel_id: z.coerce.number().int().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  idade_minima: z.coerce.number().int().nullable().optional(),
  idade_maxima: z.coerce.number().int().nullable().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { ok: false as const, status: 401, supabase };
  }

  const { data: profile, error: e2 } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", data.user.id)
    .single();

  if (e2 || !profile?.is_admin) {
    return { ok: false as const, status: 403, supabase };
  }

  return { ok: true as const, status: 200, supabase };
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "NAO_AUTORIZADO" }, { status: admin.status });
  }

  const nivelId = Number(ctx.params.id);
  if (!Number.isFinite(nivelId)) {
    return NextResponse.json({ ok: false, error: "ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues }, { status: 400 });
  }

  const { supabase } = admin;

  const { data, error } = await supabase
    .from("niveis")
    .update({
      nome: parsed.data.nome,
      faixa_etaria_sugerida: parsed.data.faixa_etaria_sugerida ?? null,
      pre_requisito_nivel_id: parsed.data.pre_requisito_nivel_id ?? null,
      observacoes: parsed.data.observacoes ?? null,
      idade_minima: parsed.data.idade_minima ?? null,
      idade_maxima: parsed.data.idade_maxima ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", nivelId)
    .select("*")
    .single();

  if (error) {
    console.error("ERRO UPDATE NIVEL:", { nivelId, error });
    return NextResponse.json({ ok: false, error: "FALHA_UPDATE_NIVEL", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nivel: data }, { status: 200 });
}
