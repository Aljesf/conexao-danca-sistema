import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContaConexaoRow = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: string;
  descricao_exibicao: string | null;
  dia_fechamento: number;
  dia_vencimento: number | null;
  ativo: boolean;
  pessoas?: { id: number; nome: string; cpf: string | null } | null;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_fechamento: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
};

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

function parsePeriodo(periodo: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!m) throw new Error("periodo_invalido");
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error("periodo_invalido");
  return { year, month };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function clampDay(year: number, month: number, day: number): number {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1) return 1;
  if (day > last) return last;
  return day;
}

function buildComposicaoResumo(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const itens = Array.isArray(record.itens) ? record.itens : [];
  if (!itens.length) return null;

  const parts: string[] = [];
  for (let i = 0; i < itens.length; i++) {
    if (parts.length >= 3) break;
    const item = itens[i] as Record<string, unknown>;
    const label = typeof item.label === "string" && item.label.trim() ? item.label.trim() : `Item ${i + 1}`;
    const posicao = typeof item.posicao === "number" && Number.isFinite(item.posicao) ? item.posicao : i + 1;
    const valorBrl =
      typeof item.valor_brl === "string" && item.valor_brl.trim() ? item.valor_brl.trim() : null;
    parts.push(`${label} (${posicao}a)${valorBrl ? ` ${valorBrl}` : ""}`);
  }

  let resumo = parts.join(" + ");
  if (itens.length > parts.length) resumo += " + ...";
  const totalBrl =
    typeof record.total_brl === "string" && record.total_brl.trim() ? record.total_brl.trim() : null;
  if (totalBrl) resumo = `Total ${totalBrl} | ${resumo}`;
  return resumo;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const periodo = sp.get("periodo") ?? "";
    const q = (sp.get("q") ?? "").trim();
    const contaIdParam = (sp.get("conta_id") ?? "").trim();

    const { year, month } = parsePeriodo(periodo);
    const contaId = contaIdParam ? Number(contaIdParam) : null;

    const supabase = getAdminSupabase();

    let contasQuery = supabase
      .from("credito_conexao_contas")
      .select(
        `
        id,
        pessoa_titular_id,
        tipo_conta,
        descricao_exibicao,
        dia_fechamento,
        dia_vencimento,
        ativo,
        pessoas:pessoa_titular_id ( id, nome, cpf )
      `
      )
      .eq("ativo", true);

    if (contaId && Number.isFinite(contaId)) {
      contasQuery = contasQuery.eq("id", contaId);
    }

    if (q) {
      contasQuery = contasQuery.or(`pessoas.nome.ilike.%${q}%,pessoas.cpf.ilike.%${q}%`);
    }

    const { data: contasRaw, error: contasErr } = await contasQuery;
    if (contasErr) throw contasErr;

    const contas = (contasRaw ?? []) as ContaConexaoRow[];

    const inserts = contas.map((c) => {
      const fechamentoDia = clampDay(year, month, c.dia_fechamento ?? 10);
      const vencDia = c.dia_vencimento ? clampDay(year, month, c.dia_vencimento) : null;

      return {
        conta_conexao_id: c.id,
        periodo_referencia: periodo,
        data_fechamento: toISODate(year, month, fechamentoDia),
        data_vencimento: vencDia ? toISODate(year, month, vencDia) : null,
        valor_total_centavos: 0,
        valor_taxas_centavos: 0,
        status: "ABERTA",
      };
    });

    if (inserts.length > 0) {
      const { error: upsertErr } = await supabase
        .from("credito_conexao_faturas")
        .upsert(inserts, { onConflict: "conta_conexao_id,periodo_referencia", ignoreDuplicates: true });

      if (upsertErr) throw upsertErr;
    }

    let faturasQuery = supabase
      .from("credito_conexao_faturas")
      .select(
        `
        id,
        conta_conexao_id,
        periodo_referencia,
        data_fechamento,
        data_vencimento,
        valor_total_centavos,
        valor_taxas_centavos,
        status
      `
      )
      .eq("periodo_referencia", periodo);

    if (contaId && Number.isFinite(contaId)) {
      faturasQuery = faturasQuery.eq("conta_conexao_id", contaId);
    } else if (contas.length > 0) {
      const ids = contas.map((c) => c.id);
      faturasQuery = faturasQuery.in("conta_conexao_id", ids);
    }

    const { data: faturasRaw, error: faturasErr } = await faturasQuery.order("id", { ascending: false });
    if (faturasErr) throw faturasErr;

    const faturas = (faturasRaw ?? []) as FaturaRow[];

    const contaMap = new Map<number, ContaConexaoRow>();
    for (const c of contas) contaMap.set(c.id, c);

    const composicaoByFatura = new Map<number, string>();
    const faturaIds = faturas.map((f) => Number(f.id)).filter((id) => Number.isFinite(id));
    if (faturaIds.length > 0) {
      const { data: lancamentosRaw, error: lancErr } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select(
          `
          fatura_id,
          lancamento:credito_conexao_lancamentos (
            id,
            composicao_json,
            descricao
          )
        `,
        )
        .in("fatura_id", faturaIds);

      if (lancErr) {
        console.error("Erro ao carregar composicao das faturas", lancErr);
      } else {
        (lancamentosRaw ?? []).forEach((row) => {
          const record = row as Record<string, unknown>;
          const faturaId = Number(record.fatura_id);
          if (!Number.isFinite(faturaId) || composicaoByFatura.has(faturaId)) return;
          const lanc = (record.lancamento ?? null) as Record<string, unknown> | null;
          const resumo =
            buildComposicaoResumo(lanc?.composicao_json ?? null) ??
            (typeof lanc?.descricao === "string" && lanc.descricao.trim() ? lanc.descricao.trim() : null);
          if (resumo) composicaoByFatura.set(faturaId, resumo);
        });
      }
    }

    const rows = faturas.map((f) => {
      const conta = contaMap.get(f.conta_conexao_id) ?? null;
      const pessoaNome = conta?.pessoas?.nome ?? "—";
      const pessoaCpf = conta?.pessoas?.cpf ?? null;

      const total = f.valor_total_centavos ?? 0;
      const taxas = f.valor_taxas_centavos ?? 0;
      const compras = total - taxas;

      const tituloConta =
        conta?.descricao_exibicao?.trim()
          ? conta.descricao_exibicao.trim()
          : `Cartão Conexão ${conta?.tipo_conta ?? ""}`.trim() || "Cartão Conexão";

      return {
        id: f.id,
        conta_conexao_id: f.conta_conexao_id,
        titulo_conta: tituloConta,
        pessoa_nome: pessoaNome,
        pessoa_cpf: pessoaCpf,
        tipo_conta: conta?.tipo_conta ?? null,
        periodo_referencia: f.periodo_referencia,
        data_fechamento: f.data_fechamento,
        data_vencimento: f.data_vencimento,
        compras_centavos: compras,
        taxas_centavos: taxas,
        total_centavos: total,
        status: f.status,
        composicao_resumo: composicaoByFatura.get(f.id) ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      periodo,
      contas: contas.map((c) => ({
        id: c.id,
        tipo_conta: c.tipo_conta,
        descricao_exibicao: c.descricao_exibicao,
        pessoa_nome: c.pessoas?.nome ?? "—",
        pessoa_cpf: c.pessoas?.cpf ?? null,
      })),
      rows,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
