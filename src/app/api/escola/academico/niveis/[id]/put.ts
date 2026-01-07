import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

const PayloadSchema = z.object({
  nome: z.string().min(1),
  faixa_etaria_sugerida: z.string().nullable().optional(),
  pre_requisito_nivel_id: z.coerce.number().int().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  idade_minima: z.coerce.number().int().nullable().optional(),
  idade_maxima: z.coerce.number().int().nullable().optional(),
});

async function requireAdmin() {
  const supabase = await getSupabaseRoute();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { ok: false as const, status: 401 };
  }

  const { data: profile, error: e2 } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", data.user.id)
    .single();

  if (e2 || !profile?.is_admin) {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const, status: 200 };
}

export async function handlePut(req: Request, params: { id: string }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "NAO_AUTORIZADO" }, { status: auth.status });
  }

  const nivelId = Number(params.id);
  if (!Number.isFinite(nivelId)) {
    return NextResponse.json({ ok: false, error: "ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues }, { status: 400 });
  }

  const updatePayload = {
    nome: parsed.data.nome,
    faixa_etaria_sugerida: parsed.data.faixa_etaria_sugerida ?? null,
    pre_requisito_nivel_id: parsed.data.pre_requisito_nivel_id ?? null,
    observacoes: parsed.data.observacoes ?? null,
    idade_minima: parsed.data.idade_minima ?? null,
    idade_maxima: parsed.data.idade_maxima ?? null,
    updated_at: new Date().toISOString(),
  };

  let adminClient;
  try {
    adminClient = getSupabaseAdmin();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
    return NextResponse.json(
      { ok: false, error: "ENV_NAO_CONFIGURADA", details: msg },
      { status: 500 }
    );
  }

  const { data, error } = await adminClient
    .from("niveis")
    .update(updatePayload)
    .eq("id", nivelId)
    .select(
      "id, curso_id, nome, idade_minima, idade_maxima, faixa_etaria_sugerida, pre_requisito_nivel_id, observacoes, updated_at"
    )
    .maybeSingle();

  if (error) {
    console.error("ERRO UPDATE NIVEL:", { nivelId, updatePayload, error });
    return NextResponse.json({ ok: false, error: "FALHA_UPDATE_NIVEL", details: error.message }, { status: 500 });
  }

  if (!data) {
    console.error("UPDATE NIVEL SEM RETORNO (0 linhas ou RLS):", { nivelId, updatePayload });
    return NextResponse.json({ ok: false, error: "NIVEL_NAO_ATUALIZADO_OU_SEM_PERMISSAO" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, nivel: data }, { status: 200 });
}
