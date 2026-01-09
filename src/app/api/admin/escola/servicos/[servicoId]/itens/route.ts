import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function GET(_req: Request, ctx: { params: { servicoId?: string } }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdmin();
    const servicoId = parseId(ctx.params.servicoId);
    if (!servicoId) {
      return NextResponse.json({ ok: false, error: "servico_id_invalido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("servico_itens")
      .select("id,servico_id,codigo,nome,descricao,tipo_item,obrigatorio,ativo,created_at,updated_at")
      .eq("servico_id", servicoId)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_itens", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, itens: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { servicoId?: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdmin();
    const servicoId = parseId(ctx.params.servicoId);
    if (!servicoId) {
      return NextResponse.json({ ok: false, error: "servico_id_invalido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as {
      codigo?: string;
      nome?: string;
      descricao?: string | null;
      tipo_item?: string | null;
      obrigatorio?: boolean | null;
      ativo?: boolean | null;
    } | null;

    const codigo = typeof body?.codigo === "string" ? body.codigo.trim() : "";
    const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
    if (!codigo || !nome) {
      return NextResponse.json(
        { ok: false, error: "payload_invalido", message: "codigo e nome sao obrigatorios" },
        { status: 400 },
      );
    }

    const payload = {
      servico_id: servicoId,
      codigo: codigo.toUpperCase(),
      nome,
      descricao: body?.descricao ?? null,
      tipo_item: String(body?.tipo_item ?? "PADRAO").toUpperCase(),
      obrigatorio: Boolean(body?.obrigatorio ?? false),
      ativo: Boolean(body?.ativo ?? true),
    };

    const { data, error } = await supabase
      .from("servico_itens")
      .insert(payload)
      .select("id,servico_id,codigo,nome,descricao,tipo_item,obrigatorio,ativo,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_criar_item", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, item: data }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message }, { status: 500 });
  }
}
