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

async function garantirVariantePadrao(supabase: any, produto_id: number) {
  const { data, error } = await supabase
    .from("loja_produto_variantes")
    .select("id, sku, estoque_atual, preco_venda_centavos, ativo")
    .eq("produto_id", produto_id)
    .is("cor_id", null)
    .is("numeracao_id", null)
    .is("tamanho_id", null)
    .order("id", { ascending: true })
    .limit(1);

  if (error) throw error;
  if (data && data.length) return data[0];

  const sku = `PADRAO-${produto_id}`;
  const ins = await supabase
    .from("loja_produto_variantes")
    .insert({
      produto_id,
      sku,
      cor_id: null,
      numeracao_id: null,
      tamanho_id: null,
      estoque_atual: 0,
      preco_venda_centavos: null,
      ativo: true,
      observacoes: "Variante padrão criada automaticamente (venda).",
    })
    .select("id, sku, estoque_atual, preco_venda_centavos, ativo")
    .single();

  if (ins.error) throw ins.error;
  return ins.data;
}

function supabaseErrPayload(err: any) {
  return {
    message: err?.message || "Erro no Supabase",
    details: { code: err?.code ?? null, hint: err?.hint ?? null, details: err?.details ?? null },
  };
}

function isMissingColumnPgrst(err: any) {
  return String(err?.code || "") === "PGRST204";
}

function extractMissingColumnName(err: any): string | null {
  const msg = String(err?.message || "");
  const m = msg.match(/'([^']+)'\s+column\s+of\s+'loja_vendas'/i);
  return m?.[1] || null;
}

function extractMissingColumnNameGeneric(err: any): { table: string | null; column: string | null } {
  const msg = String(err?.message || "");
  const m = msg.match(/'([^']+)'\s+column\s+of\s+'([^']+)'/i);
  return { column: m?.[1] || null, table: m?.[2] || null };
}

function isCheckMotivo(err: any) {
  return String(err?.code || "") === "23514" && String(err?.message || "").includes("motivo_check");
}

async function getCentroCustoLojaId(supabase: any) {
  const envId = Number(process.env.CENTRO_CUSTO_LOJA_ID);
  if (Number.isFinite(envId) && envId > 0) return envId;

  const codigosPreferidos = ["LOJA", "AJ_LOJA", "AJDANCE_LOJA", "AJ_DANCE_STORE"];
  const byCodigo = await supabase
    .from("centros_custo")
    .select("id, codigo, nome")
    .in("codigo", codigosPreferidos)
    .order("id", { ascending: true })
    .limit(1);

  if (!byCodigo.error && byCodigo.data && byCodigo.data.length > 0) {
    return Number(byCodigo.data[0].id);
  }

  const byNome = await supabase
    .from("centros_custo")
    .select("id, codigo, nome")
    .ilike("nome", "%loja%")
    .order("id", { ascending: true })
    .limit(1);

  if (!byNome.error && byNome.data && byNome.data.length > 0) {
    return Number(byNome.data[0].id);
  }

  return null;
}

async function insertVendaComRetryCamposInexistentes(supabase: any, payload: any) {
  let tentativa = 0;
  const maxTentativas = 6;
  const working = { ...payload };

  while (tentativa < maxTentativas) {
    tentativa++;

    const res = await supabase
      .from("loja_vendas")
      .insert(working)
      .select("id")
      .single();

    if (!res.error) return res;

    if (isMissingColumnPgrst(res.error)) {
      const col = extractMissingColumnName(res.error);
      if (col && Object.prototype.hasOwnProperty.call(working, col)) {
        console.warn(
          `[/api/loja/vendas] coluna inexistente em loja_vendas: ${col}. Removendo do payload e retry...`,
        );
        delete working[col];
        continue;
      }
    }

    return res;
  }

  return {
    data: null,
    error: {
      code: "PGRST204_RETRY_EXCEEDED",
      message: "Falha ao inserir venda: muitas colunas inexistentes no schema.",
      details: working,
    },
  };
}

async function insertComRetryPgrst204(supabase: any, table: string, payload: any) {
  let tentativa = 0;
  const maxTentativas = 8;
  const working = { ...payload };

  while (tentativa < maxTentativas) {
    tentativa++;
    const res = await supabase.from(table).insert(working);
    if (!res.error) return res;

    if (String(res.error?.code || "") === "PGRST204") {
      const { column, table: t } = extractMissingColumnNameGeneric(res.error);
      if (t === table && column && Object.prototype.hasOwnProperty.call(working, column)) {
        console.warn(`[/api/loja/vendas] coluna inexistente em ${table}: ${column}. Removendo e retry...`);
        delete working[column];
        continue;
      }
    }
    return res;
  }

  return {
    data: null,
    error: {
      code: "PGRST204_RETRY_EXCEEDED",
      message: `Falha ao inserir em ${table}: muitas colunas inexistentes.`,
      details: working,
    },
  };
}

// GET de diagnóstico simples
export async function GET() {
  try {
    return json({ ok: true, route: "/api/loja/vendas", ts: new Date().toISOString() });
  } catch (err: any) {
    return json(
      { ok: false, error: "GET crash", details: { message: String(err?.message || err) } },
      500
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const body = await req.json().catch(() => ({}));

    const cliente_pessoa_id = Number(body?.cliente_pessoa_id);
    const itens = Array.isArray(body?.itens) ? body.itens : [];

    if (!Number.isFinite(cliente_pessoa_id) || cliente_pessoa_id <= 0) {
      return json({ ok: false, error: "cliente_pessoa_id inválido." }, 400);
    }
    if (!itens.length) {
      return json({ ok: false, error: "Venda sem itens." }, 400);
    }

    const warnings: any[] = [];

    const total_centavos = itens.reduce((sum: number, it: any) => {
      const qtd = Number(it?.quantidade ?? 0);
      const pu = Number(it?.preco_unitario_centavos ?? 0);
      return sum + (Number.isFinite(qtd) ? qtd : 0) * (Number.isFinite(pu) ? pu : 0);
    }, 0);

    const insertVenda: any = {
      cliente_pessoa_id,
      tipo_venda: body?.tipo_venda ?? "VENDA",
      forma_pagamento: body?.forma_pagamento ?? null,
      forma_pagamento_codigo: body?.forma_pagamento_codigo ?? null,
      status_pagamento: body?.status_pagamento ?? "PENDENTE",
      data_vencimento: body?.data_vencimento ?? null,
      observacoes: body?.observacoes ?? null,
      observacao_vendedor: body?.observacao_vendedor ?? null,
      // compat: alguns schemas usam total_centavos, outros usam valor_total_centavos (NOT NULL)
      total_centavos,
      valor_total_centavos: total_centavos,
    };
    // compat opcional: se existir coluna valor_total (numeric em reais)
    insertVenda.valor_total = total_centavos / 100;

    const formaPagamento = String(body?.forma_pagamento ?? "");
    if (formaPagamento === "CREDITO") {
      if (body?.cartao_maquina_id) insertVenda.cartao_maquina_id = Number(body.cartao_maquina_id);
      if (body?.cartao_bandeira_id) insertVenda.cartao_bandeira_id = Number(body.cartao_bandeira_id);
      if (body?.cartao_numero_parcelas) insertVenda.cartao_numero_parcelas = Number(body.cartao_numero_parcelas);
    }
    if (formaPagamento === "CARTAO_CONEXAO") {
      if (body?.conta_conexao_id) insertVenda.conta_conexao_id = Number(body.conta_conexao_id);
      if (body?.cartao_numero_parcelas) insertVenda.cartao_numero_parcelas = Number(body.cartao_numero_parcelas);
    }

    const vendaInsert = await insertVendaComRetryCamposInexistentes(supabase, insertVenda);

    if (vendaInsert.error) {
      const p = supabaseErrPayload
        ? supabaseErrPayload(vendaInsert.error)
        : { message: vendaInsert.error.message, details: vendaInsert.error };
      console.error("[/api/loja/vendas] falha ao inserir venda", p, { insertVenda });
      return json({ ok: false, error: p.message, details: p.details }, 500);
    }

    const venda_id = vendaInsert.data.id;

    for (const it of itens) {
      const produto_id = Number(it?.produto_id);
      const quantidade = Number(it?.quantidade);
      const preco_unitario_centavos = Number(it?.preco_unitario_centavos);
      const beneficiario_pessoa_id = it?.beneficiario_pessoa_id ? Number(it.beneficiario_pessoa_id) : null;

      if (!Number.isFinite(produto_id) || produto_id <= 0) {
        return json({ ok: false, error: "Item com produto_id inválido." }, 400);
      }
      if (!Number.isFinite(quantidade) || quantidade <= 0) {
        return json({ ok: false, error: "Item com quantidade inválida." }, 400);
      }
      if (!Number.isFinite(preco_unitario_centavos) || preco_unitario_centavos < 0) {
        return json({ ok: false, error: "Item com preço inválido." }, 400);
      }

      const total_item_centavos =
        Math.trunc(quantidade) * Math.trunc(preco_unitario_centavos);

      let variante_id = it?.variante_id ? Number(it.variante_id) : null;
      if (!variante_id || !Number.isFinite(variante_id) || variante_id <= 0) {
        const vpadrao = await garantirVariantePadrao(supabase, produto_id);
        variante_id = Number(vpadrao.id);
      }

      const vsel = await supabase
        .from("loja_produto_variantes")
        .select("id, produto_id, sku, estoque_atual")
        .eq("id", variante_id)
        .single();

      if (vsel.error) {
        const p = supabaseErrPayload(vsel.error);
        console.error("[/api/loja/vendas] falha ao carregar variante", p);
        return json({ ok: false, error: p.message, details: p.details }, 500);
      }
      if (Number(vsel.data.produto_id) !== produto_id) {
        return json({ ok: false, error: "Variante não pertence ao produto." }, 400);
      }

      const saldo_antes = Number(vsel.data.estoque_atual ?? 0);
      const saldo_depois = saldo_antes - quantidade;
      if (saldo_depois < 0) {
        return json(
          { ok: false, error: `Estoque insuficiente na variante ${vsel.data.sku || variante_id}.` },
          400
        );
      }

      const itemPayload: any = {
        venda_id,
        produto_id,
        variante_id,
        quantidade,
        preco_unitario_centavos,
        beneficiario_pessoa_id,
        observacoes: it?.observacoes ?? null,
        total_centavos: total_item_centavos,
        valor_total_centavos: total_item_centavos,
        valor_total: total_item_centavos / 100,
      };

      const itemIns = await insertComRetryPgrst204(supabase, "loja_venda_itens", itemPayload);

      if (itemIns.error) {
        const p = supabaseErrPayload(itemIns.error);
        console.error("[/api/loja/vendas] falha ao inserir item", p, { itemPayload });
        return json({ ok: false, error: p.message, details: p.details }, 500);
      }

      const upd = await supabase
        .from("loja_produto_variantes")
        .update({ estoque_atual: saldo_depois })
        .eq("id", variante_id);

      if (upd.error) {
        const p = supabaseErrPayload(upd.error);
        console.error("[/api/loja/vendas] falha ao baixar estoque da variante", p);
        return json({ ok: false, error: p.message, details: p.details }, 500);
      }

      const movPayload: any = {
        produto_id,
        variante_id,
        tipo: "SAIDA",
        origem: "VENDA",
        motivo: "VENDA",
        referencia_id: venda_id,
        quantidade,
        saldo_antes,
        saldo_depois,
        observacao: "Saida automatica por venda no caixa",
        created_by: null,
      };

      const mov = await insertComRetryPgrst204(supabase, "loja_estoque_movimentos", movPayload);

      if (mov.error) {
        const p = supabaseErrPayload(mov.error);

        if (isCheckMotivo(mov.error)) {
          console.error("[/api/loja/vendas] MOVIMENTO NAO GRAVADO (mantendo venda):", p, {
            movPayloadTentado: movPayload,
          });
          warnings.push({
            type: "MOV_ESTOQUE_PENDENTE",
            venda_id,
            produto_id,
            variante_id,
            motivo_check: true,
            error: p.message,
            details: p.details,
          });
        } else {
          console.error("[/api/loja/vendas] falha ao registrar movimento", p, { movPayload });
          return json({ ok: false, error: p.message, details: p.details }, 500);
        }
      }
    }

    try {
      const centroLojaId = await getCentroCustoLojaId(supabase);
      if (!centroLojaId) {
        warnings.push({
          type: "FIN_CENTRO_INDEFINIDO",
          message: "Centro de custo da Loja nao encontrado para registrar a receita da venda.",
        });
      } else if (total_centavos > 0) {
        const descricaoFin =
          "Venda Loja #" +
          venda_id +
          (body?.forma_pagamento ? ` - ${String(body.forma_pagamento)}` : "");

        const { error: movFinError } = await supabase.from("movimento_financeiro").insert({
          tipo: "RECEITA",
          centro_custo_id: centroLojaId,
          valor_centavos: total_centavos,
          data_movimento: new Date().toISOString(),
          origem: "VENDA_LOJA",
          origem_id: venda_id,
          descricao: descricaoFin,
        });

        if (movFinError) {
          console.error("[/api/loja/vendas] falha ao registrar movimento financeiro da venda:", movFinError);
          warnings.push({
            type: "FIN_MOVIMENTO_FALHOU",
            message: movFinError.message ?? "Falha ao registrar movimento financeiro da venda",
            details: movFinError,
          });
        }
      }
    } catch (err: any) {
      console.error("[/api/loja/vendas] erro inesperado ao registrar movimento financeiro:", err);
      warnings.push({ type: "FIN_MOVIMENTO_EXCEPTION", message: String(err?.message || err) });
    }

    return json({ ok: true, data: { venda: { id: venda_id }, warnings } }, 200);
  } catch (err: any) {
    console.error("[/api/loja/vendas] POST crash", err);
    return json(
      {
        ok: false,
        error: "POST crash em /api/loja/vendas",
        details: {
          message: String(err?.message || err),
          stack: err?.stack ? String(err.stack).slice(0, 1500) : null,
        },
      },
      500
    );
  }
}
