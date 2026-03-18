import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServerAuth } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ExpurgoBody = {
  cobranca_id?: unknown;
  motivo?: unknown;
};

type CobrancaExpurgoRow = {
  id: number | null;
  status: string | null;
  expurgada: boolean | null;
};

function parseBody(body: ExpurgoBody): { cobrancaId: number | null; motivo: string | null } {
  const cobrancaId =
    typeof body.cobranca_id === "number" && Number.isFinite(body.cobranca_id)
      ? Math.trunc(body.cobranca_id)
      : null;
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  return {
    cobrancaId: cobrancaId && cobrancaId > 0 ? cobrancaId : null,
    motivo: motivo.length > 0 ? motivo : null,
  };
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const authClient = await getSupabaseServerAuth();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ExpurgoBody | null;
  const { cobrancaId, motivo } = parseBody(body ?? {});

  if (!cobrancaId) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  if (!motivo) {
    return NextResponse.json({ ok: false, error: "motivo_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cobrancas")
    .select("id,status,expurgada")
    .eq("id", cobrancaId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "erro_buscar_cobranca", details: error.message }, { status: 500 });
  }

  const cobranca = (data ?? null) as CobrancaExpurgoRow | null;
  if (!cobranca?.id) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  if ((cobranca.status ?? "").toUpperCase() !== "CANCELADA") {
    return NextResponse.json({ ok: false, error: "cobranca_nao_cancelada" }, { status: 400 });
  }

  if (cobranca.expurgada === true) {
    return NextResponse.json({ ok: false, error: "cobranca_ja_expurgada" }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("cobrancas")
    .update({
      expurgada: true,
      expurgada_em: new Date().toISOString(),
      expurgada_por: user.id,
      expurgo_motivo: motivo,
    } as never)
    .eq("id", cobrancaId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "erro_expurgar_cobranca", details: updateError.message },
      { status: 500 },
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: snapshotsHoje, error: snapshotError } = await supabase
    .from("financeiro_snapshots")
    .select("id")
    .eq("data_base", hoje)
    .is("centro_custo_id", null);

  if (!snapshotError) {
    const snapshotIds = (snapshotsHoje ?? [])
      .map((row) => (typeof row.id === "number" && row.id > 0 ? row.id : null))
      .filter((id): id is number => typeof id === "number");

    if (snapshotIds.length > 0) {
      await supabase.from("financeiro_analises_gpt").delete().in("snapshot_id", snapshotIds);
      await supabase.from("financeiro_snapshots").delete().in("id", snapshotIds);
    }
  }

  return NextResponse.json({
    ok: true,
    cobranca_id: cobrancaId,
    expurgada: true,
    expurgada_por: user.id,
    expurgo_motivo: motivo,
  });
}
