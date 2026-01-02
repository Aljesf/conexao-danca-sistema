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

type VariavelUpdatePayload = {
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

function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  return id;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const variavelId = parseId(id);

  if (!variavelId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_variaveis")
    .select("*")
    .eq("id", variavelId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const variavelId = parseId(id);

  if (!variavelId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as VariavelUpdatePayload;
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

  const supabase = await getSupabaseServerSSR();
  const { data, error } = await supabase
    .from("documentos_variaveis")
    .update(updatePayload)
    .eq("id", variavelId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const variavelId = parseId(id);

  if (!variavelId) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();
  const { error } = await supabase
    .from("documentos_variaveis")
    .update({ ativo: false })
    .eq("id", variavelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
