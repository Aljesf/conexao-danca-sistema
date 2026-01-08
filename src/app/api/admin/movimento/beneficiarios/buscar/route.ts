import { NextResponse } from "next/server";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError } from "@/lib/http/api-errors";

type BenefBuscaRow = {
  beneficiario_id: string;
  pessoa_id: string;
  status: string;
  pessoa_nome: string | null;
  pessoa_cpf: string | null;
  pessoa_email: string | null;
};

export async function GET(req: Request) {
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q.length < 3) {
      return NextResponse.json({ ok: true, data: [] as BenefBuscaRow[] });
    }

    const qLike = `%${q}%`;

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .select("id,status,pessoa_id,pessoas(nome,cpf,email)")
      .or(`pessoas.nome.ilike.${qLike},pessoas.cpf.ilike.${qLike},pessoas.email.ilike.${qLike}`)
      .limit(10);

    if (error) throw error;

    const mapped = (data ?? []).map((row) => {
      const item = row as unknown as {
        id: string;
        status: string;
        pessoa_id: unknown;
        pessoas?: { nome?: string | null; cpf?: string | null; email?: string | null } | null;
      };

      return {
        beneficiario_id: item.id,
        pessoa_id: String(item.pessoa_id),
        status: item.status,
        pessoa_nome: item.pessoas?.nome ?? null,
        pessoa_cpf: item.pessoas?.cpf ?? null,
        pessoa_email: item.pessoas?.email ?? null,
      };
    }) as BenefBuscaRow[];

    return NextResponse.json({ ok: true, data: mapped });
  } catch (err) {
    return jsonError(err);
  }
}
