import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseId } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

type AddMembroBody = {
  pessoa_id: number;
};

type MembroRow = {
  id: number;
  pessoa_id: number;
  data_entrada: string;
  ativo: boolean;
  pessoas: {
    nome: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
};

async function validarNucleoExiste(nucleoId: number): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("nucleos").select("id").eq("id", nucleoId).maybeSingle();
  if (error) return error.message;
  return data ? null : "grupo nao encontrado.";
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }

  const erroNucleo = await validarNucleoExiste(grupoId);
  if (erroNucleo) {
    const status = erroNucleo === "grupo nao encontrado." ? 404 : 500;
    return NextResponse.json({ ok: false, error: erroNucleo }, { status });
  }

  const { data, error } = await supabase
    .from("nucleo_membros")
    .select("id,pessoa_id,data_entrada,ativo,pessoas!inner(nome,telefone,email)")
    .eq("nucleo_id", grupoId)
    .eq("ativo", true)
    .order("data_entrada", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const membros = ((data ?? []) as MembroRow[]).map((row) => ({
    id: row.id,
    pessoa_id: row.pessoa_id,
    nome: row.pessoas?.nome ?? "",
    telefone: row.pessoas?.telefone ?? null,
    email: row.pessoas?.email ?? null,
    data_entrada: row.data_entrada,
    ativo: row.ativo,
  }));

  return NextResponse.json({ ok: true, data: membros });
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }

  let body: AddMembroBody;
  try {
    body = (await req.json()) as AddMembroBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.pessoa_id || typeof body.pessoa_id !== "number") {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const erroNucleo = await validarNucleoExiste(grupoId);
  if (erroNucleo) {
    const status = erroNucleo === "grupo nao encontrado." ? 404 : 500;
    return NextResponse.json({ ok: false, error: erroNucleo }, { status });
  }

  const { data: pessoa, error: pessoaError } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", body.pessoa_id)
    .maybeSingle();

  if (pessoaError) {
    return NextResponse.json({ ok: false, error: pessoaError.message }, { status: 500 });
  }
  if (!pessoa) {
    return NextResponse.json({ ok: false, error: "pessoa nao encontrada." }, { status: 404 });
  }

  const { data: membroAtivo, error: membroAtivoError } = await supabase
    .from("nucleo_membros")
    .select("id")
    .eq("nucleo_id", grupoId)
    .eq("pessoa_id", body.pessoa_id)
    .eq("ativo", true)
    .maybeSingle();

  if (membroAtivoError) {
    return NextResponse.json({ ok: false, error: membroAtivoError.message }, { status: 500 });
  }
  if (membroAtivo) {
    return NextResponse.json({ ok: false, error: "pessoa ja possui vinculo ativo neste nucleo." }, { status: 409 });
  }

  const { data: membroInativo, error: membroInativoError } = await supabase
    .from("nucleo_membros")
    .select("id")
    .eq("nucleo_id", grupoId)
    .eq("pessoa_id", body.pessoa_id)
    .eq("ativo", false)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membroInativoError) {
    return NextResponse.json({ ok: false, error: membroInativoError.message }, { status: 500 });
  }

  let membroId: number | null = null;

  if (membroInativo?.id) {
    const { data: reativado, error: reativarError } = await supabase
      .from("nucleo_membros")
      .update({
        ativo: true,
        data_saida: null,
        data_entrada: new Date().toISOString().slice(0, 10),
      })
      .eq("id", membroInativo.id)
      .select("id")
      .maybeSingle();

    if (reativarError) {
      return NextResponse.json({ ok: false, error: reativarError.message }, { status: 500 });
    }

    membroId = reativado?.id ?? null;
  } else {
    const { data: criado, error: createError } = await supabase
      .from("nucleo_membros")
      .insert({
        nucleo_id: grupoId,
        pessoa_id: body.pessoa_id,
      })
      .select("id")
      .maybeSingle();

    if (createError) {
      return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
    }

    membroId = criado?.id ?? null;
  }

  const { data, error } = await supabase
    .from("nucleo_membros")
    .select("id,pessoa_id,data_entrada,ativo,pessoas!inner(nome,telefone,email)")
    .eq("id", membroId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "falha ao carregar vinculo criado." }, { status: 500 });
  }

  const row = data as MembroRow;
  return NextResponse.json(
    {
      ok: true,
      data: {
        id: row.id,
        pessoa_id: row.pessoa_id,
        nome: row.pessoas?.nome ?? "",
        telefone: row.pessoas?.telefone ?? null,
        email: row.pessoas?.email ?? null,
        data_entrada: row.data_entrada,
        ativo: row.ativo,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  const url = new URL(req.url);
  const pessoaId = parseId(url.searchParams.get("pessoa_id") ?? "");
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }
  if (pessoaId === null) {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("nucleo_membros")
    .update({
      ativo: false,
      data_saida: new Date().toISOString().slice(0, 10),
    })
    .eq("nucleo_id", grupoId)
    .eq("pessoa_id", pessoaId)
    .eq("ativo", true)
    .select("id");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json({ ok: false, error: "membro nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
