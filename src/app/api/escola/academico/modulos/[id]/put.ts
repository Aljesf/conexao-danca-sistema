import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRoute } from "@/lib/supabaseRoute";
import { resolveParamsId } from "../../_helpers/params";

const PayloadSchema = z.object(
  {
    nome: z.string().min(1),
    descricao: z.string().nullable().optional(),
    ordem: z.coerce.number().int().optional(),
    obrigatorio: z.coerce.boolean().optional(),
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

export async function handlePut(req: Request, params: { id: string } | Promise<{ id: string }>) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "NAO_AUTORIZADO" }, { status: auth.status });
  }

  const idStr = await resolveParamsId(params);
  const moduloId = Number(idStr);
  if (!Number.isFinite(moduloId)) {
    return NextResponse.json({ ok: false, error: "ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    nome: parsed.data.nome,
    descricao: parsed.data.descricao ?? null,
    updated_at: new Date().toISOString(),
  };

  if (typeof parsed.data.ordem === "number") updatePayload.ordem = parsed.data.ordem;
  if (typeof parsed.data.obrigatorio === "boolean") updatePayload.obrigatorio = parsed.data.obrigatorio;

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
    .from("modulos")
    .update(updatePayload)
    .eq("id", moduloId)
    .select("id, curso_id, nivel_id, nome, descricao, ordem, obrigatorio, updated_at")
    .maybeSingle();

  if (error) {
    console.error("ERRO UPDATE MODULO:", { moduloId, updatePayload, error });
    return NextResponse.json({ ok: false, error: "FALHA_UPDATE_MODULO", details: error.message }, { status: 500 });
  }

  if (!data) {
    console.error("UPDATE MODULO SEM RETORNO (0 linhas ou RLS):", { moduloId, updatePayload });
    return NextResponse.json({ ok: false, error: "MODULO_NAO_ATUALIZADO_OU_SEM_PERMISSAO" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, modulo: data }, { status: 200 });
}
