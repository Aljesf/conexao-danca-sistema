import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const MOTIVOS_VALIDOS = new Set([
  "EXTRAVIO",
  "AVARIA",
  "USO_INTERNO",
  "INVENTARIO_POSITIVO",
  "INVENTARIO_NEGATIVO",
  "CORRECAO_CADASTRO",
  "DEVOLUCAO",
]);

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { ok: false, error: "supabase_config_ausente" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const produto_id = Number(body?.produto_id);
    const direcao = String(body?.direcao ?? "").toUpperCase(); // ENTRADA | SAIDA
    const quantidade = Number(body?.quantidade);
    const motivo = String(body?.motivo ?? "").toUpperCase();
    const observacao = String(body?.observacao ?? "");

    if (!Number.isFinite(produto_id) || produto_id <= 0) {
      return NextResponse.json({ ok: false, error: "produto_id_invalido" }, { status: 400 });
    }
    if (direcao !== "ENTRADA" && direcao !== "SAIDA") {
      return NextResponse.json({ ok: false, error: "direcao_invalida" }, { status: 400 });
    }
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      return NextResponse.json({ ok: false, error: "quantidade_invalida" }, { status: 400 });
    }
    if (!MOTIVOS_VALIDOS.has(motivo)) {
      return NextResponse.json({ ok: false, error: "motivo_invalido" }, { status: 400 });
    }
    if (!observacao || observacao.trim().length < 10) {
      return NextResponse.json({ ok: false, error: "observacao_obrigatoria" }, { status: 400 });
    }

    const { data: prod, error: errProd } = await supabaseAdmin
      .from("loja_produtos")
      .select("id, estoque_atual")
      .eq("id", produto_id)
      .maybeSingle();

    if (errProd) {
      console.error("[POST /api/loja/estoque/ajuste-manual] erro buscar produto:", errProd);
      return NextResponse.json({ ok: false, error: "erro_buscar_produto" }, { status: 500 });
    }
    if (!prod) {
      return NextResponse.json({ ok: false, error: "produto_nao_encontrado" }, { status: 404 });
    }

    const saldoAntes = Number(prod.estoque_atual ?? 0) || 0;
    const delta = direcao === "ENTRADA" ? quantidade : -quantidade;
    const saldoDepois = saldoAntes + delta;

    if (saldoDepois < 0) {
      return NextResponse.json(
        { ok: false, error: "estoque_insuficiente_para_saida", saldoAntes },
        { status: 400 }
      );
    }

    const { error: errUpd } = await supabaseAdmin
      .from("loja_produtos")
      .update({ estoque_atual: saldoDepois, updated_at: new Date().toISOString() })
      .eq("id", produto_id);

    if (errUpd) {
      console.error("[POST /api/loja/estoque/ajuste-manual] erro atualizar estoque_atual:", errUpd);
      return NextResponse.json({ ok: false, error: "erro_atualizar_saldo" }, { status: 500 });
    }

    const movimento = {
      produto_id,
      tipo: direcao === "ENTRADA" ? "ENTRADA" : "SAIDA",
      origem: "AJUSTE_MANUAL",
      referencia_id: null,
      quantidade,
      motivo,
      observacao: observacao.trim(),
      saldo_antes: saldoAntes,
      saldo_depois: saldoDepois,
      custo_unitario_centavos: null,
      created_by: null, // TODO: preencher com usuario autenticado quando disponivel
      created_at: new Date().toISOString(),
    };

    const { error: errMov } = await supabaseAdmin.from("loja_estoque_movimentos").insert(movimento);

    if (errMov) {
      console.error("[POST /api/loja/estoque/ajuste-manual] erro inserir movimento:", errMov);
      return NextResponse.json({
        ok: true,
        warning: "movimento_estoque_falhou",
        saldoAntes,
        saldoDepois,
      });
    }

    return NextResponse.json({
      ok: true,
      saldoAntes,
      saldoDepois,
    });
  } catch (err) {
    console.error("[POST /api/loja/estoque/ajuste-manual] exception:", err);
    return NextResponse.json({ ok: false, error: "erro_interno" }, { status: 500 });
  }
}
