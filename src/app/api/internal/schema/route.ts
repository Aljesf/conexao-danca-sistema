import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SnapshotResponse = {
  tables: string[];
  columns: {
    documentos_colecoes: Array<{ column_name: string; data_type: string }>;
    documentos_variaveis: Array<{ column_name: string; data_type: string }>;
  };
  samples: Record<string, unknown>;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${name}`);
  return v;
}

export async function GET() {
  try {
    const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("admin_schema_snapshot");
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, hint: error.hint ?? null },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: data as SnapshotResponse }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
