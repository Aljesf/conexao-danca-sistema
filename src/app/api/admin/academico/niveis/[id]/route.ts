import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

const ParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase, userId } = auth;
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (profErr || !profile?.is_admin) {
    return NextResponse.json({ ok: false, code: "NAO_AUTORIZADO" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = ParamsSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "PARAMETRO_INVALIDO", message: "ID do nivel invalido." },
      { status: 400 }
    );
  }
  let adminClient;
  try {
    adminClient = getSupabaseAdmin();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
    return NextResponse.json(
      { ok: false, code: "ENV_NAO_CONFIGURADA", message: msg },
      { status: 500 }
    );
  }

  const nivelId = parsed.data.id;
  const { data: nivel, error: nivelErr } = await adminClient
    .from("niveis")
    .select("id,nome")
    .eq("id", nivelId)
    .maybeSingle();

  if (nivelErr) {
    console.error("ERRO_SELECT_NIVEL", nivelErr);
    return NextResponse.json(
      { ok: false, code: "ERRO_BUSCAR_NIVEL", message: "Falha ao buscar nivel." },
      { status: 500 }
    );
  }

  if (!nivel) {
    return NextResponse.json(
      { ok: false, code: "NIVEL_NAO_ENCONTRADO", message: "Nivel nao encontrado." },
      { status: 404 }
    );
  }

  const nivelNome = (nivel.nome ?? "").trim();
  if (!nivelNome) {
    return NextResponse.json(
      { ok: false, code: "NIVEL_SEM_NOME", message: "Nivel sem nome; nao e possivel validar vinculos." },
      { status: 400 }
    );
  }

  const { count: turmasCount, error: turmasErr } = await adminClient
    .from("turmas")
    .select("turma_id", { count: "exact", head: true })
    .eq("nivel", nivelNome);

  if (turmasErr) {
    console.error("ERRO_CHECK_TURMAS_VINCULADAS", turmasErr);
    return NextResponse.json(
      { ok: false, code: "ERRO_VERIFICAR_VINCULOS", message: "Falha ao verificar turmas vinculadas." },
      { status: 500 }
    );
  }

  if ((turmasCount ?? 0) > 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "NIVEL_COM_TURMAS",
        message: "Nao e possivel apagar este nivel porque existem turmas vinculadas a ele.",
        details: { turmas_vinculadas: turmasCount ?? 0 },
      },
      { status: 409 }
    );
  }

  const { error: delErr } = await adminClient.from("niveis").delete().eq("id", nivelId);
  if (delErr) {
    console.error("ERRO_DELETE_NIVEL", delErr);
    return NextResponse.json(
      { ok: false, code: "ERRO_DELETE_NIVEL", message: "Falha ao apagar nivel." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: nivelId }, { status: 200 });
}



