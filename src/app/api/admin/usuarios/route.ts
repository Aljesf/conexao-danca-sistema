import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assertAdmin";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = clamp(Number(searchParams.get("limit") || 50), 1, 200);
  const offset = clamp(Number(searchParams.get("offset") || 0), 0, 100000);

  const profQuery = auth.supabase
    .from("profiles")
    .select("user_id, full_name, is_admin, pessoa_id, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: profiles, error: profErr } = await profQuery;
  if (profErr) {
    return NextResponse.json({ ok: false, error: "erro_profiles", details: profErr.message }, { status: 500 });
  }

  const pessoaIds = (profiles || []).map((p) => p.pessoa_id).filter(Boolean) as number[];
  const userIds = (profiles || []).map((p) => p.user_id);

  const { data: pessoas, error: pesErr } = await auth.supabase
    .from("pessoas")
    .select("id, nome, email, cpf")
    .in("id", pessoaIds.length ? pessoaIds : [0]);
  if (pesErr) {
    return NextResponse.json({ ok: false, error: "erro_pessoas", details: pesErr.message }, { status: 500 });
  }

  const pessoasById = new Map<number, any>();
  (pessoas || []).forEach((p) => pessoasById.set(p.id, p));

  const { data: userRoles, error: urErr } = await auth.supabase
    .from("usuario_roles")
    .select("user_id, role_id")
    .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  if (urErr) {
    return NextResponse.json({ ok: false, error: "erro_usuario_roles", details: urErr.message }, { status: 500 });
  }

  const roleIds = Array.from(new Set((userRoles || []).map((r) => r.role_id)));
  const { data: roles, error: rolesErr } = await auth.supabase
    .from("roles_sistema")
    .select("id, codigo, nome, ativo")
    .in("id", roleIds.length ? roleIds : ["00000000-0000-0000-0000-000000000000"]);
  if (rolesErr) {
    return NextResponse.json({ ok: false, error: "erro_roles_sistema", details: rolesErr.message }, { status: 500 });
  }

  const rolesById = new Map<string, any>();
  (roles || []).forEach((r) => rolesById.set(r.id, r));

  const rolesByUser = new Map<string, any[]>();
  (userRoles || []).forEach((ur) => {
    const arr = rolesByUser.get(ur.user_id) || [];
    const role = rolesById.get(ur.role_id);
    if (role) arr.push(role);
    rolesByUser.set(ur.user_id, arr);
  });

  let users = (profiles || []).map((p) => ({
    user_id: p.user_id,
    full_name: p.full_name,
    is_admin: p.is_admin,
    pessoa: p.pessoa_id ? pessoasById.get(p.pessoa_id) || null : null,
    roles: rolesByUser.get(p.user_id) || [],
  }));

  if (q) {
    const qlc = q.toLowerCase();
    users = users.filter((u) => {
      const nome = (u.pessoa?.nome || u.full_name || "").toLowerCase();
      const email = (u.pessoa?.email || "").toLowerCase();
      return nome.includes(qlc) || email.includes(qlc);
    });
  }

  return NextResponse.json({ ok: true, users });
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
