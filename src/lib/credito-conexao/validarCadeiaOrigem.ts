type SupabaseLike = {
  from: (table: string) => any;
};

type FaturaRow = {
  id: number;
  periodo_referencia: string | null;
  status: string | null;
  valor_total_centavos: number | null;
};

type PivotRow = {
  fatura_id: number;
  lancamento_id: number;
};

type LancamentoRow = {
  id: number;
  cobranca_id: number | null;
  competencia: string | null;
  descricao: string | null;
  matricula_id: number | null;
  origem_id: number | null;
  origem_sistema: string | null;
  referencia_item: string | null;
  status: string | null;
  valor_centavos: number | null;
};

type CobrancaRow = {
  id: number;
  cancelada_em: string | null;
  competencia_ano_mes: string | null;
  descricao: string | null;
  expurgada: boolean | null;
  origem_id: number | null;
  origem_item_id: number | null;
  origem_item_tipo: string | null;
  origem_label: string | null;
  origem_subtipo: string | null;
  origem_tipo: string | null;
  status: string | null;
  valor_centavos: number | null;
};

type MatriculaRow = {
  id: number;
  cancelamento_tipo: string | null;
  data_encerramento: string | null;
  encerramento_tipo: string | null;
  status: string | null;
};

type MatriculaItemRow = {
  id: number;
  descricao: string | null;
  matricula_id: number | null;
  status: string | null;
};

export type StatusOrigemFinanceira = "VALIDA" | "CANCELADA" | "ORFA";

export type LancamentoOrigemValidada = {
  cobranca_id: number | null;
  cobranca_status: string | null;
  competencia: string | null;
  descricao: string | null;
  fatura_id: number;
  lancamento_id: number;
  matricula_id: number | null;
  matricula_item_id: number | null;
  matricula_status: string | null;
  motivos: string[];
  origem_amigavel: string;
  origem_sistema: string | null;
  origem_tecnica: string;
  referencia_item: string | null;
  status_lancamento: string | null;
  status_origem: StatusOrigemFinanceira;
  valor_centavos: number;
};

export type FaturaOrigemValidada = {
  fatura_id: number;
  itens: LancamentoOrigemValidada[];
  motivos: string[];
  periodo_referencia: string | null;
  pode_importar_folha: boolean;
  possui_inconsistencia: boolean;
  status_fatura: string | null;
  total_fatura_centavos: number;
  total_invalidos_centavos: number;
  total_lancamentos_centavos: number;
  total_validos_centavos: number;
};

const STATUSS_CANCELADOS = new Set([
  "CANCELADO",
  "CANCELADA",
  "CANCELED",
  "CANCELLED",
  "INATIVO",
  "INATIVA",
  "VOID",
]);

const STATUSS_FATURA_IMPORTAVEL = new Set(["ABERTA", "EM_ABERTO", "PENDENTE", "EM_ATRASO"]);

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function upper(value: unknown): string {
  return textOrNull(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase() ?? "";
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
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

function isStatusCancelado(value: unknown) {
  return STATUSS_CANCELADOS.has(upper(value));
}

function isMatriculaOrigem(value: unknown) {
  const normalized = upper(value);
  return normalized.startsWith("MATRICULA");
}

function statusOrigemFromMotivos(params: {
  cobrancaCancelada: boolean;
  matriculaCancelada: boolean;
  itemCancelado: boolean;
  orfandade: boolean;
}): StatusOrigemFinanceira {
  if (params.cobrancaCancelada || params.matriculaCancelada || params.itemCancelado) {
    return "CANCELADA";
  }
  if (params.orfandade) {
    return "ORFA";
  }
  return "VALIDA";
}

function buildOrigemAmigavel(params: {
  matriculaId: number | null;
  matriculaItemId: number | null;
  origemSistema: string | null;
  descricao: string | null;
}) {
  if (params.matriculaItemId && params.matriculaId) {
    return `Item #${params.matriculaItemId} da matricula #${params.matriculaId}`;
  }
  if (params.matriculaId) {
    return `Matricula #${params.matriculaId}`;
  }
  if (textOrNull(params.descricao)) {
    return params.descricao as string;
  }
  if (textOrNull(params.origemSistema)) {
    return `Origem ${params.origemSistema}`;
  }
  return "Origem nao identificada";
}

function buildOrigemTecnica(params: {
  cobranca: CobrancaRow | null;
  lancamento: LancamentoRow;
  matricula: MatriculaRow | null;
  matriculaItem: MatriculaItemRow | null;
}) {
  const partes = [
    `lancamento#${params.lancamento.id}`,
    `origem=${textOrNull(params.lancamento.origem_sistema) ?? "-"}`,
  ];

  if (params.lancamento.referencia_item) {
    partes.push(`ref=${params.lancamento.referencia_item}`);
  }

  if (params.cobranca) {
    partes.push(
      `cobranca#${params.cobranca.id}:${textOrNull(params.cobranca.status) ?? "-"}/${textOrNull(params.cobranca.origem_tipo) ?? "-"}/${textOrNull(params.cobranca.origem_subtipo) ?? "-"}`,
    );
  } else if (params.lancamento.cobranca_id) {
    partes.push(`cobranca#${params.lancamento.cobranca_id}:ausente`);
  }

  if (params.matriculaItem) {
    partes.push(`item#${params.matriculaItem.id}:${textOrNull(params.matriculaItem.status) ?? "-"}`);
  }

  if (params.matricula) {
    partes.push(`matricula#${params.matricula.id}:${textOrNull(params.matricula.status) ?? "-"}`);
  }

  return partes.join(" -> ");
}

async function buscarFaturas(
  supabase: SupabaseLike,
  faturaIds: number[],
): Promise<Map<number, FaturaRow>> {
  const rows: FaturaRow[] = [];

  for (const chunk of chunkNumbers(faturaIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_faturas")
      .select("id,periodo_referencia,status,valor_total_centavos")
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as FaturaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function buscarPivots(
  supabase: SupabaseLike,
  faturaIds: number[],
): Promise<PivotRow[]> {
  const rows: PivotRow[] = [];

  for (const chunk of chunkNumbers(faturaIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id,lancamento_id")
      .in("fatura_id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as PivotRow[]));
  }

  return rows;
}

async function buscarLancamentos(
  supabase: SupabaseLike,
  lancamentoIds: number[],
): Promise<Map<number, LancamentoRow>> {
  const rows: LancamentoRow[] = [];

  for (const chunk of chunkNumbers(lancamentoIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,cobranca_id,competencia,descricao,matricula_id,origem_id,origem_sistema,referencia_item,status,valor_centavos",
      )
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as LancamentoRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function buscarCobrancas(
  supabase: SupabaseLike,
  cobrancaIds: number[],
): Promise<Map<number, CobrancaRow>> {
  const rows: CobrancaRow[] = [];

  for (const chunk of chunkNumbers(cobrancaIds)) {
    const { data, error } = await supabase
      .from("cobrancas")
      .select(
        "id,cancelada_em,competencia_ano_mes,descricao,expurgada,origem_id,origem_item_id,origem_item_tipo,origem_label,origem_subtipo,origem_tipo,status,valor_centavos",
      )
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as CobrancaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function buscarMatriculaItens(
  supabase: SupabaseLike,
  itemIds: number[],
): Promise<Map<number, MatriculaItemRow>> {
  if (itemIds.length === 0) return new Map<number, MatriculaItemRow>();

  const rows: MatriculaItemRow[] = [];

  for (const chunk of chunkNumbers(itemIds)) {
    const { data, error } = await supabase
      .from("matricula_itens")
      .select("id,descricao,matricula_id,status")
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as MatriculaItemRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function buscarMatriculas(
  supabase: SupabaseLike,
  matriculaIds: number[],
): Promise<Map<number, MatriculaRow>> {
  if (matriculaIds.length === 0) return new Map<number, MatriculaRow>();

  const rows: MatriculaRow[] = [];

  for (const chunk of chunkNumbers(matriculaIds)) {
    const { data, error } = await supabase
      .from("matriculas")
      .select("id,status,data_encerramento,encerramento_tipo,cancelamento_tipo")
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as MatriculaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

function resolverMatriculaId(params: {
  cobranca: CobrancaRow | null;
  lancamento: LancamentoRow;
  matriculaItem: MatriculaItemRow | null;
}) {
  if (params.lancamento.matricula_id) return params.lancamento.matricula_id;
  if (isMatriculaOrigem(params.lancamento.origem_sistema) && params.lancamento.origem_id) {
    return params.lancamento.origem_id;
  }
  if (params.matriculaItem?.matricula_id) return params.matriculaItem.matricula_id;
  if (upper(params.cobranca?.origem_item_tipo) === "MATRICULA" && params.cobranca?.origem_item_id) {
    return params.cobranca.origem_item_id;
  }
  if (isMatriculaOrigem(params.cobranca?.origem_tipo) && params.cobranca?.origem_id) {
    return params.cobranca.origem_id;
  }
  return null;
}

export async function validarFaturasCreditoConexao(
  supabase: SupabaseLike,
  faturaIds: number[],
): Promise<Map<number, FaturaOrigemValidada>> {
  const ids = Array.from(new Set(faturaIds.filter((value) => Number.isFinite(value) && value > 0)));
  if (ids.length === 0) {
    return new Map<number, FaturaOrigemValidada>();
  }

  const [faturasById, pivots] = await Promise.all([buscarFaturas(supabase, ids), buscarPivots(supabase, ids)]);
  const lancamentoIds = Array.from(
    new Set(
      pivots
        .map((pivot) => numberOrNull(pivot.lancamento_id))
        .filter((value): value is number => Boolean(value)),
    ),
  );
  const lancamentosById = await buscarLancamentos(supabase, lancamentoIds);
  const cobrancaIds = Array.from(
    new Set(
      Array.from(lancamentosById.values())
        .map((row) => numberOrNull(row.cobranca_id))
        .filter((value): value is number => Boolean(value)),
    ),
  );
  const cobrancasById = await buscarCobrancas(supabase, cobrancaIds);

  const matriculaItemIds = Array.from(
    new Set(
      Array.from(cobrancasById.values())
        .filter((row) => upper(row.origem_item_tipo) === "MATRICULA_ITEM")
        .map((row) => numberOrNull(row.origem_item_id))
        .filter((value): value is number => Boolean(value)),
    ),
  );
  const matriculaItensById = await buscarMatriculaItens(supabase, matriculaItemIds);

  const matriculaIds = Array.from(
    new Set(
      Array.from(lancamentosById.values())
        .flatMap((row) => {
          const cobranca = row.cobranca_id ? cobrancasById.get(row.cobranca_id) ?? null : null;
          const matriculaItem =
            cobranca?.origem_item_id && upper(cobranca.origem_item_tipo) === "MATRICULA_ITEM"
              ? matriculaItensById.get(cobranca.origem_item_id) ?? null
              : null;
          return [resolverMatriculaId({ cobranca, lancamento: row, matriculaItem })];
        })
        .filter((value): value is number => Boolean(value)),
    ),
  );
  const matriculasById = await buscarMatriculas(supabase, matriculaIds);

  const itensPorFatura = new Map<number, LancamentoOrigemValidada[]>();

  for (const pivot of pivots) {
    const faturaId = numberOrNull(pivot.fatura_id);
    const lancamentoId = numberOrNull(pivot.lancamento_id);
    if (!faturaId || !lancamentoId) continue;

    const lancamento = lancamentosById.get(lancamentoId);
    if (!lancamento) continue;

    const cobranca = lancamento.cobranca_id ? cobrancasById.get(lancamento.cobranca_id) ?? null : null;
    const matriculaItem =
      cobranca?.origem_item_id && upper(cobranca.origem_item_tipo) === "MATRICULA_ITEM"
        ? matriculaItensById.get(cobranca.origem_item_id) ?? null
        : null;
    const matriculaId = resolverMatriculaId({ cobranca, lancamento, matriculaItem });
    const matricula = matriculaId ? matriculasById.get(matriculaId) ?? null : null;

    const motivos: string[] = [];
    const cobrancaCancelada =
      Boolean(cobranca?.expurgada) ||
      Boolean(textOrNull(cobranca?.cancelada_em)) ||
      isStatusCancelado(cobranca?.status);
    const itemCancelado = isStatusCancelado(matriculaItem?.status);
    const matriculaCancelada = upper(matricula?.status) === "CANCELADA";
    const existeOrfandade =
      Boolean(lancamento.cobranca_id && !cobranca) ||
      (upper(cobranca?.origem_item_tipo) === "MATRICULA_ITEM" && !matriculaItem) ||
      ((isMatriculaOrigem(lancamento.origem_sistema) || isMatriculaOrigem(cobranca?.origem_tipo) || Boolean(matriculaId)) &&
        !matricula);

    if (lancamento.cobranca_id && !cobranca) {
      motivos.push("Cobranca vinculada nao encontrada.");
    }
    if (cobrancaCancelada) {
      motivos.push("Cobranca derivada esta cancelada ou expurgada.");
    }
    if (upper(cobranca?.origem_item_tipo) === "MATRICULA_ITEM" && !matriculaItem) {
      motivos.push("Item de matricula de origem nao existe mais.");
    }
    if (itemCancelado) {
      motivos.push("Item de matricula de origem esta cancelado.");
    }
    if ((isMatriculaOrigem(lancamento.origem_sistema) || isMatriculaOrigem(cobranca?.origem_tipo) || Boolean(matriculaId)) && !matricula) {
      motivos.push("Matricula de origem nao existe mais.");
    }
    if (matriculaCancelada) {
      motivos.push("Matricula de origem esta cancelada.");
    }
    if (isStatusCancelado(lancamento.status)) {
      motivos.push("Lancamento esta cancelado.");
    }

    const itemValidado: LancamentoOrigemValidada = {
      cobranca_id: numberOrNull(lancamento.cobranca_id),
      cobranca_status: textOrNull(cobranca?.status),
      competencia: textOrNull(lancamento.competencia) ?? textOrNull(cobranca?.competencia_ano_mes),
      descricao: textOrNull(lancamento.descricao) ?? textOrNull(cobranca?.descricao),
      fatura_id: faturaId,
      lancamento_id: lancamento.id,
      matricula_id: matriculaId,
      matricula_item_id: numberOrNull(matriculaItem?.id),
      matricula_status: textOrNull(matricula?.status),
      motivos,
      origem_amigavel: buildOrigemAmigavel({
        matriculaId,
        matriculaItemId: numberOrNull(matriculaItem?.id),
        origemSistema: textOrNull(lancamento.origem_sistema),
        descricao: textOrNull(lancamento.descricao) ?? textOrNull(cobranca?.origem_label),
      }),
      origem_sistema: textOrNull(lancamento.origem_sistema),
      origem_tecnica: buildOrigemTecnica({ cobranca, lancamento, matricula, matriculaItem }),
      referencia_item: textOrNull(lancamento.referencia_item),
      status_lancamento: textOrNull(lancamento.status),
      status_origem: statusOrigemFromMotivos({
        cobrancaCancelada,
        matriculaCancelada,
        itemCancelado,
        orfandade: existeOrfandade,
      }),
      valor_centavos: numberOrZero(lancamento.valor_centavos),
    };

    const atual = itensPorFatura.get(faturaId) ?? [];
    atual.push(itemValidado);
    itensPorFatura.set(faturaId, atual);
  }

  const resultado = new Map<number, FaturaOrigemValidada>();

  for (const faturaId of ids) {
    const fatura = faturasById.get(faturaId) ?? null;
    const itens = (itensPorFatura.get(faturaId) ?? []).sort((left, right) => left.lancamento_id - right.lancamento_id);
    const totalLancamentos = itens.reduce((acc, item) => acc + item.valor_centavos, 0);
    const totalValidos = itens
      .filter((item) => item.status_origem === "VALIDA" && !isStatusCancelado(item.status_lancamento))
      .reduce((acc, item) => acc + item.valor_centavos, 0);
    const totalInvalidos = totalLancamentos - totalValidos;
    const motivos = Array.from(new Set(itens.flatMap((item) => item.motivos)));
    const totalFatura = numberOrZero(fatura?.valor_total_centavos);
    const statusFatura = textOrNull(fatura?.status);
    const podeImportarFolha =
      STATUSS_FATURA_IMPORTAVEL.has(upper(statusFatura)) &&
      itens.length > 0 &&
      motivos.length === 0 &&
      totalValidos > 0 &&
      totalValidos === totalFatura;

    resultado.set(faturaId, {
      fatura_id: faturaId,
      itens,
      motivos,
      periodo_referencia: textOrNull(fatura?.periodo_referencia),
      pode_importar_folha: podeImportarFolha,
      possui_inconsistencia: motivos.length > 0 || totalValidos !== totalFatura,
      status_fatura: statusFatura,
      total_fatura_centavos: totalFatura,
      total_invalidos_centavos: totalInvalidos,
      total_lancamentos_centavos: totalLancamentos,
      total_validos_centavos: totalValidos,
    });
  }

  return resultado;
}
