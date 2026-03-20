import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import type { Database } from "@/types/supabase.generated";

type ContaInternaRow = Pick<
  Database["public"]["Tables"]["credito_conexao_contas"]["Row"],
  "id" | "descricao_exibicao" | "pessoa_titular_id" | "responsavel_financeiro_pessoa_id" | "tipo_conta"
>;

type FaturaRow = Pick<
  Database["public"]["Tables"]["credito_conexao_faturas"]["Row"],
  | "id"
  | "conta_conexao_id"
  | "periodo_referencia"
  | "data_fechamento"
  | "data_vencimento"
  | "valor_total_centavos"
  | "status"
  | "cobranca_id"
  | "neofin_invoice_id"
>;

type PivotRow = Pick<
  Database["public"]["Tables"]["credito_conexao_fatura_lancamentos"]["Row"],
  "fatura_id" | "lancamento_id"
>;

type LancamentoRow = Pick<
  Database["public"]["Tables"]["credito_conexao_lancamentos"]["Row"],
  | "id"
  | "aluno_id"
  | "composicao_json"
  | "conta_conexao_id"
  | "descricao"
  | "matricula_id"
  | "referencia_item"
  | "valor_centavos"
>;

type MatriculaRow = Pick<Database["public"]["Tables"]["matriculas"]["Row"], "id" | "pessoa_id">;
type PessoaRow = Pick<Database["public"]["Tables"]["pessoas"]["Row"], "id" | "nome">;

type FaturaPayload = {
  faturaId: number;
  contaInternaId: number | null;
  contaInternaDescricao: string | null;
  competenciaAnoMes: string;
  status: string | null;
  totalCentavos: number;
  cobrancaFaturaId: number | null;
  neofinInvoiceId: string | null;
  houveGeracaoNeoFin: boolean;
  dataFechamento: string | null;
  dataVencimento: string | null;
  itens: Array<{
    lancamentoId: number;
    descricao: string | null;
    referenciaItem: string | null;
    valorCentavos: number;
    alunoIds: number[];
    alunoNomes: string[];
    matriculaIds: number[];
  }>;
};

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  return numberOrNull(value);
}

function chunkNumbers(values: number[], chunkSize = 400): number[][] {
  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  if (unique.length === 0) return [];

  const chunks: number[][] = [];
  for (let index = 0; index < unique.length; index += chunkSize) {
    chunks.push(unique.slice(index, index + chunkSize));
  }
  return chunks;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
}

function addPositiveInt(target: Set<number>, value: unknown) {
  const numero = numberOrNull(value);
  if (numero) target.add(numero);
}

function addPositiveIntArray(target: Set<number>, value: unknown) {
  if (!Array.isArray(value)) return;

  for (const item of value) {
    if (typeof item === "object" && item && !Array.isArray(item)) {
      const registro = item as Record<string, unknown>;
      addPositiveInt(target, registro.id);
      addPositiveInt(target, registro.aluno_id);
      addPositiveInt(target, registro.aluno_pessoa_id);
      addPositiveInt(target, registro.matricula_id);
      continue;
    }

    addPositiveInt(target, item);
  }
}

function descreverContaInterna(conta: ContaInternaRow | undefined): string | null {
  const tipoConta = textOrNull(conta?.tipo_conta)?.toUpperCase();
  if (tipoConta === "ALUNO") return "Conta interna do aluno";
  if (tipoConta === "COLABORADOR") return "Conta interna do colaborador";

  const descricao = textOrNull(conta?.descricao_exibicao);
  if (!descricao) return "Conta interna";
  return descricao.replace(/cart(?:a|\u00E3)o\s+conex(?:a|\u00E3)o/gi, "Conta interna");
}

function extrairAlunoIds(composicaoJson: unknown): number[] {
  const ids = new Set<number>();
  const composicao = asRecord(composicaoJson);
  if (!composicao) return [];

  addPositiveInt(ids, composicao.aluno_id);
  addPositiveInt(ids, composicao.aluno_pessoa_id);
  addPositiveIntArray(ids, composicao.aluno_ids);
  addPositiveIntArray(ids, composicao.alunos);

  for (const item of asRecordArray(composicao.itens)) {
    addPositiveInt(ids, item.aluno_id);
    addPositiveInt(ids, item.aluno_pessoa_id);
    addPositiveIntArray(ids, item.aluno_ids);
    addPositiveIntArray(ids, item.alunos);
  }

  return Array.from(ids);
}

function extrairMatriculaIds(composicaoJson: unknown): number[] {
  const ids = new Set<number>();
  const composicao = asRecord(composicaoJson);
  if (!composicao) return [];

  addPositiveInt(ids, composicao.matricula_id);
  addPositiveIntArray(ids, composicao.matricula_ids);
  addPositiveIntArray(ids, composicao.matriculas);

  for (const item of asRecordArray(composicao.itens)) {
    addPositiveInt(ids, item.matricula_id);
    addPositiveIntArray(ids, item.matricula_ids);
    addPositiveIntArray(ids, item.matriculas);
  }

  return Array.from(ids);
}

async function carregarContasMap(
  titularPessoaId: number | null,
  contaConexaoId: number | null,
): Promise<Map<number, ContaInternaRow>> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("credito_conexao_contas")
    .select("id,descricao_exibicao,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta")
    .eq("ativo", true);

  if (contaConexaoId) {
    query = query.eq("id", contaConexaoId);
  }

  if (titularPessoaId) {
    query = query.or(
      `pessoa_titular_id.eq.${titularPessoaId},responsavel_financeiro_pessoa_id.eq.${titularPessoaId}`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`erro_listar_contas_credito_conexao:${error.message}`);
  }

  return new Map(((data ?? []) as ContaInternaRow[]).map((row) => [row.id, row]));
}

async function carregarMatriculasMap(matriculaIds: number[]): Promise<Map<number, MatriculaRow>> {
  const supabase = getSupabaseAdmin();
  const rows: MatriculaRow[] = [];

  for (const chunk of chunkNumbers(matriculaIds)) {
    const { data, error } = await supabase.from("matriculas").select("id,pessoa_id").in("id", chunk);
    if (error) {
      throw new Error(`erro_listar_matriculas_credito_conexao:${error.message}`);
    }

    rows.push(...((data ?? []) as MatriculaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function carregarPessoasMap(pessoaIds: number[]): Promise<Map<number, PessoaRow>> {
  const supabase = getSupabaseAdmin();
  const rows: PessoaRow[] = [];

  for (const chunk of chunkNumbers(pessoaIds)) {
    const { data, error } = await supabase.from("pessoas").select("id,nome").in("id", chunk);
    if (error) {
      throw new Error(`erro_listar_pessoas_credito_conexao:${error.message}`);
    }

    rows.push(...((data ?? []) as PessoaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

function nomesDosAlunos(alunoIds: number[], pessoasMap: Map<number, PessoaRow>): string[] {
  return alunoIds.map((alunoId) => textOrNull(pessoasMap.get(alunoId)?.nome) ?? `Aluno #${alunoId}`);
}

function respostaErroAmigavel(status = 500) {
  return NextResponse.json(
    {
      ok: false,
      code: "erro_listar_faturas_credito_conexao",
      message: "Nao foi possivel carregar os recibos da conta interna.",
    },
    { status },
  );
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied as Response;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const contaConexaoId = parsePositiveInt(searchParams.get("conta_conexao_id"));
    const titularPessoaId = parsePositiveInt(searchParams.get("titular_pessoa_id"));
    const status = textOrNull(searchParams.get("status"));
    const periodoReferencia = textOrNull(searchParams.get("periodo_referencia"));

    if (searchParams.get("conta_conexao_id") && !contaConexaoId) {
      return NextResponse.json({ ok: false, error: "conta_conexao_id_invalido" }, { status: 400 });
    }

    if (searchParams.get("titular_pessoa_id") && !titularPessoaId) {
      return NextResponse.json({ ok: false, error: "titular_pessoa_id_invalido" }, { status: 400 });
    }

    const contasMap = await carregarContasMap(titularPessoaId, contaConexaoId);
    if (titularPessoaId && contasMap.size === 0) {
      return NextResponse.json({ ok: true, faturas: [] satisfies FaturaPayload[] });
    }

    let query = supabase
      .from("credito_conexao_faturas")
      .select(
        "id,conta_conexao_id,periodo_referencia,data_fechamento,data_vencimento,valor_total_centavos,status,cobranca_id,neofin_invoice_id",
      )
      .order("periodo_referencia", { ascending: false })
      .order("id", { ascending: false });

    if (contaConexaoId) {
      query = query.eq("conta_conexao_id", contaConexaoId);
    } else if (contasMap.size > 0) {
      query = query.in("conta_conexao_id", Array.from(contasMap.keys()));
    }

    if (periodoReferencia) {
      query = query.eq("periodo_referencia", periodoReferencia);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data: faturasData, error: faturasError } = await query;
    if (faturasError) {
      throw new Error(`erro_buscar_faturas_credito_conexao:${faturasError.message}`);
    }

    const faturas = (faturasData ?? []) as FaturaRow[];
    if (faturas.length === 0) {
      return NextResponse.json({ ok: true, faturas: [] satisfies FaturaPayload[] });
    }

    const faturaIds = faturas.map((fatura) => fatura.id);
    const { data: pivotsData, error: pivotsError } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id,lancamento_id")
      .in("fatura_id", faturaIds);

    if (pivotsError) {
      throw new Error(`erro_buscar_ligacoes_fatura_credito_conexao:${pivotsError.message}`);
    }

    const pivots = (pivotsData ?? []) as PivotRow[];
    const lancamentoIds = Array.from(
      new Set(
        pivots
          .map((pivot) => numberOrNull(pivot.lancamento_id))
          .filter((id): id is number => typeof id === "number"),
      ),
    );

    const lancamentos: LancamentoRow[] = [];
    for (const chunk of chunkNumbers(lancamentoIds)) {
      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("id,aluno_id,composicao_json,conta_conexao_id,descricao,matricula_id,referencia_item,valor_centavos")
        .in("id", chunk)
        .order("id", { ascending: true });

      if (error) {
        throw new Error(`erro_buscar_lancamentos_fatura_credito_conexao:${error.message}`);
      }

      lancamentos.push(...((data ?? []) as LancamentoRow[]));
    }

    const lancamentosMap = new Map(lancamentos.map((lancamento) => [lancamento.id, lancamento]));
    const matriculaIds = Array.from(
      new Set(
        lancamentos.flatMap((lancamento) => [
          ...(numberOrNull(lancamento.matricula_id) ? [lancamento.matricula_id as number] : []),
          ...extrairMatriculaIds(lancamento.composicao_json),
        ]),
      ),
    );

    const matriculasMap =
      matriculaIds.length > 0 ? await carregarMatriculasMap(matriculaIds) : new Map<number, MatriculaRow>();

    const pessoaIds = new Set<number>();
    for (const lancamento of lancamentos) {
      addPositiveInt(pessoaIds, lancamento.aluno_id);
      for (const alunoId of extrairAlunoIds(lancamento.composicao_json)) {
        pessoaIds.add(alunoId);
      }
    }
    for (const matricula of matriculasMap.values()) {
      addPositiveInt(pessoaIds, matricula.pessoa_id);
    }

    const pessoasMap =
      pessoaIds.size > 0 ? await carregarPessoasMap(Array.from(pessoaIds)) : new Map<number, PessoaRow>();

    const itensPorFatura = new Map<number, FaturaPayload["itens"]>();
    for (const pivot of pivots) {
      const faturaId = numberOrNull(pivot.fatura_id);
      const lancamentoId = numberOrNull(pivot.lancamento_id);
      if (!faturaId || !lancamentoId) continue;

      const lancamento = lancamentosMap.get(lancamentoId);
      if (!lancamento) continue;

      const alunoIds = new Set<number>();
      addPositiveInt(alunoIds, lancamento.aluno_id);
      for (const alunoId of extrairAlunoIds(lancamento.composicao_json)) {
        alunoIds.add(alunoId);
      }

      const matriculaIdsDoLancamento = new Set<number>();
      addPositiveInt(matriculaIdsDoLancamento, lancamento.matricula_id);
      for (const matriculaId of extrairMatriculaIds(lancamento.composicao_json)) {
        matriculaIdsDoLancamento.add(matriculaId);
      }

      for (const matriculaId of matriculaIdsDoLancamento) {
        addPositiveInt(alunoIds, matriculasMap.get(matriculaId)?.pessoa_id);
      }

      const atual = itensPorFatura.get(faturaId) ?? [];
      atual.push({
        lancamentoId: lancamento.id,
        descricao: textOrNull(lancamento.descricao) ?? "Lancamento da conta interna",
        referenciaItem: textOrNull(lancamento.referencia_item),
        valorCentavos: numberOrZero(lancamento.valor_centavos),
        alunoIds: Array.from(alunoIds).sort((a, b) => a - b),
        alunoNomes: nomesDosAlunos(Array.from(alunoIds).sort((a, b) => a - b), pessoasMap),
        matriculaIds: Array.from(matriculaIdsDoLancamento).sort((a, b) => a - b),
      });
      itensPorFatura.set(faturaId, atual);
    }

    const payload: FaturaPayload[] = faturas.map((fatura) => {
      const contaInterna = contasMap.get(fatura.conta_conexao_id);
      return {
        faturaId: fatura.id,
        contaInternaId: numberOrNull(fatura.conta_conexao_id),
        contaInternaDescricao: descreverContaInterna(contaInterna),
        competenciaAnoMes: fatura.periodo_referencia,
        status: textOrNull(fatura.status),
        totalCentavos: numberOrZero(fatura.valor_total_centavos),
        cobrancaFaturaId: numberOrNull(fatura.cobranca_id),
        neofinInvoiceId: textOrNull(fatura.neofin_invoice_id),
        houveGeracaoNeoFin: Boolean(textOrNull(fatura.neofin_invoice_id)),
        dataFechamento: textOrNull(fatura.data_fechamento),
        dataVencimento: textOrNull(fatura.data_vencimento),
        itens: itensPorFatura.get(fatura.id) ?? [],
      };
    });

    return NextResponse.json({ ok: true, faturas: payload });
  } catch (error) {
    console.error("[/api/financeiro/credito-conexao/faturas]", error);
    return respostaErroAmigavel();
  }
}
