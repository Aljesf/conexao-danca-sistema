export type JoinEdge = {
  direction?: "IN" | "OUT";
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
  constraint_name?: string;
};

export function buildSqlForJoinPath(params: {
  rootTable: string;
  rootPk: string;
  rootIdParamName: string; // ex: "p_root_id"
  joinPath: JoinEdge[];
  targetTable: string;
  targetColumn: string;
}): { sql: string; args: Record<string, unknown> } {
  const { rootTable, rootPk, rootIdParamName, joinPath, targetTable, targetColumn } = params;

  const payload = {
    rootTable,
    rootPk,
    joinPath,
    targetTable,
    targetColumn,
    rootIdParamName,
  };

  return { sql: "", args: payload };
}
