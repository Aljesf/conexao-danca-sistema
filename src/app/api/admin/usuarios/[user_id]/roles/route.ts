import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

async function requireAdmin(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return { response: auth };

  const { supabase, userId } = auth;
  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", { uid: userId });
  if (adminErr) {
    return {
      response: NextResponse.json(
        { error: "admin_check_failed", message: adminErr.message },
        { status: 500 }
      ),
    };
  }
  if (!isAdmin) {
    return {
      response: NextResponse.json(
        { error: "forbidden", message: "Acesso negado (admin obrigatório)." },
        { status: 403 }
      ),
    };
  }

  return { supabase };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await context.params;

  if (!user_id || user_id === "undefined" || user_id === "null") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id inválido." },
      { status: 400 }
    );
  }

  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const { data, error } = await admin.supabase
    .from("usuario_roles")
    .select("role_id, roles_sistema:public.roles_sistema(id,codigo,nome,ativo)")
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ roles: data ?? [] }, { status: 200 });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await context.params;

  if (!user_id || user_id === "undefined" || user_id === "null") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id inválido." },
      { status: 400 }
    );
  }

  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const body = (await request.json().catch(() => null)) as { role_id?: string } | null;
  const role_id = body?.role_id;
  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const { error } = await admin.supabase.from("usuario_roles").insert({ user_id, role_id });
  if (error) {
    return NextResponse.json(
      { error: "erro_adicionar_role", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await context.params;

  if (!user_id || user_id === "undefined" || user_id === "null") {
    return NextResponse.json(
      { error: "bad_request", message: "user_id inválido." },
      { status: 400 }
    );
  }

  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const body = (await request.json().catch(() => null)) as { role_id?: string } | null;
  const role_id = body?.role_id;
  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("usuario_roles")
    .delete()
    .eq("user_id", user_id)
    .eq("role_id", role_id);
  if (error) {
    return NextResponse.json(
      { error: "erro_remover_role", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
