import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, userId } = auth;

    const { data: adminRows, error: adminErr } = await supabase
      .from("usuario_roles")
      .select("role_id, roles_sistema!inner(codigo)")
      .eq("user_id", userId)
      .eq("roles_sistema.codigo", "ADMIN")
      .limit(1);

    if (adminErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_VERIFICAR_ADMIN", message: adminErr.message },
        { status: 500 }
      );
    }

    if (!adminRows || adminRows.length === 0) {
      return NextResponse.json({ ok: false, code: "SEM_PERMISSAO" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const targetUserId = body?.user_id;
    const senha = body?.senha;

    if (!targetUserId || typeof targetUserId !== "string" || typeof senha !== "string" || senha.length < 6) {
      return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
    }

    let admin = null as ReturnType<typeof getSupabaseServiceClient> | null;
    try {
      admin = getSupabaseServiceClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "SERVICE_ROLE_NAO_CONFIGURADO";
      return NextResponse.json({ ok: false, code: msg }, { status: 500 });
    }

    const { error: resetErr } = await admin.auth.admin.updateUserById(targetUserId, { password: senha });
    if (resetErr) {
      return NextResponse.json(
        { ok: false, code: "ERRO_RESETAR_SENHA", message: resetErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERRO_INESPERADO";
    return NextResponse.json({ ok: false, code: "ERRO_INESPERADO", message: msg }, { status: 500 });
  }
}

