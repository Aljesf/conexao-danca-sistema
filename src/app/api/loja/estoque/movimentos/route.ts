import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const produto_id = Number(url.searchParams.get("produto_id"));
    const varianteIdRaw = url.searchParams.get("variante_id");
    const variante_id = varianteIdRaw ? Number(varianteIdRaw) : null;

    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return json({ ok: false, error: "produto_id inválido." }, 400);
    }
    if (varianteIdRaw && (!Number.isFinite(variante_id!) || variante_id! <= 0)) {
      return json({ ok: false, error: "variante_id inválido." }, 400);
    }

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const selectFull = `
      id,
      produto_id,
      variante_id,
      tipo,
      origem,
      quantidade,
      saldo_antes,
      saldo_depois,
      referencia_id,
      observacao,
      created_at,
      variante:loja_produto_variantes!loja_estoque_movimentos_variante_id_fkey (
        id, sku
      )
    `;

    let query = supabase
      .from("loja_estoque_movimentos")
      .select(selectFull)
      .eq("produto_id", produto_id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (variante_id) query = query.eq("variante_id", variante_id);

    let res = await query;

    if (res.error && String(res.error.code || "") === "PGRST204") {
      const selectMin = `
        id,
        produto_id,
        tipo,
        origem,
        quantidade,
        saldo_antes,
        saldo_depois,
        referencia_id,
        observacao,
        created_at
      `;
      let q2 = supabase
        .from("loja_estoque_movimentos")
        .select(selectMin)
        .eq("produto_id", produto_id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (variante_id) q2 = q2.eq("variante_id", variante_id);
      res = await q2;
    }

    if (res.error) {
      console.error("[/api/loja/estoque/movimentos] erro:", res.error);
      return json({ ok: false, error: res.error.message, details: res.error }, 500);
    }

    const movimentos = (res.data || []).map((m: any) => ({
      id: m.id,
      produto_id: m.produto_id,
      variante_id: m.variante_id ?? null,
      sku: m.variante?.sku ?? null,
      tipo: m.tipo,
      origem: m.origem,
      quantidade: m.quantidade,
      saldo_antes: m.saldo_antes ?? null,
      saldo_depois: m.saldo_depois ?? null,
      referencia_id: m.referencia_id ?? null,
      observacao: m.observacao ?? null,
      created_at: m.created_at,
    }));

    return json({ ok: true, movimentos }, 200);
  } catch (err: any) {
    console.error("[/api/loja/estoque/movimentos] crash:", err);
    return json({ ok: false, error: String(err?.message || err) }, 500);
  }
}
