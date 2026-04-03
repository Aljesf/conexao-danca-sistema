import { NextResponse } from "next/server";
import {
  criarInscricaoEdicaoEvento,
  listarInscricoesEdicaoEvento,
} from "@/lib/eventos/service";
import { validateEdicaoInscricaoPayload } from "@/lib/eventos/validators";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseServiceRole } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    edicaoId: string;
  }>;
};

type RoleModulePermission = {
  view?: boolean;
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  read?: boolean;
  write?: boolean;
};

type RolePermissoes = {
  modules?: Record<string, RoleModulePermission>;
} & Record<string, unknown>;

type RoleRecord = {
  codigo: string;
  permissoes: RolePermissoes | null;
  ativo: boolean | null;
};

type RoleJoinRow = {
  role: RoleRecord | null;
};

const EVENTOS_MODULE_KEYS = ["eventos_escola", "eventos", "escola_eventos"] as const;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function isRoleModulePermission(value: unknown): value is RoleModulePermission {
  return typeof value === "object" && value !== null;
}

function hasEventosWritePermission(permissoes: RolePermissoes | null): boolean {
  if (!permissoes) return false;

  for (const key of EVENTOS_MODULE_KEYS) {
    const modulePermission = permissoes.modules?.[key];
    if (modulePermission?.create || modulePermission?.write || modulePermission?.update) {
      return true;
    }
  }

  for (const key of EVENTOS_MODULE_KEYS) {
    const modulePermission = permissoes[key];
    if (
      isRoleModulePermission(modulePermission) &&
      (modulePermission.create || modulePermission.write || modulePermission.update)
    ) {
      return true;
    }
  }

  return false;
}

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("nao autenticado");
  }

  const adminDb = getSupabaseServiceRole();
  const { data, error: rolesError } = await adminDb
    .from("usuario_roles")
    .select("role:roles_sistema(codigo, permissoes, ativo)")
    .eq("user_id", user.id);

  if (rolesError) {
    throw new Error("falha ao carregar permissoes");
  }

  const roles = (data ?? []) as RoleJoinRow[];
  const hasPermission = roles.some(({ role }) => {
    if (!role || role.ativo === false) return false;
    if (role.codigo === "ADMIN") return true;
    return hasEventosWritePermission(role.permissoes);
  });

  if (!hasPermission) {
    throw new Error("sem permissao");
  }

  return { db: adminDb, user };
}

function getStatusFromMessage(message: string) {
  if (message === "nao autenticado") return 401;
  if (message === "sem permissao") return 403;
  if (message.includes("nao encontrada") || message.includes("nao encontrado")) {
    return 404;
  }
  return 400;
}

function getErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const extendedError = error as Error & {
      code?: string;
      details?: string;
      hint?: string;
      httpStatus?: number;
      statusCode?: number;
    };

    return {
      message: extendedError.message || fallbackMessage,
      details: extendedError.details ?? extendedError.hint ?? extendedError.message,
      code: extendedError.code ?? null,
      status:
        typeof extendedError.httpStatus === "number"
          ? extendedError.httpStatus
          : typeof extendedError.statusCode === "number"
            ? extendedError.statusCode
            : null,
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    return {
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : fallbackMessage,
      details:
        typeof record.details === "string" && record.details
          ? record.details
          : typeof record.hint === "string" && record.hint
            ? record.hint
            : null,
      code: typeof record.code === "string" ? record.code : null,
      status: typeof record.status === "number" ? record.status : null,
    };
  }

  return {
    message: fallbackMessage,
    details: null,
    code: null,
    status: null,
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { db } = await requireAuthenticatedUser();
    const { edicaoId } = await params;
    const data = await listarInscricoesEdicaoEvento(db, edicaoId);

    return NextResponse.json({ ok: true, success: true, data }, { status: 200 });
  } catch (error) {
    console.error("EVENTOS EDICAO INSCRICOES GET ERROR:", error);
    const errorResponse = getErrorResponse(error, "falha ao listar inscricoes");

    return NextResponse.json(
      { ok: false, success: false, ...errorResponse },
      { status: errorResponse.status ?? getStatusFromMessage(errorResponse.message) },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { db, user } = await requireAuthenticatedUser();
    const { edicaoId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const payload = validateEdicaoInscricaoPayload({
      ...body,
      edicaoId,
    });
    const data = await criarInscricaoEdicaoEvento(db, payload, {
      userId: user.id,
    });
    const { data: edicaoResumo, error: edicaoResumoError } = await db
      .from("eventos_escola_edicoes")
      .select("id,titulo_exibicao,evento:eventos_escola(titulo)")
      .eq("id", edicaoId)
      .maybeSingle();

    if (edicaoResumoError) {
      throw edicaoResumoError;
    }

    const eventoBase = firstRelation(
      edicaoResumo?.evento as { titulo?: string | null } | { titulo?: string | null }[] | null,
    );
    const participanteNome =
      typeof data.participante_nome_snapshot === "string" &&
      data.participante_nome_snapshot.trim()
        ? data.participante_nome_snapshot.trim()
        : typeof data.aluno?.nome === "string" && data.aluno.nome?.trim()
          ? data.aluno.nome.trim()
          : typeof data.participante_externo?.nome_exibicao === "string" &&
              data.participante_externo.nome_exibicao?.trim()
            ? data.participante_externo.nome_exibicao.trim()
            : typeof data.participante?.nome === "string" && data.participante.nome?.trim()
              ? data.participante.nome.trim()
              : `Pessoa #${String(data.pessoa_id)}`;
    const parcelasContaInterna = Array.isArray(data.parcelas_conta_interna)
      ? data.parcelas_conta_interna.map((parcela) => ({
          parcelaNumero: parcela.parcela_numero,
          totalParcelas: parcela.total_parcelas,
          competencia: parcela.competencia,
          valorCentavos: parcela.valor_centavos,
          dataVencimento:
            typeof parcela.data_vencimento === "string"
              ? parcela.data_vencimento
              : null,
        }))
      : [];

    return NextResponse.json(
      {
        ok: true,
        success: true,
        data,
        inscricaoId: data.id,
        participante: {
          origem: data.origem_inscricao,
          nome: participanteNome,
          alunoPessoaId: data.aluno_pessoa_id,
          participanteExternoId: data.participante_externo_id,
        },
        edicao: {
          id: edicaoId,
          tituloExibicao:
            typeof edicaoResumo?.titulo_exibicao === "string"
              ? edicaoResumo.titulo_exibicao
              : null,
          eventoBaseTitulo:
            eventoBase && typeof eventoBase.titulo === "string"
              ? eventoBase.titulo
              : null,
        },
        itens: Array.isArray(data.itens)
          ? data.itens.map((item) => ({
              id: item.id,
              tipoItem: item.tipo_item ?? null,
              descricao:
                item.descricao_snapshot ?? item.descricao ?? "Item da inscricao",
              quantidade: item.quantidade,
              valorUnitarioCentavos: item.valor_unitario_centavos,
              valorTotalCentavos: item.valor_total_centavos,
              status: item.status,
            }))
          : [],
        financeiro: {
          valorTotalCentavos: data.valor_total_centavos,
          modalidadePagamentoFinanceiro:
            data.modalidade_pagamento_financeiro ?? null,
          valorPagoAtoCentavos: data.valor_pago_ato_centavos ?? 0,
          valorSaldoContaInternaCentavos:
            data.valor_saldo_conta_interna_centavos ?? 0,
          statusFinanceiro: data.status_financeiro,
          destinoFinanceiro: data.destino_financeiro,
          pagamentoNoAto: data.pagamento_no_ato,
          cobrancaId: data.cobranca_id,
          recebimentoId: data.recebimento_id,
          contaInternaId: data.conta_interna_id,
        },
        parcelamento: parcelasContaInterna,
        dataInscricao: data.data_inscricao,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("EVENTOS EDICAO INSCRICOES POST ERROR:", error);
    const errorResponse = getErrorResponse(error, "falha ao criar inscricao");

    return NextResponse.json(
      { ok: false, success: false, ...errorResponse },
      { status: errorResponse.status ?? getStatusFromMessage(errorResponse.message) },
    );
  }
}
