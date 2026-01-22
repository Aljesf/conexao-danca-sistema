import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireUser, type ApiAuthContext } from "@/lib/supabase/api-auth";

type EmissaoModelo = {
  modelo_id: number;
  titulo: string;
  tipo_documento: string | null;
  versao: string | null;
  ativo: boolean;
  ordem_vinculo: number | null;
};

type EmissaoGrupo = {
  grupo_id: number;
  grupo_nome: string;
  ordem: number | null;
  modelos: EmissaoModelo[];
};

type EmissaoConjunto = {
  conjunto_id: number;
  conjunto_nome: string;
  grupos: EmissaoGrupo[];
};

type ConjuntoRow = {
  id: number;
  codigo: string;
  nome: string;
  ativo: boolean;
};

type GrupoRow = {
  id: number;
  nome: string;
  ordem: number | null;
  ativo?: boolean | null;
};

type ConjuntoGrupoRow = {
  id: number;
  grupo_id: number;
  ordem: number | null;
  ativo?: boolean | null;
};

type LinkRow = {
  conjunto_grupo_id: number;
  modelo_id: number;
  ordem: number | null;
  ativo?: boolean | null;
};

type ModeloRow = {
  id: number;
  titulo: string;
  versao: string | null;
  ativo: boolean;
  tipo_documento_id: number | null;
};

type TipoDocumentoRow = {
  tipo_documento_id: number;
  codigo: string | null;
  nome: string | null;
};

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function resolveOperacao(tipoMatricula: string | null): { operacao: string; codigos: string[] } {
  const normalized = (tipoMatricula ?? "").trim().toUpperCase();
  if (normalized === "REGULAR") {
    return { operacao: "MATRICULA_REGULAR", codigos: ["MATRICULA_REGULAR"] };
  }
  if (normalized === "CURSO_LIVRE") {
    return { operacao: "CURSO_LIVRE", codigos: ["CURSO_LIVRE", "MATRICULA_CURSO_LIVRE"] };
  }
  if (normalized === "PROJETO_ARTISTICO") {
    return { operacao: "PROJETO_ARTISTICO", codigos: ["PROJETO_ARTISTICO", "BOLSA_MOVIMENTO"] };
  }
  return { operacao: normalized || "DESCONHECIDA", codigos: normalized ? [normalized] : [] };
}

async function fetchConjuntos(supabase: ApiAuthContext["supabase"], codigos: string[]) {
  let query = supabase.from("documentos_conjuntos").select("id,codigo,nome,ativo").eq("ativo", true);
  if (codigos.length > 0) {
    query = query.in("codigo", codigos);
  }

  const { data, error } = await query.order("nome", { ascending: true });
  if (error) {
    return { data: null, error };
  }
  return { data: (data ?? []) as ConjuntoRow[], error: null };
}

async function fetchGruposDoConjunto(
  supabase: ApiAuthContext["supabase"],
  conjuntoId: number,
) {
  const pivotCheck = await supabase.from("documentos_conjuntos_grupos").select("id").limit(1);
  const hasPivot = !(pivotCheck.error && isSchemaMissing(pivotCheck.error));

  if (hasPivot) {
    const { data: pivots, error: pivotErr } = await supabase
      .from("documentos_conjuntos_grupos")
      .select("id,grupo_id,ordem,ativo")
      .eq("conjunto_id", conjuntoId)
      .eq("ativo", true)
      .order("ordem", { ascending: true })
      .order("id", { ascending: true });

    if (pivotErr) {
      return { data: null, error: pivotErr };
    }

    const pivotRows = (pivots ?? []) as ConjuntoGrupoRow[];
    if (pivotRows.length > 0) {
      const grupoIds = pivotRows.map((row) => row.grupo_id).filter((id) => Number.isFinite(id));
      const { data: grupos, error: grupoErr } = await supabase
        .from("documentos_grupos")
        .select("id,nome,ordem,ativo")
        .in("id", grupoIds);

      if (grupoErr) {
        return { data: null, error: grupoErr };
      }

      const gruposMap = new Map<number, GrupoRow>();
      (grupos ?? []).forEach((g) => {
        if (g.id) gruposMap.set(Number(g.id), g as GrupoRow);
      });

      const gruposOut = pivotRows
        .map((row) => {
          const grupo = gruposMap.get(Number(row.grupo_id));
          if (!grupo || grupo.ativo === false) return null;
          return {
            grupo_id: Number(row.id),
            grupo_nome: String(grupo.nome ?? `Grupo #${row.grupo_id}`),
            ordem: Number.isFinite(Number(row.ordem)) ? Number(row.ordem) : grupo.ordem ?? null,
          };
        })
        .filter(Boolean);

      return { data: gruposOut as Array<{ grupo_id: number; grupo_nome: string; ordem: number | null }>, error: null };
    }
  }

  const { data: grupos, error: grupoErr } = await supabase
    .from("documentos_grupos")
    .select("id,nome,ordem,ativo")
    .eq("conjunto_id", conjuntoId)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (grupoErr) {
    return { data: null, error: grupoErr };
  }

  const gruposOut = (grupos ?? []).map((g) => ({
    grupo_id: Number(g.id),
    grupo_nome: String(g.nome ?? `Grupo #${g.id}`),
    ordem: Number.isFinite(Number(g.ordem)) ? Number(g.ordem) : null,
  }));

  return { data: gruposOut, error: null };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);

  const matriculaIdRaw = searchParams.get("matriculaId");
  const matriculaId = matriculaIdRaw ? Number(matriculaIdRaw) : null;

  if (!matriculaId || !Number.isFinite(matriculaId)) {
    return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
  }

  const { data: matricula, error: matErr } = await supabase
    .from("matriculas")
    .select("id,tipo_matricula")
    .eq("id", matriculaId)
    .maybeSingle();

  if (matErr || !matricula) {
    return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
  }

  const { operacao, codigos } = resolveOperacao(matricula.tipo_matricula ?? null);
  const { data: conjuntos, error: conjErr } = await fetchConjuntos(supabase, codigos);

  if (conjErr || !conjuntos) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_conjuntos", detail: conjErr?.message },
      { status: 500 },
    );
  }

  if (conjuntos.length === 0) {
    return NextResponse.json({ ok: true, data: { operacao, conjuntos: [] } });
  }

  const conjuntosOut: EmissaoConjunto[] = [];

  for (const conjunto of conjuntos) {
    const { data: grupos, error: gruposErr } = await fetchGruposDoConjunto(supabase, conjunto.id);
    if (gruposErr || !grupos) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_grupos", detail: gruposErr?.message },
        { status: 500 },
      );
    }

    const grupoIds = grupos.map((g) => g.grupo_id).filter((id) => Number.isFinite(id));
    const modelosPorGrupo = new Map<number, EmissaoModelo[]>();

    if (grupoIds.length > 0) {
      const { data: links, error: linkErr } = await supabase
        .from("documentos_conjuntos_grupos_modelos")
        .select("conjunto_grupo_id,modelo_id,ordem,ativo")
        .in("conjunto_grupo_id", grupoIds)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (linkErr && !isSchemaMissing(linkErr)) {
        return NextResponse.json(
          { ok: false, error: "falha_listar_modelos", detail: linkErr.message },
          { status: 500 },
        );
      }

      const linkRows = ((links ?? []) as LinkRow[]).filter((l) => l.ativo !== false);
      const modeloIds = Array.from(new Set(linkRows.map((l) => l.modelo_id))).filter((id) => Number.isFinite(id));

      const { data: modelos, error: modelosErr } = await supabase
        .from("documentos_modelo")
        .select("id,titulo,versao,ativo,tipo_documento_id")
        .in("id", modeloIds)
        .eq("ativo", true);

      if (modelosErr && !isSchemaMissing(modelosErr)) {
        return NextResponse.json(
          { ok: false, error: "falha_listar_modelos", detail: modelosErr.message },
          { status: 500 },
        );
      }

      const modelosList = (modelos ?? []) as ModeloRow[];
      const modeloById = new Map<number, ModeloRow>();
      modelosList.forEach((m) => modeloById.set(Number(m.id), m));

      const tipoIds = Array.from(
        new Set(
          modelosList
            .map((m) => Number(m.tipo_documento_id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      const tipoMap = new Map<number, TipoDocumentoRow>();
      if (tipoIds.length > 0) {
        const { data: tipos, error: tiposErr } = await supabase
          .from("documentos_tipos")
          .select("tipo_documento_id,codigo,nome")
          .in("tipo_documento_id", tipoIds);
        if (!tiposErr) {
          (tipos ?? []).forEach((t) => {
            tipoMap.set(Number(t.tipo_documento_id), t as TipoDocumentoRow);
          });
        }
      }

      for (const link of linkRows) {
        const modelo = modeloById.get(Number(link.modelo_id));
        if (!modelo || !modelo.ativo) continue;
        const tipo = modelo.tipo_documento_id ? tipoMap.get(Number(modelo.tipo_documento_id)) : null;
        const item: EmissaoModelo = {
          modelo_id: Number(modelo.id),
          titulo: String(modelo.titulo ?? `Modelo #${modelo.id}`),
          tipo_documento: tipo?.codigo ?? tipo?.nome ?? null,
          versao: modelo.versao ?? null,
          ativo: true,
          ordem_vinculo: Number.isFinite(Number(link.ordem)) ? Number(link.ordem) : null,
        };

        const bucket = modelosPorGrupo.get(Number(link.conjunto_grupo_id)) ?? [];
        bucket.push(item);
        modelosPorGrupo.set(Number(link.conjunto_grupo_id), bucket);
      }
    }

    const gruposOut: EmissaoGrupo[] = grupos.map((g) => ({
      grupo_id: g.grupo_id,
      grupo_nome: g.grupo_nome,
      ordem: g.ordem ?? null,
      modelos: modelosPorGrupo.get(g.grupo_id) ?? [],
    }));

    conjuntosOut.push({
      conjunto_id: Number(conjunto.id),
      conjunto_nome: String(conjunto.nome ?? `Conjunto #${conjunto.id}`),
      grupos: gruposOut,
    });
  }

  return NextResponse.json({ ok: true, data: { operacao, conjuntos: conjuntosOut } });
}


