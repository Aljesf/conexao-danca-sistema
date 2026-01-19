import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function POST(req: Request, ctx: { params: Promise<{ mapaId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const { mapaId } = await ctx.params;
  const mapaIdParsed = zId.safeParse(mapaId);
  if (!mapaIdParsed.success) {
    return NextResponse.json({ ok: false, code: "MAPA_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    modulo_id: z.coerce.number().int().positive(),
    obrigatorio: z.boolean().optional(),
    ordem: z.coerce.number().int().positive().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const { modulo_id, obrigatorio, ordem } = parsed.data;
  const payload = {
    mapa_id: mapaIdParsed.data,
    modulo_id,
    obrigatorio: typeof obrigatorio === "boolean" ? obrigatorio : true,
    ordem: typeof ordem === "number" ? ordem : null,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase.from("mapa_modulos").insert(payload).select("*").single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_CRIAR_MAPA_MODULO", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mapa_modulo: data }, { status: 201 });
}
