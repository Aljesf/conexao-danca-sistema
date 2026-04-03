import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseId } from "../../../_lib";

type Params = { params: Promise<{ id: string; membroId: string }> };

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id, membroId } = await params;
  const grupoId = parseId(id);
  const vinculoId = parseId(membroId);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }
  if (vinculoId === null) {
    return NextResponse.json({ ok: false, error: "membro_id invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("nucleo_membros")
    .update({
      ativo: false,
      data_saida: new Date().toISOString().slice(0, 10),
    })
    .eq("id", vinculoId)
    .eq("nucleo_id", grupoId)
    .eq("ativo", true)
    .select("id,pessoa_id,data_saida,ativo")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "membro nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
