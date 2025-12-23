# Estado Atual - Matriculas (Operacional)

Gerado em: 2025-12-23T17:50:10.7217809-03:00

## Objetivo
- Registrar como o modulo esta estruturado HOJE (SQL + APIs + telas de teste).
- Base para a grande mudanca: Matricula -> lancamentos no Cartao Conexao (faturas).

## Migrations relacionadas
  
  Mode   LastWriteTime       Length Name
  ----   -------------       ------ ----
  -a---- 03/12/2025 08:51:14    635 2025-12-03-01_relax_matriculas_planos_contratos.sql
  -a---- 12/12/2025 06:28:58    889 2025-12-12_loja_estoque_movimentos.sql
  -a---- 12/12/2025 19:44:01    738 2025-12-12_loja_estoque_movimentos_motivo.sql
  -a---- 03/12/2025 08:51:14   1061 20251202120000_turma_professores.sql
  -a---- 03/12/2025 08:51:14   6970 20251202_etapa1_criar_matriculas_e_ajustar_turma_aluno.sql
  -a---- 04/12/2025 16:04:29   6766 202512041500_loja_v0.sql
  -a---- 05/12/2025 12:34:11   3982 202512051800_loja_fornecedores.sql
  -a---- 06/12/2025 23:23:45   1349 202512061200_loja_produtos_fornecedor_datas.sql
  -a---- 07/12/2025 01:44:02   3287 202512071200_loja_vendas_items_v0.sql
  -a---- 07/12/2025 20:31:09   1403 20251207_add_conta_pagar_id_to_loja_pedidos_compra.sql
  -a---- 07/12/2025 22:57:07   2331 20251207_loja_compras_recebimentos_e_bloqueio_venda.sql
  -a---- 07/12/2025 02:45:40    873 202512081200_loja_estoque_movimentos_v0.sql
  -a---- 07/12/2025 03:44:25   2525 202512091200_loja_compras_v0.sql
  -a---- 08/12/2025 00:48:27   6253 20251209_add_financial_mapping_to_loja_produto_categoria.sql
  -a---- 09/12/2025 23:43:09   2856 20251209_cartao_credito_etapa1.sql
  -a---- 08/12/2025 00:50:58   3643 20251209_financial_mapping_only_in_subcategories.sql
  -a---- 07/12/2025 12:16:20    327 202512101000_loja_pedidos_compra_conta_pagar_id.sql
  -a---- 08/12/2025 14:27:20    698 20251210_add_categoria_subcategoria_to_loja_produtos.sql
  -a---- 10/12/2025 00:33:14    163 20251210_add_updated_at_contas_financeiras.sql
  -a---- 08/12/2025 19:35:20   2635 20251210_create_loja_produto_categoria.sql
  -a---- 10/12/2025 13:04:18   6190 20251210_credito_conexao.sql
  -a---- 10/12/2025 13:41:40    365 20251210_credito_conexao_contas_limites.sql
  -a---- 10/12/2025 13:19:38    763 20251210_formas_pagamento_cartao_conexao.sql
  -a---- 10/12/2025 08:34:38   2114 20251210_formas_pagamento_etapa1.sql
  -a---- 09/12/2025 10:00:22   1190 202512111000_add_categoria_subcategoria_id_loja_produtos.sql
  -a---- 09/12/2025 10:36:13    980 202512111010_add_fornecedor_principal_id_loja_produtos.sql
  -a---- 11/12/2025 14:09:48    337 20251211_credito_conexao_parcelas_taxas.sql
  -a---- 11/12/2025 09:17:51   1547 20251211_credito_conexao_regras_parcelas.sql
  -a---- 12/12/2025 04:17:46    226 20251212_add_loja_vendas_conexao_fields.sql
  -a---- 13/12/2025 10:37:02   5798 20251213_lojav1_variantes_modelo_cadastros.sql
  -a---- 13/12/2025 18:37:00   1995 202512150900_loja_estoque_por_variantes_view.sql
  -a---- 15/12/2025 02:13:37   1545 20251215_dashboard_financeiro_inteligente.sql
  -a---- 15/12/2025 05:04:20    829 20251215_unificar_formas_pagamento_financeiro.sql
  -a---- 18/12/2025 08:42:21   1629 20251218_governanca_boletos_neofin.sql
  -a---- 19/12/2025 01:33:36   4756 20251219_credito_conexao_faturas_unique_periodo.sql
  -a---- 19/12/2025 00:55:31  12730 20251219_roles_sistema_perfis_base.sql
  -a---- 23/12/2025 09:08:30   4409 20251223_1700_matriculas_config_planos.sql
  -a---- 23/12/2025 15:06:58   4562 20251223_1830_cobrancas_encargos_e_datas_acordo.sql

## Rotas API Matriculas (paths)
  17:src/app/api\matriculas\operacional\[matriculaId]\route.ts
  24:src/app/api\matriculas\operacional\encerrar\route.ts
  34:src/app/api\matriculas\operacional\criar\route.ts
  36:src/app/api\matriculas\novo\route.ts
  39:src/app/api\matriculas\operacional\aplicar-acordo\route.ts
  56:src/app/api\admin\matriculas\precos\route.ts
  63:src/app/api\admin\matriculas\configuracoes\route.ts
  76:src/app/api\admin\matriculas\planos\[id]\route.ts
  79:src/app/api\admin\matriculas\planos\route.ts

## Rotas especificas (operacionais)
  .\src\app\api\matriculas\novo\route.ts
  .\src\app\api\matriculas\operacional\aplicar-acordo\README.md
  .\src\app\api\matriculas\operacional\aplicar-acordo\route.ts
  .\src\app\api\matriculas\operacional\criar\README.md
  .\src\app\api\matriculas\operacional\criar\route.ts
  .\src\app\api\matriculas\operacional\encerrar\README.md
  .\src\app\api\matriculas\operacional\encerrar\route.ts

## Tela de teste
  (nenhuma)


## API 4 - Criar matricula (operacional)

### Arquivo
```
src/app/api/matriculas/operacional/criar/route.ts
```

### Codigo
```ts
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

function buildDescricao(params: {
  anoReferencia: number;
  turmaId: number;
  origemSubtipo: "PRORATA_AJUSTE" | "ANUIDADE_PARCELA";
  parcelaNumero: number | null;
  totalParcelas: number | null;
}): string {
  const { anoReferencia, turmaId, origemSubtipo, parcelaNumero, totalParcelas } = params;

  if (origemSubtipo === "PRORATA_AJUSTE") {
    return `Matricula ${anoReferencia} - Pro-rata (ajuste inicial) - Turma ${turmaId}`;
  }

  if (parcelaNumero && totalParcelas) {
    return `Matricula ${anoReferencia} - Parcela ${parcelaNumero}/${totalParcelas} - Turma ${turmaId}`;
  }

  return `Matricula ${anoReferencia} - Cobranca - Turma ${turmaId}`;
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
            descricao: buildDescricao({
              anoReferencia: anoRef,
              turmaId,
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
          descricao: buildDescricao({
            anoReferencia: anoRef,
            turmaId,
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
```

### README
```md
# POST /api/matriculas/operacional/criar

## Objetivo
Criar matricula operacional completa (transacao unica):
- cria `matriculas`
- cria vinculo pedagogico em `turma_aluno`
- gera cobrancas:
  - pro-rata (opcional)  `origem_subtipo = PRORATA_AJUSTE`
  - 12 parcelas anuais  `origem_subtipo = ANUIDADE_PARCELA`

## Regras fechadas
- vencimento e fixo (contratual)
- acordo nao altera vencimento: ajusta `data_prevista_pagamento` e `data_inicio_encargos` em rotas especificas
- ao criar, default:
  - `data_prevista_pagamento = vencimento`
  - `data_inicio_encargos = vencimento`
- `multa_percentual_aplicavel` e `juros_mora_percentual_mensal_aplicavel` vem de `matricula_configuracoes` ativa
- mes comercial = 30 dias
- Atualizacao: `cobrancas.descricao` e obrigatorio (NOT NULL) e e preenchido automaticamente pela API.

## Payload
```json
{
  "pessoa_id": 123,
  "responsavel_financeiro_id": 456,
  "turma_id": 789,
  "ano_referencia": 2026,
  "data_matricula": "2026-02-10",
  "mes_inicio_cobranca": 2,
  "gerar_prorata": true
}
```

Resposta (201): retorna matricula, vinculo e lista basica das cobrancas criadas
(id, subtipo, vencimento, valor, parcela_numero).
```

## API 5 - Aplicar acordo em cobranca

### Codigo
```ts
import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";

export const runtime = "nodejs";

type AplicarAcordoBody = {
  cobranca_id: number;
  data_prevista_pagamento: string; // YYYY-MM-DD
  data_inicio_encargos: string; // YYYY-MM-DD
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function okISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split("-").map((v) => Number(v));
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return null;
  return v;
}

async function getCobrancaInfo(
  client: PoolClient,
  cobrancaId: number
): Promise<{
  id: number;
  parcela_numero: number | null;
  total_parcelas: number | null;
  origem_tipo: string | null;
  origem_id: number | null;
} | null> {
  const { rows } = await client.query(
    `
    SELECT id, parcela_numero, total_parcelas, origem_tipo, origem_id
    FROM public.cobrancas
    WHERE id = $1
    LIMIT 1
    `,
    [cobrancaId]
  );

  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;

  return {
    id: Number(r.id),
    parcela_numero:
      r.parcela_numero === null || r.parcela_numero === undefined ? null : Number(r.parcela_numero),
    total_parcelas:
      r.total_parcelas === null || r.total_parcelas === undefined ? null : Number(r.total_parcelas),
    origem_tipo: r.origem_tipo === null || r.origem_tipo === undefined ? null : String(r.origem_tipo),
    origem_id: r.origem_id === null || r.origem_id === undefined ? null : Number(r.origem_id),
  };
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 }
    );
  }

  let body: Partial<AplicarAcordoBody> = {};
  try {
    const parsed: unknown = await req.json();
    body = parsed as Partial<AplicarAcordoBody>;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const cobrancaId = parsePositiveInt(body.cobranca_id);
  const dataPrevista =
    typeof body.data_prevista_pagamento === "string" ? body.data_prevista_pagamento : null;
  const dataInicio =
    typeof body.data_inicio_encargos === "string" ? body.data_inicio_encargos : null;

  if (!cobrancaId || !dataPrevista || !dataInicio) {
    return NextResponse.json(
      {
        error: "payload_invalido",
        message: "cobranca_id, data_prevista_pagamento e data_inicio_encargos sao obrigatorios.",
      },
      { status: 400 }
    );
  }

  if (!okISODate(dataPrevista) || !okISODate(dataInicio)) {
    return NextResponse.json(
      { error: "datas_invalidas", message: "Datas devem estar em YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (new Date(`${dataInicio}T00:00:00Z`).getTime() < new Date(`${dataPrevista}T00:00:00Z`).getTime()) {
    return NextResponse.json(
      {
        error: "regra_datas",
        message: "data_inicio_encargos nao pode ser menor que data_prevista_pagamento.",
      },
      { status: 422 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cobr = await getCobrancaInfo(client, cobrancaId);
    if (!cobr) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "cobranca_nao_encontrada" }, { status: 404 });
    }

    if (cobr.origem_tipo !== "MATRICULA") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        {
          error: "origem_invalida",
          message: "Acordo permitido apenas para cobrancas de origem MATRICULA.",
        },
        { status: 422 }
      );
    }

    if (cobr.parcela_numero !== null && cobr.total_parcelas !== null) {
      if (cobr.parcela_numero === cobr.total_parcelas) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          {
            error: "acordo_bloqueado_ultima_parcela",
            message: "A ultima parcela nao pode ter acordo.",
          },
          { status: 409 }
        );
      }
    }

    const { rows } = await client.query(
      `
      UPDATE public.cobrancas
      SET
        data_prevista_pagamento = $2,
        data_inicio_encargos = $3,
        updated_at = now()
      WHERE id = $1
      RETURNING id, data_prevista_pagamento, data_inicio_encargos, parcela_numero, total_parcelas, origem_tipo, origem_id
      `,
      [cobrancaId, dataPrevista, dataInicio]
    );

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, cobranca: rows[0] ?? null }, { status: 200 });
  } catch (e: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_aplicar_acordo", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
```

### README
```md
# API 5 - Aplicar acordo em cobranca (Matriculas)

POST `/api/matriculas/operacional/aplicar-acordo`

## Objetivo
Aplicar acordo sem mudar vencimento contratual:
- atualiza `data_prevista_pagamento`
- atualiza `data_inicio_encargos`

## Regras
- permitido apenas para cobrancas com `origem_tipo = 'MATRICULA'`
- bloqueado para ultima parcela: `parcela_numero = total_parcelas`
- `data_inicio_encargos >= data_prevista_pagamento`

## Payload
```json
{
  "cobranca_id": 123,
  "data_prevista_pagamento": "2026-03-10",
  "data_inicio_encargos": "2026-03-20"
}
```

Resposta:
- 200 com a cobranca atualizada
- 409 se for ultima parcela
```

## API 6 - Detalhe operacional da matricula

### Codigo
```ts
```

### README
```md
```

## API 7 - Encerrar matricula / vinculo

### Codigo
```ts
import { NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";

export const runtime = "nodejs";

type EncerrarMatriculaBody = {
  matricula_id: number;
  data_fim?: string; // YYYY-MM-DD (default: current_date)
  motivo?: string | null;
  cancelar_cobrancas_futuras?: boolean; // default false
};

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: process.env.SUPABASE_DB_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

function parsePositiveInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v <= 0) return null;
  return v;
}

function okISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

async function q1(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown> | null> {
  const { rows } = await client.query(sql, params);
  if (rows.length === 0) return null;
  return rows[0] as Record<string, unknown>;
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(
      { error: "env_invalida", message: "SUPABASE_DB_URL nao configurada." },
      { status: 500 }
    );
  }

  let body: Partial<EncerrarMatriculaBody> = {};
  try {
    const parsed: unknown = await req.json();
    body = parsed as Partial<EncerrarMatriculaBody>;
  } catch {
    return NextResponse.json({ error: "json_invalido" }, { status: 400 });
  }

  const matriculaId = parsePositiveInt(body.matricula_id);
  if (!matriculaId) {
    return NextResponse.json(
      { error: "payload_invalido", message: "matricula_id e obrigatorio e deve ser inteiro > 0." },
      { status: 400 }
    );
  }

  const cancelarFuturas = body.cancelar_cobrancas_futuras === true;
  const dataFim = typeof body.data_fim === "string" ? body.data_fim : null;
  if (dataFim && !okISODate(dataFim)) {
    return NextResponse.json({ error: "data_fim_invalida" }, { status: 400 });
  }

  const motivo = typeof body.motivo === "string" ? body.motivo : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const matricula = await q1(
      client,
      `
      SELECT id, status
      FROM public.matriculas
      WHERE id = $1
      LIMIT 1
      `,
      [matriculaId]
    );

    if (!matricula) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
    }

    const dataFimEfetiva =
      dataFim ?? String((await client.query("SELECT current_date::text AS d")).rows[0]?.d);

    const vinculo = await q1(
      client,
      `
      SELECT turma_aluno_id, status
      FROM public.turma_aluno
      WHERE matricula_id = $1
      ORDER BY turma_aluno_id DESC
      LIMIT 1
      `,
      [matriculaId]
    );

    if (vinculo) {
      await client.query(
        `
        UPDATE public.turma_aluno
        SET
          status = 'encerrado',
          dt_fim = $2
        WHERE turma_aluno_id = $1
        `,
        [Number(vinculo.turma_aluno_id), dataFimEfetiva]
      );
    }

    await client.query(
      `
      UPDATE public.matriculas
      SET
        status = 'CANCELADA',
        data_encerramento = $2,
        observacoes = COALESCE($3, observacoes),
        updated_at = now()
      WHERE id = $1
      `,
      [matriculaId, dataFimEfetiva, motivo]
    );

    if (cancelarFuturas) {
      await client.query(
        `
        UPDATE public.cobrancas
        SET
          status = 'CANCELADA',
          updated_at = now()
        WHERE origem_tipo = 'MATRICULA'
          AND origem_id = $1
          AND vencimento > $2
          AND status IN ('ABERTA', 'PENDENTE')
        `,
        [matriculaId, dataFimEfetiva]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json(
      {
        ok: true,
        matricula_id: matriculaId,
        data_fim: dataFimEfetiva,
        cancelar_cobrancas_futuras: cancelarFuturas,
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ error: "falha_encerrar_matricula", message: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
```

### README
```md
# API 7  Encerrar matricula/vinculo (operacional)

POST `/api/matriculas/operacional/encerrar`

## Objetivo
Encerrar, em transacao unica:
- vinculo pedagogico (`turma_aluno`) associado a matricula
- matricula (`matriculas.status = 'CANCELADA'`)
- opcionalmente cancelar cobrancas futuras abertas

## Payload
```json
{
  "matricula_id": 7,
  "data_fim": "2026-06-30",
  "motivo": "Mudanca de turma / cancelamento",
  "cancelar_cobrancas_futuras": true
}
```

Resposta
200: { ok: true, matricula_id, data_fim, cancelar_cobrancas_futuras }

404: matricula nao encontrada

500: erro interno
```


## Schema (consulta rapida)

### public.matriculas
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='matriculas'
ORDER BY ordinal_position;
```

### public.turma_aluno
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='turma_aluno'
ORDER BY ordinal_position;
```

### public.cobrancas
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='cobrancas'
ORDER BY ordinal_position;
```

