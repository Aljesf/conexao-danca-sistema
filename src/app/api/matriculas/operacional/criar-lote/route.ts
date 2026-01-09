import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env");
  return createClient(url, key, { auth: { persistSession: false } });
}

type LoteItem = {
  servico_id?: number;
  turma_id?: number;
  itens?: { item_id: number; quantidade: number }[];
};

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = sbAdmin();
    const body = (await req.json()) as {
      aluno_pessoa_id: number;
      responsavel_financeiro_pessoa_id?: number;
      ano_referencia?: number;
      data_matricula?: string;
      metodo_liquidacao?: "CARTAO_CONEXAO" | "OUTRO";
      matriculas: LoteItem[];
    };

    if (!body?.aluno_pessoa_id || !Array.isArray(body.matriculas) || body.matriculas.length === 0) {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
    }

    const results: Array<{ ok: boolean; index: number; matricula_id?: number; error?: string }> = [];

    for (let i = 0; i < body.matriculas.length; i += 1) {
      const m = body.matriculas[i];

      if (!m.servico_id && !m.turma_id) {
        results.push({ ok: false, index: i, error: "faltou_servico_ou_turma" });
        continue;
      }

      if (!m.servico_id) {
        results.push({ ok: false, index: i, error: "servico_id_obrigatorio_nesta_versao" });
        continue;
      }

      const { data: mat, error: matErr } = await supabase
        .from("matriculas")
        .insert({
          pessoa_id: body.aluno_pessoa_id,
          responsavel_financeiro_id: body.responsavel_financeiro_pessoa_id ?? body.aluno_pessoa_id,
          servico_id: m.servico_id,
          ano_referencia: body.ano_referencia ?? null,
          data_matricula: body.data_matricula ?? undefined,
          status: "ATIVA",
        })
        .select("id")
        .single();

      if (matErr || !mat) {
        results.push({ ok: false, index: i, error: matErr?.message ?? "erro_criar_matricula" });
        continue;
      }

      if (Array.isArray(m.itens) && m.itens.length > 0) {
        await supabase.from("matriculas_itens").insert(
          m.itens.map((it) => ({
            matricula_id: (mat as { id: number }).id,
            item_id: it.item_id,
            quantidade: it.quantidade,
            valor_centavos: 0,
            moeda: "BRL",
          })),
        );
      }

      results.push({ ok: true, index: i, matricula_id: (mat as { id: number }).id });
    }

    return NextResponse.json({ ok: true, results }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
