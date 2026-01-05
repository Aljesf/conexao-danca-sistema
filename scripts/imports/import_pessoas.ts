import { getAdminSupabase } from "./_supabase";
import { readCsv, requireColumns } from "./_csv";

type PessoaInsert = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  cpf?: string | null;
  ativo?: boolean;
  observacoes?: string | null;
};

function normalizePhone(v: string): string {
  return v.replace(/[^\d]/g, "");
}

function toNullable(v: string): string | null {
  const t = v.trim();
  return t.length ? t : null;
}

async function main() {
  const file = process.argv[2] ?? "data/imports/pessoas.csv";
  const rows = readCsv(file);
  requireColumns(rows, ["nome", "email", "telefone", "cpf", "ativo", "observacoes"]);

  if (rows.length === 0) {
    console.log(`[IMPORT] Nenhuma linha no CSV: ${file}`);
    process.exit(0);
  }

  const supabase = getAdminSupabase();

  const payload: PessoaInsert[] = rows.map((r) => ({
    nome: r.nome.trim(),
    email: toNullable(r.email),
    telefone: r.telefone ? normalizePhone(r.telefone) : null,
    cpf: toNullable(r.cpf),
    ativo: (r.ativo ?? "true").trim().toLowerCase() !== "false",
    observacoes: toNullable(r.observacoes),
  }));

  // Estrategia simples: upsert por email quando existir, senao por cpf quando existir.
  // Observacao: isso depende da sua regra real de unicidade no banco.
  // Se nao houver indices unicos, o upsert pode falhar. Ajustamos conforme seu schema.
  const hasAnyEmail = payload.some((p) => !!p.email);
  const conflictTarget = hasAnyEmail ? "email" : "cpf";

  console.log(`[IMPORT] Inserindo/atualizando pessoas: ${payload.length} (onConflict=${conflictTarget})`);

  const { data, error } = await supabase
    .from("pessoas")
    .upsert(payload as unknown as Record<string, unknown>[], { onConflict: conflictTarget });

  if (error) throw error;

  console.log(`[IMPORT] OK. Retorno:`, Array.isArray(data) ? data.length : data);
}

main().catch((e) => {
  console.error("[IMPORT] ERRO:", e);
  process.exit(1);
});
