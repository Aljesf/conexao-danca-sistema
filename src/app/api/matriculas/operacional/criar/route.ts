import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

type MetodoLiquidacao = "CARTAO_CONEXAO" | "COBRANCAS_LEGADO" | "CREDITO_BOLSA";

type CriarMatriculaOperacionalBody = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  turma_id?: number;
  servico_id?: number;
  ano_referencia: number;
  data_matricula?: string; // YYYY-MM-DD (default: current_date)
  mes_inicio_cobranca?: number; // 1..12
  gerar_prorata?: boolean; // default true
  metodo_liquidacao?: MetodoLiquidacao; // default CARTAO_CONEXAO
};

type MatriculaConfigAtiva = {
  id: number;
  parcelas_padrao: number;
  mes_referencia_dias: number;
  vencimento_dia_padrao: number;
  multa_percentual_padrao: string;
  juros_mora_percentual_mensal_padrao: string;
};

type ServicoTipo = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ServicoReferenciaTipo = "TURMA" | "LEGADO";

type ServicoAtivo = {
  id: number;
  tipo: ServicoTipo;
  referencia_tipo: ServicoReferenciaTipo;
  referencia_id: number | null;
  titulo: string;
};

type PrecoTurmaAtivo = {
  id: number;
  turma_id: number;
  ano_referencia: number;
  plano_id: number;
  centro_custo_id: number | null;
};

type PrecoServicoAtivo = {
  id: number;
  servico_id: number;
  ano_referencia: number;
  plano_id: number;
  centro_custo_id: number | null;
};

type PlanoAtivo = {
  id: number;
  valor_mensal_base_centavos: number;
  valor_anuidade_centavos: number;
  total_parcelas: number;
};

type CriarCobrancaInput = {
  pessoa_id: number;
  centro_custo_id: number | null;
  valor_centavos: number;
  descricao: string;
  vencimento: string; // YYYY-MM-DD
  origem_tipo: string; // "MATRICULA"
  origem_subtipo: string; // "PRORATA_AJUSTE" | "ANUIDADE_PARCELA"
  origem_id: number; // matricula_id
  parcela_numero: number | null;
  total_parcelas: number | null;
  data_prevista_pagamento: string; // YYYY-MM-DD
  data_inicio_encargos: string; // YYYY-MM-DD
  multa_percentual_aplicavel: string;
  juros_mora_percentual_mensal_aplicavel: string;
};

type CriarLancamentoCartaoInput = {
  conta_conexao_id: number;
  valor_centavos: number;
  numero_parcelas: number; // 1
  status: "PENDENTE_FATURA";
  origem_sistema: "MATRICULA";
  origem_id: number; // matriculas.id
  descricao: string;
};

type DbClient = {
  query: (q: string, p?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split("-").map((v) => Number(v));
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function roundCentavos(value: number): number {
  return Math.round(value);
}

function buildDescricaoCobranca(params: {
  anoReferencia: number;
  referenciaLabel: string;
  origemSubtipo: "PRORATA_AJUSTE" | "ANUIDADE_PARCELA";
  parcelaNumero: number | null;
  totalParcelas: number | null;
}): string {
  const { anoReferencia, referenciaLabel, origemSubtipo, parcelaNumero, totalParcelas } = params;

  if (origemSubtipo === "PRORATA_AJUSTE") {
    return `Matricula ${anoReferencia} - Pro-rata (ajuste inicial) - ${referenciaLabel}`;
  }

  if (parcelaNumero && totalParcelas) {
    return `Matricula ${anoReferencia} - Parcela ${parcelaNumero}/${totalParcelas} - ${referenciaLabel}`;
  }

  return `Matricula ${anoReferencia} - Cobranca - ${referenciaLabel}`;
}

function buildDescricaoLancamento(params: {
  anoReferencia: number;
  referenciaLabel: string;
  origemSubtipo: "PRORATA_AJUSTE" | "ANUIDADE_PARCELA";
  parcelaNumero: number | null;
  totalParcelas: number | null;
  vencimentoISO: string;
}): string {
  const base = buildDescricaoCobranca({
    anoReferencia: params.anoReferencia,
    referenciaLabel: params.referenciaLabel,
    origemSubtipo: params.origemSubtipo,
    parcelaNumero: params.parcelaNumero,
    totalParcelas: params.totalParcelas,
  });
  return `${base} - Venc ${params.vencimentoISO}`;
}

function addMonths(year: number, month: number, add: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + add;
  const newYear = Math.floor(idx / 12);
  const newMonth = (idx % 12) + 1;
  return { year: newYear, month: newMonth };
}

async function getConfigAtiva(client: DbClient): Promise<MatriculaConfigAtiva | null> {
  const { rows } = await client.query(
    `
    SELECT
      id,
      parcelas_padrao,
      mes_referencia_dias,
      vencimento_dia_padrao,
      multa_percentual_padrao,
      juros_mora_percentual_mensal_padrao
    FROM public.matricula_configuracoes
    WHERE ativo = true
    ORDER BY id DESC
    LIMIT 1
    `,
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    parcelas_padrao: Number(r.parcelas_padrao),
    mes_referencia_dias: Number(r.mes_referencia_dias),
    vencimento_dia_padrao: Number(r.vencimento_dia_padrao),
    multa_percentual_padrao: String(r.multa_percentual_padrao),
    juros_mora_percentual_mensal_padrao: String(r.juros_mora_percentual_mensal_padrao),
  };
}

async function getServicoAtivo(client: DbClient, servicoId: number): Promise<ServicoAtivo | null> {
  const { rows } = await client.query(
    `
    SELECT
      id,
      tipo,
      referencia_tipo,
      referencia_id,
      titulo
    FROM public.servicos
    WHERE ativo = true
      AND id = $1
    LIMIT 1
    `,
    [servicoId],
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    tipo: String(r.tipo) as ServicoTipo,
    referencia_tipo: String(r.referencia_tipo) as ServicoReferenciaTipo,
    referencia_id: r.referencia_id === null || r.referencia_id === undefined ? null : Number(r.referencia_id),
    titulo: String(r.titulo),
  };
}

async function getPrecoTurmaAtivo(
  client: DbClient,
  turmaId: number,
  anoRef: number,
): Promise<PrecoTurmaAtivo | null> {
  const { rows } = await client.query(
    `
    SELECT
      id,
      turma_id,
      ano_referencia,
      plano_id,
      centro_custo_id
    FROM public.matricula_precos_turma
    WHERE ativo = true
      AND turma_id = $1
      AND ano_referencia = $2
    ORDER BY id DESC
    LIMIT 1
    `,
    [turmaId, anoRef],
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    turma_id: Number(r.turma_id),
    ano_referencia: Number(r.ano_referencia),
    plano_id: Number(r.plano_id),
    centro_custo_id:
      r.centro_custo_id === null || r.centro_custo_id === undefined ? null : Number(r.centro_custo_id),
  };
}

async function getPrecoServicoAtivo(
  client: DbClient,
  servicoId: number,
  anoRef: number,
): Promise<PrecoServicoAtivo | null> {
  const { rows } = await client.query(
    `
    SELECT
      id,
      servico_id,
      ano_referencia,
      plano_id,
      centro_custo_id
    FROM public.matricula_precos_servico
    WHERE ativo = true
      AND servico_id = $1
      AND ano_referencia = $2
    ORDER BY id DESC
    LIMIT 1
    `,
    [servicoId, anoRef],
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    servico_id: Number(r.servico_id),
    ano_referencia: Number(r.ano_referencia),
    plano_id: Number(r.plano_id),
    centro_custo_id:
      r.centro_custo_id === null || r.centro_custo_id === undefined ? null : Number(r.centro_custo_id),
  };
}

async function getPlanoAtivo(client: DbClient, planoId: number): Promise<PlanoAtivo | null> {
  const { rows } = await client.query(
    `
    SELECT
      id,
      valor_mensal_base_centavos,
      valor_anuidade_centavos,
      total_parcelas
    FROM public.matricula_planos
    WHERE ativo = true
      AND id = $1
    LIMIT 1
    `,
    [planoId],
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    valor_mensal_base_centavos: Number(r.valor_mensal_base_centavos),
    valor_anuidade_centavos: Number(r.valor_anuidade_centavos),
    total_parcelas: Number(r.total_parcelas),
  };
}

async function inserirCobranca(client: DbClient, c: CriarCobrancaInput): Promise<{ id: number }> {
  const { rows } = await client.query(
    `
    INSERT INTO public.cobrancas (
      pessoa_id,
      centro_custo_id,
      valor_centavos,
      descricao,
      vencimento,
      status,
      origem_tipo,
      origem_subtipo,
      origem_id,
      parcela_numero,
      total_parcelas,
      data_prevista_pagamento,
      data_inicio_encargos,
      multa_percentual_aplicavel,
      juros_mora_percentual_mensal_aplicavel
    ) VALUES (
      $1,$2,$3,$4,$5,'ABERTA',$6,$7,$8,$9,$10,$11,$12,$13,$14
    )
    RETURNING id
    `,
    [
      c.pessoa_id,
      c.centro_custo_id,
      c.valor_centavos,
      c.descricao,
      c.vencimento,
      c.origem_tipo,
      c.origem_subtipo,
      c.origem_id,
      c.parcela_numero,
      c.total_parcelas,
      c.data_prevista_pagamento,
      c.data_inicio_encargos,
      c.multa_percentual_aplicavel,
      c.juros_mora_percentual_mensal_aplicavel,
    ],
  );

  return { id: Number(rows[0]?.id) };
}

async function ensureContaConexaoAluno(
  client: DbClient,
  responsavelFinanceiroId: number,
  centroCustoPrincipalId: number | null,
  vencimentoDiaPadrao: number,
): Promise<number> {
  const { rows: existing } = await client.query(
    `
    SELECT id, ativo
    FROM public.credito_conexao_contas
    WHERE pessoa_titular_id = $1
      AND tipo_conta = 'ALUNO'
    ORDER BY id DESC
    LIMIT 1
    `,
    [responsavelFinanceiroId],
  );

  if (existing.length > 0) {
    const row = existing[0];
    const id = Number(row.id);
    const ativo = row.ativo === true || row.ativo === "true";
    if (!ativo) {
      throw new Error("conta_conexao_inativa");
    }
    return id;
  }

  const { rows } = await client.query(
    `
    INSERT INTO public.credito_conexao_contas (
      pessoa_titular_id,
      tipo_conta,
      descricao_exibicao,
      dia_fechamento,
      dia_vencimento,
      centro_custo_principal_id,
      ativo,
      created_at,
      updated_at
    ) VALUES (
      $1,'ALUNO',NULL,10,$2,$3,true,now(),now()
    )
    RETURNING id
    `,
    [responsavelFinanceiroId, vencimentoDiaPadrao, centroCustoPrincipalId],
  );

  return Number(rows[0]?.id);
}

async function inserirLancamentoCartao(client: DbClient, l: CriarLancamentoCartaoInput): Promise<number> {
  const { rows } = await client.query(
    `
    INSERT INTO public.credito_conexao_lancamentos (
      conta_conexao_id,
      valor_centavos,
      numero_parcelas,
      status,
      origem_sistema,
      origem_id,
      descricao,
      created_at,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,now(),now()
    )
    RETURNING id
    `,
    [
      l.conta_conexao_id,
      l.valor_centavos,
      l.numero_parcelas,
      l.status,
      l.origem_sistema,
      l.origem_id,
      l.descricao,
    ],
  );

  return Number(rows[0]?.id);
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json({ error: "config_incompleta" }, { status: 500 });
  }

  try {
    const bodyUnknown: unknown = await req.json();
    const body = bodyUnknown as Partial<CriarMatriculaOperacionalBody>;

    const pessoaId = parsePositiveInt(body.pessoa_id);
    const respFinId = parsePositiveInt(body.responsavel_financeiro_id);
    const turmaIdInput = parsePositiveInt(body.turma_id);
    const servicoId = parsePositiveInt(body.servico_id);
    const anoRef = parsePositiveInt(body.ano_referencia);

    if (!pessoaId || !respFinId || !anoRef || (!turmaIdInput && !servicoId)) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          message:
            "pessoa_id, responsavel_financeiro_id, ano_referencia e (turma_id ou servico_id) sao obrigatorios e devem ser inteiros > 0.",
        },
        { status: 400 },
      );
    }
    if (turmaIdInput && servicoId) {
      return NextResponse.json(
        { error: "payload_invalido", message: "Informe apenas um entre turma_id e servico_id." },
        { status: 400 },
      );
    }

    const metodoLiquidacao: MetodoLiquidacao = (body.metodo_liquidacao ?? "CARTAO_CONEXAO") as MetodoLiquidacao;

    const dataMatricula =
      body.data_matricula && typeof body.data_matricula === "string" ? body.data_matricula : null;
    if (dataMatricula && !isValidISODate(dataMatricula)) {
      return NextResponse.json({ error: "data_matricula_invalida" }, { status: 400 });
    }

    const gerarProrata = body.gerar_prorata !== false;

    const mesInicioCobranca =
      typeof body.mes_inicio_cobranca === "number" && Number.isInteger(body.mes_inicio_cobranca)
        ? clampInt(body.mes_inicio_cobranca, 1, 12)
        : null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const config = await getConfigAtiva(client);
      if (!config) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "configuracao_inexistente", message: "Nao existe configuracao ativa." }, { status: 422 });
      }

      let servico: ServicoAtivo | null = null;
      let turmaId: number | null = turmaIdInput;
      let vinculoId: number | null = turmaIdInput;

      if (servicoId) {
        servico = await getServicoAtivo(client, servicoId);
        if (!servico) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "servico_inexistente", message: "Servico nao encontrado ou inativo." }, { status: 404 });
        }

        const referenciaId =
          servico.referencia_id !== null && servico.referencia_id !== undefined ? Number(servico.referencia_id) : null;
        if (!referenciaId || referenciaId <= 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "servico_referencia_invalida", message: "Servico sem referencia valida." },
            { status: 422 },
          );
        }

        vinculoId = referenciaId;

        if (servico.referencia_tipo === "TURMA") {
          turmaId = referenciaId;
        } else {
          turmaId = null;
        }
      }

      const preco = servicoId
        ? await getPrecoServicoAtivo(client, servicoId, anoRef)
        : turmaId
          ? await getPrecoTurmaAtivo(client, turmaId, anoRef)
          : null;
      if (!preco) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "preco_inexistente",
            message: servicoId
              ? "Nao existe preco ativo para o servico/ano informado."
              : "Nao existe preco ativo para a turma/ano informado.",
          },
          { status: 400 },
        );
      }

      const plano = await getPlanoAtivo(client, preco.plano_id);
      if (!plano) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "plano_inexistente", message: "Plano do preco esta inativo ou nao existe." }, { status: 422 });
      }

      const totalParcelas = plano.total_parcelas || config.parcelas_padrao;
      if (totalParcelas !== 12) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "parcelas_invalidas", message: `Total de parcelas esperado = 12, recebido = ${totalParcelas}.` }, { status: 422 });
      }

      const mesComercialDias = config.mes_referencia_dias || 30;
      if (mesComercialDias !== 30) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "mes_comercial_invalido", message: `Mes comercial esperado = 30, recebido = ${mesComercialDias}.` }, { status: 422 });
      }

      const diaVenc = clampInt(config.vencimento_dia_padrao, 1, 28);

      const { rows: pessoaRows } = await client.query("SELECT id FROM public.pessoas WHERE id = $1", [pessoaId]);
      if (pessoaRows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
      }

      const { rows: respRows } = await client.query("SELECT id FROM public.pessoas WHERE id = $1", [respFinId]);
      if (respRows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "responsavel_nao_encontrado" }, { status: 404 });
      }

      if (turmaId) {
        const { rows: turmaRows } = await client.query("SELECT turma_id FROM public.turmas WHERE turma_id = $1", [turmaId]);
        if (turmaRows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "turma_nao_encontrada" }, { status: 404 });
        }

        const { rows: vinculoAtivoRows } = await client.query(
          `
          SELECT turma_aluno_id
          FROM public.turma_aluno
          WHERE turma_id = $1
            AND aluno_pessoa_id = $2
            AND dt_fim IS NULL
            AND (status IS NULL OR LOWER(status) = 'ativo')
          LIMIT 1
          `,
          [turmaId, pessoaId],
        );
        if (vinculoAtivoRows.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "vinculo_ativo_existente" }, { status: 409 });
        }
      }

      const dataMatriculaEfetiva =
        dataMatricula ?? String((await client.query("SELECT current_date AS d")).rows[0]?.d);

      const tipoMatricula = servico?.tipo ?? "REGULAR";

      const { rows: matriculaRows } = await client.query(
        `
        INSERT INTO public.matriculas (
          pessoa_id,
          responsavel_financeiro_id,
          tipo_matricula,
          vinculo_id,
          plano_matricula_id,
          ano_referencia,
          data_matricula,
          status,
          metodo_liquidacao,
          servico_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ATIVA',$8,$9)
        RETURNING id, pessoa_id, responsavel_financeiro_id, vinculo_id, plano_matricula_id, ano_referencia, data_matricula, status, metodo_liquidacao, servico_id
        `,
        [pessoaId, respFinId, tipoMatricula, vinculoId, plano.id, anoRef, dataMatriculaEfetiva, metodoLiquidacao, servicoId ?? null],
      );

      const matricula = matriculaRows[0];
      const matriculaId = Number(matricula?.id);

      let turmaAluno: Record<string, unknown> | null = null;
      if (turmaId) {
        const { rows: vincRows } = await client.query(
          `
          INSERT INTO public.turma_aluno (
            turma_id,
            aluno_pessoa_id,
            matricula_id,
            dt_inicio,
            status
          ) VALUES ($1,$2,$3,$4,'ativo')
          RETURNING turma_aluno_id, turma_id, aluno_pessoa_id, matricula_id, dt_inicio, status
          `,
          [turmaId, pessoaId, matriculaId, dataMatriculaEfetiva],
        );
        turmaAluno = vincRows[0];
      }

      if (metodoLiquidacao === "CARTAO_CONEXAO") {
        const { rows: jaExiste } = await client.query(
          `
          SELECT id
          FROM public.credito_conexao_lancamentos
          WHERE origem_sistema = 'MATRICULA'
            AND origem_id = $1
          LIMIT 1
          `,
          [matriculaId],
        );
        if (jaExiste.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "matricula_financeiro_ja_gerado" }, { status: 409 });
        }
      }

      const createdCobrancas: Array<{
        id: number;
        origem_subtipo: string;
        vencimento: string;
        valor_centavos: number;
        parcela_numero: number | null;
      }> = [];

      const createdLancamentos: Array<{
        id: number;
        descricao: string;
        valor_centavos: number;
        status: "PENDENTE_FATURA";
      }> = [];

      const referenciaLabel = turmaId ? `Turma ${turmaId}` : servico ? `Servico ${servico.id}` : "Servico";

      const dt = new Date(`${String(dataMatriculaEfetiva)}T00:00:00Z`);
      const baseYear = dt.getUTCFullYear();
      const baseMonth = dt.getUTCMonth() + 1;
      const diaInicio = clampInt(dt.getUTCDate(), 1, mesComercialDias);

      let startYear = baseYear;
      let startMonth = mesInicioCobranca ?? baseMonth;
      if (mesInicioCobranca !== null) {
        if (startMonth < baseMonth) {
          startYear = baseYear + 1;
        } else if (startMonth === baseMonth && diaInicio > diaVenc) {
          const next = addMonths(startYear, startMonth, 1);
          startYear = next.year;
          startMonth = next.month;
        }
      } else if (diaInicio > diaVenc) {
        const next = addMonths(baseYear, baseMonth, 1);
        startYear = next.year;
        startMonth = next.month;
      }

      let contaConexaoId: number | null = null;
      if (metodoLiquidacao === "CARTAO_CONEXAO") {
        contaConexaoId = await ensureContaConexaoAluno(client, respFinId, preco.centro_custo_id, diaVenc);
      }

      if (gerarProrata) {
        let vencBase = { year: baseYear, month: baseMonth };
        if (diaInicio > diaVenc) {
          vencBase = addMonths(baseYear, baseMonth, 1);
        }
        const vencProrata = toISODate(vencBase.year, vencBase.month, diaVenc);

        const diasUso =
          diaInicio <= diaVenc ? diaVenc - diaInicio : mesComercialDias - diaInicio + diaVenc;
        const fator = diasUso > 0 ? diasUso / mesComercialDias : 0;
        const valorProrata = roundCentavos(plano.valor_mensal_base_centavos * fator);

        if (valorProrata > 0) {
          if (metodoLiquidacao === "COBRANCAS_LEGADO") {
            const cobr = await inserirCobranca(client, {
              pessoa_id: respFinId,
              centro_custo_id: preco.centro_custo_id,
              valor_centavos: valorProrata,
              descricao: buildDescricaoCobranca({
                anoReferencia: anoRef,
                referenciaLabel,
                origemSubtipo: "PRORATA_AJUSTE",
                parcelaNumero: null,
                totalParcelas: null,
              }),
              vencimento: vencProrata,
              origem_tipo: "MATRICULA",
              origem_subtipo: "PRORATA_AJUSTE",
              origem_id: matriculaId,
              parcela_numero: null,
              total_parcelas: null,
              data_prevista_pagamento: vencProrata,
              data_inicio_encargos: vencProrata,
              multa_percentual_aplicavel: config.multa_percentual_padrao,
              juros_mora_percentual_mensal_aplicavel: config.juros_mora_percentual_mensal_padrao,
            });

            createdCobrancas.push({
              id: cobr.id,
              origem_subtipo: "PRORATA_AJUSTE",
              vencimento: vencProrata,
              valor_centavos: valorProrata,
              parcela_numero: null,
            });
          } else if (metodoLiquidacao === "CARTAO_CONEXAO" && contaConexaoId) {
            const desc = buildDescricaoLancamento({
              anoReferencia: anoRef,
              referenciaLabel,
              origemSubtipo: "PRORATA_AJUSTE",
              parcelaNumero: null,
              totalParcelas: null,
              vencimentoISO: vencProrata,
            });

            const idLanc = await inserirLancamentoCartao(client, {
              conta_conexao_id: contaConexaoId,
              valor_centavos: valorProrata,
              numero_parcelas: 1,
              status: "PENDENTE_FATURA",
              origem_sistema: "MATRICULA",
              origem_id: matriculaId,
              descricao: desc,
            });

            createdLancamentos.push({ id: idLanc, descricao: desc, valor_centavos: valorProrata, status: "PENDENTE_FATURA" });
          }
        }
      }

      const valorParcela = roundCentavos(plano.valor_anuidade_centavos / 12);

      for (let i = 0; i < 12; i += 1) {
        const parcelaNumero = i + 1;
        const m = addMonths(startYear, startMonth, i);
        const venc = toISODate(m.year, m.month, diaVenc);

        if (metodoLiquidacao === "COBRANCAS_LEGADO") {
          const cobr = await inserirCobranca(client, {
            pessoa_id: respFinId,
            centro_custo_id: preco.centro_custo_id,
            valor_centavos: valorParcela,
            descricao: buildDescricaoCobranca({
              anoReferencia: anoRef,
              referenciaLabel,
              origemSubtipo: "ANUIDADE_PARCELA",
              parcelaNumero,
              totalParcelas: 12,
            }),
            vencimento: venc,
            origem_tipo: "MATRICULA",
            origem_subtipo: "ANUIDADE_PARCELA",
            origem_id: matriculaId,
            parcela_numero: parcelaNumero,
            total_parcelas: 12,
            data_prevista_pagamento: venc,
            data_inicio_encargos: venc,
            multa_percentual_aplicavel: config.multa_percentual_padrao,
            juros_mora_percentual_mensal_aplicavel: config.juros_mora_percentual_mensal_padrao,
          });

          createdCobrancas.push({
            id: cobr.id,
            origem_subtipo: "ANUIDADE_PARCELA",
            vencimento: venc,
            valor_centavos: valorParcela,
            parcela_numero: parcelaNumero,
          });
        } else if (metodoLiquidacao === "CARTAO_CONEXAO" && contaConexaoId) {
          const desc = buildDescricaoLancamento({
            anoReferencia: anoRef,
            referenciaLabel,
            origemSubtipo: "ANUIDADE_PARCELA",
            parcelaNumero,
            totalParcelas: 12,
            vencimentoISO: venc,
          });

          const idLanc = await inserirLancamentoCartao(client, {
            conta_conexao_id: contaConexaoId,
            valor_centavos: valorParcela,
            numero_parcelas: 1,
            status: "PENDENTE_FATURA",
            origem_sistema: "MATRICULA",
            origem_id: matriculaId,
            descricao: desc,
          });

          createdLancamentos.push({ id: idLanc, descricao: desc, valor_centavos: valorParcela, status: "PENDENTE_FATURA" });
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          ok: true,
          matricula: {
            id: matriculaId,
            pessoa_id: Number(matricula?.pessoa_id),
            responsavel_financeiro_id: Number(matricula?.responsavel_financeiro_id),
            turma_id: turmaId ?? null,
            servico_id:
              matricula?.servico_id === null || matricula?.servico_id === undefined
                ? null
                : Number(matricula?.servico_id),
            ano_referencia: Number(matricula?.ano_referencia),
            plano_id: plano.id,
            data_matricula: String(matricula?.data_matricula),
            status: String(matricula?.status),
            metodo_liquidacao: String(matricula?.metodo_liquidacao ?? metodoLiquidacao),
          },
          turma_aluno: turmaAluno,
          cobrancas: metodoLiquidacao === "COBRANCAS_LEGADO" ? createdCobrancas : [],
          lancamentos_cartao: metodoLiquidacao === "CARTAO_CONEXAO" ? createdLancamentos : [],
        },
        { status: 201 },
      );
    } catch (e: unknown) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // noop
      }
      const msg = e instanceof Error ? e.message : "erro_desconhecido";
      return NextResponse.json({ error: "falha_criar_matricula", message: msg }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_request", message: msg }, { status: 400 });
  }
}
