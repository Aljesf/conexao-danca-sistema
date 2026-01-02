import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type Origem =
  | "ALUNO"
  | "RESPONSAVEL_FINANCEIRO"
  | "MATRICULA"
  | "TURMA"
  | "ESCOLA"
  | "FINANCEIRO"
  | "MANUAL";
type Tipo = "TEXTO" | "MONETARIO" | "DATA";

type VariavelPayload = {
  id?: number;
  codigo?: string;
  descricao?: string;
  origem?: Origem;
  tipo?: Tipo;
  path_origem?: string | null;
  formato?: string | null;
  ativo?: boolean;
};

const ORIGENS: Origem[] = [
  "ALUNO",
  "RESPONSAVEL_FINANCEIRO",
  "MATRICULA",
  "TURMA",
  "ESCOLA",
  "FINANCEIRO",
  "MANUAL",
];
const TIPOS: Tipo[] = ["TEXTO", "MONETARIO", "DATA"];
const FORMATOS_MONETARIO = ["BRL"];
const FORMATOS_DATA = ["DATA_CURTA"];

function normalizeCodigo(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_");
}

function isOrigem(value: unknown): value is Origem {
  return typeof value === "string" && ORIGENS.includes(value as Origem);
}

function isTipo(value: unknown): value is Tipo {
  return typeof value === "string" && TIPOS.includes(value as Tipo);
}

function validateFormato(tipo: Tipo, formato: string | null): string | null {
  if (!formato) return null;
  if (tipo === "MONETARIO" && FORMATOS_MONETARIO.includes(formato)) return formato;
  if (tipo === "DATA" && FORMATOS_DATA.includes(formato)) return formato;
  if (tipo === "TEXTO") return null;
  return null;
}

export async function GET(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const url = new URL(req.url);
  const ativoParam = url.searchParams.get("ativo");

  let query = supabase
    .from("documentos_variaveis")
    .select("*")
    .order("ativo", { ascending: false })
    .order("codigo", { ascending: true });

  if (ativoParam !== null) {
    const onlyActive = ativoParam !== "0" && ativoParam.toLowerCase() !== "false";
    query = query.eq("ativo", onlyActive);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as VariavelPayload;

  if (!body?.codigo || !body?.descricao || !isOrigem(body.origem) || !isTipo(body.tipo)) {
    return NextResponse.json(
      { error: "Campos obrigatorios: codigo, descricao, origem, tipo." },
      { status: 400 },
    );
  }

  const codigo = normalizeCodigo(body.codigo);
  if (!/^[A-Z0-9_]+$/.test(codigo)) {
    return NextResponse.json({ error: "Codigo invalido. Use A-Z, 0-9 e _." }, { status: 400 });
  }

  const pathOrigem = body.origem === "MANUAL" ? null : body.path_origem?.trim() || null;
  if (body.origem !== "MANUAL" && !pathOrigem) {
    return NextResponse.json({ error: "Path tecnico obrigatorio para origem nao MANUAL." }, { status: 400 });
  }

  const formato = validateFormato(body.tipo, body.formato ?? null);

  const insertPayload = {
    codigo,
    descricao: body.descricao.trim(),
    origem: body.origem,
    tipo: body.tipo,
    path_origem: pathOrigem,
    formato,
    ativo: typeof body.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("documentos_variaveis")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PUT(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as VariavelPayload;

  const id = typeof body.id === "number" ? body.id : Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {};

  if (typeof body.codigo === "string" && body.codigo.trim()) {
    const codigo = normalizeCodigo(body.codigo);
    if (!/^[A-Z0-9_]+$/.test(codigo)) {
      return NextResponse.json({ error: "Codigo invalido. Use A-Z, 0-9 e _." }, { status: 400 });
    }
    updatePayload.codigo = codigo;
  }

  if (typeof body.descricao === "string") updatePayload.descricao = body.descricao.trim();
  if (isOrigem(body.origem)) updatePayload.origem = body.origem;
  if (isTipo(body.tipo)) updatePayload.tipo = body.tipo;
  if (typeof body.ativo === "boolean") updatePayload.ativo = body.ativo;

  const origemAtual = (updatePayload.origem as Origem | undefined) ?? body.origem;
  if (origemAtual === "MANUAL") {
    updatePayload.path_origem = null;
  } else if (typeof body.path_origem === "string") {
    updatePayload.path_origem = body.path_origem.trim() || null;
  }

  const tipoAtual = (updatePayload.tipo as Tipo | undefined) ?? body.tipo;
  if (tipoAtual && typeof tipoAtual === "string") {
    updatePayload.formato = validateFormato(tipoAtual as Tipo, body.formato ?? null);
  }

  const { data, error } = await supabase
    .from("documentos_variaveis")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as { id?: number };
  const id = typeof body?.id === "number" ? body.id : Number(body?.id);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const { error } = await supabase.from("documentos_variaveis").update({ ativo: false }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
