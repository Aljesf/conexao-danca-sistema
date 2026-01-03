import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import type { AiAnalyzeResp } from "@/lib/documentos/ai.types";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

type ApplyBody = {
  sugestao: AiAnalyzeResp;
  criar_variaveis?: boolean;
  criar_modelo?: boolean;
  modelo_id?: number | null;
  tipo_documento_id?: number | null;
  source_text?: string | null;
};

type TipoVariavel = "TEXTO" | "MONETARIO" | "DATA";

function normalizeCodigo(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  return value.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

function normalizeTipo(raw: unknown): TipoVariavel {
  const val = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (val === "MONETARIO" || val === "DATA") return val;
  return "TEXTO";
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as ApplyBody;

  const sugestao = body.sugestao;
  if (!sugestao?.template_html || !Array.isArray(sugestao.variaveis)) {
    return NextResponse.json(
      { ok: false, message: "Sugestao invalida." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const criarVariaveis = body.criar_variaveis !== false;
  const criarModelo = body.criar_modelo !== false;
  const modeloId =
    typeof body.modelo_id === "number" && Number.isFinite(body.modelo_id)
      ? Number(body.modelo_id)
      : null;
  const tipoDocumentoId =
    typeof body.tipo_documento_id === "number" && Number.isFinite(body.tipo_documento_id)
      ? Number(body.tipo_documento_id)
      : null;
  const aiSourceText =
    typeof body.source_text === "string" && body.source_text.trim() ? body.source_text.trim() : null;

  if (criarVariaveis) {
    const codigos = sugestao.variaveis
      .map((v) => normalizeCodigo(v.codigo))
      .filter((c) => c.length > 0);

    if (codigos.length > 0) {
      const { data: existentes, error: errExist } = await supabase
        .from("documentos_variaveis")
        .select("codigo")
        .in("codigo", codigos);

      if (errExist) {
        return NextResponse.json(
          { ok: false, message: errExist.message } satisfies ApiResp<never>,
          { status: 500 },
        );
      }

      const existingRows = Array.isArray(existentes)
        ? (existentes as Array<{ codigo?: string | null }>)
        : [];
      const setExist = new Set(existingRows.map((x) => String(x.codigo ?? "")));

      const seen = new Set<string>(setExist);
      const payloads: Array<Record<string, unknown>> = [];
      for (const v of sugestao.variaveis) {
        const codigo = normalizeCodigo(v.codigo);
        if (!codigo || seen.has(codigo)) continue;
        seen.add(codigo);
        const descricao =
          typeof v.descricao === "string" && v.descricao.trim() ? v.descricao.trim() : codigo;
        const tipo = normalizeTipo(v.tipo);
        const formato =
          typeof v.formato === "string" && v.formato.trim() ? v.formato.trim() : null;
        payloads.push({
          codigo,
          descricao,
          origem: "MATRICULA",
          tipo,
          formato,
          ativo: true,
          ai_gerada: true,
          mapeamento_pendente: true,
        });
      }

      if (payloads.length > 0) {
        const { error: errIns } = await supabase.from("documentos_variaveis").insert(payloads);
        if (errIns) {
          return NextResponse.json(
            { ok: false, message: errIns.message } satisfies ApiResp<never>,
            { status: 500 },
          );
        }
      }
    }
  }

  if (criarModelo) {
    const modeloPayload: Record<string, unknown> = {
      titulo: sugestao.titulo_sugerido || "Modelo gerado por IA",
      formato: "RICH_HTML",
      conteudo_html: sugestao.template_html,
      texto_modelo_md: sugestao.template_html,
      ativo: true,
      ai_source_text: aiSourceText,
      ai_sugestoes_json: sugestao,
      ai_updated_at: new Date().toISOString(),
    };

    if (tipoDocumentoId) {
      modeloPayload.tipo_documento_id = tipoDocumentoId;
    }

    if (modeloId) {
      const { error: errUp } = await supabase
        .from("documentos_modelo")
        .update(modeloPayload)
        .eq("id", modeloId);
      if (errUp) {
        return NextResponse.json(
          { ok: false, message: errUp.message } satisfies ApiResp<never>,
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, data: { modelo_id: modeloId } } satisfies ApiResp<unknown>);
    }

    const { data: created, error: errCr } = await supabase
      .from("documentos_modelo")
      .insert(modeloPayload)
      .select("id")
      .single();
    if (errCr) {
      return NextResponse.json(
        { ok: false, message: errCr.message } satisfies ApiResp<never>,
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, data: { modelo_id: created?.id } } satisfies ApiResp<unknown>,
    );
  }

  return NextResponse.json({ ok: true, data: { ok: true } } satisfies ApiResp<unknown>);
}
