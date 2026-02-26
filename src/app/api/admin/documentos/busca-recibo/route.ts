import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Item = {
  tipo: "COBRANCA" | "RECEBIMENTO";
  ref_id: number;
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_cpf: string;
  pessoa_telefone: string;
  competencia_ano_mes: string;
  valor_centavos: number;
  status: string;
  created_at: string;
  cobranca_id: number | null;
};

function isNumericLike(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

function sortByCreatedAtDesc(items: Item[]): Item[] {
  return items.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);

  if (!qRaw || qRaw.length < 2) {
    return NextResponse.json({ ok: true, q: qRaw, items: [] as Item[] });
  }

  const supabase = await createClient();
  const qSanitized = qRaw.replaceAll(",", " ");
  const like = `%${qSanitized}%`;

  const baseQuery = supabase
    .from("vw_documentos_busca_recibo")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  const orExpression = [
    `pessoa_nome.ilike.${like}`,
    `pessoa_cpf.ilike.${like}`,
    `pessoa_telefone.ilike.${like}`,
    `competencia_ano_mes.ilike.${like}`,
  ].join(",");

  if (isNumericLike(qRaw)) {
    const [byId, byText] = await Promise.all([
      supabase
        .from("vw_documentos_busca_recibo")
        .select("*")
        .eq("ref_id", Number(qRaw))
        .order("created_at", { ascending: false })
        .limit(limit),
      baseQuery.or(orExpression),
    ]);

    if (byId.error) {
      return NextResponse.json(
        { ok: false, error: "busca_recibo_erro", details: byId.error.message },
        { status: 500 },
      );
    }
    if (byText.error) {
      return NextResponse.json(
        { ok: false, error: "busca_recibo_erro", details: byText.error.message },
        { status: 500 },
      );
    }

    const map = new Map<string, Item>();
    for (const it of (byId.data ?? []) as Item[]) map.set(`${it.tipo}:${it.ref_id}`, it);
    for (const it of (byText.data ?? []) as Item[]) map.set(`${it.tipo}:${it.ref_id}`, it);

    const items = sortByCreatedAtDesc(Array.from(map.values())).slice(0, limit);
    return NextResponse.json({ ok: true, q: qRaw, items });
  }

  const { data, error } = await baseQuery.or(orExpression);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "busca_recibo_erro", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, q: qRaw, items: (data ?? []) as Item[] });
}
