import { NextResponse } from "next/server";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import {
  extractPlaceholderCodes,
  formatValue,
  getByPath,
  type DocumentoVariavel,
} from "@/lib/documentos/resolvePlaceholders";
import { type JoinEdge } from "@/lib/documentos/resolveByJoinPath";

type Item = { grupo_id: number; documento_modelo_id: number; incluir: boolean };
type Body = {
  documento_conjunto_id: number;
  itens: Item[];
  variaveis_manuais?: Record<string, unknown>;
  snapshot_financeiro?: Record<string, unknown>;
};

type DocumentoVariavelDb = DocumentoVariavel & {
  root_table: string | null;
  root_pk_column: string | null;
  join_path: JoinEdge[] | null;
  target_table: string | null;
  target_column: string | null;
  ai_gerada: boolean;
  mapeamento_pendente: boolean;
};

const isInDirection = (direction?: string | null) =>
  direction === "IN" || direction === "IN_GUESS";

function normalizeJoinPathForRpc(joinPath: JoinEdge[] | null): JoinEdge[] | null {
  if (!joinPath || joinPath.length === 0) return null;
  return joinPath.map((edge) => {
    if (isInDirection(edge.direction)) {
      return {
        from_table: edge.to_table,
        from_column: edge.to_column,
        to_table: edge.from_table,
        to_column: edge.from_column,
        constraint_name: edge.constraint_name,
      };
    }
    return {
      from_table: edge.from_table,
      from_column: edge.from_column,
      to_table: edge.to_table,
      to_column: edge.to_column,
      constraint_name: edge.constraint_name,
    };
  });
}

const PAPEIS_VALIDOS = ["PRINCIPAL", "OBRIGATORIO", "OPCIONAL", "ADICIONAL"] as const;
type Papel = (typeof PAPEIS_VALIDOS)[number];

function normalizePapel(value: unknown): Papel | null {
  if (typeof value !== "string") return null;
  const upper = value.trim().toUpperCase();
  return PAPEIS_VALIDOS.includes(upper as Papel) ? (upper as Papel) : null;
}

function resolveModeloTemplate(modelo: Record<string, unknown>): string {
  const formato = String(modelo.formato ?? "MARKDOWN");
  if (formato === "RICH_HTML") {
    const html = modelo.conteudo_html;
    if (typeof html === "string" && html.trim()) return html;
  }
  const texto = modelo.texto_modelo_md;
  return typeof texto === "string" ? texto : "";
}

function buildVariaveisByCodigo(rows: Array<Record<string, unknown>>): Map<string, DocumentoVariavelDb> {
  const map = new Map<string, DocumentoVariavelDb>();
  for (const row of rows) {
    const codigo = String(row.codigo ?? "").trim().toUpperCase();
    if (!codigo) continue;
    map.set(codigo, {
      codigo,
      path_origem: typeof row.path_origem === "string" ? row.path_origem : row.path_origem ?? null,
      formato: typeof row.formato === "string" ? row.formato : row.formato ?? null,
      tipo: typeof row.tipo === "string" ? row.tipo : row.tipo ?? null,
      root_table: typeof row.root_table === "string" ? row.root_table : row.root_table ?? null,
      root_pk_column:
        typeof row.root_pk_column === "string" ? row.root_pk_column : row.root_pk_column ?? null,
      join_path: Array.isArray(row.join_path) ? (row.join_path as JoinEdge[]) : null,
      target_table: typeof row.target_table === "string" ? row.target_table : row.target_table ?? null,
      target_column: typeof row.target_column === "string" ? row.target_column : row.target_column ?? null,
      ai_gerada: Boolean(row.ai_gerada),
      mapeamento_pendente: Boolean(row.mapeamento_pendente),
    });
  }
  return map;
}

async function resolveTemplateValues(params: {
  template: string;
  contexto: Record<string, unknown>;
  variaveisByCodigo: Map<string, DocumentoVariavelDb>;
  supabase: SupabaseClient;
  rootId: number;
}): Promise<{ resolved: string; utilizadas: Record<string, unknown> }> {
  const { template, contexto, variaveisByCodigo, supabase, rootId } = params;
  const codes = extractPlaceholderCodes(template);
  const valoresFormatados: Record<string, string> = {};
  const utilizadas: Record<string, unknown> = {};

  await Promise.all(
    codes.map(async (code) => {
      const variavel = variaveisByCodigo.get(code);

      if (variavel?.mapeamento_pendente) {
        valoresFormatados[code] = "";
        utilizadas[code] = null;
        return;
      }

      if (variavel?.root_table) {
        const rootTable = variavel.root_table;
        const rootPk = variavel.root_pk_column || "id";
        const targetTable = variavel.target_table;
        const targetColumn = variavel.target_column;

        if (rootTable && targetTable && targetColumn) {
          const joinPath = normalizeJoinPathForRpc(variavel.join_path ?? null);
          const { data, error } = await supabase.rpc("documentos_resolver_por_join_path", {
            p_root_table: rootTable,
            p_root_pk: rootPk,
            p_root_id: rootId,
            p_join_path: joinPath,
            p_target_table: targetTable,
            p_target_column: targetColumn,
          });

          const raw = error ? null : data;
          valoresFormatados[code] = formatValue(raw, variavel.formato);
          utilizadas[code] = typeof raw === "undefined" ? null : raw;
          return;
        }
      }

      if (variavel?.path_origem) {
        const raw = getByPath(contexto, variavel.path_origem);
        valoresFormatados[code] = formatValue(raw, variavel.formato);
        utilizadas[code] = typeof raw === "undefined" ? null : raw;
        return;
      }

      const rawManual = getByPath(contexto, `variaveis_manuais.${code}`);
      valoresFormatados[code] = formatValue(rawManual, variavel?.formato ?? null);
      utilizadas[code] = typeof rawManual === "undefined" ? null : rawManual;
    }),
  );

  const resolved = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, codeRaw: string) => {
    const code = String(codeRaw || "").trim();
    return code ? valoresFormatados[code] ?? "" : "";
  });

  return { resolved, utilizadas };
}

function normalizeManualVars(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const code = k.trim().toUpperCase();
    if (!code) continue;
    out[code] = v;
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const matriculaId = Number(id);
  if (!Number.isFinite(matriculaId)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as Body;
  const conjuntoId = Number(body?.documento_conjunto_id);
  const itens = Array.isArray(body?.itens) ? body.itens : [];

  if (!Number.isFinite(conjuntoId) || conjuntoId <= 0) {
    return NextResponse.json({ ok: false, message: "documento_conjunto_id invalido." }, { status: 400 });
  }

  const supabase = await getSupabaseServerSSR();

  const { data: mat, error: matErr } = await supabase
    .from("matriculas")
    .select("*")
    .eq("id", matriculaId)
    .single();

  if (matErr || !mat) {
    return NextResponse.json({ ok: false, message: "Matricula nao encontrada." }, { status: 404 });
  }

  const { data: conjunto, error: conjErr } = await supabase
    .from("documentos_conjuntos")
    .select("id")
    .eq("id", conjuntoId)
    .single();

  if (conjErr || !conjunto) {
    return NextResponse.json({ ok: false, message: "Conjunto nao encontrado." }, { status: 404 });
  }

  const { data: grupos, error: gruposErr } = await supabase
    .from("documentos_grupos")
    .select("id, obrigatorio, papel")
    .eq("conjunto_id", conjuntoId);

  if (gruposErr) {
    return NextResponse.json({ ok: false, message: gruposErr.message }, { status: 500 });
  }

  const grupoSet = new Map<number, { obrigatorio: boolean; papel: Papel | null }>();
  for (const g of (grupos ?? []) as unknown as Array<Record<string, unknown>>) {
    const gid = Number(g.id);
    const papel = normalizePapel(g.papel);
    grupoSet.set(gid, { obrigatorio: Boolean(g.obrigatorio), papel });
  }

  const selecionados = itens
    .filter((i) => i && typeof i === "object")
    .map((i) => ({
      grupo_id: Number(i.grupo_id),
      documento_modelo_id: Number(i.documento_modelo_id),
      incluir: Boolean(i.incluir),
    }))
    .filter((i) => Number.isFinite(i.grupo_id) && Number.isFinite(i.documento_modelo_id));

  const obrigatorios = Array.from(grupoSet.entries())
    .filter(([, v]) => v.papel === "OBRIGATORIO" || v.obrigatorio)
    .map(([k]) => k);
  const incluidosSet = new Set<number>(selecionados.filter((s) => s.incluir).map((s) => s.grupo_id));
  const faltandoObrig = obrigatorios.filter((gid) => !incluidosSet.has(gid));

  if (faltandoObrig.length > 0) {
    return NextResponse.json(
      { ok: false, message: `Grupos obrigatorios nao selecionados: ${faltandoObrig.join(", ")}` },
      { status: 400 }
    );
  }

  const principaisIncluidos = Array.from(grupoSet.entries())
    .filter(([gid, v]) => v.papel === "PRINCIPAL" && incluidosSet.has(gid))
    .map(([gid]) => gid);

  if (principaisIncluidos.length === 0) {
    return NextResponse.json({ ok: false, message: "Selecione 1 grupo PRINCIPAL." }, { status: 400 });
  }

  if (principaisIncluidos.length > 1) {
    return NextResponse.json({ ok: false, message: "Selecione apenas 1 grupo PRINCIPAL." }, { status: 400 });
  }

  const emitidos: Array<Record<string, unknown>> = [];
  const snapshot = (body.snapshot_financeiro ?? {}) as Record<string, unknown>;
  const manuaisRaw = (body.variaveis_manuais ?? {}) as Record<string, unknown>;
  const manuais = normalizeManualVars(manuaisRaw);

  const { data: variaveisRaw, error: variaveisErr } = await supabase
    .from("documentos_variaveis")
    .select(
      "codigo, path_origem, formato, tipo, root_table, root_pk_column, join_path, target_table, target_column, ai_gerada, mapeamento_pendente",
    )
    .eq("ativo", true);

  if (variaveisErr) {
    return NextResponse.json({ ok: false, message: variaveisErr.message }, { status: 500 });
  }

  const variaveisByCodigo = buildVariaveisByCodigo(
    (variaveisRaw ?? []) as unknown as Array<Record<string, unknown>>,
  );

  const pessoaId = Number((mat as Record<string, unknown>).pessoa_id);
  const respFinId = Number((mat as Record<string, unknown>).responsavel_financeiro_id);

  const { data: aluno } = await supabase.from("pessoas").select("*").eq("id", pessoaId).single();
  const { data: responsavel } = await supabase.from("pessoas").select("*").eq("id", respFinId).single();

  const vinculoIdRaw = (mat as Record<string, unknown>).vinculo_id;
  const vinculoId = typeof vinculoIdRaw === "number" ? vinculoIdRaw : Number(vinculoIdRaw);
  let turma: Record<string, unknown> | null = null;

  if (Number.isFinite(vinculoId)) {
    const { data: turmaData, error: turmaErr } = await supabase
      .from("turmas")
      .select("*")
      .eq("turma_id", vinculoId)
      .maybeSingle();

    if (!turmaErr && turmaData) {
      turma = turmaData as Record<string, unknown>;
    }
  }

  const contexto: Record<string, unknown> = {
    aluno: aluno ?? null,
    turma,
    matricula: mat,
    responsavel: responsavel ?? null,
    escola: null,
    snapshot_financeiro: snapshot,
    variaveis_manuais: manuais,
  };

  const grupoIdsIncluidos = Array.from(new Set(selecionados.filter((s) => s.incluir).map((s) => s.grupo_id)));
  if (grupoIdsIncluidos.length === 0) {
    return NextResponse.json({ ok: false, message: "Nenhum grupo selecionado para emissao." }, { status: 400 });
  }

  const { data: vincs, error: vincErr } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .select("conjunto_grupo_id, modelo_id, ativo")
    .in("conjunto_grupo_id", grupoIdsIncluidos)
    .eq("ativo", true);

  if (vincErr) return NextResponse.json({ ok: false, message: vincErr.message }, { status: 500 });

  const allowed = new Set<string>();
  for (const r of (vincs ?? []) as unknown as Array<Record<string, unknown>>) {
    const k = `${Number(r.conjunto_grupo_id)}:${Number(r.modelo_id)}`;
    allowed.add(k);
  }

  for (const item of selecionados.filter((s) => s.incluir)) {
    if (!grupoSet.has(item.grupo_id)) {
      return NextResponse.json(
        { ok: false, message: `Grupo invalido para este conjunto: ${item.grupo_id}` },
        { status: 400 }
      );
    }

    const key = `${item.grupo_id}:${item.documento_modelo_id}`;
    if (!allowed.has(key)) {
      return NextResponse.json(
        { ok: false, message: `Modelo ${item.documento_modelo_id} nao esta vinculado ao grupo ${item.grupo_id}.` },
        { status: 400 }
      );
    }

    const { data: modelo, error: modErr } = await supabase
      .from("documentos_modelo")
      .select("id,formato,conteudo_html,texto_modelo_md,cabecalho_html,rodape_html")
      .eq("id", item.documento_modelo_id)
      .single();

    if (modErr || !modelo) {
      return NextResponse.json({ ok: false, message: `Modelo nao encontrado: ${item.documento_modelo_id}` }, { status: 404 });
    }

    const template = resolveModeloTemplate(modelo as Record<string, unknown>);
    const { resolved: conteudoResolvido, utilizadas: variaveisUtilizadas } =
      await resolveTemplateValues({
        template,
        variaveisByCodigo,
        contexto,
        supabase,
        rootId: matriculaId,
      });
    const hash = crypto.createHash("sha256").update(conteudoResolvido, "utf8").digest("hex");

    const baseInsert: Record<string, unknown> = {
      matricula_id: matriculaId,
      status_assinatura: "PENDENTE",
      conteudo_renderizado_md: conteudoResolvido,
      conteudo_template_html: template,
      conteudo_resolvido_html: conteudoResolvido,
      cabecalho_html: (modelo as Record<string, unknown>).cabecalho_html ?? null,
      rodape_html: (modelo as Record<string, unknown>).rodape_html ?? null,
      contexto_json: contexto,
      variaveis_utilizadas_json: variaveisUtilizadas,
      snapshot_financeiro_json: snapshot,
      hash_conteudo: hash,
      documento_conjunto_id: conjuntoId,
      documento_grupo_id: item.grupo_id,
    };

    let inserted: Record<string, unknown> | null = null;

    {
      const try1 = { ...baseInsert, documento_modelo_id: item.documento_modelo_id };
      const { data, error } = await supabase.from("documentos_emitidos").insert(try1).select("*").single();
      if (!error) inserted = data as unknown as Record<string, unknown>;
    }

    if (!inserted) {
      const try2 = { ...baseInsert, contrato_modelo_id: item.documento_modelo_id };
      const { data, error } = await supabase.from("documentos_emitidos").insert(try2).select("*").single();
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      inserted = data as unknown as Record<string, unknown>;
    }

    emitidos.push(inserted);
  }

  await supabase
    .from("matriculas")
    .update({ documento_conjunto_id: conjuntoId })
    .eq("id", matriculaId);

  return NextResponse.json(
    { ok: true, data: { matricula_id: matriculaId, documento_conjunto_id: conjuntoId, emitidos } },
    { status: 201 }
  );
}
