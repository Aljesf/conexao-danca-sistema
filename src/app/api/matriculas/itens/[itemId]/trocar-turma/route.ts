import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { inserirMatriculaEventoSupabase } from "@/lib/matriculas/eventos";

type Params = {
  params: Promise<{
    itemId?: string;
  }>;
};

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isDateISO(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request as any);
  if (auth instanceof NextResponse) return auth;

  try {
    const { itemId: rawItemId } = await params;
    const itemId = parsePositiveInt(rawItemId);
    if (!itemId) {
      return NextResponse.json({ ok: false, error: "item_id_invalido" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const novaTurmaId = parsePositiveInt(typeof body.turma_id === "string" ? body.turma_id : String(body.turma_id ?? ""));
    if (!novaTurmaId) {
      return NextResponse.json({ ok: false, error: "turma_id_invalido" }, { status: 400 });
    }

    const dataTroca = isDateISO(body.data_troca) ? body.data_troca : new Date().toISOString().slice(0, 10);
    const admin = getSupabaseAdmin();
    const db = admin as unknown as { from: (table: string) => any };

    const { data: item, error: itemError } = await db
      .from("matricula_itens")
      .select("id,matricula_id,modulo_id,turma_id_inicial,status,data_inicio,data_fim")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) {
      return NextResponse.json({ ok: false, error: "item_nao_encontrado" }, { status: 404 });
    }

    const statusItem = String(item.status ?? "").toUpperCase();
    if (statusItem !== "ATIVO") {
      return NextResponse.json({ ok: false, error: "item_nao_ativo" }, { status: 409 });
    }

    const { data: turmaNova, error: turmaNovaError } = await admin
      .from("turmas")
      .select("turma_id,nome")
      .eq("turma_id", novaTurmaId)
      .maybeSingle();

    if (turmaNovaError) throw turmaNovaError;
    if (!turmaNova) {
      return NextResponse.json({ ok: false, error: "turma_destino_nao_encontrada" }, { status: 404 });
    }

    const { data: vinculosAtivos, error: vinculosError } = await admin
      .from("turma_aluno")
      .select("turma_aluno_id,turma_id,aluno_pessoa_id,matricula_id,dt_inicio,dt_fim,status,turma:turmas(turma_id,nome)")
      .eq("matricula_item_id", itemId)
      .is("dt_fim", null)
      .order("dt_inicio", { ascending: false });

    if (vinculosError) throw vinculosError;

    const vinculoAtual = (vinculosAtivos?.[0] ?? null) as
      | {
          turma_aluno_id?: number;
          turma_id?: number;
          aluno_pessoa_id?: number;
          matricula_id?: number;
          dt_inicio?: string | null;
          status?: string | null;
          turma?: { turma_id?: number; nome?: string | null } | null;
        }
      | null;

    if (!vinculoAtual?.aluno_pessoa_id || !vinculoAtual?.matricula_id) {
      return NextResponse.json(
        { ok: false, error: "vinculo_operacional_nao_encontrado" },
        { status: 409 },
      );
    }

    if (Number(vinculoAtual.turma_id) === novaTurmaId) {
      return NextResponse.json(
        {
          ok: true,
          turma_anterior: {
            turma_id: vinculoAtual.turma_id ?? null,
            nome: vinculoAtual.turma?.nome ?? null,
          },
          turma_nova: {
            turma_id: turmaNova.turma_id,
            nome: turmaNova.nome ?? null,
          },
          matricula_item_id: itemId,
          impacto_financeiro: false,
          reused: true,
        },
        { status: 200 },
      );
    }

    const { error: fecharError } = await admin
      .from("turma_aluno")
      .update({
        dt_fim: dataTroca,
        status: "encerrado",
      })
      .eq("matricula_item_id", itemId)
      .is("dt_fim", null);

    if (fecharError) throw fecharError;

    const { data: novoVinculo, error: novoVinculoError } = await admin
      .from("turma_aluno")
      .insert({
        turma_id: novaTurmaId,
        aluno_pessoa_id: vinculoAtual.aluno_pessoa_id,
        matricula_id: vinculoAtual.matricula_id,
        matricula_item_id: itemId,
        dt_inicio: dataTroca,
        status: "ativo",
      })
      .select("turma_aluno_id,turma_id,aluno_pessoa_id,matricula_id,dt_inicio,dt_fim,status")
      .single();

    if (novoVinculoError) throw novoVinculoError;

    await inserirMatriculaEventoSupabase(db, {
      matricula_id: Number(item.matricula_id ?? 0),
      tipo_evento: "TURMA_TROCADA",
      modulo_id: Number(item.modulo_id ?? 0) || null,
      turma_origem_id: Number(vinculoAtual.turma_id ?? 0) || null,
      turma_destino_id: novaTurmaId,
      observacao: "Troca de turma operacional do item da matricula.",
      created_by: auth.userId,
      dados: {
        item_id: itemId,
        vinculo_encerrado_id: vinculoAtual.turma_aluno_id ?? null,
        novo_vinculo_id: Number((novoVinculo as { turma_aluno_id?: unknown }).turma_aluno_id ?? 0) || null,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        turma_anterior: {
          turma_id: Number(vinculoAtual.turma_id ?? 0) || null,
          nome: vinculoAtual.turma?.nome ?? null,
        },
        turma_nova: {
          turma_id: turmaNova.turma_id,
          nome: turmaNova.nome ?? null,
        },
        matricula_item_id: itemId,
        vinculo_encerrado_id: vinculoAtual.turma_aluno_id ?? null,
        novo_vinculo: novoVinculo,
        impacto_financeiro: false,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "falha_trocar_turma", details: message }, { status: 500 });
  }
}
