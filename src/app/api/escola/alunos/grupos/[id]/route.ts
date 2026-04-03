import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isGrupoTipo,
  mapNucleoToGrupo,
  normalizeText,
  NUCLEO_SELECT,
  parseId,
  type NucleoRow,
} from "../_lib";

type Params = { params: Promise<{ id: string }> };

type GrupoUpdate = {
  nome?: string;
  categoria?: string | null;
  subcategoria?: string | null;
  tipo?: "TEMPORARIO" | "DURADOURO";
  descricao?: string | null;
  ativo?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("nucleos")
    .select(NUCLEO_SELECT)
    .eq("id", grupoId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "grupo nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapNucleoToGrupo(data as NucleoRow) });
}

export async function PUT(req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  let body: GrupoUpdate;
  try {
    body = (await req.json()) as GrupoUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.nome !== undefined) {
    const nome = normalizeText(body.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, error: "nome e obrigatorio." }, { status: 400 });
    }
    payload.nome = nome;
  }
  if (body.categoria !== undefined) payload.categoria = normalizeText(body.categoria);
  if (body.subcategoria !== undefined) payload.subcategoria = normalizeText(body.subcategoria);
  if (body.tipo !== undefined) {
    if (!isGrupoTipo(body.tipo)) {
      return NextResponse.json({ ok: false, error: "tipo invalido." }, { status: 400 });
    }
    payload.tipo = body.tipo;
  }
  if (body.descricao !== undefined) payload.descricao = normalizeText(body.descricao);

  const { data, error } = await supabase
    .from("nucleos")
    .update(payload)
    .eq("id", grupoId)
    .select(NUCLEO_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "grupo nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data: mapNucleoToGrupo(data as NucleoRow) });
}

export async function DELETE(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "id invalido." }, { status: 400 });
  }

  const { data, error } = await supabase.from("nucleos").delete().eq("id", grupoId).select("id").maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "grupo nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
