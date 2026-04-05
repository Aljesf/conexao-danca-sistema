# Estado Atual - Conta Interna

> Padrão operacional atual: [Conta Interna — Cobranças, Lançamentos e Faturas](../financeiro/cartao-conexao-cobrancas.md)


Gerado em: 2025-12-23T18:02:54.5787618-03:00

## Objetivo
- Registrar como a Conta Interna esta estruturada HOJE (SQL + APIs + integracoes).
- Base para refatorar Matriculas para lancar em faturas (sem criar cobrancas diretas).

## Migrations relacionadas (filtradas por palavras-chave)
  
  Mode   LastWriteTime       Length Name
  ----   -------------       ------ ----
  -a---- 09/12/2025 23:43:09   2856 20251209_cartao_credito_etapa1.sql
  -a---- 10/12/2025 13:04:18   6190 20251210_credito_conexao.sql
  -a---- 10/12/2025 13:41:40    365 20251210_credito_conexao_contas_limites.sql
  -a---- 10/12/2025 13:19:38    763 20251210_formas_pagamento_cartao_conexao.sql
  -a---- 10/12/2025 08:34:38   2114 20251210_formas_pagamento_etapa1.sql
  -a---- 11/12/2025 14:09:48    337 20251211_credito_conexao_parcelas_taxas.sql
  -a---- 11/12/2025 09:17:51   1547 20251211_credito_conexao_regras_parcelas.sql
  -a---- 15/12/2025 05:04:20    829 20251215_unificar_formas_pagamento_financeiro.sql
  -a---- 19/12/2025 01:33:36   4756 20251219_credito_conexao_faturas_unique_periodo.sql

## Rotas API relacionadas (paths)
  src/app/api\credito-conexao\faturas\route.ts
  src/app/api\financeiro\cartao\maquinas\route.ts
  src/app/api\financeiro\cartao\bandeiras\route.ts
  src/app/api\financeiro\cartao\maquinas\opcoes\route.ts
  src/app/api\financeiro\cartao\bandeiras\opcoes\route.ts
  src/app/api\financeiro\cartao\regras\route.ts
  src/app/api\financeiro\cartao\recebiveis\route.ts
  src/app/api\financeiro\credito-conexao\regras-parcelas\route.ts
  src/app/api\financeiro\credito-conexao\contas\route.ts
  src/app/api\financeiro\credito-conexao\faturas\route.ts
  src/app/api\financeiro\credito-conexao\faturas\incluir-pendencias\route.ts
  src/app/api\financeiro\credito-conexao\faturas\fechar\route.ts
  src/app/api\financeiro\credito-conexao\faturas\[id]\route.ts
  src/app/api\financeiro\credito-conexao\faturas\[id]\fechar\route.ts
  src/app/api\financeiro\credito-conexao\faturas\[id]\lancamentos\route.ts

## Pastas candidatas (APIs)
  .\src\app\api\credito-conexao
  .\src\app\api\credito-conexao\faturas
  .\src\app\api\financeiro\cartao
  .\src\app\api\financeiro\credito-conexao
  .\src\app\api\financeiro\cartao\bandeiras
  .\src\app\api\financeiro\cartao\maquinas
  .\src\app\api\financeiro\cartao\recebiveis
  .\src\app\api\financeiro\cartao\regras
  .\src\app\api\financeiro\cartao\bandeiras\opcoes
  .\src\app\api\financeiro\cartao\maquinas\opcoes
  .\src\app\api\financeiro\credito-conexao\contas
  .\src\app\api\financeiro\credito-conexao\faturas
  .\src\app\api\financeiro\credito-conexao\regras-parcelas
  .\src\app\api\financeiro\credito-conexao\faturas\fechar
  .\src\app\api\financeiro\credito-conexao\faturas\incluir-pendencias
  
  
  

## Codigo das rotas (route.ts) - Cartao/Credito/Faturas


### src/app/api\credito-conexao\faturas\route.ts
```ts
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

    const rows = faturas.map((f) => {
      const conta = contaMap.get(f.conta_conexao_id) ?? null;
      const pessoaNome = conta?.pessoas?.nome ?? "";
      const pessoaCpf = conta?.pessoas?.cpf ?? null;

      const total = f.valor_total_centavos ?? 0;
      const taxas = f.valor_taxas_centavos ?? 0;
      const compras = total - taxas;

      const tituloConta =
        conta?.descricao_exibicao?.trim()
          ? conta.descricao_exibicao.trim()
          : `Carto Conexo ${conta?.tipo_conta ?? ""}`.trim() || "Carto Conexo";

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
      };
    });

    return NextResponse.json({
      ok: true,
      periodo,
      contas: contas.map((c) => ({
        id: c.id,
        tipo_conta: c.tipo_conta,
        descricao_exibicao: c.descricao_exibicao,
        pessoa_nome: c.pessoas?.nome ?? "",
        pessoa_cpf: c.pessoas?.cpf ?? null,
      })),
      rows,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
```

### src/app/api\financeiro\cartao\regras\route.ts
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/regras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_regras_operacao")
    .select(
      `
      id,
      maquina_id,
      bandeira_id,
      tipo_transacao,
      prazo_recebimento_dias,
      taxa_percentual,
      taxa_fixa_centavos,
      permitir_parcelado,
      max_parcelas,
      ativo,
      created_at,
      updated_at,
      cartao_maquinas:maquina_id ( id, nome ),
      cartao_bandeiras:bandeira_id ( id, nome )
    `
    )
    .order("ativo", { ascending: false })
    .order("maquina_id", { ascending: true })
    .order("bandeira_id", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/regras] Erro ao listar regras:", error);
    return NextResponse.json(
      { error: "Erro ao listar regras de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, regras: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const {
    id,
    maquina_id,
    bandeira_id,
    tipo_transacao,
    prazo_recebimento_dias,
    taxa_percentual,
    taxa_fixa_centavos,
    permitir_parcelado,
    max_parcelas,
    ativo,
  } = body ?? {};

  if (!maquina_id || !bandeira_id || !tipo_transacao) {
    return NextResponse.json(
      { error: "Maquininha, bandeira e tipo de transacao sao obrigatorios." },
      { status: 400 }
    );
  }

  const payloadBase = {
    maquina_id,
    bandeira_id,
    tipo_transacao,
    prazo_recebimento_dias: prazo_recebimento_dias ?? 30,
    taxa_percentual: taxa_percentual ?? 0,
    taxa_fixa_centavos: taxa_fixa_centavos ?? 0,
    permitir_parcelado: typeof permitir_parcelado === "boolean" ? permitir_parcelado : true,
    max_parcelas: max_parcelas ?? 12,
    ativo: typeof ativo === "boolean" ? ativo : true,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from("cartao_regras_operacao")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/regras] Erro ao atualizar regra:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar regra de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, regra: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_regras_operacao")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/regras] Erro ao criar regra:", error);
    return NextResponse.json(
      { error: "Erro ao criar regra de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, regra: data });
}
```

### src/app/api\financeiro\cartao\maquinas\route.ts
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/maquinas] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_maquinas")
    .select(
      `
      id,
      nome,
      operadora,
      conta_financeira_id,
      centro_custo_id,
      ativo,
      observacoes,
      created_at,
      updated_at,
      contas_financeiras:conta_financeira_id ( id, codigo, nome ),
      centros_custo:centro_custo_id ( id, nome )
    `
    )
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/maquinas] Erro ao listar cartao_maquinas:", error);
    return NextResponse.json(
      { error: "Erro ao listar maquininhas de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maquinas: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const {
    id,
    nome,
    operadora,
    conta_financeira_id,
    centro_custo_id,
    ativo,
    observacoes,
  } = body ?? {};

  if (!nome || !conta_financeira_id || !centro_custo_id) {
    return NextResponse.json(
      { error: "Nome, conta financeira e centro de custo sao obrigatorios." },
      { status: 400 }
    );
  }

  const contaIdNum = Number(conta_financeira_id);
  const centroIdNum = Number(centro_custo_id);

  const payloadBase = {
    nome: String(nome).trim(),
    operadora: operadora ? String(operadora).trim() : null,
    conta_financeira_id: Number.isFinite(contaIdNum) ? contaIdNum : null,
    centro_custo_id: Number.isFinite(centroIdNum) ? centroIdNum : null,
    ativo: typeof ativo === "boolean" ? ativo : true,
    observacoes: observacoes ? String(observacoes).trim() : null,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin
      .from("cartao_maquinas")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/maquinas] Erro ao atualizar maquininha:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar maquininha de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, maquina: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_maquinas")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/maquinas] Erro ao criar maquininha:", error);
    return NextResponse.json(
      { error: "Erro ao criar maquininha de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maquina: data });
}
```

### src/app/api\financeiro\cartao\recebiveis\route.ts
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/recebiveis] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function nowLocalISOString(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PREVISTO";
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  let query = supabaseAdmin
    .from("cartao_recebiveis")
    .select(
      `
      id,
      venda_id,
      maquina_id,
      bandeira_id,
      conta_financeira_id,
      valor_bruto_centavos,
      taxa_operadora_centavos,
      valor_liquido_centavos,
      numero_parcelas,
      data_prevista_pagamento,
      status,
      data_pagamento_real,
      cartao_maquinas:maquina_id ( nome, operadora, centro_custo_id ),
      cartao_bandeiras:bandeira_id ( nome )
    `
    )
    .eq("status", status)
    .order("data_prevista_pagamento", { ascending: true })
    .order("id", { ascending: true });

  if (dataInicio) {
    query = query.gte("data_prevista_pagamento", dataInicio);
  }

  if (dataFim) {
    query = query.lte("data_prevista_pagamento", dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/financeiro/cartao/recebiveis] Erro ao buscar recebiveis:", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao buscar recebiveis de cartao." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, recebiveis: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON invalido." }, { status: 400 });
  }

  const recebivelId = Number(body?.recebivel_id);
  const dataPagamento =
    typeof body?.data_pagamento === "string" && body.data_pagamento
      ? body.data_pagamento
      : new Date().toISOString().slice(0, 10);
  const valorLiquidoOverride = Number(body?.valor_liquido_centavos);

  if (!Number.isFinite(recebivelId) || recebivelId <= 0) {
    return NextResponse.json(
      { ok: false, error: "recebivel_id e obrigatorio e deve ser numerico." },
      { status: 400 }
    );
  }

  const { data: recebivel, error: recebivelError } = await supabaseAdmin
    .from("cartao_recebiveis")
    .select("*")
    .eq("id", recebivelId)
    .maybeSingle();

  if (recebivelError || !recebivel) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Recebivel de cartao nao encontrado:",
      recebivelError
    );
    return NextResponse.json(
      { ok: false, error: "Recebivel de cartao nao encontrado." },
      { status: 404 }
    );
  }

  if (recebivel.status === "PAGO") {
    return NextResponse.json(
      { ok: false, error: "Recebivel ja esta marcado como PAGO." },
      { status: 400 }
    );
  }

  if (recebivel.status === "CANCELADO") {
    return NextResponse.json(
      { ok: false, error: "Recebivel cancelado nao pode ser baixado." },
      { status: 400 }
    );
  }

  const valorLiquidoCentavos =
    Number.isFinite(valorLiquidoOverride) && valorLiquidoOverride > 0
      ? valorLiquidoOverride
      : Number(recebivel.valor_liquido_centavos || 0);

  const { data: maquina, error: maquinaError } = await supabaseAdmin
    .from("cartao_maquinas")
    .select("id, centro_custo_id")
    .eq("id", recebivel.maquina_id)
    .maybeSingle();

  if (maquinaError || !maquina) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao buscar maquininha do recebivel:",
      maquinaError
    );
    return NextResponse.json(
      {
        ok: false,
        error:
          "Repasse registrado parcialmente. Nao foi possivel identificar o centro de custo da maquininha.",
      },
      { status: 500 }
    );
  }

  const { data: recebimento, error: recebimentoError } = await supabaseAdmin
    .from("recebimentos")
    .insert({
      cobranca_id: null,
      centro_custo_id: maquina.centro_custo_id,
      valor_centavos: valorLiquidoCentavos,
      data_pagamento: `${dataPagamento}T00:00:00`,
      metodo_pagamento: "CREDITO_OPERADORA",
      origem_sistema: "CARTAO_REPASSE",
      observacoes: `Repasse cartao - recebivel #${recebivelId}`,
    })
    .select("*")
    .maybeSingle();

  if (recebimentoError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao registrar recebimento do repasse:",
      recebimentoError
    );
    return NextResponse.json(
      { ok: false, error: "Erro ao registrar recebimento do repasse." },
      { status: 500 }
    );
  }

  const { error: movimentoError } = await supabaseAdmin.from("movimento_financeiro").insert({
    tipo: "RECEITA",
    centro_custo_id: maquina.centro_custo_id,
    valor_centavos: valorLiquidoCentavos,
    data_movimento: nowLocalISOString(),
    origem: "CARTAO_REPASSE",
    origem_id: recebivelId,
    descricao: `Repasse cartao - Venda #${recebivel.venda_id}`,
    usuario_id: null,
  });

  if (movimentoError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao registrar movimento financeiro:",
      movimentoError
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Repasse registrado mas houve erro ao gravar movimento financeiro.",
      },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("cartao_recebiveis")
    .update({
      status: "PAGO",
      data_pagamento_real: dataPagamento,
      valor_liquido_centavos: valorLiquidoCentavos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", recebivelId);

  if (updateError) {
    console.error(
      "[POST /api/financeiro/cartao/recebiveis] Erro ao atualizar recebivel:",
      updateError
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Repasse registrado mas houve erro ao atualizar o recebivel.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, recebimento });
}
```

### src/app/api\financeiro\cartao\bandeiras\route.ts
```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/bandeiras] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_bandeiras")
    .select("id, nome, codigo, ativo, created_at, updated_at")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/bandeiras] Erro ao listar cartao_bandeiras:", error);
    return NextResponse.json(
      { error: "Erro ao listar bandeiras de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, bandeiras: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const { id, nome, codigo, ativo } = body ?? {};

  if (!nome) {
    return NextResponse.json(
      { error: "Nome da bandeira e obrigatorio." },
      { status: 400 }
    );
  }

  const payloadBase = {
    nome: String(nome).trim(),
    codigo: codigo ? String(codigo).trim() : null,
    ativo: typeof ativo === "boolean" ? ativo : true,
  };

  const idNum = Number(id);
  if (Number.isFinite(idNum) && idNum > 0) {
    const payload = { ...payloadBase, updated_at: new Date().toISOString() };

    const { data, error } = await supabaseAdmin
      .from("cartao_bandeiras")
      .update(payload)
      .eq("id", idNum)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[POST /api/financeiro/cartao/bandeiras] Erro ao atualizar bandeira:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar bandeira de cartao" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, bandeira: data });
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_bandeiras")
    .insert(payloadBase)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[POST /api/financeiro/cartao/bandeiras] Erro ao criar bandeira:", error);
    return NextResponse.json(
      { error: "Erro ao criar bandeira de cartao" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, bandeira: data });
}
```

### src/app/api\financeiro\cartao\maquinas\opcoes\route.ts
```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/cartao/maquinas/opcoes] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_maquinas")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/maquinas/opcoes] Erro ao listar maquininhas:", error);
    return NextResponse.json(
      { error: "Erro ao listar maquininhas" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, maquinas: data ?? [] });
}
```

### src/app/api\financeiro\credito-conexao\regras-parcelas\route.ts
```ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/financeiro/credito-conexao/regras-parcelas
// Lista regras de parcelamento do Cartao Conexao.
export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);

    const tipoConta = searchParams.get("tipo_conta"); // ALUNO / COLABORADOR / null
    const ativo = searchParams.get("ativo"); // "true"/"false"/null

    let query = supabase
      .from("credito_conexao_regras_parcelas")
      .select(
        `
        id,
        tipo_conta,
        numero_parcelas_min,
        numero_parcelas_max,
        valor_minimo_centavos,
        taxa_percentual,
        taxa_fixa_centavos,
        centro_custo_id,
        categoria_financeira_id,
        ativo,
        created_at,
        updated_at
      `,
      )
      .order("tipo_conta", { ascending: true })
      .order("numero_parcelas_min", { ascending: true });

    if (tipoConta) {
      query = query.eq("tipo_conta", tipoConta);
    }

    if (ativo === "true") {
      query = query.eq("ativo", true);
    } else if (ativo === "false") {
      query = query.eq("ativo", false);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar regras de parcelamento Credito Conexao", error);
      return NextResponse.json(
        { ok: false, error: "erro_listar_regras_parcelamento", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, regras: data ?? [] });
  } catch (err: any) {
    console.error("Erro inesperado em GET /regras-parcelas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_regras_parcelas_get" },
      { status: 500 },
    );
  }
}

// POST /api/financeiro/credito-conexao/regras-parcelas
// Cria ou atualiza uma regra de parcelamento.
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const body = await req.json();
    console.log("[credito-conexao] payload recebido:", body);

    const {
      id,
      tipo_conta,
      numero_parcelas_min,
      numero_parcelas_max,
      valor_minimo_centavos,
      taxa_percentual,
      taxa_fixa_centavos,
      centro_custo_id,
      categoria_financeira_id,
      ativo,
    } = body ?? {};

    if (!tipo_conta || !["ALUNO", "COLABORADOR"].includes(tipo_conta)) {
      return NextResponse.json(
        { ok: false, error: "tipo_conta_obrigatorio_ou_invalido" },
        { status: 400 },
      );
    }

    const numMin = Number(numero_parcelas_min);
    const numMax = Number(numero_parcelas_max);

    if (!numMin || !numMax || numMin < 1 || numMax < numMin) {
      return NextResponse.json(
        { ok: false, error: "faixa_parcelas_invalida" },
        { status: 400 },
      );
    }

    const payload: any = {
      tipo_conta,
      numero_parcelas_min: numMin,
      numero_parcelas_max: numMax,
      valor_minimo_centavos: Number(valor_minimo_centavos) || 0,
      taxa_percentual: Number(taxa_percentual) || 0,
      taxa_fixa_centavos: Number(taxa_fixa_centavos) || 0,
      centro_custo_id: centro_custo_id ?? null,
      categoria_financeira_id: categoria_financeira_id ?? null,
      ativo: typeof ativo === "boolean" ? ativo : true,
      updated_at: new Date().toISOString(),
    };

    // Campos possivelmente obrigatrios no schema
    if ("unidade_id" in body) {
      payload.unidade_id = Number(body.unidade_id) || 1;
    }
    if ("created_by" in body) {
      payload.created_by = body.created_by ?? null;
    }
    if ("updated_by" in body) {
      payload.updated_by = body.updated_by ?? null;
    }

    let result;

    if (id) {
      const { data, error } = await supabase
        .from("credito_conexao_regras_parcelas")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar regra de parcelamento Credito Conexao", error);
        return NextResponse.json(
          {
            ok: false,
            error: "erro_atualizar_regra_parcelamento",
            details: error.message,
          },
          { status: 400 },
        );
      }

      result = data;
    } else {
      const insertPayload = {
        ...payload,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("credito_conexao_regras_parcelas")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar regra de parcelamento Credito Conexao", error);
        return NextResponse.json(
          { ok: false, error: "erro_criar_regra_parcelamento", details: error.message },
          { status: 400 },
        );
      }

      result = data;
    }

    return NextResponse.json({ ok: true, regra: result });
  } catch (err: any) {
    console.error("Erro inesperado em POST /regras-parcelas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_regras_parcelas_post" },
      { status: 500 },
    );
  }
}
```

### src/app/api\financeiro\credito-conexao\contas\route.ts
```ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/financeiro/credito-conexao/contas
// Lista todas as contas de Crdito Conexo (sem joins por enquanto).
export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const tipoConta = searchParams.get("tipo_conta"); // ALUNO / COLABORADOR / null

    let query = supabase
      .from("credito_conexao_contas")
      .select(
        `
        id,
        pessoa_titular_id,
        tipo_conta,
        descricao_exibicao,
        dia_fechamento,
        dia_vencimento,
        centro_custo_principal_id,
        conta_financeira_origem_id,
        conta_financeira_destino_id,
        limite_maximo_centavos,
        limite_autorizado_centavos,
        ativo,
        created_at,
        updated_at
      `,
      )
      .order("ativo", { ascending: false })
      .order("id", { ascending: true });

    if (tipoConta) {
      query = query.eq("tipo_conta", tipoConta);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar credito_conexao_contas", error);
      return NextResponse.json(
        {
          ok: false,
          error: "erro_listar_contas_credito_conexao",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, contas: data ?? [] });
  } catch (err: any) {
    console.error("Erro inesperado em GET /credito-conexao/contas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_credito_conexao_get" },
      { status: 500 },
    );
  }
}

// POST /api/financeiro/credito-conexao/contas
// Cria ou atualiza uma conta de Crdito Conexo.
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const body = await req.json();

    const {
      id,
      pessoa_titular_id,
      tipo_conta,
      descricao_exibicao,
      dia_fechamento,
      dia_vencimento,
      centro_custo_principal_id,
      conta_financeira_origem_id,
      conta_financeira_destino_id,
      limite_maximo_centavos,
      limite_autorizado_centavos,
      ativo,
    } = body ?? {};

    if (!pessoa_titular_id || !tipo_conta) {
      return NextResponse.json(
        { ok: false, error: "pessoa_titular_e_tipo_conta_obrigatorios" },
        { status: 400 },
      );
    }

    if (!["ALUNO", "COLABORADOR"].includes(tipo_conta)) {
      return NextResponse.json(
        { ok: false, error: "tipo_conta_invalido" },
        { status: 400 },
      );
    }

    const payload: any = {
      pessoa_titular_id: Number(pessoa_titular_id),
      tipo_conta,
      descricao_exibicao: descricao_exibicao || null,
      dia_fechamento: dia_fechamento ?? 10,
      dia_vencimento: dia_vencimento ?? null,
      centro_custo_principal_id: centro_custo_principal_id ?? null,
      conta_financeira_origem_id: conta_financeira_origem_id ?? null,
      conta_financeira_destino_id: conta_financeira_destino_id ?? null,
      limite_maximo_centavos:
        typeof limite_maximo_centavos === "number" ? limite_maximo_centavos : null,
      limite_autorizado_centavos:
        typeof limite_autorizado_centavos === "number" ? limite_autorizado_centavos : null,
      ativo: typeof ativo === "boolean" ? ativo : true,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (id) {
      const { data, error } = await supabase
        .from("credito_conexao_contas")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Erro ao atualizar conta de Crdito Conexo", error);
        return NextResponse.json(
          { ok: false, error: "erro_atualizar_conta_credito_conexao", details: error.message },
          { status: 500 },
        );
      }

      result = data;
    } else {
      const insertPayload = {
        ...payload,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("credito_conexao_contas")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Erro ao criar conta de Crdito Conexo", error);
        return NextResponse.json(
          { ok: false, error: "erro_criar_conta_credito_conexao", details: error.message },
          { status: 500 },
        );
      }

      result = data;
    }

    return NextResponse.json({ ok: true, conta: result });
  } catch (err: any) {
    console.error("Erro inesperado em POST /credito-conexao/contas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_credito_conexao_post" },
      { status: 500 },
    );
  }
}
```

### src/app/api\financeiro\cartao\bandeiras\opcoes\route.ts
```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("cartao_bandeiras")
    .select("id, nome, codigo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[GET /api/financeiro/cartao/bandeiras/opcoes] Erro ao listar bandeiras:", error);
    return NextResponse.json({ ok: false, error: "Erro ao listar bandeiras" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bandeiras: data ?? [] });
}
```

### src/app/api\financeiro\credito-conexao\faturas\route.ts
```ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

// GET /api/financeiro/credito-conexao/faturas
// Lista faturas de Crdito Conexo (sem join complexo por enquanto).
export async function GET(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { searchParams } = new URL(req.url);

    const contaIdParam = searchParams.get("conta_conexao_id");
    const statusParam = searchParams.get("status"); // ABERTA, PAGA, EM_ATRASO, CANCELADA ou null
    const periodoParam = searchParams.get("periodo_referencia"); // YYYY-MM

    let query = supabase
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
        status,
        conta:credito_conexao_contas (
          id,
          descricao_exibicao,
          tipo_conta,
          pessoa_titular_id,
          titular:pessoas (
            id,
            nome,
            cpf
          )
        ),
        created_at,
        updated_at
      `,
      )
      .order("periodo_referencia", { ascending: false })
      .order("id", { ascending: false });

    if (contaIdParam) {
      query = query.eq("conta_conexao_id", Number(contaIdParam));
    }

    if (periodoParam) {
      query = query.eq("periodo_referencia", periodoParam);
    }

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar faturas Crdito Conexo", error);
      return NextResponse.json(
        { ok: false, error: "erro_listar_faturas_credito_conexao", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, faturas: data ?? [] });
  } catch (err: any) {
    console.error("Erro inesperado em GET /credito-conexao/faturas", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_listar_faturas" },
      { status: 500 },
    );
  }
}
```

### src/app/api\financeiro\credito-conexao\faturas\incluir-pendencias\route.ts
```ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  ensureFaturaAberta,
  getPeriodoReferencia,
  recalcularComprasFatura,
  vincularLancamentoNaFatura,
} from "@/lib/financeiro/creditoConexaoFaturas";

type IncluirPendenciasPayload = {
  conta_conexao_id?: number;
  periodo_referencia?: string | null;
  incluir_origens?: string[] | null;
};

const DEFAULT_ORIGENS = ["LOJA"];

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as IncluirPendenciasPayload | null;
    const contaId = body?.conta_conexao_id ? Number(body.conta_conexao_id) : NaN;
    if (!contaId || Number.isNaN(contaId)) {
      return NextResponse.json({ ok: false, error: "conta_conexao_id_obrigatorio" }, { status: 400 });
    }

    const periodoReferencia =
      typeof body?.periodo_referencia === "string" && body.periodo_referencia.trim()
        ? body.periodo_referencia.trim()
        : getPeriodoReferencia();

    const incluirOrigens =
      Array.isArray(body?.incluir_origens) && body?.incluir_origens.length
        ? body.incluir_origens
        : DEFAULT_ORIGENS;

    const { data: conta, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id, ativo, pessoa_titular_id, tipo_conta")
      .eq("id", contaId)
      .maybeSingle();

    if (contaErr || !conta) {
      return NextResponse.json({ ok: false, error: "conta_conexao_nao_encontrada" }, { status: 404 });
    }
    if (conta.ativo === false) {
      return NextResponse.json({ ok: false, error: "conta_conexao_inativa" }, { status: 400 });
    }

    let fatura;
    let periodo_usado = periodoReferencia;
    try {
      const resultado = await ensureFaturaAberta(supabase, contaId, periodoReferencia);
      fatura = resultado.fatura;
      periodo_usado = resultado.periodo_usado;
    } catch (err: any) {
      console.error("[incluir-pendencias] erro ao garantir fatura aberta:", err);
      return NextResponse.json(
        { ok: false, error: "erro_buscar_ou_criar_fatura", details: err?.message ?? null },
        { status: 500 }
      );
    }

    const { data: pendentes, error: pendErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, valor_centavos, numero_parcelas, origem_sistema, origem_id")
      .eq("conta_conexao_id", contaId)
      .eq("status", "PENDENTE_FATURA")
      .in("origem_sistema", incluirOrigens);

    if (pendErr) {
      console.error("[incluir-pendencias] erro ao buscar pendentes:", pendErr);
      return NextResponse.json({ ok: false, error: "erro_buscar_pendencias" }, { status: 500 });
    }

    const pendentesList = pendentes ?? [];
    if (pendentesList.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          aviso: "sem_pendencias",
          fatura_id: fatura.id,
          conta_conexao_id: contaId,
          periodo_referencia: periodo_usado,
          pendencias_incluidas: 0,
          compras_centavos: fatura?.valor_total_centavos ?? 0,
        },
        { status: 200 }
      );
    }

    const pendentesIds = pendentesList.map((p) => p.id);

    for (const id of pendentesIds) {
      const vinc = await vincularLancamentoNaFatura(supabase, fatura.id, id);
      if (!vinc.ok) {
        console.error("[incluir-pendencias] erro ao vincular lancamento:", vinc.error);
        return NextResponse.json({ ok: false, error: "erro_vincular_pendencias" }, { status: 500 });
      }
    }

    const { error: updErr } = await supabase
      .from("credito_conexao_lancamentos")
      .update({ status: "FATURADO" })
      .in("id", pendentesIds);

    if (updErr) {
      console.error("[incluir-pendencias] erro ao atualizar status pendentes:", updErr);
      return NextResponse.json({ ok: false, error: "erro_atualizar_status_pendentes" }, { status: 500 });
    }

    let comprasCentavos = 0;
    try {
      comprasCentavos = await recalcularComprasFatura(supabase, fatura.id);
    } catch (errCalc: any) {
      console.error("[incluir-pendencias] erro ao recalcular compras da fatura:", errCalc?.message ?? errCalc);
      return NextResponse.json(
        { ok: false, error: "erro_recalcular_fatura", details: errCalc?.message ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        fatura_id: fatura.id,
        conta_conexao_id: contaId,
        periodo_referencia: periodo_usado,
        pendencias_incluidas: pendentesIds.length,
        compras_centavos: comprasCentavos,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[incluir-pendencias] erro inesperado:", err);
    return NextResponse.json({ ok: false, error: "erro_interno_incluir_pendencias" }, { status: 500 });
  }
}
```

### src/app/api\financeiro\credito-conexao\faturas\fechar\route.ts
```ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { criarCobrancaLocalEEnviarNeofin } from "@/lib/cobrancasNeofin";

/**
 * POST /api/financeiro/credito-conexao/faturas/fechar
 *
 * Body esperado:
 * {
 *   "conta_conexao_id": number,
 *   "data_referencia"?: "YYYY-MM-DD" (opcional; default = hoje)
 * }
 *
 * Comportamento:
 * - Busca lancamentos PENDENTE_FATURA da conta.
 * - Soma valor_total.
 * - Cria fatura em credito_conexao_faturas.
 * - Cria vinculos em credito_conexao_fatura_lancamentos.
 * - Atualiza lancamentos para status = 'FATURADO'.
 */
export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const body = await req.json().catch(() => ({}));

    const contaConexaoId = Number(body.conta_conexao_id);
    const dataReferenciaStr: string | undefined = body.data_referencia;

    if (!contaConexaoId || Number.isNaN(contaConexaoId)) {
      return NextResponse.json(
        { ok: false, error: "conta_conexao_id_obrigatorio" },
        { status: 400 },
      );
    }

    const hoje = new Date();
    const dataRef = dataReferenciaStr ? new Date(dataReferenciaStr) : hoje;

    if (Number.isNaN(dataRef.getTime())) {
      return NextResponse.json(
        { ok: false, error: "data_referencia_invalida" },
        { status: 400 },
      );
    }

    const periodoAno = dataRef.getFullYear();
    const periodoMes = dataRef.getMonth() + 1; // 1..12
    const periodo_ref = `${periodoAno}-${String(periodoMes).padStart(2, "0")}`;

    // Buscar dados da conta (para dia_fechamento / dia_vencimento)
    const { data: conta, error: contaError } = await supabase
      .from("credito_conexao_contas")
      .select(
        `
        id,
        pessoa_titular_id,
        tipo_conta,
        dia_fechamento,
        dia_vencimento,
        centro_custo_principal_id
      `,
      )
      .eq("id", contaConexaoId)
      .single();

    if (contaError || !conta) {
      console.error("Conta Credito Conexao nao encontrada", contaError);
      return NextResponse.json(
        { ok: false, error: "conta_conexao_nao_encontrada" },
        { status: 404 },
      );
    }

    // Determinar datas de fechamento e vencimento da fatura
    // Regra simples: usa data_referencia para o mes/ano, e aplica dia_fechamento/dia_vencimento.
    function construirData(day: number | null | undefined): Date | null {
      if (!day || day < 1 || day > 31) return null;
      return new Date(periodoAno, periodoMes - 1, day);
    }

    const dataFechamento = construirData(conta.dia_fechamento) ?? dataRef;
    const dataVencimento =
      construirData(conta.dia_vencimento) ??
      null; // para COLABORADOR pode ser null; Aluno normalmente usa dia_vencimento

    // Buscar lancamentos PENDENTE_FATURA desta conta
    const { data: lancamentos, error: lancamentosError } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, valor_centavos, numero_parcelas")
      .eq("conta_conexao_id", contaConexaoId)
      .eq("status", "PENDENTE_FATURA");

    if (lancamentosError) {
      console.error("Erro ao buscar lancamentos PENDENTE_FATURA", lancamentosError);
      return NextResponse.json(
        { ok: false, error: "erro_buscar_lancamentos_pendentes" },
        { status: 500 },
      );
    }

    if (!lancamentos || lancamentos.length === 0) {
      // Nada a faturar
      return NextResponse.json(
        {
          ok: false,
          error: "sem_lancamentos_pendentes",
          message: "Nao ha lancamentos pendentes para esta conta.",
        },
        { status: 400 },
      );
    }

    // Regras de parcelamento ativas para o tipo de conta
    const { data: regrasParcelamento, error: regrasError } = await supabase
      .from("credito_conexao_regras_parcelas")
      .select(
        `
        id,
        tipo_conta,
        numero_parcelas_min,
        numero_parcelas_max,
        valor_minimo_centavos,
        taxa_percentual,
        taxa_fixa_centavos,
        ativo
      `,
      )
      .eq("tipo_conta", conta.tipo_conta)
      .eq("ativo", true);

    if (regrasError) {
      console.error("Erro ao buscar regras de parcelamento Crdito Conexo", regrasError);
    }

    const regrasAtivas = regrasParcelamento ?? [];

    // Somar valor total da fatura aplicando taxas por regra de parcelamento
    let valorComprasTotal = 0;
    let valorTaxasTotal = 0;

    for (const lanc of lancamentos ?? []) {
      const valorLanc = lanc.valor_centavos ?? 0;
      valorComprasTotal += valorLanc;

      const nParcelas = lanc.numero_parcelas ?? 1;
      if (!regrasAtivas.length || nParcelas <= 1 || valorLanc <= 0) {
        continue;
      }

      const regra = regrasAtivas.find((r) => {
        const dentroFaixa =
          nParcelas >= (r.numero_parcelas_min ?? 1) &&
          nParcelas <= (r.numero_parcelas_max ?? r.numero_parcelas_min ?? 1);
        const atendeMinimo = valorLanc >= (r.valor_minimo_centavos ?? 0);
        return dentroFaixa && atendeMinimo;
      });

      if (!regra) continue;

      const taxaPerc = Number(regra.taxa_percentual ?? 0);
      const taxaFixa = Number(regra.taxa_fixa_centavos ?? 0);
      const taxaSobreValor = taxaPerc > 0 ? Math.round((valorLanc * taxaPerc) / 100) : 0;
      const taxaTotalLancamento = taxaSobreValor + taxaFixa;

      if (taxaTotalLancamento > 0) {
        valorTaxasTotal += taxaTotalLancamento;
      }
    }

    const valorTotalFatura = valorComprasTotal + valorTaxasTotal;

    if (valorTotalFatura <= 0) {
      return NextResponse.json(
        { ok: false, error: "valor_total_invalido" },
        { status: 400 },
      );
    }

    // Iniciar transacao logica (nao temos BEGIN/COMMIT, entao vamos em passos,
    // mas cuidando para nao deixar estados inconsistentes em caso de erro).
    // 1) Criar fatura
    const { data: fatura, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .insert({
        conta_conexao_id: contaConexaoId,
        periodo_referencia: periodo_ref,
        data_fechamento: dataFechamento.toISOString().slice(0, 10),
        data_vencimento: dataVencimento ? dataVencimento.toISOString().slice(0, 10) : null,
        valor_total_centavos: valorTotalFatura,
        valor_taxas_centavos: valorTaxasTotal,
        status: "ABERTA",
      })
      .select()
      .single();

    if (faturaError || !fatura) {
      console.error("Erro ao criar fatura de Credito Conexao", faturaError);
      return NextResponse.json(
        { ok: false, error: "erro_criar_fatura_credito_conexao" },
        { status: 500 },
      );
    }

    const faturaId = fatura.id as number;

    // 1.5) Criar cobranca vinculada a fatura (Cartao Conexao Aluno)
    let cobrancaId: number | null = null;

    if (conta.tipo_conta === "ALUNO") {
      try {
        // Buscar dados minimos do titular para a cobranca (pessoa)
        const pessoaId = conta.pessoa_titular_id;
        if (!pessoaId) {
          console.warn(
            "Conta Credito Conexao ALUNO sem pessoa_titular_id; nao sera gerada cobranca.",
          );
        } else {
          const integrationIdentifier = `credito-conexao-fatura-${faturaId}`;
          const resultadoCobranca = await criarCobrancaLocalEEnviarNeofin({
            supabase,
            usuarioId: null,
            pessoa_id: pessoaId,
            descricao: `Fatura Cartao Conexao ${periodo_ref} (Conta #${conta.id})`,
            valor_centavos: valorTotalFatura,
            vencimento: (dataVencimento ?? dataFechamento).toISOString().slice(0, 10),
            metodo_pagamento: null,
            centro_custo_id: conta.centro_custo_principal_id ?? null,
            origem_tipo: "CREDITO_CONEXAO_FATURA",
            origem_id: faturaId,
            integrationIdentifier,
            exigirResponsavelFinanceiro: true,
          });

          if (resultadoCobranca.ok) {
            cobrancaId = resultadoCobranca.cobranca_id;

            const { error: updateFaturaError } = await supabase
              .from("credito_conexao_faturas")
              .update({ cobranca_id: cobrancaId })
              .eq("id", faturaId);

            if (updateFaturaError) {
              console.error(
                "Erro ao atualizar fatura com cobranca_id",
                updateFaturaError,
              );
            }
          } else {
            console.error(
              "Falha ao criar/enviar cobranca Neofin no fechamento da fatura:",
              resultadoCobranca,
            );
          }
        }
      } catch (cobrancaErr) {
        console.error(
          "Erro inesperado ao gerar cobranca da fatura Credito Conexao",
          cobrancaErr,
        );
      }
    }
    // 2) Criar vinculos em credito_conexao_fatura_lancamentos
    const vinculos = lancamentos.map((l) => ({
      fatura_id: faturaId,
      lancamento_id: l.id,
    }));

    const { error: vinculosError } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .insert(vinculos);

    if (vinculosError) {
      console.error("Erro ao vincular lancamentos a fatura Credito Conexao", vinculosError);
      return NextResponse.json(
        { ok: false, error: "erro_criar_vinculos_fatura" },
        { status: 500 },
      );
    }

    // 3) Atualizar lancamentos para FATURADO
    const idsLancamentos = lancamentos.map((l) => l.id);

    const { error: updateLancamentosError } = await supabase
      .from("credito_conexao_lancamentos")
      .update({ status: "FATURADO" })
      .in("id", idsLancamentos);

    if (updateLancamentosError) {
      console.error("Erro ao atualizar lancamentos para FATURADO", updateLancamentosError);
      return NextResponse.json(
        { ok: false, error: "erro_atualizar_lancamentos_faturados" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      fatura,
      quantidade_lancamentos: lancamentos.length,
      valor_total_centavos: valorTotalFatura,
      valor_taxas_centavos: valorTaxasTotal,
      cobranca_id: cobrancaId,
    });
  } catch (err: any) {
    console.error("Erro inesperado ao fechar fatura Credito Conexao", err);
    return NextResponse.json(
      { ok: false, error: "erro_interno_fechar_fatura" },
      { status: 500 },
    );
  }
}
```

### src/app/api\financeiro\credito-conexao\faturas\[id]\route.ts
```ts
```

### src/app/api\financeiro\credito-conexao\faturas\[id]\lancamentos\route.ts
```ts
```

### src/app/api\financeiro\credito-conexao\faturas\[id]\fechar\route.ts
```ts
```

## READMEs relacionados

(nenhum README encontrado)

## Schema (templates de consulta)

### Listar tabelas que parecem ser da Conta Interna
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND (table_name ILIKE '%cartao%' OR table_name ILIKE '%fatura%' OR table_name ILIKE '%credito%')
ORDER BY table_name;
```

### Inspecionar colunas de uma tabela (substituir NOME_TABELA)
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='NOME_TABELA'
ORDER BY ordinal_position;
```

