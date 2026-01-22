import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type MatriculaTabelaRow = {
  id: number;
  titulo: string;
  ano_referencia: number | null;
  ativo: boolean;
  referencia_id: number | null;
  produto_tipo: string;
};

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("matricula_tabelas")
    .select("id,titulo,ano_referencia,ativo,referencia_id,produto_tipo")
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tabelas: (data ?? []) as MatriculaTabelaRow[] });
}

