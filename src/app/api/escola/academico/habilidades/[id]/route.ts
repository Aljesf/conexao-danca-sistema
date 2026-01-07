import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return { ok: false as const, status: 401, supabase };

  const { data: profile, error: e2 } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", data.user.id)
    .single();

  if (e2 || !profile?.is_admin) return { ok: false as const, status: 403, supabase };
  return { ok: true as const, status: 200, supabase };
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: "NAO_AUTORIZADO" }, { status: admin.status });
  }

  const habilidadeId = Number(ctx.params.id);
  if (!Number.isFinite(habilidadeId)) {
    return NextResponse.json({ ok: false, error: "ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues }, { status: 400 });
  }

  const { supabase } = admin;

  const { data, error } = await supabase
    .from("habilidades")
    .update({
      nome: parsed.data.nome,
      tipo: parsed.data.tipo ?? null,
      descricao: parsed.data.descricao ?? null,
      criterio_avaliacao: parsed.data.criterio_avaliacao ?? null,
      ordem: typeof parsed.data.ordem === "number" ? parsed.data.ordem : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", habilidadeId)
    .select("*")
    .single();

  if (error) {
    console.error("ERRO UPDATE HABILIDADE:", { habilidadeId, error });
    return NextResponse.json({ ok: false, error: "FALHA_UPDATE_HABILIDADE", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, habilidade: data }, { status: 200 });
}
