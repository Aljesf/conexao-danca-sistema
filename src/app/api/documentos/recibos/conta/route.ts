import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ReqBody = {
  fatura_id: number;
  aluno_pessoa_id?: number;
};

type FaturaItemViewRow = {
  fatura_id: number;
  conta_conexao_id: number;
  competencia_ano_mes: string | null;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number | null;
  status_fatura: string | null;
  cobranca_fatura_id: number | null;
  pessoa_titular_id: number;
  titular_nome: string | null;
  titular_cpf: string | null;
  titular_telefone: string | null;
  lancamento_id: number;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  data_lancamento: string | null;
  status_lancamento: string | null;
  composicao_json: unknown;
};

type DiscriminatedItem = {
  titulo: string;
  valorCentavos: number;
  lancamentoId?: number;
};

function toPositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function toCentavos(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function brlFromCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(d?: string | null): string {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  const [y, m, day] = iso.split("-").map((x) => Number(x));
  if (!y || !m || !day) return d;
  return `${String(day).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function pushItem(items: DiscriminatedItem[], titulo: unknown, valor: unknown, lancamentoId?: number) {
  const valorCentavos = toCentavos(valor);
  const title = safeText(titulo).trim() || "Item";
  items.push({ titulo: title, valorCentavos, lancamentoId });
}

function extractAlunoItemsFromComposicao(
  composicao: unknown,
  alunoPessoaId: number,
  fallbackDesc: string,
  fallbackValorCentavos: number,
  lancamentoId: number,
): DiscriminatedItem[] {
  if (!composicao || typeof composicao !== "object") return [];
  const comp = composicao as Record<string, unknown>;

  const extracted: DiscriminatedItem[] = [];
  const candidateKeys = ["itens", "items", "linhas", "entries"];
  for (const key of candidateKeys) {
    const value = comp[key];
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry as Record<string, unknown>;
      const alunoId = toPositiveInt(
        rec.aluno_pessoa_id ?? rec.pessoa_id ?? rec.dependente_pessoa_id,
      );
      if (alunoId !== alunoPessoaId) continue;
      pushItem(
        extracted,
        rec.descricao ?? rec.titulo ?? rec.item_nome ?? fallbackDesc,
        rec.valor_centavos ?? rec.valor ?? fallbackValorCentavos,
        lancamentoId,
      );
    }
  }

  const alunoSingle = toPositiveInt(comp.aluno_pessoa_id ?? comp.pessoa_id);
  if (alunoSingle === alunoPessoaId && extracted.length === 0) {
    pushItem(
      extracted,
      comp.descricao ?? comp.titulo ?? fallbackDesc,
      comp.valor_centavos ?? comp.valor ?? fallbackValorCentavos,
      lancamentoId,
    );
  }

  return extracted;
}

async function resolveMatriculaIdForRecibo(params: {
  supabase: Awaited<ReturnType<typeof requireUser>> extends { supabase: infer T } ? T : never;
  titularPessoaId: number;
  alunoPessoaId: number | null;
}): Promise<number | null> {
  const { supabase, titularPessoaId, alunoPessoaId } = params;

  if (alunoPessoaId) {
    const { data: byAlunoComResponsavel } = await supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", alunoPessoaId)
      .eq("responsavel_financeiro_id", titularPessoaId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = toPositiveInt((byAlunoComResponsavel as { id?: number } | null)?.id);
    if (id) return id;

    const { data: byAluno } = await supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", alunoPessoaId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const idAluno = toPositiveInt((byAluno as { id?: number } | null)?.id);
    if (idAluno) return idAluno;
  }

  const { data: byResponsavel } = await supabase
    .from("matriculas")
    .select("id")
    .eq("responsavel_financeiro_id", titularPessoaId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  const idResponsavel = toPositiveInt((byResponsavel as { id?: number } | null)?.id);
  if (idResponsavel) return idResponsavel;

  const { data: byTitular } = await supabase
    .from("matriculas")
    .select("id")
    .eq("pessoa_id", titularPessoaId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return toPositiveInt((byTitular as { id?: number } | null)?.id);
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

  const faturaId = toPositiveInt(body.fatura_id);
  if (!faturaId) {
    return NextResponse.json({ error: "fatura_id_obrigatorio" }, { status: 400 });
  }
  const alunoPessoaId = toPositiveInt(body.aluno_pessoa_id);

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

  const { data: linhasRaw, error: linhasErr } = await supabase
    .from("vw_credito_conexao_fatura_itens")
    .select(
      [
        "fatura_id",
        "conta_conexao_id",
        "competencia_ano_mes",
        "data_fechamento",
        "data_vencimento",
        "valor_total_centavos",
        "status_fatura",
        "cobranca_fatura_id",
        "pessoa_titular_id",
        "titular_nome",
        "titular_cpf",
        "titular_telefone",
        "lancamento_id",
        "origem_sistema",
        "origem_id",
        "descricao",
        "valor_centavos",
        "data_lancamento",
        "status_lancamento",
        "composicao_json",
      ].join(","),
    )
    .eq("fatura_id", faturaId);

  if (linhasErr || !linhasRaw || linhasRaw.length === 0) {
    return NextResponse.json(
      { error: "fatura_nao_encontrada_ou_sem_itens", details: linhasErr?.message ?? null },
      { status: 404 },
    );
  }

  const linhas = linhasRaw as unknown as FaturaItemViewRow[];
  const head = linhas[0];
  const titularPessoaId = toPositiveInt(head.pessoa_titular_id);
  if (!titularPessoaId) {
    return NextResponse.json({ error: "titular_nao_resolvido" }, { status: 400 });
  }

  const matriculaId = await resolveMatriculaIdForRecibo({
    supabase,
    titularPessoaId,
    alunoPessoaId,
  });
  if (!matriculaId) {
    return NextResponse.json(
      { error: "matricula_nao_resolvida", details: "Nao foi possivel vincular a fatura a uma matricula para emitir o documento." },
      { status: 400 },
    );
  }

  const allItems: DiscriminatedItem[] = [];
  const filteredItems: DiscriminatedItem[] = [];

  for (const row of linhas) {
    const valorLinha = toCentavos(row.valor_centavos);
    const descLinha = safeText(row.descricao).trim() || safeText(row.origem_sistema) || "Item";
    pushItem(allItems, descLinha, valorLinha, row.lancamento_id);

    if (alunoPessoaId) {
      const extracted = extractAlunoItemsFromComposicao(
        row.composicao_json,
        alunoPessoaId,
        descLinha,
        valorLinha,
        row.lancamento_id,
      );
      filteredItems.push(...extracted);
    }
  }

  const itens = alunoPessoaId && filteredItems.length > 0 ? filteredItems : allItems;
  const totalItens = itens.reduce((acc, it) => acc + toCentavos(it.valorCentavos), 0);
  const totalFallback = toCentavos(head.valor_total_centavos);
  const totalFinal = totalItens > 0 ? totalItens : totalFallback;

  const linhasTexto = itens
    .map((it) => `- ${it.titulo}: ${brlFromCentavos(it.valorCentavos)}`)
    .join("\n");

  let alunoNome = "—";
  if (alunoPessoaId) {
    const { data: aluno } = await supabase
      .from("pessoas")
      .select("id,nome")
      .eq("id", alunoPessoaId)
      .maybeSingle();
    alunoNome = safeText(aluno?.nome).trim() || `Dependente #${alunoPessoaId}`;
  }

  const escolaNome = safeText(process.env.ESCOLA_NOME || process.env.NEXT_PUBLIC_ESCOLA_NOME).trim() || "Conexao Danca";
  const competencia = safeText(head.competencia_ano_mes).trim() || "—";
  const cidadeData = `Salinopolis/PA, ${new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}.`;

  const vars: Record<string, string> = {
    ESCOLA_NOME: escolaNome,
    PAGADOR_NOME: safeText(head.titular_nome).trim() || "—",
    PAGADOR_CPF: safeText(head.titular_cpf).trim() || "—",
    ALUNO_NOME: alunoNome,
    COMPETENCIA: competencia,
    REFERENCIA: `Conta interna (competencia ${competencia})`,
    VALOR: brlFromCentavos(totalFinal),
    FORMA_PAGAMENTO: "—",
    DATA_PAGAMENTO: formatDateBR(head.data_fechamento),
    CIDADE_DATA: cidadeData,
  };

  const template = safeText(modelo.texto_modelo_md).trim();
  const baseTemplate = template || "RECIBO\n\nRecebemos de {{PAGADOR_NOME}} o valor de {{VALOR}}.";
  const baseRender = renderTemplate(baseTemplate, vars);
  const textoRenderizado =
    `${baseRender}\n\n` +
    `DETALHAMENTO DA CONTA (ITENS)\n` +
    `${linhasTexto || "- (sem itens)"}\n\n` +
    `Total dos itens: ${brlFromCentavos(totalFinal)}\n`;

  const snapshot = {
    origem: "RECIBO_CONTA_FATURA",
    fatura_id: faturaId,
    conta_conexao_id: head.conta_conexao_id,
    pessoa_titular_id: titularPessoaId,
    aluno_pessoa_id: alunoPessoaId,
    competencia_ano_mes: head.competencia_ano_mes,
    total_itens_centavos: totalFinal,
    total_fatura_centavos: totalFallback,
    itens,
    vars,
  };

  const baseInsert = {
    matricula_id: matriculaId,
    contrato_modelo_id: modelo.id,
    status_assinatura: "RASCUNHO",
    conteudo_renderizado_md: textoRenderizado,
    contexto_json: snapshot,
    variaveis_utilizadas_json: vars,
    snapshot_financeiro_json: {
      fatura_id: faturaId,
      conta_conexao_id: head.conta_conexao_id,
      cobranca_fatura_id: head.cobranca_fatura_id,
      competencia_ano_mes: head.competencia_ano_mes,
      data_fechamento: head.data_fechamento,
      data_vencimento: head.data_vencimento,
      status_fatura: head.status_fatura,
      total_itens_centavos: totalFinal,
      total_fatura_centavos: totalFallback,
    },
  };

  let insert = await supabase.from("documentos_emitidos").insert(baseInsert).select("id").maybeSingle();

  if (
    insert.error &&
    (insert.error.code === "23514" || insert.error.message.toLowerCase().includes("status_assinatura"))
  ) {
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
