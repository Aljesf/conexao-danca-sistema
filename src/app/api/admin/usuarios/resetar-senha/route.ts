import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = await getSupabaseServer();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, code: "NAO_AUTENTICADO" }, { status: 401 });
    }

    const userId = userData.user.id;

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

    const body = await req.json().catch(() => null);
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
