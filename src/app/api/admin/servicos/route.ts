import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ServicoRow = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia: number | null;
  created_at: string | null;
  updated_at: string | null;
};

// Observacao:
// - Esta rota e ADMIN: usar SERVICE_ROLE para leitura e evitar travas de RLS.
// - Caso voce ja tenha um helper padrao no projeto (ex.: getSupabaseServerSSR),
//   pode substituir o createClient daqui por ele, mantendo a logica de tratamento.

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("ENV ausente: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    // Query simples e robusta:
    // - Sem joins (para nao quebrar por coluna/relacionamento ainda em migracao)
    // - Ordenacao por id (mais seguro)
    const { data, error } = await supabase
      .from("servicos")
      .select("id,tipo,titulo,ativo,ano_referencia,created_at,updated_at")
      .order("id", { ascending: false });

    if (error) {
      console.error("[api/admin/servicos] Supabase error:", {
        message: error.message,
        details: (error as unknown as { details?: string }).details,
        hint: (error as unknown as { hint?: string }).hint,
        code: (error as unknown as { code?: string }).code,
      });

      // Nao devolver 500 "cego" sem contexto
      return NextResponse.json(
        {
          ok: false,
          error: "erro_ao_listar_servicos",
          message: error.message,
        },
        { status: 500 },
      );
    }

    const servicos = (data ?? []) as ServicoRow[];

    return NextResponse.json({ ok: true, servicos }, { status: 200 });
  } catch (err) {
    console.error("[api/admin/servicos] Unhandled error:", err);

    const message = err instanceof Error ? err.message : "Erro inesperado no servidor";

    return NextResponse.json(
      { ok: false, error: "erro_interno", message },
      { status: 500 },
    );
  }
}
