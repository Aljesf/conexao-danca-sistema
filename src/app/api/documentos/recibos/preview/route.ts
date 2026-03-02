import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function s(v: string | null): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

function money(cent: number): string {
  return (cent / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildPreviewHtml({
  pagadorNome,
  alunoNome,
  competencia,
  referenciaTexto,
  valorFormatado,
  pagamentoConfirmado,
}: {
  pagadorNome: string;
  alunoNome: string | null;
  competencia: string | null;
  referenciaTexto: string;
  valorFormatado: string;
  pagamentoConfirmado: boolean;
}): string {
  const html = `
<div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color:#1f2937;">
  <div style="text-align:center; margin-bottom:15px;">
    <h2 style="margin:0;">RECIBO DE PAGAMENTO</h2>
    <div style="font-size:11px; color:#6b7280;">
      Conexão Dança – Sistema de Gestão
    </div>
  </div>

  <div style="margin-bottom:10px;">
    <b>Responsável financeiro:</b> ${pagadorNome}
  </div>

  ${alunoNome ? `<div><b>Aluno/Beneficiário:</b> ${alunoNome}</div>` : ""}

  ${competencia ? `<div><b>Competência:</b> ${competencia}</div>` : ""}

  <div><b>Referência:</b> ${referenciaTexto}</div>

  <div style="margin:15px 0; padding:10px; background:#f3f4f6; border-radius:6px;">
    <div style="font-size:11px; color:#6b7280;">Valor</div>
    <div style="font-size:18px; font-weight:bold;">
      ${valorFormatado}
    </div>
    <div style="margin-top:5px;">
      <b>Status do pagamento:</b> ${pagamentoConfirmado ? "CONFIRMADO" : "NÃO CONFIRMADO"}
    </div>
  </div>

  ${
    pagamentoConfirmado
      ? `<div>Declaramos para os devidos fins que o valor acima foi devidamente recebido.</div>`
      : `<div style="color:#b45309;">
           Este documento é apenas uma pré-visualização.
           O pagamento ainda não foi confirmado no sistema.
           Não possui validade como comprovante de quitação.
         </div>`
  }

  <div style="margin-top:20px;">
    Salinópolis/PA, ${new Date().toLocaleDateString("pt-BR")}.
  </div>

  <div style="margin-top:30px;">
    ____________________________________________<br/>
    Conexão Dança
  </div>
</div>
`.trim();

  return html;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { searchParams } = new URL(req.url);
  const tipo = s(searchParams.get("tipo"));
  const competencia = s(searchParams.get("competencia"));
  const responsavelId = s(searchParams.get("responsavel_pessoa_id"));
  const cobrancaAvulsaId = s(searchParams.get("cobranca_avulsa_id"));

  if (!tipo) {
    return NextResponse.json({ ok: false, error: "tipo_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (tipo === "COBRANCA_AVULSA") {
    const id = Number(cobrancaAvulsaId);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "cobranca_avulsa_id_invalido" }, { status: 400 });
    }

    const { data: c, error: cErr } = await supabase
      .from("vw_financeiro_cobranca_avulsa_detalhe")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (cErr) {
      return NextResponse.json({ ok: false, error: "db_erro", detail: cErr.message }, { status: 500 });
    }
    if (!c) {
      return NextResponse.json({ ok: false, error: "nao_encontrado" }, { status: 404 });
    }

    const status = String((c as { status?: unknown }).status ?? "").toUpperCase();
    const pagamentoConfirmado = status === "PAGO";
    const motivoBloqueio = pagamentoConfirmado
      ? null
      : "Pagamento ainda nao confirmado (cobranca nao esta PAGA).";

    const pagadorNome =
      (c as { pagador_nome?: unknown }).pagador_nome ??
      `Pessoa #${Number((c as { pagador_pessoa_id?: unknown }).pagador_pessoa_id ?? 0)}`;
    const alunoNome = (c as { aluno_nome?: unknown }).aluno_nome ? String((c as { aluno_nome?: unknown }).aluno_nome) : null;

    const origemTipo = String((c as { origem_tipo?: unknown }).origem_tipo ?? "-");
    const origemId = (c as { origem_id?: unknown }).origem_id ?? "-";
    const html = buildPreviewHtml({
      pagadorNome: String(pagadorNome),
      alunoNome,
      competencia: null,
      referenciaTexto: `${origemTipo} (#${String(origemId)})`,
      valorFormatado: money(Number((c as { valor_centavos?: unknown }).valor_centavos ?? 0)),
      pagamentoConfirmado,
    });

    return NextResponse.json({
      ok: true,
      tipo,
      pagamento_confirmado: pagamentoConfirmado,
      motivo_bloqueio: motivoBloqueio,
      html_preview: html,
      meta: { cobranca_avulsa_id: id },
    });
  }

  if (tipo === "CONTA_INTERNA") {
    const rid = Number(responsavelId);
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
    }
    if (!Number.isFinite(rid) || rid <= 0) {
      return NextResponse.json({ ok: false, error: "responsavel_pessoa_id_invalido" }, { status: 400 });
    }

    let pagamentoConfirmado = false;
    const { data: pgTry, error: pgErr } = await supabase
      .from("conta_interna_pagamentos")
      .select("id,confirmado")
      .eq("responsavel_pessoa_id", rid)
      .eq("competencia", competencia)
      .limit(1);

    // Fallback seguro: se a tabela/view nao existir (ou falhar), mantem nao confirmado.
    if (!pgErr && Array.isArray(pgTry) && (pgTry[0] as { confirmado?: unknown } | undefined)?.confirmado === true) {
      pagamentoConfirmado = true;
    }

    const { data: p, error: pErr } = await supabase
      .from("pessoas")
      .select("id,nome,cpf")
      .eq("id", rid)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ ok: false, error: "db_erro", detail: pErr.message }, { status: 500 });
    }

    const respNome = (p as { nome?: unknown } | null)?.nome ?? `Pessoa #${rid}`;
    const respCpf = (p as { cpf?: unknown } | null)?.cpf ?? "";
    const motivoBloqueio = pagamentoConfirmado ? null : "Pagamento ainda nao confirmado para esta competencia.";
    const { data: fatByComp, error: fatErr } = await supabase
      .from("vw_credito_conexao_fatura_itens")
      .select("valor_total_centavos")
      .eq("pessoa_titular_id", rid)
      .eq("competencia_ano_mes", competencia)
      .limit(1);

    const valorContaCentavos =
      !fatErr && Array.isArray(fatByComp) && fatByComp[0]
        ? Number((fatByComp[0] as { valor_total_centavos?: unknown }).valor_total_centavos ?? 0)
        : 0;

    const pagadorNome = `${String(respNome)}${respCpf ? ` (CPF: ${String(respCpf)})` : ""}`;
    const html = buildPreviewHtml({
      pagadorNome,
      alunoNome: null,
      competencia,
      referenciaTexto: `Conta interna (competência ${competencia})`,
      valorFormatado: money(valorContaCentavos),
      pagamentoConfirmado,
    });

    return NextResponse.json({
      ok: true,
      tipo,
      pagamento_confirmado: pagamentoConfirmado,
      motivo_bloqueio: motivoBloqueio,
      html_preview: html,
      meta: {
        responsavel_pessoa_id: rid,
        competencia,
        fallback_pagamento: Boolean(pgErr),
      },
    });
  }

  return NextResponse.json({ ok: false, error: "tipo_nao_suportado" }, { status: 400 });
}
