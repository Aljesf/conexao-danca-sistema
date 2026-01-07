import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

const PayloadSchema = z.object(
  {
    nome: z.string().min(1),
    tipo: z.string().nullable().optional(),
    descricao: z.string().nullable().optional(),
    criterio_avaliacao: z.string().nullable().optional(),
    ordem: z.coerce.number().int().optional(),
  },
  { strict: true }
);

async function requireAdmin() {
  const supabase = await getSupabaseRoute();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false as const, status: 401 };

  const { data: profile, error: e2 } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", data.user.id)
    .single();

  if (e2 || !profile?.is_admin) return { ok: false as const, status: 403 };
  return { ok: true as const, status: 200 };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "NAO_AUTORIZADO" }, { status: auth.status });
  }

  const rawParams = (ctx as { params: Promise<{ id: string }> }).params;
  const params = rawParams instanceof Promise ? await rawParams : (ctx as { params: { id: string } }).params;

  const habilidadeId = Number(params.id);
  if (!Number.isFinite(habilidadeId)) {
    return NextResponse.json({ ok: false, error: "ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    nome: parsed.data.nome,
    tipo: parsed.data.tipo ?? null,
    descricao: parsed.data.descricao ?? null,
    criterio_avaliacao: parsed.data.criterio_avaliacao ?? null,
    updated_at: new Date().toISOString(),
  };

  if (typeof parsed.data.ordem === "number") updatePayload.ordem = parsed.data.ordem;

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
    .from("habilidades")
    .update(updatePayload)
    .eq("id", habilidadeId)
    .select("id, curso_id, nivel_id, modulo_id, nome, tipo, descricao, criterio_avaliacao, ordem, updated_at")
    .maybeSingle();

  if (error) {
    console.error("ERRO UPDATE HABILIDADE:", { habilidadeId, updatePayload, error });
    return NextResponse.json({ ok: false, error: "FALHA_UPDATE_HABILIDADE", details: error.message }, { status: 500 });
  }

  if (!data) {
    console.error("UPDATE HABILIDADE SEM RETORNO (0 linhas ou RLS):", { habilidadeId, updatePayload });
    return NextResponse.json({ ok: false, error: "HABILIDADE_NAO_ATUALIZADA_OU_SEM_PERMISSAO" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, habilidade: data }, { status: 200 });
}
