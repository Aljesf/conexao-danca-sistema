import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { isTechAdmin } from "@/lib/auth/authorize";

export const runtime = "nodejs";

type CobrancaRow = {
  id: number;
  descricao: string | null;
  valor_centavos: number;
  vencimento: string;
  status: string;
  neofin_charge_id: string;
  link_pagamento: string | null;
  origem_id: number | null;
  pessoa_id: string | null;
};

type PessoaRow = { id: string; nome: string | null; cpf: string | null };
type FaturaRow = { id: number; periodo_referencia: string; valor_total_centavos: number; valor_taxas_centavos: number; status: string };
type FaturaLancRow = { fatura_id: number; lancamento_id: number };
type LancamentoRow = { id: number; descricao: string | null; origem_sistema: string | null; valor_centavos: number; data_lancamento: string | null };
type MatriculaRow = { pessoa_id: string | null; responsavel_financeiro_id: string | null };

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { supabase, userId } = auth;

  const admin = await isTechAdmin(userId);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Sem permissao." }, { status: 403 });
  }

  const url = request.nextUrl;
  const statusFilter = url.searchParams.get("status") || null;
  const dataInicio = url.searchParams.get("data_inicio") || null;
  const dataFim = url.searchParams.get("data_fim") || null;
  const busca = url.searchParams.get("busca") || null;

  // ── 1. Cobranças com neofin_charge_id e origem CREDITO_CONEXAO_FATURA ──
  let query = supabase
    .from("cobrancas")
    .select("id, descricao, valor_centavos, vencimento, status, neofin_charge_id, link_pagamento, origem_id, pessoa_id")
    .not("neofin_charge_id", "is", null)
    .eq("origem_tipo", "CREDITO_CONEXAO_FATURA")
    .order("vencimento", { ascending: false })
    .limit(300);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (dataInicio) query = query.gte("vencimento", dataInicio);
  if (dataFim) query = query.lte("vencimento", dataFim);

  const { data: rawCobrancas, error: queryErr } = await query;

  if (queryErr) {
    return NextResponse.json({ ok: false, error: queryErr.message }, { status: 500 });
  }

  const cobrancas = (rawCobrancas ?? []) as unknown as CobrancaRow[];
  if (cobrancas.length === 0) {
    return NextResponse.json({ ok: true, cobrancas: [] });
  }

  // ── 2. Responsáveis (pessoas) ──
  const pessoaIds = [...new Set(cobrancas.map((c) => c.pessoa_id).filter(Boolean))] as string[];
  const pessoasMap: Record<string, { nome: string; cpf: string }> = {};

  if (pessoaIds.length > 0) {
    const { data: rawPessoas } = await supabase
      .from("pessoas")
      .select("id, nome, cpf")
      .in("id", pessoaIds);

    const pessoas = (rawPessoas ?? []) as unknown as PessoaRow[];
    for (const p of pessoas) {
      pessoasMap[p.id] = { nome: p.nome ?? "Sem nome", cpf: p.cpf ?? "" };
    }
  }

  // ── Filtro por busca (nome do responsável) ──
  let filtered = cobrancas;
  if (busca) {
    const buscaLower = busca.toLowerCase();
    filtered = cobrancas.filter((c) => {
      const pessoa = c.pessoa_id ? pessoasMap[c.pessoa_id] : null;
      return pessoa?.nome?.toLowerCase().includes(buscaLower);
    });
  }

  // ── 3. Faturas ──
  const origemIds = [...new Set(filtered.map((c) => c.origem_id).filter(Boolean))] as number[];
  const faturasMap: Record<number, FaturaRow> = {};

  if (origemIds.length > 0) {
    const { data: rawFaturas } = await supabase
      .from("credito_conexao_faturas")
      .select("id, periodo_referencia, valor_total_centavos, valor_taxas_centavos, status")
      .in("id", origemIds);

    const faturas = (rawFaturas ?? []) as unknown as FaturaRow[];
    for (const f of faturas) faturasMap[f.id] = f;
  }

  // ── 4. Lançamentos por fatura ──
  const faturaIds = Object.keys(faturasMap).map(Number);
  const lancamentosMap: Record<number, LancamentoRow[]> = {};

  if (faturaIds.length > 0) {
    const { data: rawFaturaLancs } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id, lancamento_id")
      .in("fatura_id", faturaIds);

    const faturaLancs = (rawFaturaLancs ?? []) as unknown as FaturaLancRow[];

    if (faturaLancs.length > 0) {
      const lancIds = [...new Set(faturaLancs.map((fl) => fl.lancamento_id))];

      const { data: rawLancamentos } = await supabase
        .from("credito_conexao_lancamentos")
        .select("id, descricao, origem_sistema, valor_centavos, data_lancamento")
        .in("id", lancIds);

      const lancamentos = (rawLancamentos ?? []) as unknown as LancamentoRow[];
      const lancMap: Record<number, LancamentoRow> = {};
      for (const l of lancamentos) lancMap[l.id] = l;

      for (const fl of faturaLancs) {
        if (!lancamentosMap[fl.fatura_id]) lancamentosMap[fl.fatura_id] = [];
        const lanc = lancMap[fl.lancamento_id];
        if (lanc) lancamentosMap[fl.fatura_id].push(lanc);
      }
    }
  }

  // ── 5. Alunos vinculados (matrículas ativas do responsável) ──
  const alunosMap: Record<string, { id: string; nome: string }[]> = {};

  if (pessoaIds.length > 0) {
    const { data: rawMatriculas } = await supabase
      .from("matriculas")
      .select("pessoa_id, responsavel_financeiro_id")
      .in("responsavel_financeiro_id", pessoaIds)
      .eq("status", "ATIVA");

    const matriculas = (rawMatriculas ?? []) as unknown as MatriculaRow[];

    if (matriculas.length > 0) {
      const alunoPessoaIds = [...new Set(matriculas.map((m) => m.pessoa_id).filter(Boolean))] as string[];

      const alunoNomesMap: Record<string, string> = {};
      if (alunoPessoaIds.length > 0) {
        const { data: rawAlunoPessoas } = await supabase
          .from("pessoas")
          .select("id, nome")
          .in("id", alunoPessoaIds);

        const alunoPessoas = (rawAlunoPessoas ?? []) as unknown as PessoaRow[];
        for (const ap of alunoPessoas) alunoNomesMap[ap.id] = ap.nome ?? "Sem nome";
      }

      for (const m of matriculas) {
        const key = m.responsavel_financeiro_id as string;
        if (!alunosMap[key]) alunosMap[key] = [];
        alunosMap[key].push({
          id: m.pessoa_id as string,
          nome: alunoNomesMap[m.pessoa_id as string] ?? "Sem nome",
        });
      }
    }
  }

  // ── 6. Montar resposta ──
  const result = filtered.map((c) => {
    const fatura = c.origem_id ? faturasMap[c.origem_id] ?? null : null;
    return {
      id: c.id,
      descricao: c.descricao,
      valor_centavos: c.valor_centavos,
      vencimento: c.vencimento,
      status: c.status,
      neofin_charge_id: c.neofin_charge_id,
      link_pagamento: c.link_pagamento,
      origem_id: c.origem_id,
      responsavel: c.pessoa_id ? pessoasMap[c.pessoa_id] ?? { nome: "Sem nome", cpf: "" } : { nome: "Sem nome", cpf: "" },
      fatura: fatura
        ? {
            periodo_referencia: fatura.periodo_referencia,
            valor_total_centavos: fatura.valor_total_centavos,
            valor_taxas_centavos: fatura.valor_taxas_centavos,
            status: fatura.status,
          }
        : null,
      lancamentos: fatura ? lancamentosMap[fatura.id] ?? [] : [],
      alunos_vinculados: c.pessoa_id ? alunosMap[c.pessoa_id] ?? [] : [],
    };
  });

  return NextResponse.json({ ok: true, cobrancas: result });
}
