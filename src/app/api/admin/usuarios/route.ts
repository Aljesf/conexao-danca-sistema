import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { getSupabaseServer } from "@/lib/supabaseServer";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  const user = authData?.user;
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const { data: adminRole, error: adminErr } = await supabase
    .from("usuario_roles")
    .select("role_id, roles_sistema!inner(codigo)")
    .eq("user_id", user.id)
    .eq("roles_sistema.codigo", "ADMIN")
    .maybeSingle();

  if (adminErr) {
    return NextResponse.json(
      { ok: false, error: "erro_admin_roles", details: adminErr.message },
      { status: 500 }
    );
  }

  if (!adminRole) {
    return NextResponse.json({ ok: false, error: "nao_admin" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = clamp(Number(searchParams.get("limit") || 50), 1, 200);
  const offset = clamp(Number(searchParams.get("offset") || 0), 0, 100000);

  const { data: rows, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, pessoa_id, pessoas:pessoa_id ( id, nome, email, cpf ), usuario_roles:user_id ( role_id, roles_sistema:role_id ( id, codigo, nome, ativo ) )"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ ok: false, error: "erro_listar_usuarios", details: error.message }, { status: 500 });
  }

  let users = (rows ?? []).map((row) => {
    const rolesRaw = Array.isArray(row.usuario_roles) ? row.usuario_roles : [];
    const roles = rolesRaw
      .map((r) => r.roles_sistema)
      .filter((r): r is { id: string; codigo: string; nome: string; ativo?: boolean } => Boolean(r));
    const is_admin = roles.some((r) => r.codigo === "ADMIN");
    return {
      user_id: row.user_id,
      full_name: row.full_name ?? null,
      is_admin,
      pessoa: row.pessoas ?? null,
      roles,
    };
  });

  if (q) {
    const qlc = q.toLowerCase();
    users = users.filter((u) => {
      const nome = (u.pessoa?.nome || u.full_name || "").toLowerCase();
      const email = (u.pessoa?.email || "").toLowerCase();
      return nome.includes(qlc) || email.includes(qlc);
    });
  }

  return NextResponse.json({ ok: true, users, usuarios: users, total: users.length });
}

export async function PATCH(req: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const user_id = body?.user_id;
  const is_admin = body?.is_admin;

  if (!user_id || typeof user_id !== "string" || typeof is_admin !== "boolean") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ is_admin })
    .eq("user_id", user_id)
    .select("user_id, full_name, is_admin, pessoa_id")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "erro_update_admin", details: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "perfil_nao_encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true, profile: data });
}
