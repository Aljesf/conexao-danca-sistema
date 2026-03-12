import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractPlaceholderCodes,
  formatValue,
  getByPath,
  type DocumentoVariavel,
} from "@/lib/documentos/resolvePlaceholders";
import { type JoinEdge } from "@/lib/documentos/resolveByJoinPath";

export type DocumentoVariavelDb = DocumentoVariavel & {
  root_table: string | null;
  root_pk_column: string | null;
  join_path: JoinEdge[] | null;
  target_table: string | null;
  target_column: string | null;
  ai_gerada: boolean;
  mapeamento_pendente: boolean;
};

export type VariaveisResolvidasDocumento = {
  values: Record<string, string>;
  utilizadas: Record<string, unknown>;
  variaveisByCodigo: Map<string, DocumentoVariavelDb>;
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

export function buildVariaveisByCodigo(
  rows: Array<Record<string, unknown>>,
): Map<string, DocumentoVariavelDb> {
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
      target_column:
        typeof row.target_column === "string" ? row.target_column : row.target_column ?? null,
      ai_gerada: Boolean(row.ai_gerada),
      mapeamento_pendente: Boolean(row.mapeamento_pendente),
    });
  }
  return map;
}

export async function carregarVariaveisDocumentaisAtivas(
  supabase: SupabaseClient,
): Promise<Map<string, DocumentoVariavelDb>> {
  const { data, error } = await supabase
    .from("documentos_variaveis")
    .select(
      "codigo, path_origem, formato, tipo, root_table, root_pk_column, join_path, target_table, target_column, ai_gerada, mapeamento_pendente",
    )
    .eq("ativo", true);

  if (error) {
    throw new Error(error.message);
  }

  return buildVariaveisByCodigo((data ?? []) as Array<Record<string, unknown>>);
}

export async function resolverVariaveisDocumento(params: {
  template: string;
  contexto: Record<string, unknown>;
  variaveisByCodigo: Map<string, DocumentoVariavelDb>;
  supabase: SupabaseClient;
  rootId: number;
}): Promise<VariaveisResolvidasDocumento> {
  const { template, contexto, variaveisByCodigo, supabase, rootId } = params;
  const codes = extractPlaceholderCodes(template);
  const values: Record<string, string> = {};
  const utilizadas: Record<string, unknown> = {};

  await Promise.all(
    codes.map(async (code) => {
      const variavel = variaveisByCodigo.get(code);

      if (variavel?.mapeamento_pendente) {
        values[code] = "";
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
          values[code] = formatValue(raw, variavel.formato);
          utilizadas[code] = typeof raw === "undefined" ? null : raw;
          return;
        }
      }

      if (variavel?.path_origem) {
        const raw = getByPath(contexto, variavel.path_origem);
        values[code] = formatValue(raw, variavel.formato);
        utilizadas[code] = typeof raw === "undefined" ? null : raw;
        return;
      }

      const rawManual = getByPath(contexto, `variaveis_manuais.${code}`);
      values[code] = formatValue(rawManual, variavel?.formato ?? null);
      utilizadas[code] = typeof rawManual === "undefined" ? null : rawManual;
    }),
  );

  return {
    values,
    utilizadas,
    variaveisByCodigo,
  };
}
