import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ReqBody = {
  cobranca_id?: number;
  recebimento_id?: number;
  matricula_id?: number;
  pagador_pessoa_id?: number;
  aluno_pessoa_id?: number;
  competencia?: string;
  valor_centavos?: number;
  forma_pagamento?: string;
  data_pagamento?: string;
  referencia?: string;
};

type CobrancaRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia_ano_mes: string | null;
  metodo_pagamento: string | null;
  data_pagamento: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
};

type RecebimentoRow = {
  id: number;
  cobranca_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
};

function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function toCentavos(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safe(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function pickFirstNonEmpty(...values: Array<unknown>): string | null {
  for (const value of values) {
    const s = safe(value).trim();
    if (s) return s;
  }
  return null;
}

function normalizeDateISO(dateLike: unknown): string | null {
  const raw = asText(dateLike).trim();
  if (!raw) return null;
  const yyyyMmDd = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  if (yyyyMmDd) return yyyyMmDd;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function formatDateBR(dateIso: string | null): string {
  if (!dateIso) return "";
  const parts = dateIso.split("-");
  if (parts.length !== 3) return dateIso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function formatCompetencia(value: string | null): string {
  if (!value) return "";
  const s = value.trim();
  if (/^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-");
    return `${m}/${y}`;
  }
  return s;
}

function formatBRLFromCentavos(value: number | null): string {
  const v = Number.isFinite(value) ? Number(value) : 0;
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const cobrancaId = toPositiveInt(body.cobranca_id);
  const recebimentoId = toPositiveInt(body.recebimento_id);

  if (!cobrancaId && !recebimentoId) {
    return NextResponse.json({ error: "informe_cobranca_ou_recebimento" }, { status: 400 });
  }

  const { data: modeloByCodigo } = await supabase
    .from("documentos_modelo")
    .select("id,texto_modelo_md,observacoes")
    .ilike("observacoes", "%RECIBO_MENSALIDADE%")
    .eq("ativo", true)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  let modelo = modeloByCodigo as { id: number; texto_modelo_md: string | null } | null;

  if (!modelo) {
    const { data: modeloByTitulo } = await supabase
      .from("documentos_modelo")
      .select("id,texto_modelo_md")
      .eq("titulo", "Recibo de Pagamento de Mensalidade")
      .eq("ativo", true)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    modelo = (modeloByTitulo as { id: number; texto_modelo_md: string | null } | null) ?? null;
  }

  if (!modelo) {
    return NextResponse.json({ error: "modelo_recibo_nao_encontrado" }, { status: 404 });
  }

  let matriculaId = toPositiveInt(body.matricula_id);
  let pagadorPessoaId = toPositiveInt(body.pagador_pessoa_id);
  let alunoPessoaId = toPositiveInt(body.aluno_pessoa_id);
  let valorCentavos = toCentavos(body.valor_centavos);
  let formaPagamento = pickFirstNonEmpty(body.forma_pagamento);
  let dataPagamento = normalizeDateISO(body.data_pagamento);
  let competencia = pickFirstNonEmpty(body.competencia);
  let referencia = pickFirstNonEmpty(body.referencia);

  let cobranca: CobrancaRow | null = null;
  let recebimento: RecebimentoRow | null = null;

  async function loadCobrancaById(id: number) {
    const { data, error } = await supabase
      .from("cobrancas")
      .select("id,pessoa_id,descricao,valor_centavos,competencia_ano_mes,metodo_pagamento,data_pagamento,origem_tipo,origem_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return data as unknown as CobrancaRow;
  }

  async function loadRecebimentoById(id: number) {
    const { data, error } = await supabase
      .from("recebimentos")
      .select("id,cobranca_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return data as unknown as RecebimentoRow;
  }

  if (cobrancaId) {
    cobranca = await loadCobrancaById(cobrancaId);
    if (!cobranca) {
      return NextResponse.json({ error: "cobranca_nao_encontrada" }, { status: 404 });
    }

    pagadorPessoaId = pagadorPessoaId ?? toPositiveInt(cobranca.pessoa_id);
    valorCentavos = valorCentavos ?? toCentavos(cobranca.valor_centavos);
    formaPagamento = formaPagamento ?? pickFirstNonEmpty(cobranca.metodo_pagamento);
    dataPagamento = dataPagamento ?? normalizeDateISO(cobranca.data_pagamento);
    competencia = competencia ?? pickFirstNonEmpty(cobranca.competencia_ano_mes);
    referencia = referencia ?? pickFirstNonEmpty(cobranca.descricao);

    const origemTipo = safe(cobranca.origem_tipo).toUpperCase();
    if (!matriculaId && origemTipo === "MATRICULA") {
      matriculaId = toPositiveInt(cobranca.origem_id);
    }

    const { data: recDaCobranca } = await supabase
      .from("recebimentos")
      .select("id,cobranca_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo")
      .eq("cobranca_id", cobrancaId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recDaCobranca) {
      recebimento = recDaCobranca as unknown as RecebimentoRow;
      valorCentavos = valorCentavos ?? toCentavos(recebimento.valor_centavos);
      formaPagamento =
        formaPagamento ?? pickFirstNonEmpty(recebimento.forma_pagamento_codigo, recebimento.metodo_pagamento);
      dataPagamento = dataPagamento ?? normalizeDateISO(recebimento.data_pagamento);
    }
  }

  if (recebimentoId) {
    recebimento = await loadRecebimentoById(recebimentoId);
    if (!recebimento) {
      return NextResponse.json({ error: "recebimento_nao_encontrado" }, { status: 404 });
    }

    valorCentavos = valorCentavos ?? toCentavos(recebimento.valor_centavos);
    formaPagamento = formaPagamento ?? pickFirstNonEmpty(recebimento.forma_pagamento_codigo, recebimento.metodo_pagamento);
    dataPagamento = dataPagamento ?? normalizeDateISO(recebimento.data_pagamento);

    const cobrancaIdDoRecebimento = toPositiveInt(recebimento.cobranca_id);
    if (cobrancaIdDoRecebimento) {
      const cobrancaDoRecebimento = await loadCobrancaById(cobrancaIdDoRecebimento);
      if (cobrancaDoRecebimento) {
        cobranca = cobranca ?? cobrancaDoRecebimento;
        pagadorPessoaId = pagadorPessoaId ?? toPositiveInt(cobrancaDoRecebimento.pessoa_id);
        competencia = competencia ?? pickFirstNonEmpty(cobrancaDoRecebimento.competencia_ano_mes);
        referencia = referencia ?? pickFirstNonEmpty(cobrancaDoRecebimento.descricao);

        const origemTipo = safe(cobrancaDoRecebimento.origem_tipo).toUpperCase();
        if (!matriculaId && origemTipo === "MATRICULA") {
          matriculaId = toPositiveInt(cobrancaDoRecebimento.origem_id);
        }
      }
    }
  }

  if (!matriculaId && cobrancaId) {
    const { data: matByCobranca } = await supabase
      .from("matriculas")
      .select("id")
      .eq("primeira_cobranca_cobranca_id", cobrancaId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    matriculaId = toPositiveInt((matByCobranca as { id?: number } | null)?.id);
  }

  if (!matriculaId && recebimentoId) {
    const { data: matByReceb } = await supabase
      .from("matriculas")
      .select("id")
      .eq("primeira_cobranca_recebimento_id", recebimentoId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    matriculaId = toPositiveInt((matByReceb as { id?: number } | null)?.id);
  }

  if (!matriculaId && alunoPessoaId) {
    let query = supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", alunoPessoaId)
      .order("id", { ascending: false })
      .limit(1);

    if (pagadorPessoaId) {
      query = query.eq("responsavel_financeiro_id", pagadorPessoaId);
    }

    const { data: matByAluno } = await query.maybeSingle();
    matriculaId = toPositiveInt((matByAluno as { id?: number } | null)?.id);
  }

  if (!matriculaId) {
    return NextResponse.json(
      { error: "matricula_nao_resolvida", details: "Nao foi possivel vincular o recibo a uma matricula." },
      { status: 400 },
    );
  }

  const { data: matricula, error: matriculaErr } = await supabase
    .from("matriculas")
    .select("id,pessoa_id,responsavel_financeiro_id")
    .eq("id", matriculaId)
    .maybeSingle();

  if (matriculaErr || !matricula) {
    return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
  }

  alunoPessoaId = alunoPessoaId ?? toPositiveInt((matricula as { pessoa_id?: number }).pessoa_id);
  pagadorPessoaId =
    pagadorPessoaId ?? toPositiveInt((matricula as { responsavel_financeiro_id?: number }).responsavel_financeiro_id);

  const { data: pagador } = pagadorPessoaId
    ? await supabase.from("pessoas").select("id,nome,cpf,cnpj").eq("id", pagadorPessoaId).maybeSingle()
    : { data: null as unknown as { id: number; nome: string | null; cpf: string | null; cnpj: string | null } | null };

  const { data: aluno } = alunoPessoaId
    ? await supabase.from("pessoas").select("id,nome").eq("id", alunoPessoaId).maybeSingle()
    : { data: null as unknown as { id: number; nome: string | null } | null };

  const competenciaFinal = formatCompetencia(
    competencia ?? (dataPagamento ? dataPagamento.slice(0, 7) : null),
  );
  const referenciaFinal = referencia ?? "Mensalidade";

  const escolaNome =
    pickFirstNonEmpty(process.env.ESCOLA_NOME, process.env.NEXT_PUBLIC_ESCOLA_NOME) ?? "Conexao Danca";
  const cidadeData = `Salinopolis/PA, ${new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}.`;

  const vars: Record<string, string> = {
    ESCOLA_NOME: escolaNome,
    PAGADOR_NOME: pickFirstNonEmpty(pagador?.nome) ?? "-",
    PAGADOR_CPF: pickFirstNonEmpty(pagador?.cpf, pagador?.cnpj) ?? "-",
    ALUNO_NOME: pickFirstNonEmpty(aluno?.nome) ?? "-",
    COMPETENCIA: competenciaFinal || "-",
    REFERENCIA: referenciaFinal,
    VALOR: formatBRLFromCentavos(valorCentavos),
    FORMA_PAGAMENTO: formaPagamento ?? "-",
    DATA_PAGAMENTO: formatDateBR(dataPagamento) || "-",
    CIDADE_DATA: cidadeData,
  };

  const template = asText(modelo.texto_modelo_md).trim();
  const textoTemplate = template || "RECIBO\n\nRecebemos de {{PAGADOR_NOME}} o valor de {{VALOR}}.";
  const textoRenderizado = renderTemplate(textoTemplate, vars);

  const payloadSnapshot = {
    origem: "RECIBO_MENSALIDADE",
    cobranca_id: cobrancaId,
    recebimento_id: recebimentoId,
    matricula_id: matriculaId,
    pagador_pessoa_id: pagadorPessoaId,
    aluno_pessoa_id: alunoPessoaId,
    competencia: competenciaFinal,
    referencia: referenciaFinal,
    forma_pagamento: formaPagamento,
    data_pagamento: dataPagamento,
    valor_centavos: valorCentavos,
    vars,
  };

  const baseInsert = {
    matricula_id: matriculaId,
    contrato_modelo_id: modelo.id,
    status_assinatura: "RASCUNHO",
    conteudo_renderizado_md: textoRenderizado,
    contexto_json: payloadSnapshot,
    variaveis_utilizadas_json: vars,
    snapshot_financeiro_json: {
      cobranca_id: cobrancaId,
      recebimento_id: recebimentoId,
      valor_centavos: valorCentavos,
      data_pagamento: dataPagamento,
      forma_pagamento: formaPagamento,
      competencia: competenciaFinal,
      referencia: referenciaFinal,
    },
  };

  let insert = await supabase.from("documentos_emitidos").insert(baseInsert).select("id").maybeSingle();

  if (insert.error && (insert.error.code === "23514" || insert.error.message.toLowerCase().includes("status_assinatura"))) {
    insert = await supabase
      .from("documentos_emitidos")
      .insert({ ...baseInsert, status_assinatura: "PENDENTE" })
      .select("id")
      .maybeSingle();
  }

  if (insert.error || !insert.data) {
    return NextResponse.json(
      { error: "falha_ao_emitir_recibo", details: insert.error?.message ?? null },
      { status: 500 },
    );
  }

  return NextResponse.json({
    documento_emitido_id: (insert.data as { id: number }).id,
    texto_renderizado: textoRenderizado,
  });
}
