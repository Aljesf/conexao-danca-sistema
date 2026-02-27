import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type FaturaRow = {
  id: number;
  conta_conexao_id: number | null;
} & Record<string, unknown>;

type PivotRow = {
  lancamento_id: number;
  created_at: string | null;
};

type LancamentoRow = {
  id: number;
  conta_conexao_id: number | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia: string | null;
  referencia_item: string | null;
  status: string | null;
  composicao_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  aluno_pessoa_id?: number | null;
  aluno_nome?: string | null;
  responsavel_financeiro_nome?: string | null;
  cobranca_fatura_id?: number | null;
};

type ContaRow = {
  id: number;
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  descricao_exibicao: string | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
};

type LancamentoEnriquecidoRow = {
  lancamento_id: number;
  aluno_pessoa_id: number | null;
  aluno_nome: string | null;
  responsavel_financeiro_nome: string | null;
  cobranca_fatura_id: number | null;
};

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_ as any);
  if (denied) return denied as any;
  const supabase = getSupabaseAdmin();
  const { id: rawId } = await ctx.params;
  const faturaId = Number(rawId);

  if (!Number.isFinite(faturaId)) {
    return NextResponse.json({ ok: false, error: "fatura_id_invalido" }, { status: 400 });
  }

  const { data: fatura, error: fatErr } = await supabase
    .from("credito_conexao_faturas")
    .select("*")
    .eq("id", faturaId)
    .maybeSingle();

  if (fatErr || !fatura) {
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  const { data: pivots, error: pivErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id, created_at")
    .eq("fatura_id", faturaId);

  if (pivErr) {
    return NextResponse.json({ ok: false, error: "falha_buscar_pivot", detail: pivErr.message }, { status: 500 });
  }

  const lancamentoIds = (pivots ?? [])
    .map((p) => Number((p as PivotRow).lancamento_id))
    .filter((n) => Number.isFinite(n));

  let lancamentos: LancamentoRow[] = [];
  if (lancamentoIds.length > 0) {
    const { data: l, error: lErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,competencia,referencia_item,status,composicao_json,created_at,updated_at",
      )
      .in("id", lancamentoIds)
      .order("id", { ascending: true });

    if (lErr) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_lancamentos", detail: lErr.message },
        { status: 500 },
      );
    }
    lancamentos = (l ?? []) as LancamentoRow[];
  }

  if (lancamentos.length > 0) {
    const { data: enriquecidos, error: enrErr } = await supabase
      .from("vw_credito_conexao_fatura_itens_enriquecida")
      .select(
        "lancamento_id,aluno_pessoa_id,aluno_nome,responsavel_financeiro_nome,cobranca_fatura_id",
      )
      .eq("fatura_id", faturaId);

    if (!enrErr && enriquecidos) {
      const map = new Map<number, LancamentoEnriquecidoRow>();
      for (const row of enriquecidos as LancamentoEnriquecidoRow[]) {
        map.set(Number(row.lancamento_id), row);
      }
      lancamentos = lancamentos.map((row) => {
        const extra = map.get(Number(row.id));
        if (!extra) return row;
        return {
          ...row,
          aluno_pessoa_id: extra.aluno_pessoa_id,
          aluno_nome: extra.aluno_nome,
          responsavel_financeiro_nome: extra.responsavel_financeiro_nome,
          cobranca_fatura_id: extra.cobranca_fatura_id,
        };
      });
    }
  }

  const faturaRow = fatura as FaturaRow;
  const contaConexaoId = Number(faturaRow.conta_conexao_id);

  let conta: ContaRow | null = null;
  let pessoa: PessoaRow | null = null;

  if (Number.isFinite(contaConexaoId)) {
    const { data: contaRaw } = await supabase
      .from("credito_conexao_contas")
      .select("id,tipo_conta,pessoa_titular_id,descricao_exibicao")
      .eq("id", contaConexaoId)
      .maybeSingle();

    conta = (contaRaw ?? null) as ContaRow | null;

    const pessoaId = Number(conta?.pessoa_titular_id);
    if (Number.isFinite(pessoaId)) {
      const { data: pessoaRaw } = await supabase
        .from("pessoas")
        .select("id,nome,cpf,email")
        .eq("id", pessoaId)
        .maybeSingle();
      pessoa = (pessoaRaw ?? null) as PessoaRow | null;
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      fatura: faturaRow,
      conta,
      pessoa,
      pivot: (pivots ?? []) as PivotRow[],
      lancamentos,
    },
  });
}
