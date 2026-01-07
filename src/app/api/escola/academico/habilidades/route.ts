import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseRoute } from "@/lib/supabaseRoute";

const CreateHabilidadeSchema = z.object({
  curso_id: z.number().int().positive(),
  nivel_id: z.number().int().positive(),
  modulo_id: z.number().int().positive(),
  nome: z.string().trim().min(2),
  tipo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  criterio_avaliacao: z.string().optional().nullable(),
  ordem: z.number().int().nonnegative().optional(),
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
  const parsed = CreateHabilidadeSchema.safeParse(body);
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
    modulo_id: parsed.data.modulo_id,
    nome: parsed.data.nome.trim(),
    tipo: asText(parsed.data.tipo),
    descricao: asText(parsed.data.descricao),
    criterio_avaliacao: asText(parsed.data.criterio_avaliacao),
    ordem: parsed.data.ordem ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("habilidades").insert(payload).select("*").single();
  if (error) {
    console.error("ERRO INSERT HABILIDADE:", error);
    return NextResponse.json(
      { ok: false, error: "FALHA_INSERT_HABILIDADE", message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, habilidade: data }, { status: 201 });
}
