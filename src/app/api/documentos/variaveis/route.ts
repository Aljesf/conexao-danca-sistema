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
  root_table?: string | null;
  root_pk_column?: string | null;
  join_path?: unknown;
  target_table?: string | null;
  target_column?: string | null;
  display_label?: string | null;
  path_labels?: unknown;
  ai_gerada?: boolean;
  mapeamento_pendente?: boolean;
};

type JoinEdge = {
  direction?: "IN" | "OUT" | "IN_GUESS" | "OUT_GUESS";
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
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

function parseJoinPath(raw: unknown): { value: JoinEdge[] | null; error?: string } {
  if (raw === null || typeof raw === "undefined") return { value: null };
  if (!Array.isArray(raw)) return { value: null, error: "join_path deve ser uma lista." };
  if (raw.length > 3) return { value: null, error: "join_path aceita no maximo 3 saltos." };

  const edges: JoinEdge[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { value: null, error: "join_path invalido." };
    }
    const rec = item as Record<string, unknown>;
    const from_table = String(rec.from_table ?? "").trim();
    const from_column = String(rec.from_column ?? "").trim();
    const to_table = String(rec.to_table ?? "").trim();
    const to_column = String(rec.to_column ?? "").trim();
    const directionRaw = typeof rec.direction === "string" ? rec.direction.trim().toUpperCase() : "";
    const direction =
      directionRaw === "IN" ||
      directionRaw === "OUT" ||
      directionRaw === "IN_GUESS" ||
      directionRaw === "OUT_GUESS"
        ? directionRaw
        : undefined;
    const constraint_name =
      typeof rec.constraint_name === "string" ? rec.constraint_name : undefined;

    if (!from_table || !from_column || !to_table || !to_column) {
      return { value: null, error: "join_path invalido." };
    }

    edges.push({ direction, from_table, from_column, to_table, to_column, constraint_name });
  }

  return { value: edges };
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

  const formato = validateFormato(body.tipo, body.formato ?? null);
  const displayLabelRaw = typeof body.display_label === "string" ? body.display_label.trim() : "";
  const displayLabel = displayLabelRaw ? displayLabelRaw : null;
  const pathLabels = typeof body.path_labels === "undefined" ? null : body.path_labels ?? null;
  const rootTable = String(body.root_table || "").trim();
  const rootPkColumn = String(body.root_pk_column || "id").trim();
  const targetTable = String(body.target_table || "").trim();
  const targetColumn = String(body.target_column || "").trim();
  const joinPathParsed = parseJoinPath(body.join_path);

  if (body.origem !== "MANUAL") {
    if (!rootTable || !targetTable || !targetColumn) {
      return NextResponse.json(
        { error: "root_table, target_table e target_column sao obrigatorios." },
        { status: 400 },
      );
    }
    if (joinPathParsed.error) {
      return NextResponse.json({ error: joinPathParsed.error }, { status: 400 });
    }

    {
      const { data, error } = await supabase.rpc("documentos_schema_table_columns", {
        p_table: rootTable,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rootCols = Array.isArray(data) ? (data as Array<{ column_name?: string }>) : [];
      if (rootCols.length === 0) {
        return NextResponse.json(
          { error: `root_table invalida: ${rootTable}` },
          { status: 400 },
        );
      }
      const hasPk = rootCols.some((c) => String(c.column_name) === rootPkColumn);
      if (!hasPk) {
        return NextResponse.json(
          { error: `PK do root invalida: ${rootPkColumn}` },
          { status: 400 },
        );
      }
    }

    {
      const { data, error } = await supabase.rpc("documentos_schema_table_columns", {
        p_table: targetTable,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const targetCols = Array.isArray(data) ? (data as Array<{ column_name?: string }>) : [];
      const hasCol = targetCols.some((c) => String(c.column_name) === targetColumn);
      if (!hasCol) {
        return NextResponse.json(
          { error: `Coluna destino invalida: ${targetTable}.${targetColumn}` },
          { status: 400 },
        );
      }
    }
  }

  const insertPayload = {
    codigo,
    descricao: body.descricao.trim(),
    origem: body.origem,
    tipo: body.tipo,
    path_origem: pathOrigem,
    formato,
    ativo: typeof body.ativo === "boolean" ? body.ativo : true,
    ai_gerada: typeof body.ai_gerada === "boolean" ? body.ai_gerada : false,
    mapeamento_pendente:
      typeof body.mapeamento_pendente === "boolean" ? body.mapeamento_pendente : false,
    root_table: body.origem === "MANUAL" ? null : rootTable,
    root_pk_column: body.origem === "MANUAL" ? null : rootPkColumn,
    join_path: body.origem === "MANUAL" ? null : joinPathParsed.value,
    target_table: body.origem === "MANUAL" ? null : targetTable,
    target_column: body.origem === "MANUAL" ? null : targetColumn,
    display_label: displayLabel,
    path_labels: body.origem === "MANUAL" ? null : pathLabels,
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
    updatePayload.root_table = null;
    updatePayload.root_pk_column = null;
    updatePayload.join_path = null;
    updatePayload.target_table = null;
    updatePayload.target_column = null;
    updatePayload.path_labels = null;
  } else if (typeof body.path_origem === "string") {
    updatePayload.path_origem = body.path_origem.trim() || null;
  }

  const tipoAtual = (updatePayload.tipo as Tipo | undefined) ?? body.tipo;
  if (tipoAtual && typeof tipoAtual === "string") {
    updatePayload.formato = validateFormato(tipoAtual as Tipo, body.formato ?? null);
  }

  if (typeof body.display_label !== "undefined") {
    const raw = typeof body.display_label === "string" ? body.display_label.trim() : "";
    updatePayload.display_label = raw ? raw : null;
  }

  if (typeof body.path_labels !== "undefined" && origemAtual !== "MANUAL") {
    updatePayload.path_labels = body.path_labels ?? null;
  }

  if (typeof body.mapeamento_pendente === "boolean") {
    updatePayload.mapeamento_pendente = body.mapeamento_pendente;
  }

  const rootTable = typeof body.root_table === "string" ? body.root_table.trim() : "";
  const rootPkColumn =
    typeof body.root_pk_column === "string" ? body.root_pk_column.trim() || "id" : "id";
  const targetTable = typeof body.target_table === "string" ? body.target_table.trim() : "";
  const targetColumn = typeof body.target_column === "string" ? body.target_column.trim() : "";
  const joinPathParsed = parseJoinPath(body.join_path);

  const updateJoinFields =
    typeof body.root_table !== "undefined" ||
    typeof body.root_pk_column !== "undefined" ||
    typeof body.target_table !== "undefined" ||
    typeof body.target_column !== "undefined" ||
    typeof body.join_path !== "undefined";

  if (origemAtual !== "MANUAL" && updateJoinFields) {
    if (!rootTable || !targetTable || !targetColumn) {
      return NextResponse.json(
        { error: "root_table, target_table e target_column sao obrigatorios." },
        { status: 400 },
      );
    }
    if (joinPathParsed.error) {
      return NextResponse.json({ error: joinPathParsed.error }, { status: 400 });
    }

    {
      const { data, error } = await supabase.rpc("documentos_schema_table_columns", {
        p_table: rootTable,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const rootCols = Array.isArray(data) ? (data as Array<{ column_name?: string }>) : [];
      if (rootCols.length === 0) {
        return NextResponse.json(
          { error: `root_table invalida: ${rootTable}` },
          { status: 400 },
        );
      }
      const hasPk = rootCols.some((c) => String(c.column_name) === rootPkColumn);
      if (!hasPk) {
        return NextResponse.json(
          { error: `PK do root invalida: ${rootPkColumn}` },
          { status: 400 },
        );
      }
    }

    {
      const { data, error } = await supabase.rpc("documentos_schema_table_columns", {
        p_table: targetTable,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const targetCols = Array.isArray(data) ? (data as Array<{ column_name?: string }>) : [];
      const hasCol = targetCols.some((c) => String(c.column_name) === targetColumn);
      if (!hasCol) {
        return NextResponse.json(
          { error: `Coluna destino invalida: ${targetTable}.${targetColumn}` },
          { status: 400 },
        );
      }
    }

    updatePayload.root_table = rootTable;
    updatePayload.root_pk_column = rootPkColumn || "id";
    updatePayload.join_path = joinPathParsed.value;
    updatePayload.target_table = targetTable;
    updatePayload.target_column = targetColumn;
    if (typeof body.mapeamento_pendente === "undefined") {
      updatePayload.mapeamento_pendente = false;
    }
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
