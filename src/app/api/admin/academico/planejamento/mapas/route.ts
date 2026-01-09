import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const url = new URL(req.url);
  const cursoRaw = url.searchParams.get("cursoId");
  const nivelRaw = url.searchParams.get("nivelId");

  if (cursoRaw && !zId.safeParse(cursoRaw).success) {
    return NextResponse.json({ ok: false, code: "CURSO_ID_INVALIDO" }, { status: 400 });
  }
  if (nivelRaw && !zId.safeParse(nivelRaw).success) {
    return NextResponse.json({ ok: false, code: "NIVEL_ID_INVALIDO" }, { status: 400 });
  }

  let q = admin.supabase.from("mapas_pedagogicos").select("*").order("id", { ascending: false });
  if (cursoRaw) q = q.eq("curso_id", Number(cursoRaw));
  if (nivelRaw) q = q.eq("nivel_id", Number(nivelRaw));

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_LISTAR_MAPAS", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mapas: data ?? [] });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const body = await req.json().catch(() => null);
  const schema = z.object({
    curso_id: z.coerce.number().int().positive(),
    nivel_id: z.coerce.number().int().positive(),
    descricao: z.string().trim().optional().nullable(),
    ativo: z.boolean().optional(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const { curso_id, nivel_id, descricao, ativo } = parsed.data;
  const payload = {
    curso_id,
    nivel_id,
    descricao: descricao ?? null,
    ativo: typeof ativo === "boolean" ? ativo : true,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase
    .from("mapas_pedagogicos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_CRIAR_MAPA", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mapa: data }, { status: 201 });
}
