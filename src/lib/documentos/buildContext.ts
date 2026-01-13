import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentoContexto = Record<string, unknown>;

type ParcelaCartaoConexao = {
  periodo: string;
  vencimento: string;
  valor: string;
  valor_centavos: number;
  status: string;
};

type FaturaCartaoRow = {
  id: number;
  periodo_referencia: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number | null;
  status: string | null;
};

type FaturaLinkRow = {
  fatura_id: number;
  lancamento_id: number;
};

type LancamentoCartaoRow = {
  id: number;
  valor_centavos: number | null;
};

type EscolaContext = {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
};

type BuildContextParams = {
  supabase: SupabaseClient;
  matriculaId: number;
  matricula?: Record<string, unknown> | null;
  snapshotFinanceiro?: Record<string, unknown> | null;
  variaveisManuais?: Record<string, unknown> | null;
};

type BuildContextResult = {
  contexto: DocumentoContexto;
  snapshot: Record<string, unknown>;
  parcelasCartao: ParcelaCartaoConexao[];
  parcelasDocumento: Array<Record<string, unknown>>;
  aluno: Record<string, unknown> | null;
  responsavel: Record<string, unknown> | null;
  turma: Record<string, unknown> | null;
  matricula: Record<string, unknown>;
  escola: EscolaContext;
};

function formatDateBR(dateISO: string | null): string {
  if (!dateISO) return "";
  const [y, m, d] = dateISO.split("-");
  if (!y || !m || !d) return dateISO;
  return `${d}/${m}/${y}`;
}

function formatBRLFromCentavos(centavos: number): string {
  const valor = Number.isFinite(centavos) ? centavos / 100 : 0;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickFirstText(source: Record<string, unknown> | null, keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickEnv(keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function resolveEscolaContext(supabase: SupabaseClient): Promise<EscolaContext> {
  const escola: EscolaContext = {
    nome: "",
    cnpj: "",
    endereco: "",
    cidade: "",
  };

  const { data: settings } = await supabase
    .from("system_settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (settings && typeof settings === "object") {
    const rec = settings as Record<string, unknown>;
    escola.nome =
      pickFirstText(rec, ["escola_nome", "school_name", "nome", "system_name"]) || escola.nome;
    escola.cnpj = pickFirstText(rec, ["escola_cnpj", "school_cnpj", "cnpj", "documento"]) || escola.cnpj;
    escola.endereco =
      pickFirstText(rec, ["escola_endereco", "school_endereco", "endereco"]) || escola.endereco;
    escola.cidade =
      pickFirstText(rec, ["escola_cidade", "school_cidade", "cidade"]) || escola.cidade;
  }

  if (!escola.nome || !escola.endereco || !escola.cidade) {
    const { data: locais } = await supabase
      .from("locais")
      .select("nome,endereco")
      .eq("ativo", true)
      .order("id", { ascending: true })
      .limit(1);

    if (locais && locais.length > 0) {
      const local = locais[0] as Record<string, unknown>;
      if (!escola.nome) escola.nome = pickFirstText(local, ["nome"]);
      if (!escola.endereco) escola.endereco = pickFirstText(local, ["endereco"]);
    }
  }

  if (!escola.nome) escola.nome = pickEnv(["ESCOLA_NOME", "SCHOOL_NAME", "NEXT_PUBLIC_ESCOLA_NOME"]);
  if (!escola.cnpj) escola.cnpj = pickEnv(["ESCOLA_CNPJ", "SCHOOL_CNPJ", "NEXT_PUBLIC_ESCOLA_CNPJ"]);
  if (!escola.endereco) escola.endereco = pickEnv(["ESCOLA_ENDERECO", "SCHOOL_ENDERECO", "NEXT_PUBLIC_ESCOLA_ENDERECO"]);
  if (!escola.cidade) escola.cidade = pickEnv(["ESCOLA_CIDADE", "SCHOOL_CIDADE", "NEXT_PUBLIC_ESCOLA_CIDADE"]);

  return escola;
}

export function normalizeManualVars(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const code = k.trim().toUpperCase();
    if (!code) continue;
    out[code] = v;
  }
  return out;
}

export async function buildContextFromMatricula(params: BuildContextParams): Promise<BuildContextResult> {
  const { supabase, matriculaId, matricula: matriculaInput } = params;
  const snapshotBase = (params.snapshotFinanceiro ?? {}) as Record<string, unknown>;
  const manualRaw = (params.variaveisManuais ?? {}) as Record<string, unknown>;
  const manual = normalizeManualVars(manualRaw);

  let matricula = matriculaInput ?? null;
  if (!matricula) {
    const { data: mat, error: matErr } = await supabase
      .from("matriculas")
      .select("*")
      .eq("id", matriculaId)
      .single();
    if (matErr || !mat) {
      throw new Error("Matricula nao encontrada.");
    }
    matricula = mat as Record<string, unknown>;
  }

  const matriculaRec = matricula as Record<string, unknown>;
  const pessoaId = Number(matriculaRec.pessoa_id);
  const respFinId = Number(matriculaRec.responsavel_financeiro_id);

  const { data: aluno } = Number.isFinite(pessoaId)
    ? await supabase.from("pessoas").select("*").eq("id", pessoaId).single()
    : { data: null };

  const { data: responsavel } = Number.isFinite(respFinId)
    ? await supabase.from("pessoas").select("*").eq("id", respFinId).single()
    : { data: null };

  const vinculoIdRaw = matriculaRec.vinculo_id;
  const vinculoId = typeof vinculoIdRaw === "number" ? vinculoIdRaw : Number(vinculoIdRaw);
  let turma: Record<string, unknown> | null = null;

  if (Number.isFinite(vinculoId)) {
    const { data: turmaData, error: turmaErr } = await supabase
      .from("turmas")
      .select("*")
      .eq("turma_id", vinculoId)
      .maybeSingle();

    if (!turmaErr && turmaData) {
      turma = turmaData as Record<string, unknown>;
    }
  }

  const valorMensalidade =
    toFiniteNumber(snapshotBase.valor_mensalidade_centavos) ??
    toFiniteNumber(matriculaRec.total_mensalidade_centavos);
  const valorMatricula =
    toFiniteNumber(snapshotBase.valor_matricula_centavos) ??
    toFiniteNumber(matriculaRec.primeira_cobranca_valor_centavos);
  let numeroParcelas = toFiniteNumber(snapshotBase.numero_parcelas);
  if (numeroParcelas === null) {
    const planoPagamentoId = toFiniteNumber(matriculaRec.plano_pagamento_id);
    if (planoPagamentoId) {
      const { data: planoPagamento } = await supabase
        .from("matricula_planos_pagamento")
        .select("numero_parcelas")
        .eq("id", planoPagamentoId)
        .maybeSingle();
      const parsed = planoPagamento
        ? toFiniteNumber((planoPagamento as { numero_parcelas?: number | null }).numero_parcelas)
        : null;
      if (parsed !== null) {
        numeroParcelas = parsed;
      }
    }
  }
  const diaVencimento =
    toFiniteNumber(snapshotBase.dia_vencimento) ??
    toFiniteNumber(matriculaRec.vencimento_dia_padrao);
  const snapshot: Record<string, unknown> = {
    ...snapshotBase,
    valor_mensalidade_centavos: valorMensalidade ?? null,
    valor_matricula_centavos: valorMatricula ?? null,
    numero_parcelas: numeroParcelas ?? null,
    dia_vencimento: diaVencimento ?? null,
  };

  const escola = await resolveEscolaContext(supabase);
  const contexto: DocumentoContexto = {
    aluno: aluno ?? null,
    turma,
    matricula,
    responsavel: responsavel ?? null,
    escola,
    snapshot_financeiro: snapshot,
    variaveis_manuais: manual,
  };

  const parcelasCartao: ParcelaCartaoConexao[] = [];
  if (Number.isFinite(respFinId) && respFinId > 0) {
    const { data: contas, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id")
      .eq("pessoa_titular_id", respFinId)
      .eq("ativo", true)
      .order("id", { ascending: false })
      .limit(1);

    if (contaErr) {
      throw new Error(contaErr.message);
    }

    const contaId = contas && contas.length > 0 ? Number(contas[0]?.id) : null;
    if (contaId && Number.isFinite(contaId)) {
      const statusFaturas = ["ABERTA", "PENDENTE", "EM_ABERTO"];
      const { data: faturasRaw, error: faturasErr } = await supabase
        .from("credito_conexao_faturas")
        .select("id,periodo_referencia,data_vencimento,valor_total_centavos,status,data_fechamento")
        .eq("conta_conexao_id", contaId)
        .in("status", statusFaturas)
        .order("data_vencimento", { ascending: true, nullsFirst: false })
        .order("data_fechamento", { ascending: true, nullsFirst: false })
        .limit(120);

      if (faturasErr) {
        throw new Error(faturasErr.message);
      }

      const faturas: FaturaCartaoRow[] = (faturasRaw ?? []).map((row) => {
        const record = row as Record<string, unknown>;
        const valorRaw = Number(record.valor_total_centavos);
        return {
          id: Number(record.id),
          periodo_referencia: typeof record.periodo_referencia === "string" ? record.periodo_referencia : null,
          data_vencimento: typeof record.data_vencimento === "string" ? record.data_vencimento : null,
          valor_total_centavos: Number.isFinite(valorRaw) ? valorRaw : null,
          status: typeof record.status === "string" ? record.status : null,
        };
      });

      const faturaIds = faturas.map((f) => f.id).filter((id) => Number.isFinite(id) && id > 0);
      const somaPorFatura = new Map<number, number>();

      if (faturaIds.length > 0) {
        const { data: linksRaw, error: linksErr } = await supabase
          .from("credito_conexao_fatura_lancamentos")
          .select("fatura_id,lancamento_id")
          .in("fatura_id", faturaIds);

        if (linksErr) {
          throw new Error(linksErr.message);
        }

        const links: FaturaLinkRow[] = (linksRaw ?? []).map((row) => {
          const record = row as Record<string, unknown>;
          return {
            fatura_id: Number(record.fatura_id),
            lancamento_id: Number(record.lancamento_id),
          };
        });

        const lancamentoIds = Array.from(
          new Set(links.map((l) => l.lancamento_id).filter((id) => Number.isFinite(id) && id > 0)),
        );

        if (lancamentoIds.length > 0) {
          const { data: lancRaw, error: lancErr } = await supabase
            .from("credito_conexao_lancamentos")
            .select("id,valor_centavos")
            .in("id", lancamentoIds);

          if (lancErr) {
            throw new Error(lancErr.message);
          }

          const lancamentos: LancamentoCartaoRow[] = (lancRaw ?? []).map((row) => {
            const record = row as Record<string, unknown>;
            const valorRaw = Number(record.valor_centavos);
            return {
              id: Number(record.id),
              valor_centavos: Number.isFinite(valorRaw) ? valorRaw : null,
            };
          });

          const valorPorLancamento = new Map<number, number>();
          for (const l of lancamentos) {
            if (Number.isFinite(l.id)) {
              valorPorLancamento.set(l.id, Number(l.valor_centavos ?? 0));
            }
          }

          for (const link of links) {
            const valor = valorPorLancamento.get(link.lancamento_id) ?? 0;
            if (!Number.isFinite(valor)) continue;
            somaPorFatura.set(link.fatura_id, (somaPorFatura.get(link.fatura_id) ?? 0) + valor);
          }
        }
      }

      for (const fatura of faturas) {
        const soma = somaPorFatura.get(fatura.id) ?? 0;
        const valorCentavos =
          Number.isFinite(soma) && soma > 0 ? soma : Number(fatura.valor_total_centavos ?? 0);

        parcelasCartao.push({
          periodo: fatura.periodo_referencia ?? "",
          vencimento: formatDateBR(fatura.data_vencimento ?? null),
          valor: formatBRLFromCentavos(valorCentavos),
          valor_centavos: valorCentavos,
          status: fatura.status ?? "",
        });
      }
    }
  }

  contexto.PARCELAS_CARTAO_CONEXAO = parcelasCartao;
  const parcelasDocumento = parcelasCartao.map((parcela) => ({
    vencimento: parcela.vencimento,
    descricao: parcela.periodo ? `Fatura ${parcela.periodo}` : "Fatura",
    valor_centavos: parcela.valor_centavos,
    status: parcela.status,
    data: parcela.vencimento,
    valor: parcela.valor,
  }));
  contexto.parcelas = parcelasDocumento;

  return {
    contexto,
    snapshot,
    parcelasCartao,
    parcelasDocumento,
    aluno: (aluno as Record<string, unknown>) ?? null,
    responsavel: (responsavel as Record<string, unknown>) ?? null,
    turma,
    matricula,
    escola,
  };
}
