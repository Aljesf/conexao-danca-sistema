import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function POST(req: Request, ctx: { params: { mapaModuloId: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const mapaModuloId = zId.safeParse(ctx.params.mapaModuloId);
  if (!mapaModuloId.success) {
    return NextResponse.json({ ok: false, code: "MAPA_MODULO_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    habilidade_id: z.coerce.number().int().positive(),
    obrigatoria: z.boolean().optional(),
    peso_pedagogico: z.coerce.number().optional(),
    ordem: z.coerce.number().int().positive().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const { habilidade_id, obrigatoria, peso_pedagogico, ordem } = parsed.data;
  const payload = {
    mapa_modulo_id: mapaModuloId.data,
    habilidade_id,
    obrigatoria: typeof obrigatoria === "boolean" ? obrigatoria : true,
    peso_pedagogico: typeof peso_pedagogico === "number" ? peso_pedagogico : null,
    ordem: typeof ordem === "number" ? ordem : null,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase
    .from("mapa_habilidades")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_CRIAR_MAPA_HABILIDADE", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, mapa_habilidade: data }, { status: 201 });
}
