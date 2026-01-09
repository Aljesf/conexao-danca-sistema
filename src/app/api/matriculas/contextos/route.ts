import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type ContextoStatus = "ATIVO" | "ENCERRADO" | "CANCELADO";

type ContextoMatriculaRow = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: ContextoStatus;
  created_at: string;
  updated_at: string;
};

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") as ContextoTipo | null;
  const status = (searchParams.get("status") as ContextoStatus | null) ?? "ATIVO";
  const ano = searchParams.get("ano");
  const anoInt = ano ? Number(ano) : null;

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("escola_contextos_matricula")
    .select("id,tipo,titulo,ano_referencia,data_inicio,data_fim,status,created_at,updated_at")
    .order("tipo", { ascending: true })
    .order("ano_referencia", { ascending: false })
    .order("titulo", { ascending: true });

  if (tipo) query = query.eq("tipo", tipo);
  if (status) query = query.eq("status", status);
  if (anoInt !== null && Number.isFinite(anoInt)) query = query.eq("ano_referencia", anoInt);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: "falha_ao_listar_contextos", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: (data ?? []) as ContextoMatriculaRow[] });
}
