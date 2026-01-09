import { NextResponse } from "next/server";
import { requireMovimentoAdmin } from "@/lib/auth/movimento-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { jsonError } from "@/lib/http/api-errors";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type PessoaRow = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type PessoaRowDb = {
  id: number | string;
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    await requireMovimentoAdmin();
    const supabase = getSupabaseServiceClient();

    const url = new URL(req.url);
    const qRaw = (url.searchParams.get("q") ?? "").trim();

    if (qRaw.length < 3) {
      return NextResponse.json({ ok: true, data: [] as PessoaRow[] });
    }

    const qLike = `%${qRaw}%`;
    const digits = qRaw.replace(/\D/g, "");
    const orParts = [`nome.ilike.${qLike}`, `email.ilike.${qLike}`];

    if (digits.length >= 3) {
      orParts.push(`cpf.ilike.%${digits}%`);
    } else {
      orParts.push(`cpf.ilike.${qLike}`);
    }

    const { data, error } = await supabase
      .from("pessoas")
      .select("id,nome,cpf,email,telefone")
      .or(orParts.join(","))
      .limit(10);

    if (error) throw error;

    const mapped = (data as PessoaRowDb[] | null | undefined)?.map((p) => ({
      id: String(p.id),
      nome: p.nome ?? "",
      cpf: p.cpf ?? null,
      email: p.email ?? null,
      telefone: p.telefone ?? null,
    })) ?? [];

    return NextResponse.json({ ok: true, data: mapped });
  } catch (err) {
    return jsonError(err);
  }
}
