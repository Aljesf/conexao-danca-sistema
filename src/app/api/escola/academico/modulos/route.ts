import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/api-auth";

const CreateModuloSchema = z.object({
  curso_id: z.number().int().positive(),
  nivel_id: z.number().int().positive(),
  nome: z.string().trim().min(2),
  descricao: z.string().optional().nullable(),
  ordem: z.number().int().nonnegative().optional(),
  obrigatorio: z.boolean().optional(),
});

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function requireAdmin(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase, userId } = auth;
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json(
      { ok: false, error: "ERRO_PERMISSAO", details: profErr.message },
      { status: 500 }
    );
  }

  if (!profile?.is_admin) {
    return NextResponse.json({ ok: false, error: "SEM_PERMISSAO" }, { status: 403 });
  }

  return null;
}
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request);
  if (adminCheck) return adminCheck;

  const body = await request.json().catch(() => null);
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
    ordem: parsed.data.ordem ?? 0,
    obrigatorio: parsed.data.obrigatorio ?? false,
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

