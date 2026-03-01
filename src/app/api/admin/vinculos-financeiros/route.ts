import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const body = await req.json().catch(() => ({}));
  const responsavelId = num(body.responsavel_pessoa_id);
  const dependenteId = num(body.dependente_pessoa_id);

  if (!responsavelId || !dependenteId) {
    return NextResponse.json({ ok: false, error: "ids_invalidos" }, { status: 400 });
  }
  if (responsavelId === dependenteId) {
    return NextResponse.json({ ok: false, error: "mesma_pessoa" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("pessoa_responsavel_financeiro_vinculos")
    .upsert(
      {
        responsavel_pessoa_id: responsavelId,
        dependente_pessoa_id: dependenteId,
        origem_tipo: "MANUAL",
        origem_id: null,
        ativo: true,
      },
      { onConflict: "responsavel_pessoa_id,dependente_pessoa_id" },
    )
    .select("id,responsavel_pessoa_id,dependente_pessoa_id,origem_tipo,origem_id,ativo,criado_em,atualizado_em")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: "db_erro", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, vinculo: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { searchParams } = new URL(req.url);
  const responsavelId = num(searchParams.get("responsavel_pessoa_id"));
  const dependenteId = num(searchParams.get("dependente_pessoa_id"));

  if (!responsavelId || !dependenteId) {
    return NextResponse.json({ ok: false, error: "ids_invalidos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // "Remover" = desativar para preservar historico.
  const { error } = await supabase
    .from("pessoa_responsavel_financeiro_vinculos")
    .update({ ativo: false })
    .eq("responsavel_pessoa_id", responsavelId)
    .eq("dependente_pessoa_id", dependenteId);

  if (error) {
    return NextResponse.json({ ok: false, error: "db_erro", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
