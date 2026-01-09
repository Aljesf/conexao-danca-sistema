import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("roles_sistema")
    .select("id, codigo, nome, descricao, ativo, created_at, permissoes")
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: "erro_roles", details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, roles: data || [] });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const codigo = (body?.codigo || "").trim();
  const nome = (body?.nome || "").trim();
  const descricao = (body?.descricao || "").trim();

  if (!codigo || !nome) return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });

  const { data, error } = await auth.supabase
    .from("roles_sistema")
    .insert({ codigo, nome, descricao: descricao || null, ativo: true })
    .select("id, codigo, nome, descricao, ativo, permissoes")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "erro_criar_role", details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role: data });
}

export async function PATCH(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const patch: Record<string, any> = {};

  if (!id || typeof id !== "string") return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });

  if (typeof body?.nome === "string") patch.nome = body.nome.trim();
  if (typeof body?.descricao === "string") patch.descricao = body.descricao.trim();
  if (typeof body?.ativo === "boolean") patch.ativo = body.ativo;
  if (body && Object.prototype.hasOwnProperty.call(body, "permissoes")) patch.permissoes = body.permissoes;

  const { data, error } = await auth.supabase
    .from("roles_sistema")
    .update(patch)
    .eq("id", id)
    .select("id, codigo, nome, descricao, ativo, permissoes")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "erro_update_role", details: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "role_nao_encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true, role: data });
}
