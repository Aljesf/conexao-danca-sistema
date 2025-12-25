// src/app/api/turmas/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function abreviarDia(valor: string): string | null {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  switch (normalizado) {
    case "DOMINGO":
    case "DOM":
      return "Dom";
    case "SEGUNDA":
    case "SEGUNDAFEIRA":
    case "SEG":
      return "Seg";
    case "TERCA":
    case "TERCAFEIRA":
    case "TER":
      return "Ter";
    case "QUARTA":
    case "QUARTAFEIRA":
    case "QUA":
      return "Qua";
    case "QUINTA":
    case "QUINTAFEIRA":
    case "QUI":
      return "Qui";
    case "SEXTA":
    case "SEXTAFEIRA":
    case "SEX":
      return "Sex";
    case "SABADO":
    case "SAB":
      return "Sab";
    default:
      return null;
  }
}

function compactarNiveis(resumo: string | null | undefined): string {
  const partes = (resumo ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  if (partes.length === 0) return "";

  const abreviados = partes.map((parte) => {
    const semPrefixo = parte.replace(/^nivel\s*/i, "N");
    return semPrefixo.replace(/\s+/g, " ");
  });

  if (abreviados.length <= 2) {
    return abreviados.join("/");
  }

  const primeiros = abreviados.slice(0, 2).join("/");
  return `${primeiros}/+${abreviados.length - 2}`;
}

function montarNomeTurma(params: {
  curso?: string | null;
  nivelResumo?: string | null;
  turno?: string | null;
  dias?: string[];
  ano?: number | null;
}): string {
  const curso = params.curso?.trim() || "Turma";
  const nivel = compactarNiveis(params.nivelResumo);

  const turnoMap: Record<string, string> = {
    MANHA: "Manha",
    TARDE: "Tarde",
    NOITE: "Noite",
    INTEGRAL: "Integral",
  };
  const turno = params.turno ? turnoMap[String(params.turno).toUpperCase()] ?? String(params.turno) : "";

  const diasOrdenados = (params.dias ?? [])
    .map((dia) => abreviarDia(dia) ?? dia)
    .filter((dia) => dia)
    .map((dia) => String(dia));

  const ordemDia: Record<string, number> = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sab: 6 };
  const diasUnicos = Array.from(new Set(diasOrdenados));
  diasUnicos.sort((a, b) => (ordemDia[a] ?? 99) - (ordemDia[b] ?? 99));
  const dias = diasUnicos.length > 0 ? diasUnicos.join("/") : "";

  const partes = [curso, nivel, turno, dias].filter((parte) => parte && String(parte).trim().length > 0);
  if (params.ano) {
    partes.push(String(params.ano));
  }

  return partes.join(" - ");
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("turmas")
    .select(`
      id,
      nome,
      nivel,
      curso,
      capacidade,
      ativo,
      created_at,
      user_email,
      particular,
      passe_livre,
      online,
      professor_id,
      professor:pessoas ( id, nome, email ),
      horarios:turmas_horarios ( day_of_week, inicio, fim ),
      updated_at
    `)
    .order("id", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usuarioId = user?.id ?? null;
  if (!usuarioId) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const payload = await req.json(); // { turma: {...}, horarios: [...] }
  const niveisIdsRaw = Array.isArray(payload.niveis_ids) ? payload.niveis_ids : null;
  const niveisIds: number[] = [];

  if (niveisIdsRaw) {
    const seen = new Set<number>();
    for (const raw of niveisIdsRaw) {
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "niveis_ids_invalidos" }, { status: 400 });
      }
      if (!seen.has(id)) {
        seen.add(id);
        niveisIds.push(id);
      }
    }
  }

  const turmaPayload = { ...(payload.turma ?? {}) } as Record<string, unknown>;
  for (const key of ["serie", "created_at", "updated_at", "created_by", "updated_by"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }
  const nomeRaw = typeof turmaPayload.nome === "string" ? turmaPayload.nome.trim() : "";
  const diasRaw = turmaPayload.dias_semana;
  if (typeof diasRaw === "string") {
    return NextResponse.json(
      { error: "dias_semana_invalido", message: "dias_semana deve ser array de strings, nao string." },
      { status: 400 },
    );
  }
  const diasLista = Array.isArray(diasRaw) ? diasRaw.map((dia) => String(dia)) : [];

  const nomeGerado = montarNomeTurma({
    curso: turmaPayload.curso ?? null,
    nivelResumo: turmaPayload.nivel ?? null,
    turno: turmaPayload.turno ?? null,
    dias: diasLista,
    ano: turmaPayload.ano_referencia ?? null,
  });

  const turmaInsert = {
    ...turmaPayload,
    nome: nomeRaw || nomeGerado,
    dias_semana: diasLista.length > 0 ? diasLista : null,
  };

  const { data: turma, error } = await supabase
    .from("turmas")
    .insert([turmaInsert])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const turmaId = Number((turma as { turma_id?: number; id?: number })?.turma_id ?? turma?.id);

  if (niveisIds.length > 0) {
    const rows = niveisIds.map((nivelId, index) => ({
      turma_id: turmaId,
      nivel_id: nivelId,
      principal: index === 0,
    }));

    const { error: errNiveis } = await supabase.from("turma_niveis").insert(rows);

    if (errNiveis) {
      return NextResponse.json({ error: errNiveis.message }, { status: 500 });
    }
  }

  if (Array.isArray(payload.horarios) && payload.horarios.length) {
    const rows = payload.horarios.map((h: any) => ({
      turma_id: turmaId,
      day_of_week: h.day,
      inicio: h.inicio,
      fim: h.fim,
    }));

    const { error: errH } = await supabase.from("turmas_horarios").insert(rows);

    if (errH) {
      return NextResponse.json({ error: errH.message }, { status: 500 });
    }
  }

  const usuarioNome = await resolverNomeDoUsuario(usuarioId);
  await logAuditoria({
    usuario_id: usuarioId ?? "",
    usuario_nome: usuarioNome,
    entidade: "turma",
    entidade_id: turmaId,
    acao: "CREATE",
    descricao: `Criou turma ${turma.nome ?? ""} (#${turmaId})`,
  });

  return NextResponse.json({ data: turma, niveis_ids: niveisIds }, { status: 201 });
}
