import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pessoaIdRaw = url.searchParams.get("pessoa_id");
  const pessoaId = pessoaIdRaw ? Number(pessoaIdRaw) : NaN;

  if (!Number.isFinite(pessoaId)) {
    return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: alunoCanon, error: alunoErr } = await supabase
    .from("vw_alunos_canonico")
    .select("pessoa_id")
    .eq("pessoa_id", pessoaId)
    .maybeSingle();

  if (alunoErr) {
    return NextResponse.json({ ok: false, error: alunoErr.message }, { status: 500 });
  }

  const { data: curr, error: currErr } = await supabase
    .from("curriculos_institucionais")
    .select("pessoa_id, tipo_curriculo, habilitado")
    .eq("pessoa_id", pessoaId)
    .maybeSingle();

  if (currErr) {
    return NextResponse.json({ ok: false, error: currErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        pessoa_id: pessoaId,
        is_aluno: Boolean(alunoCanon?.pessoa_id),
        curriculo_institucional_habilitado: Boolean(curr?.habilitado),
        tipo_curriculo_institucional: curr?.tipo_curriculo ?? null,
      },
    },
    { status: 200 },
  );
}
