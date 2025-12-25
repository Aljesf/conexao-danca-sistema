import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

type MetodoLiquidacao = "CARTAO_CONEXAO" | "COBRANCAS_LEGADO" | "CREDITO_BOLSA" | "OUTRO";

type CriarMatriculaOperacionalBody = {
  pessoa_id?: number;
  aluno_pessoa_id?: number;
  responsavel_financeiro_id?: number;
  responsavel_financeiro_pessoa_id?: number;
  turma_id?: number;
  servico_id?: number;
  ano_referencia?: number;
  data_matricula?: string; // YYYY-MM-DD (default: current_date)
  mes_inicio_cobranca?: number; // 1..12
  gerar_prorata?: boolean; // default true
  metodo_liquidacao?: MetodoLiquidacao; // default CARTAO_CONEXAO
  itens?: Array<{ item_id: number; quantidade?: number }>;
};

type ItemSelecionado = {
  item_id: number;
  quantidade: number;
};

type MatriculaConfigAtiva = {
  vencimento_dia_padrao: number;
};

type ServicoTipo = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type ServicoReferenciaTipo = "TURMA" | "LEGADO" | "PROJETO";

type ServicoAtivo = {
  id: number;
  tipo: ServicoTipo;
  referencia_tipo: ServicoReferenciaTipo;
  referencia_id: number | null;
  titulo: string;
};

type ServicoItemAtivo = {
  id: number;
  servico_id: number;
  codigo: string;
  nome: string;
  tipo_item: string;
};

type ServicoItemPrecoAtivo = {
  id: number;
  item_id: number;
  valor_centavos: number;
  moeda: string;
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

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function normalizeItensInput(value: unknown): ItemSelecionado[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const map = new Map<number, number>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const itemId = parsePositiveInt(record.item_id);
    if (!itemId) return null;
    const quantidadeRaw = record.quantidade === undefined ? 1 : record.quantidade;
    const quantidade = parsePositiveInt(quantidadeRaw);
    if (!quantidade) return null;
    map.set(itemId, (map.get(itemId) ?? 0) + quantidade);
  }
  return Array.from(map, ([item_id, quantidade]) => ({ item_id, quantidade }));
}

function calcularIdade(nascimentoISO: string | null): number | null {
  if (!nascimentoISO) return null;
  const match = nascimentoISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (!ano || !mes || !dia) return null;

  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - ano;
  const mesAtual = hoje.getUTCMonth() + 1;
  const diaAtual = hoje.getUTCDate();
  if (mesAtual < mes || (mesAtual === mes && diaAtual < dia)) {
    idade -= 1;
  }
  return idade;
}

function roundCentavos(value: number): number {
  return Math.round(value);
}

async function getConfigAtiva(client: DbClient): Promise<MatriculaConfigAtiva | null> {
  const { rows } = await client.query(
    `
    SELECT
      vencimento_dia_padrao
    FROM public.matricula_configuracoes
    WHERE ativo = true
    ORDER BY id DESC
    LIMIT 1
    `,
  );

  if (rows.length === 0) return null;
  const r = rows[0];

  return {
    vencimento_dia_padrao: Number(r.vencimento_dia_padrao),
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

    const pessoaId = parsePositiveInt(body.pessoa_id ?? body.aluno_pessoa_id);
    const responsavelFinanceiroRaw =
      body.responsavel_financeiro_id ?? body.responsavel_financeiro_pessoa_id;
    const responsavelFinanceiroIdInput = parsePositiveInt(responsavelFinanceiroRaw);
    const turmaIdInput = parsePositiveInt(body.turma_id);
    const servicoId = parsePositiveInt(body.servico_id);
    const anoRef = parsePositiveInt(body.ano_referencia);
    const itensSelecionados = normalizeItensInput(body.itens);

    if (itensSelecionados === null) {
      return NextResponse.json(
        { error: "payload_invalido", message: "itens deve ser uma lista valida de item_id/quantidade." },
        { status: 400 },
      );
    }

    if (responsavelFinanceiroRaw !== undefined && responsavelFinanceiroRaw !== null && !responsavelFinanceiroIdInput) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          message: "responsavel_financeiro_id deve ser inteiro > 0 quando informado.",
        },
        { status: 400 },
      );
    }

    if (!pessoaId || !anoRef || (!turmaIdInput && !servicoId)) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          message:
            "pessoa_id, ano_referencia e (turma_id ou servico_id) sao obrigatorios e devem ser inteiros > 0.",
        },
        { status: 400 },
      );
    }
    if ((itensSelecionados?.length ?? 0) > 0 && !servicoId) {
      return NextResponse.json(
        {
          error: "payload_invalido",
          message: "itens requerem servico_id valido.",
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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const config = await getConfigAtiva(client);
      if (!config) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "configuracao_inexistente", message: "Nao existe configuracao ativa." }, { status: 422 });
      }
      const diaVenc = clampInt(config.vencimento_dia_padrao, 1, 28);

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

        if (servico.referencia_tipo === "TURMA") {
          if (!referenciaId || referenciaId <= 0) {
            await client.query("ROLLBACK");
            return NextResponse.json(
              { error: "servico_referencia_invalida", message: "Servico TURMA sem referencia valida." },
              { status: 422 },
            );
          }
          vinculoId = referenciaId;
          turmaId = referenciaId;
        } else {
          turmaId = null;
          vinculoId = null;
        }
      }

      const itensInput = itensSelecionados ?? [];
      if (itensInput.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "itens_obrigatorios", message: "Para este fluxo, selecione ao menos 1 item com preco ativo." },
          { status: 400 },
        );
      }
      let itensCalculados: Array<{
        item_id: number;
        quantidade: number;
        nome: string;
        codigo: string;
        valor_centavos: number;
        moeda: string;
      }> = [];

      if (itensInput.length > 0 && servicoId) {
        const itemIds = itensInput.map((it) => it.item_id);
        const { rows: itemRows } = await client.query(
          `
          SELECT
            id,
            servico_id,
            codigo,
            nome,
            tipo_item
          FROM public.servico_itens
          WHERE servico_id = $1
            AND ativo = true
            AND id = ANY($2::bigint[])
          `,
          [servicoId, itemIds],
        );

        if (itemRows.length !== itemIds.length) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "item_invalido", message: "Existem itens invalidos para o servico informado." },
            { status: 400 },
          );
        }

        const itensById = new Map<number, ServicoItemAtivo>();
        itemRows.forEach((r) => {
          itensById.set(Number(r.id), {
            id: Number(r.id),
            servico_id: Number(r.servico_id),
            codigo: String(r.codigo),
            nome: String(r.nome),
            tipo_item: String(r.tipo_item),
          });
        });

        const { rows: precoRows } = await client.query(
          `
          SELECT DISTINCT ON (item_id)
            id,
            item_id,
            valor_centavos,
            moeda
          FROM public.servico_itens_precos
          WHERE ativo = true
            AND item_id = ANY($1::bigint[])
          ORDER BY item_id, id DESC
          `,
          [itemIds],
        );

        const precoByItem = new Map<number, ServicoItemPrecoAtivo>();
        precoRows.forEach((r) => {
          precoByItem.set(Number(r.item_id), {
            id: Number(r.id),
            item_id: Number(r.item_id),
            valor_centavos: Number(r.valor_centavos),
            moeda: String(r.moeda),
          });
        });

        const itensSemPreco = itemIds.filter((id) => !precoByItem.has(id));
        if (itensSemPreco.length > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "item_sem_preco", message: "Existem itens sem preco ativo." },
            { status: 400 },
          );
        }

        itensCalculados = itensInput.map((it) => {
          const info = itensById.get(it.item_id);
          const precoAtivo = precoByItem.get(it.item_id);
          if (!info || !precoAtivo) {
            return {
              item_id: it.item_id,
              quantidade: it.quantidade,
              nome: "Item",
              codigo: "",
              valor_centavos: 0,
              moeda: "BRL",
            };
          }
          return {
            item_id: it.item_id,
            quantidade: it.quantidade,
            nome: info.nome,
            codigo: info.codigo,
            valor_centavos: roundCentavos(precoAtivo.valor_centavos * it.quantidade),
            moeda: precoAtivo.moeda,
          };
        });
      }

      const { rows: pessoaRows } = await client.query("SELECT id, nascimento FROM public.pessoas WHERE id = $1", [pessoaId]);
      if (pessoaRows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
      }

      const nascimento = pessoaRows[0]?.nascimento ? String(pessoaRows[0].nascimento) : null;
      let responsavelFinanceiroId = responsavelFinanceiroIdInput;

      if (!responsavelFinanceiroId) {
        const idade = calcularIdade(nascimento);
        if (idade === null) {
          console.warn("[matriculas/operacional/criar] nascimento invalido para aluno.", {
            pessoa_id: pessoaId,
            nascimento,
          });
          await client.query("ROLLBACK");
          return NextResponse.json(
            { error: "nascimento_invalido", message: "Data de nascimento invalida para o aluno." },
            { status: 400 },
          );
        }

        if (idade >= 18) {
          responsavelFinanceiroId = pessoaId;
        } else {
          console.warn("[matriculas/operacional/criar] responsavel financeiro obrigatorio para menor de idade.", {
            pessoa_id: pessoaId,
          });
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error: "responsavel_financeiro_obrigatorio_menor",
              message: "Responsavel financeiro obrigatorio para aluno menor de idade.",
            },
            { status: 400 },
          );
        }
      }

      const { rows: respRows } = await client.query("SELECT id FROM public.pessoas WHERE id = $1", [responsavelFinanceiroId]);
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
          ano_referencia,
          data_matricula,
          status,
          metodo_liquidacao,
          servico_id
        ) VALUES ($1,$2,$3,$4,$5,$6,'ATIVA',$7,$8)
        RETURNING id, pessoa_id, responsavel_financeiro_id, vinculo_id, ano_referencia, data_matricula, status, metodo_liquidacao, servico_id
        `,
        [
          pessoaId,
          responsavelFinanceiroId,
          tipoMatricula,
          vinculoId,
          anoRef,
          dataMatriculaEfetiva,
          metodoLiquidacao,
          servicoId ?? null,
        ],
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

      const createdItens: Array<{
        id: number;
        item_id: number;
        quantidade: number;
        valor_centavos: number;
        moeda: string;
        nome: string;
        codigo: string;
      }> = [];

      const createdLancamentos: Array<{
        id: number;
        descricao: string;
        valor_centavos: number;
        status: "PENDENTE_FATURA";
      }> = [];

      let contaConexaoId: number | null = null;
      if (metodoLiquidacao === "CARTAO_CONEXAO") {
        contaConexaoId = await ensureContaConexaoAluno(
          client,
          responsavelFinanceiroId,
          null,
          diaVenc,
        );
      }

      const usarItensNoCartao = itensCalculados.length > 0 && metodoLiquidacao === "CARTAO_CONEXAO";

      if (itensCalculados.length > 0) {
        for (const item of itensCalculados) {
          const { rows: itensRows } = await client.query(
            `
            INSERT INTO public.matriculas_itens (
              matricula_id,
              item_id,
              quantidade,
              valor_centavos,
              moeda,
              created_at
            ) VALUES (
              $1,$2,$3,$4,$5,now()
            )
            RETURNING id, item_id, quantidade, valor_centavos, moeda
            `,
            [matriculaId, item.item_id, item.quantidade, item.valor_centavos, item.moeda],
          );

          const row = itensRows[0];
          createdItens.push({
            id: Number(row?.id),
            item_id: Number(row?.item_id),
            quantidade: Number(row?.quantidade),
            valor_centavos: Number(row?.valor_centavos),
            moeda: String(row?.moeda ?? item.moeda),
            nome: item.nome,
            codigo: item.codigo,
          });
        }
      }

      if (usarItensNoCartao && contaConexaoId) {
        for (const item of itensCalculados) {
          const desc = `Matricula: ${item.nome}`;
          const idLanc = await inserirLancamentoCartao(client, {
            conta_conexao_id: contaConexaoId,
            valor_centavos: item.valor_centavos,
            numero_parcelas: 1,
            status: "PENDENTE_FATURA",
            origem_sistema: "MATRICULA",
            origem_id: matriculaId,
            descricao: desc,
          });

          createdLancamentos.push({
            id: idLanc,
            descricao: desc,
            valor_centavos: item.valor_centavos,
            status: "PENDENTE_FATURA",
          });
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
            data_matricula: String(matricula?.data_matricula),
            status: String(matricula?.status),
            metodo_liquidacao: String(matricula?.metodo_liquidacao ?? metodoLiquidacao),
          },
          turma_aluno: turmaAluno,
          itens: createdItens,
          cobrancas: metodoLiquidacao === "COBRANCAS_LEGADO" ? createdCobrancas : [],
          lancamentos: metodoLiquidacao === "CARTAO_CONEXAO" ? createdLancamentos : [],
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
