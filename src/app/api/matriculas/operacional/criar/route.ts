import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

type CriarMatriculaOperacionalBody = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  turma_id: number;
  ano_referencia: number;
  data_matricula?: string; // YYYY-MM-DD (default: current_date)
  mes_inicio_cobranca?: number; // 1..12
  gerar_prorata?: boolean; // default true
};

type MatriculaConfigAtiva = {
  id: number;
  parcelas_padrao: number;
  mes_referencia_dias: number;
  vencimento_dia_padrao: number;
  multa_percentual_padrao: string;
  juros_mora_percentual_mensal_padrao: string;
};

type PrecoTurmaAtivo = {
  id: number;
  turma_id: number;
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
    `
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

async function getPrecoTurmaAtivo(
  client: DbClient,
  turmaId: number,
  anoRef: number
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
    [turmaId, anoRef]
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    id: Number(r.id),
    turma_id: Number(r.turma_id),
    ano_referencia: Number(r.ano_referencia),
    plano_id: Number(r.plano_id),
    centro_custo_id:
      r.centro_custo_id === null || r.centro_custo_id === undefined
        ? null
        : Number(r.centro_custo_id),
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
    [planoId]
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
      $1,$2,$3,$4,'ABERTA',$5,$6,$7,$8,$9,$10,$11,$12,$13
    )
    RETURNING id
    `,
    [
      c.pessoa_id,
      c.centro_custo_id,
      c.valor_centavos,
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
    ]
  );

  return { id: Number(rows[0]?.id) };
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
    const turmaId = parsePositiveInt(body.turma_id);
    const anoRef = parsePositiveInt(body.ano_referencia);

    if (!pessoaId || !respFinId || !turmaId || !anoRef) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          message:
            "pessoa_id, responsavel_financeiro_id, turma_id, ano_referencia sao obrigatorios e devem ser inteiros > 0.",
        },
        { status: 400 }
      );
    }

    const dataMatricula = body.data_matricula && typeof body.data_matricula === "string"
      ? body.data_matricula
      : null;
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
        return NextResponse.json(
          { error: "configuracao_inexistente", message: "Nao existe configuracao ativa." },
          { status: 422 }
        );
      }

      const preco = await getPrecoTurmaAtivo(client, turmaId, anoRef);
      if (!preco) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "preco_inexistente", message: "Nao existe preco ativo para a turma/ano informado." },
          { status: 400 }
        );
      }

      const plano = await getPlanoAtivo(client, preco.plano_id);
      if (!plano) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "plano_inexistente", message: "Plano do preco esta inativo ou nao existe." },
          { status: 422 }
        );
      }

      const totalParcelas = plano.total_parcelas || config.parcelas_padrao;
      if (totalParcelas !== 12) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "parcelas_invalidas",
            message: `Total de parcelas esperado = 12, recebido = ${totalParcelas}.`,
          },
          { status: 422 }
        );
      }

      const mesComercialDias = config.mes_referencia_dias || 30;
      if (mesComercialDias !== 30) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "mes_comercial_invalido",
            message: `Mes comercial esperado = 30, recebido = ${mesComercialDias}.`,
          },
          { status: 422 }
        );
      }

      const diaVenc = clampInt(config.vencimento_dia_padrao, 1, 28);

      const { rows: pessoaRows } = await client.query(
        "SELECT id FROM public.pessoas WHERE id = $1",
        [pessoaId]
      );
      if (pessoaRows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
      }

      const { rows: respRows } = await client.query(
        "SELECT id FROM public.pessoas WHERE id = $1",
        [respFinId]
      );
      if (respRows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "responsavel_nao_encontrado" }, { status: 404 });
      }

      const { rows: turmaRows } = await client.query(
        "SELECT turma_id FROM public.turmas WHERE turma_id = $1",
        [turmaId]
      );
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
        [turmaId, pessoaId]
      );
      if (vinculoAtivoRows.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "vinculo_ativo_existente" }, { status: 409 });
      }

      const dataMatriculaEfetiva =
        dataMatricula ?? String((await client.query("SELECT current_date AS d")).rows[0]?.d);

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
          status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'ATIVA')
        RETURNING id, pessoa_id, responsavel_financeiro_id, vinculo_id, plano_matricula_id, ano_referencia, data_matricula, status
        `,
        [pessoaId, respFinId, "REGULAR", turmaId, plano.id, anoRef, dataMatriculaEfetiva]
      );

      const matricula = matriculaRows[0];
      const matriculaId = Number(matricula?.id);

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
        [turmaId, pessoaId, matriculaId, dataMatriculaEfetiva]
      );
      const turmaAluno = vincRows[0];

      const createdCobrancas: Array<{
        id: number;
        origem_subtipo: string;
        vencimento: string;
        valor_centavos: number;
        parcela_numero: number | null;
      }> = [];

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

      if (gerarProrata) {
        let vencBase = { year: baseYear, month: baseMonth };
        if (diaInicio > diaVenc) {
          vencBase = addMonths(baseYear, baseMonth, 1);
        }
        const vencProrata = toISODate(vencBase.year, vencBase.month, diaVenc);

        const diasUso =
          diaInicio <= diaVenc
            ? diaVenc - diaInicio
            : mesComercialDias - diaInicio + diaVenc;
        const fator = diasUso > 0 ? diasUso / mesComercialDias : 0;
        const valorProrata = roundCentavos(plano.valor_mensal_base_centavos * fator);

        if (valorProrata > 0) {
          const cobr = await inserirCobranca(client, {
            pessoa_id: respFinId,
            centro_custo_id: preco.centro_custo_id,
            valor_centavos: valorProrata,
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
        }
      }

      const valorParcela = roundCentavos(plano.valor_anuidade_centavos / 12);
      for (let i = 0; i < 12; i += 1) {
        const parcelaNumero = i + 1;
        const m = addMonths(startYear, startMonth, i);
        const venc = toISODate(m.year, m.month, diaVenc);

        const cobr = await inserirCobranca(client, {
          pessoa_id: respFinId,
          centro_custo_id: preco.centro_custo_id,
          valor_centavos: valorParcela,
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
      }

      await client.query("COMMIT");

      return NextResponse.json(
        {
          ok: true,
          matricula: {
            id: matriculaId,
            pessoa_id: Number(matricula?.pessoa_id),
            responsavel_financeiro_id: Number(matricula?.responsavel_financeiro_id),
            turma_id: turmaId,
            ano_referencia: Number(matricula?.ano_referencia),
            plano_id: plano.id,
            data_matricula: String(matricula?.data_matricula),
            status: String(matricula?.status),
          },
          turma_aluno: turmaAluno,
          cobrancas: createdCobrancas,
        },
        { status: 201 }
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
