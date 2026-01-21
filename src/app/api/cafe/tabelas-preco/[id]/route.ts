import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type TabelaUpdate = {
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
  is_default?: boolean;
  ordem?: number;
};

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const id = Number(ctx.params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("cafe_tabelas_preco").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const id = Number(ctx.params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as TabelaUpdate | null;
  if (!body) return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });

  const supabase = getSupabaseServiceClient();

  if (body.is_default) {
    const { error: clearErr } = await supabase
      .from("cafe_tabelas_preco")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearErr) return NextResponse.json({ ok: false, error: clearErr.message }, { status: 500 });
  }

  const payload: Record<string, unknown> = {};
  if (typeof body.nome === "string") payload.nome = body.nome.trim();
  if (body.descricao !== undefined) payload.descricao = body.descricao;
  if (typeof body.ativo === "boolean") payload.ativo = body.ativo;
  if (typeof body.is_default === "boolean") payload.is_default = body.is_default;
  if (typeof body.ordem === "number") payload.ordem = body.ordem;

  const { data, error } = await supabase
    .from("cafe_tabelas_preco")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data });
}
