import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { listarParcelasResumoPorMatriculaId } from "@/lib/matriculas/resumoFinanceiro";

export type ResolveCollectionsInput = {
  operacaoTipo: string;
  operacaoId: number;
  colecoes: string[];
};

export type CollectionRow = Record<string, string>;
export type CollectionsResolved = Record<string, CollectionRow[]>;

function formatBRLFromCentavos(centavos: number): string {
  const valor = centavos / 100;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(dateISO: string | null): string {
  if (!dateISO) return "";
  const parts = dateISO.split("-");
  if (parts.length !== 3) return dateISO;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function clampDay(year: number, month: number, day: number): number {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1) return 1;
  if (day > last) return last;
  return day;
}

function buildIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function mapLancamentos(rows: Array<Record<string, unknown>>): CollectionRow[] {
  return rows.map((row) => {
    const data = getString(row, "data_lancamento");
    const descricao = getString(row, "descricao") ?? "";
    const status = getString(row, "status") ?? "";
    const valorCentavos = getNumber(row, "valor_centavos") ?? 0;
    return {
      DATA: formatDateBR(data),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(valorCentavos),
      STATUS: status,
    };
  });
}

function mapLedgerRows(rows: Array<Record<string, unknown>>, opts: { dateKey: string }): CollectionRow[] {
  return rows.map((row) => {
    const data = getString(row, opts.dateKey);
    const descricao = getString(row, "descricao") ?? "";
    const status = getString(row, "status") ?? "";
    const valorCentavos = getNumber(row, "valor_centavos") ?? 0;
    return {
      DATA: formatDateBR(data),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(valorCentavos),
      STATUS: status,
    };
  });
}

function mapParcelasResumo(
  rows: Array<{ vencimento: string | null; valorCentavos: number; status: string; descricao: string | null }>,
): CollectionRow[] {
  return rows.map((row, index) => {
    const descricao = row.descricao ?? `Parcela ${index + 1}`;
    return {
      DATA: formatDateBR(row.vencimento),
      DESCRICAO: descricao,
      VALOR: formatBRLFromCentavos(row.valorCentavos ?? 0),
    };
  });
}

export async function resolveCollections(input: ResolveCollectionsInput): Promise<CollectionsResolved> {
  const supabase = await getSupabaseServerSSR();
  const operacaoTipo = input.operacaoTipo.trim().toUpperCase();
  const colecoes = Array.from(new Set(input.colecoes.map((c) => c.trim().toUpperCase()).filter(Boolean)));
  const debug = process.env.DOCS_EMIT_DEBUG === "1";

  const resp: CollectionsResolved = {};

  if (!colecoes.length) return resp;

  const { data: cat, error: catError } = await supabase
    .from("documentos_colecoes")
    .select("codigo,root_tipo")
    .in("codigo", colecoes)
    .eq("ativo", true);

  if (catError) throw new Error(catError.message);

  const catalogo = (cat ?? []) as Array<{ codigo?: string | null; root_tipo?: string | null }>;

  for (const c of catalogo) {
    const codigo = String(c.codigo ?? "").trim().toUpperCase();
    if (!codigo) continue;
    resp[codigo] = [];

    const rootTipo = String(c.root_tipo ?? "").trim().toUpperCase();
    if (rootTipo !== operacaoTipo) {
      continue;
    }

    if (codigo === "MATRICULA_ENTRADAS" || codigo === "MATRICULA_ENTRADA") {
      const { data, error } = await supabase
        .from("matriculas_financeiro_linhas")
        .select("data_evento,descricao,valor_centavos,status")
        .eq("matricula_id", input.operacaoId)
        .eq("tipo", "ENTRADA")
        .order("data_evento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      resp[codigo] = mapLedgerRows((data ?? []) as Array<Record<string, unknown>>, { dateKey: "data_evento" });
      continue;
    }

    if (codigo === "MATRICULA_PARCELAS") {
      if (debug) {
        console.log("[doc-colecao] matricula_id:", input.operacaoId);
      }

      const parcelasResumo = await listarParcelasResumoPorMatriculaId(input.operacaoId);
      resp[codigo] = mapParcelasResumo(parcelasResumo);

      if (resp[codigo].length === 0) {
        const { data: matricula, error: matErr } = await supabase
          .from("matriculas")
          .select("id,total_mensalidade_centavos,ano_referencia,pessoa_id,responsavel_financeiro_id")
          .eq("id", input.operacaoId)
          .maybeSingle();

        if (!matErr && matricula) {
          const valorMensalCentavos = Number(
            (matricula as { total_mensalidade_centavos?: number | null }).total_mensalidade_centavos ?? 0,
          );
          let anoReferencia = Number(
            (matricula as { ano_referencia?: number | null }).ano_referencia ?? new Date().getFullYear(),
          );
          if (!Number.isFinite(anoReferencia) || anoReferencia < 2000) {
            anoReferencia = new Date().getFullYear();
          }
          const responsavelId = getNumber(matricula as Record<string, unknown>, "responsavel_financeiro_id");
          const pessoaId = getNumber(matricula as Record<string, unknown>, "pessoa_id");

          let diaVencimento = 12;
          const titularId = responsavelId ?? pessoaId;
          if (titularId) {
            const { data: conta } = await supabase
              .from("credito_conexao_contas")
              .select("dia_vencimento,ativo,tipo_conta")
              .eq("pessoa_titular_id", titularId)
              .eq("tipo_conta", "ALUNO")
              .eq("ativo", true)
              .order("id", { ascending: false })
              .limit(1)
              .maybeSingle();

            const diaConta = Number((conta as { dia_vencimento?: number | null }).dia_vencimento);
            if (Number.isFinite(diaConta) && diaConta >= 1 && diaConta <= 31) {
              diaVencimento = diaConta;
            }
          }

          const { data: turmasRaw } = await supabase
            .from("turma_aluno")
            .select("turma:turmas(turma_id,nome)")
            .eq("matricula_id", input.operacaoId)
            .in("status", ["ATIVO", "ativo"]);

          const turmaLabels = (turmasRaw ?? [])
            .map((row) => {
              const turma = (row as { turma?: { turma_id?: number | null; nome?: string | null } | null }).turma;
              const nome = turma?.nome?.trim();
              const turmaRecord = turma && typeof turma === "object" ? (turma as Record<string, unknown>) : null;
              const turmaId = turmaRecord ? getNumber(turmaRecord, "turma_id") : null;
              if (nome) return nome;
              if (turmaId) return `Turma #${turmaId}`;
              return null;
            })
            .filter((label): label is string => !!label);

          const composicaoTexto = turmaLabels.length > 0 ? turmaLabels.join(" + ") : "composicao";
          const valorLabel = formatBRLFromCentavos(Number.isFinite(valorMensalCentavos) ? valorMensalCentavos : 0);

          const previsao: CollectionRow[] = [];
          for (let mes = 1; mes <= 12; mes += 1) {
            const competencia = `${anoReferencia}-${pad2(mes)}`;
            const dataIso = buildIsoDate(anoReferencia, mes, clampDay(anoReferencia, mes, diaVencimento));
            previsao.push({
              DATA: formatDateBR(dataIso),
              DESCRICAO: `Mensalidade (${competencia}) - ${composicaoTexto}`,
              VALOR: valorLabel,
            });
          }

          resp[codigo] = previsao;
        }
      }

      if (debug) {
        console.log("[doc-colecao] MATRICULA_PARCELAS_len:", resp[codigo].length);
      }
      continue;
    }

    if (codigo === "MATRICULA_LANCAMENTOS_CREDITO") {
      const origemId = input.operacaoId;
      if (debug) {
        console.log("[doc-colecao] resolvendo:", codigo, "root:", rootTipo, "origem_id:", origemId);
      }

      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("matriculas_financeiro_linhas")
        .select("data_evento,descricao,valor_centavos,status")
        .eq("matricula_id", input.operacaoId)
        .eq("tipo", "LANCAMENTO_CREDITO")
        .order("data_evento", { ascending: true })
        .limit(500);

      if (ledgerError) throw new Error(ledgerError.message);
      if (debug) {
        console.log("[doc-colecao] ledger_linhas:", Array.isArray(ledgerRows) ? ledgerRows.length : 0);
      }
      if (ledgerRows && ledgerRows.length > 0) {
        resp[codigo] = mapLedgerRows(ledgerRows as Array<Record<string, unknown>>, { dateKey: "data_evento" });
        continue;
      }

      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id")
        .eq("origem_id", origemId)
        .in("origem_sistema", ["MATRICULA", "MATRICULAS"])
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      let rows = mapLancamentos((data ?? []) as Array<Record<string, unknown>>);
      if (debug) {
        console.log("[doc-colecao] lancamentos_origem:", rows.length);
      }

      if (rows.length === 0) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("credito_conexao_lancamentos")
          .select("data_lancamento,descricao,valor_centavos,status,matricula_id")
          .eq("matricula_id", input.operacaoId)
          .order("data_lancamento", { ascending: true })
          .limit(500);

        if (!fallbackError) {
          rows = mapLancamentos((fallback ?? []) as Array<Record<string, unknown>>);
          if (debug) {
            console.log("[doc-colecao] lancamentos_fallback_matricula:", rows.length);
          }
        }
      }

      resp[codigo] = rows;
      continue;
    }

    if (codigo === "FATURA_LANCAMENTOS_CREDITO") {
      const { data: links, error: linksError } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("lancamento_id")
        .eq("fatura_id", input.operacaoId);

      if (linksError) throw new Error(linksError.message);

      const lancamentoIds = (links ?? [])
        .map((row) => {
          const rec = row as Record<string, unknown>;
          return getNumber(rec, "lancamento_id");
        })
        .filter((id): id is number => Number.isFinite(id));

      const { data, error } = await supabase
        .from("credito_conexao_lancamentos")
        .select("data_lancamento,descricao,valor_centavos,status")
        .in("id", lancamentoIds.length ? lancamentoIds : [-1])
        .order("data_lancamento", { ascending: true })
        .limit(500);

      if (error) throw new Error(error.message);
      resp[codigo] = mapLancamentos((data ?? []) as Array<Record<string, unknown>>);
      continue;
    }
  }

  for (const code of colecoes) {
    if (!resp[code]) resp[code] = [];
  }

  return resp;
}
