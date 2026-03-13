import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  inferirPrioridadePorTipo,
  isSuporteTicketPrioridade,
  isSuporteTicketStatus,
  isSuporteTicketTipo,
} from "@/lib/suporte/constants";
import { sanitizeSupportPayload } from "@/lib/suporte/sanitizeSupportPayload";

function normalizeString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
}

function parseLimit(value: string | null, fallback = 100) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(200, Math.trunc(parsed)));
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseServiceClient();
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 100);
  const tipo = searchParams.get("tipo");
  const status = searchParams.get("status");
  const prioridade = searchParams.get("prioridade");
  const contextoSlug = normalizeString(searchParams.get("contexto_slug"), 120);
  const includeTechnical = searchParams.get("include_tecnicos") === "1";
  const selectFields = includeTechnical
    ? "id,codigo,tipo,status,prioridade,titulo,descricao,contexto_slug,contexto_nome,rota_path,pagina_titulo,screenshot_url,reported_by,responsavel_uuid,created_at,updated_at,resolved_at,dados_tecnicos_json"
    : "id,codigo,tipo,status,prioridade,titulo,descricao,contexto_slug,contexto_nome,rota_path,pagina_titulo,screenshot_url,reported_by,responsavel_uuid,created_at,updated_at,resolved_at";

  let query = supabase
    .from("suporte_tickets")
    .select(selectFields)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isSuporteTicketTipo(tipo)) query = query.eq("tipo", tipo);
  if (isSuporteTicketStatus(status)) query = query.eq("status", status);
  if (isSuporteTicketPrioridade(prioridade)) query = query.eq("prioridade", prioridade);
  if (contextoSlug) query = query.eq("contexto_slug", contextoSlug);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const tipo = body.tipo;
  if (!isSuporteTicketTipo(tipo)) {
    return NextResponse.json({ ok: false, error: "tipo_invalido" }, { status: 400 });
  }

  if ("prioridade" in body && body.prioridade !== undefined && !isSuporteTicketPrioridade(body.prioridade)) {
    return NextResponse.json({ ok: false, error: "prioridade_invalida" }, { status: 400 });
  }

  const descricao = normalizeString(body.descricao, 4000);
  if (!descricao) {
    return NextResponse.json({ ok: false, error: "descricao_obrigatoria" }, { status: 400 });
  }

  const dadosContexto = sanitizeSupportPayload(body.dados_contexto_json ?? {}, {
    maxDepth: 4,
    maxStringLength: 700,
    maxSerializedLength: 8000,
  });
  const dadosTecnicos = sanitizeSupportPayload(body.dados_tecnicos_json ?? {}, {
    maxDepth: 5,
    maxStringLength: 1500,
    maxSerializedLength: 12000,
  });

  const payload = {
    tipo,
    prioridade: isSuporteTicketPrioridade(body.prioridade)
      ? body.prioridade
      : inferirPrioridadePorTipo(tipo),
    titulo: normalizeString(body.titulo, 160),
    descricao,
    contexto_slug: normalizeString(body.contexto_slug, 120),
    contexto_nome: normalizeString(body.contexto_nome, 160),
    rota_path: normalizeString(body.rota_path, 500),
    url_completa: normalizeString(body.url_completa, 2048),
    pagina_titulo: normalizeString(body.pagina_titulo, 220),
    origem: "BOTAO_FLUTUANTE",
    screenshot_url: normalizeString(body.screenshot_url, 2048),
    dados_contexto_json: dadosContexto.sanitized,
    dados_tecnicos_json: dadosTecnicos.sanitized,
    erro_mensagem: normalizeString(body.erro_mensagem, 1000),
    erro_stack: normalizeString(body.erro_stack, 12000),
    erro_nome: normalizeString(body.erro_nome, 200),
    user_agent: normalizeString(body.user_agent, 1200),
    viewport_largura: normalizeInteger(body.viewport_largura),
    viewport_altura: normalizeInteger(body.viewport_altura),
    reported_by: auth.userId,
  };

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("suporte_tickets")
    .insert(payload)
    .select(
      "id,codigo,tipo,status,prioridade,titulo,descricao,contexto_slug,contexto_nome,rota_path,pagina_titulo,screenshot_url,reported_by,responsavel_uuid,created_at,updated_at,resolved_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket: data }, { status: 201 });
}
