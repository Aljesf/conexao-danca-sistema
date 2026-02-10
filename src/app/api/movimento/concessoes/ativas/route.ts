import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ConcessaoAtivaItem = {
  concessao_id: string;
  beneficiario_id: string;
  pessoa_id: number;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  dia_vencimento_ciclo: number | null;
  modelo_liquidacao: string | null;
  percentual_movimento: number | null;
  percentual_familia: number | null;
};

function asPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  try {
    const url = new URL(req.url);
    const pessoaId = asPositiveInt(url.searchParams.get("pessoa_id"));
    if (!pessoaId) {
      return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: beneficiarios, error: benefErr } = await supabase
      .from("movimento_beneficiarios")
      .select("id,pessoa_id")
      .eq("pessoa_id", pessoaId);

    if (benefErr) {
      return NextResponse.json(
        { ok: false, error: "erro_buscar_beneficiarios", details: benefErr.message },
        { status: 500 },
      );
    }

    const beneficiarioIds = (beneficiarios ?? [])
      .map((row) => String((row as { id?: unknown }).id ?? ""))
      .filter((id) => id.length > 0);

    if (beneficiarioIds.length === 0) {
      return NextResponse.json({ ok: true, data: [] as ConcessaoAtivaItem[] });
    }

    const { data: concessoes, error: concErr } = await supabase
      .from("movimento_concessoes")
      .select(
        "id,beneficiario_id,status,data_inicio,data_fim,dia_vencimento_ciclo,modelo_liquidacao,percentual_movimento,percentual_familia",
      )
      .in("beneficiario_id", beneficiarioIds)
      .eq("status", "ATIVA")
      .order("criado_em", { ascending: false });

    if (concErr) {
      return NextResponse.json(
        { ok: false, error: "erro_buscar_concessoes", details: concErr.message },
        { status: 500 },
      );
    }

    const data = (concessoes ?? [])
      .filter((row) => {
        const dataInicio = (row as { data_inicio?: string | null }).data_inicio;
        const dataFim = (row as { data_fim?: string | null }).data_fim;
        if (dataInicio && String(dataInicio).slice(0, 10) > hoje) return false;
        if (dataFim && String(dataFim).slice(0, 10) < hoje) return false;
        return true;
      })
      .map((row) => ({
        concessao_id: String((row as { id?: unknown }).id ?? ""),
        beneficiario_id: String((row as { beneficiario_id?: unknown }).beneficiario_id ?? ""),
        pessoa_id: pessoaId,
        status: String((row as { status?: unknown }).status ?? "ATIVA"),
        data_inicio: (row as { data_inicio?: string | null }).data_inicio ?? null,
        data_fim: (row as { data_fim?: string | null }).data_fim ?? null,
        dia_vencimento_ciclo:
          typeof (row as { dia_vencimento_ciclo?: unknown }).dia_vencimento_ciclo === "number"
            ? ((row as { dia_vencimento_ciclo?: number }).dia_vencimento_ciclo ?? null)
            : null,
        modelo_liquidacao:
          typeof (row as { modelo_liquidacao?: unknown }).modelo_liquidacao === "string"
            ? String((row as { modelo_liquidacao?: string }).modelo_liquidacao)
            : null,
        percentual_movimento:
          typeof (row as { percentual_movimento?: unknown }).percentual_movimento === "number"
            ? ((row as { percentual_movimento?: number }).percentual_movimento ?? null)
            : null,
        percentual_familia:
          typeof (row as { percentual_familia?: unknown }).percentual_familia === "number"
            ? ((row as { percentual_familia?: number }).percentual_familia ?? null)
            : null,
      }))
      .filter((row) => row.concessao_id && row.beneficiario_id);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "erro_interno", details: msg }, { status: 500 });
  }
}

