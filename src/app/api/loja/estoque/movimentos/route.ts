import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const url = new URL(req.url);
    const produto_id = Number(url.searchParams.get("produto_id"));
    const varianteIdRaw = url.searchParams.get("variante_id");
    const variante_id = varianteIdRaw ? Number(varianteIdRaw) : null;
    const limitParam = Number(url.searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 200;

    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return json({ ok: false, error: "produto_id invalido." }, 400);
    }
    if (varianteIdRaw && (!Number.isFinite(variante_id!) || variante_id! <= 0)) {
      return json({ ok: false, error: "variante_id invalido." }, 400);
    }

    const auth = await requireUser(req);
    if (auth instanceof NextResponse) return auth;

    const { supabase } = auth;

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
      variante:loja_produto_variantes!fk_loja_movimentos_variante ( id, sku )
    `;

    const buildQuery = (select: string) => {
      let q = supabase
        .from("loja_estoque_movimentos")
        .select(select)
        .eq("produto_id", produto_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (variante_id) q = q.eq("variante_id", variante_id);
      return q;
    };

    let movimentosRows: any[] = [];
    let skuMap: Map<number, string> | null = null;

    const res = await buildQuery(selectFull);

    if (res.error) {
      console.warn(
        "[/api/loja/estoque/movimentos] aviso: join com variante falhou, usando fallback:",
        res.error
      );

      const selectMin = `
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
        created_at
      `;

      const fallbackRes = await buildQuery(selectMin);

      if (fallbackRes.error) {
        console.error("[/api/loja/estoque/movimentos] erro:", fallbackRes.error);
        return json(
          { ok: false, error: fallbackRes.error.message, details: fallbackRes.error },
          500
        );
      }

      movimentosRows = fallbackRes.data || [];

      const varianteIds = Array.from(
        new Set(
          (movimentosRows || [])
            .map((m: any) => Number(m.variante_id))
            .filter((id) => Number.isFinite(id) && id > 0)
        )
      );

      if (varianteIds.length > 0) {
        const skuRes = await supabase
          .from("loja_produto_variantes")
          .select("id, sku")
          .in("id", varianteIds);

        if (!skuRes.error && Array.isArray(skuRes.data)) {
          skuMap = new Map(
            skuRes.data.map((v: any) => [Number(v.id), v.sku] as [number, string])
          );
        } else if (skuRes.error) {
          console.warn(
            "[/api/loja/estoque/movimentos] aviso: falha ao carregar skus fallback:",
            skuRes.error
          );
        }
      }
    } else {
      movimentosRows = res.data || [];
    }

    const movimentos = (movimentosRows || []).map((m: any) => ({
      id: m.id,
      produto_id: m.produto_id,
      variante_id: m.variante_id ?? null,
      sku: m.variante?.sku ?? skuMap?.get(Number(m.variante_id)) ?? null,
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





