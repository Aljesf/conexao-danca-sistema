import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/authorize";

type CursoRow = {
  id: number;
  nome: string;
  metodologia: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type NivelRow = {
  id: number;
  curso_id: number;
  nome: string;
  observacoes: string | null;
  faixa_etaria_sugerida: string | null;
  idade_minima: number | null;
  idade_maxima: number | null;
  pre_requisito_nivel_id: number | null;
  ordem?: number | null;
};

type ModuloRow = {
  id: number;
  nivel_id: number;
  nome: string;
  descricao: string | null;
  ordem: number | null;
  obrigatorio: boolean;
};

type HabilidadeRow = {
  id: number;
  modulo_id: number;
  nome: string;
  descricao: string | null;
  criterio_avaliacao: string | null;
  ordem: number | null;
  tipo: string | null;
};

function sortByOrdemId<T extends { ordem?: number | null; id: number }>(a: T, b: T) {
  const ao = a.ordem ?? 0;
  const bo = b.ordem ?? 0;
  if (ao !== bo) return ao - bo;
  return a.id - b.id;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(_request: NextRequest) {
  try {
    await requirePermission({ kind: "ANY_AUTHENTICATED" });

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
      return NextResponse.json(
        { ok: false, error: "ENV_NAO_CONFIGURADA", details: msg },
        { status: 500 }
      );
    }

    const { data: cursos, error: eCursos } = await admin
      .from("cursos")
      .select("id,nome,metodologia,situacao,observacoes,created_at,updated_at")
      .order("id", { ascending: true });

    if (eCursos) {
      console.error("ERRO GET CURSOS:", eCursos);
      return NextResponse.json(
        { ok: false, code: "FALHA_GET_CURSOS", message: eCursos.message },
        { status: 500 }
      );
    }

    const cursoIds = (cursos ?? []).map((c) => c.id);
    if (cursoIds.length === 0) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    const { data: niveis, error: eNiveis } = await admin
      .from("niveis")
      .select(
        "id,curso_id,nome,observacoes,faixa_etaria_sugerida,idade_minima,idade_maxima,pre_requisito_nivel_id"
      )
      .in("curso_id", cursoIds);

    if (eNiveis) {
      console.error("ERRO GET NIVEIS:", eNiveis);
      return NextResponse.json(
        { ok: false, code: "FALHA_GET_NIVEIS", message: eNiveis.message },
        { status: 500 }
      );
    }

    const nivelIds = (niveis ?? []).map((n) => n.id);
    let modulos: ModuloRow[] = [];
    if (nivelIds.length > 0) {
      const { data, error } = await admin
        .from("modulos")
        .select("id,nivel_id,nome,descricao,ordem,obrigatorio")
        .in("nivel_id", nivelIds);

      if (error) {
        console.error("ERRO GET MODULOS:", error);
        return NextResponse.json(
          { ok: false, code: "FALHA_GET_MODULOS", message: error.message },
          { status: 500 }
        );
      }
      modulos = data ?? [];
    }

    const moduloIds = modulos.map((m) => m.id);
    let habilidades: HabilidadeRow[] = [];
    if (moduloIds.length > 0) {
      const { data, error } = await admin
        .from("habilidades")
        .select("id,modulo_id,nome,descricao,criterio_avaliacao,ordem,tipo")
        .in("modulo_id", moduloIds);

      if (error) {
        console.error("ERRO GET HABILIDADES:", error);
        return NextResponse.json(
          { ok: false, code: "FALHA_GET_HABILIDADES", message: error.message },
          { status: 500 }
        );
      }
      habilidades = data ?? [];
    }

    const habilidadesPorModulo = new Map<number, HabilidadeRow[]>();
    habilidades.forEach((h) => {
      const arr = habilidadesPorModulo.get(h.modulo_id) ?? [];
      arr.push(h);
      habilidadesPorModulo.set(h.modulo_id, arr);
    });
    habilidadesPorModulo.forEach((arr) => arr.sort(sortByOrdemId));

    const modulosPorNivel = new Map<number, (ModuloRow & { habilidades: HabilidadeRow[] })[]>();
    modulos.forEach((m) => {
      const arr = modulosPorNivel.get(m.nivel_id) ?? [];
      arr.push({ ...m, habilidades: habilidadesPorModulo.get(m.id) ?? [] });
      modulosPorNivel.set(m.nivel_id, arr);
    });
    modulosPorNivel.forEach((arr) => arr.sort(sortByOrdemId));

    const niveisPorCurso = new Map<
      number,
      (NivelRow & { modulos: (ModuloRow & { habilidades: HabilidadeRow[] })[] })[]
    >();
    (niveis ?? []).forEach((n) => {
      const arr = niveisPorCurso.get(n.curso_id) ?? [];
      arr.push({ ...n, modulos: modulosPorNivel.get(n.id) ?? [] });
      niveisPorCurso.set(n.curso_id, arr);
    });
    niveisPorCurso.forEach((arr) => arr.sort(sortByOrdemId));

    const payload = (cursos ?? []).map((c) => ({
      ...c,
      niveis: niveisPorCurso.get(c.id) ?? [],
    }));

    return NextResponse.json({ ok: true, data: payload }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    const status = msg === "Nao autenticado." ? 401 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission({ kind: "TECH_ADMIN_OR_ROLE", roles: ["PROFESSOR", "ACADEMICO"] });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "body_required" }, { status: 400 });
    }

    const nome = asText(body.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, error: "nome_obrigatorio" }, { status: 400 });
    }

    let situacao = asText(body.situacao);
    if (!situacao && typeof body.ativo === "boolean") {
      situacao = body.ativo ? "Ativo" : "Inativo";
    }

    let admin;
    try {
      admin = getSupabaseAdmin();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ENV_NAO_CONFIGURADA";
      return NextResponse.json(
        { ok: false, error: "ENV_NAO_CONFIGURADA", details: msg },
        { status: 500 }
      );
    }

    const payload = {
      nome,
      metodologia: asText(body.metodologia),
      observacoes: asText(body.observacoes),
      situacao: situacao ?? "Ativo",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin.from("cursos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "falha_criar_curso", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    const status = msg === "Nao autenticado." ? 401 : 403;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}







