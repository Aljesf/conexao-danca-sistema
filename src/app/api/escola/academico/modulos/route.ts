import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

const CreateModuloSchema = z.object({
  curso_id: z.number().int().positive(),
  nivel_id: z.number().int().positive(),
  nome: z.string().trim().min(1),
  descricao: z.string().optional().nullable(),
  ordem: z.number().int().nonnegative().optional(),
  obrigatorio: z.boolean().optional(),
});

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function requireAdmin() {
  const supabase = await getSupabaseRoute();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return { ok: false as const, status: 401, error: "NAO_AUTENTICADO" };
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profErr) {
    return { ok: false as const, status: 500, error: "ERRO_PERMISSAO", details: profErr.message };
  }

  if (!profile?.is_admin) {
    return { ok: false as const, status: 403, error: "SEM_PERMISSAO" };
  }

  return { ok: true as const, status: 200 };
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error, details: auth.details ?? null },
      { status: auth.status }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateModuloSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "PAYLOAD_INVALIDO", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
    return NextResponse.json(
      { ok: false, error: "ENV_NAO_CONFIGURADA", details: msg },
      { status: 500 }
    );
  }

  const payload = {
    curso_id: parsed.data.curso_id,
    nivel_id: parsed.data.nivel_id,
    nome: parsed.data.nome.trim(),
    descricao: asText(parsed.data.descricao),
    ordem: parsed.data.ordem ?? 1,
    obrigatorio: parsed.data.obrigatorio ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("modulos").insert(payload).select("*").single();
  if (error) {
    console.error("ERRO INSERT MODULO:", error);
    return NextResponse.json(
      { ok: false, error: "FALHA_INSERT_MODULO", message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, modulo: data }, { status: 201 });
}
