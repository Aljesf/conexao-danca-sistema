import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assertAdmin";

export async function GET(_req: Request, ctx: { params: { user_id: string } }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const user_id = ctx.params.user_id;
  const { data: ur, error: urErr } = await auth.supabase.from("usuario_roles").select("user_id, role_id").eq("user_id", user_id);
  if (urErr) return NextResponse.json({ ok: false, error: "erro_usuario_roles", details: urErr.message }, { status: 500 });

  const roleIds = Array.from(new Set((ur || []).map((x) => x.role_id)));
  const { data: roles, error: rolesErr } = await auth.supabase
    .from("roles_sistema")
    .select("id, codigo, nome, ativo")
    .in("id", roleIds.length ? roleIds : ["00000000-0000-0000-0000-000000000000"]);
  if (rolesErr) return NextResponse.json({ ok: false, error: "erro_roles_sistema", details: rolesErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, roles: roles || [] });
}

export async function POST(req: Request, ctx: { params: { user_id: string } }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const user_id = ctx.params.user_id;
  const body = await req.json().catch(() => null);
  const role_id = body?.role_id;

  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("usuario_roles").insert({ user_id, role_id });
  if (error) return NextResponse.json({ ok: false, error: "erro_adicionar_role", details: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: { user_id: string } }) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const user_id = ctx.params.user_id;
  const body = await req.json().catch(() => null);
  const role_id = body?.role_id;

  if (!role_id || typeof role_id !== "string") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { error } = await auth.supabase.from("usuario_roles").delete().eq("user_id", user_id).eq("role_id", role_id);
  if (error) return NextResponse.json({ ok: false, error: "erro_remover_role", details: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
