import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Body = {
  competencia_base: string;
  meses: number;
  importar_cartao?: boolean;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  valor_total_centavos: number;
  status: string;
  folha_pagamento_id: number | null;
};

async function importarCartaoNaFolha(
  folhaId: number,
  competencia: string,
): Promise<{ imported: number; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { data: faturas, error: fatErr } = await supabase
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,periodo_referencia,valor_total_centavos,status,folha_pagamento_id")
    .eq("periodo_referencia", competencia)
    .eq("status", "ABERTA")
    .is("folha_pagamento_id", null);

  if (fatErr) return { imported: 0, error: fatErr.message };
  if (!faturas || faturas.length === 0) return { imported: 0 };

  const contaIds = Array.from(
    new Set(
      (faturas as FaturaRow[])
        .map((x) => Number(x.conta_conexao_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
  if (contaIds.length === 0) return { imported: 0 };

  const { data: contas, error: contaErr } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,tipo_conta")
    .in("id", contaIds);
  if (contaErr) return { imported: 0, error: contaErr.message };

  const pessoaTitularPorConta = new Map<number, { pessoa_titular_id: number; tipo_conta: string }>();
  for (const c of contas ?? []) {
    pessoaTitularPorConta.set(Number(c.id), {
      pessoa_titular_id: Number(c.pessoa_titular_id),
      tipo_conta: String(c.tipo_conta ?? ""),
    });
  }

  const pessoaIds = Array.from(
    new Set((contas ?? []).map((c) => Number(c.pessoa_titular_id)).filter((id) => Number.isFinite(id) && id > 0)),
  );
  if (pessoaIds.length === 0) return { imported: 0 };

  const { data: colaboradores, error: colErr } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id")
    .in("pessoa_id", pessoaIds);
  if (colErr) return { imported: 0, error: colErr.message };

  const colaboradorPorPessoa = new Map<number, number>();
  for (const c of colaboradores ?? []) {
    colaboradorPorPessoa.set(Number(c.pessoa_id), Number(c.id));
  }

  const itensToInsert: Array<{
    folha_id: number;
    colaborador_id: number;
    tipo_item: string;
    descricao: string;
    valor_centavos: number;
    referencia_tipo: string;
    referencia_id: number;
    criado_automatico: boolean;
  }> = [];
  const faturaIdsParaVincular: number[] = [];

  for (const fat of faturas as FaturaRow[]) {
    const meta = pessoaTitularPorConta.get(Number(fat.conta_conexao_id));
    if (!meta || meta.tipo_conta !== "COLABORADOR") continue;

    const colabId = colaboradorPorPessoa.get(meta.pessoa_titular_id);
    if (!colabId) continue;

    const faturaId = Number(fat.id);
    const valor = Number(fat.valor_total_centavos);
    if (!Number.isFinite(faturaId) || !Number.isFinite(valor)) continue;

    itensToInsert.push({
      folha_id: folhaId,
      colaborador_id: colabId,
      tipo_item: "DESCONTO_CREDITO_CONEXAO",
      descricao: `Desconto Cartao Conexao (fatura #${faturaId})`,
      valor_centavos: valor,
      referencia_tipo: "CREDITO_CONEXAO_FATURA",
      referencia_id: faturaId,
      criado_automatico: true,
    });
    faturaIdsParaVincular.push(faturaId);
  }

  if (itensToInsert.length === 0) return { imported: 0 };

  const { error: delErr } = await supabase
    .from("folha_pagamento_itens")
    .delete()
    .eq("folha_id", folhaId)
    .eq("criado_automatico", true)
    .eq("referencia_tipo", "CREDITO_CONEXAO_FATURA")
    .in("referencia_id", faturaIdsParaVincular);
  if (delErr) return { imported: 0, error: delErr.message };

  const { error: insErr } = await supabase.from("folha_pagamento_itens").insert(itensToInsert);
  if (insErr) return { imported: 0, error: insErr.message };

  const { error: updErr } = await supabase
    .from("credito_conexao_faturas")
    .update({ folha_pagamento_id: folhaId })
    .in("id", faturaIdsParaVincular);
  if (updErr) return { imported: 0, error: updErr.message };

  return { imported: itensToInsert.length };
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.competencia_base || !/^\d{4}-\d{2}$/.test(body.competencia_base)) {
    return NextResponse.json({ error: "competencia_base_invalida" }, { status: 400 });
  }

  const meses = Math.max(1, Math.min(24, Math.trunc(Number(body.meses ?? 12))));
  const importar = Boolean(body.importar_cartao ?? true);

  const supabase = getSupabaseAdmin();

  const { error: rpcErr } = await supabase.rpc("folha_gerar_espelho_proximos_meses", {
    p_competencia_base: body.competencia_base,
    p_meses: meses,
  });
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  const { data: folhas, error: listErr } = await supabase
    .from("folha_pagamento")
    .select("id,competencia,status,data_pagamento_prevista")
    .gte("competencia", body.competencia_base)
    .order("competencia", { ascending: true })
    .limit(meses);
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  let totalImportado = 0;
  if (importar) {
    for (const folha of folhas ?? []) {
      const folhaId = Number(folha.id);
      if (!Number.isFinite(folhaId) || folhaId <= 0) continue;

      const comp = String(folha.competencia ?? "");
      const res = await importarCartaoNaFolha(folhaId, comp);
      if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });
      totalImportado += res.imported;
    }
  }

  return NextResponse.json(
    { ok: true, meses, folhas: folhas ?? [], imported_cartao_total: totalImportado },
    { status: 200 },
  );
}
