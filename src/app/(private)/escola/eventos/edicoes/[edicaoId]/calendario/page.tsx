import { EventoEdicaoCalendarioClient } from "@/components/escola/eventos/EventoEdicaoCalendarioClient";
import type {
  EventoCalendarioGrupoOption,
  EventoCalendarioTurmaOption,
  EventoEdicaoCalendarioData,
  EventoEdicaoCalendarioItem,
  EventoEdicaoListItem,
} from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventoEdicaoCalendarioPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
};

type EventoEdicaoResumoRow = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  tema: string | null;
  ano_referencia: number;
  status: string;
  evento:
    | {
        titulo: string;
      }[]
    | {
        titulo: string;
      }
    | null;
};

function mapEventoEdicao(row: EventoEdicaoResumoRow | null): EventoEdicaoListItem | null {
  if (!row) return null;

  const evento = Array.isArray(row.evento) ? row.evento[0] ?? null : row.evento;

  return {
    id: row.id,
    evento_id: row.evento_id,
    titulo_exibicao: row.titulo_exibicao,
    tema: row.tema,
    ano_referencia: row.ano_referencia,
    status: row.status,
    data_inicio: null,
    data_fim: null,
    local_principal_nome: null,
    local_principal_endereco: null,
    local_principal_cidade: null,
    regulamento_resumo: null,
    observacoes: null,
    created_at: "",
    updated_at: "",
    evento: evento
      ? {
          id: "",
          titulo: evento.titulo,
          descricao: null,
          tipo_evento: "",
          natureza_evento: "",
          abrangencia_evento: "",
          ativo: true,
          created_at: "",
          updated_at: "",
        }
      : null,
  };
}

async function carregarCalendarioEdicao(
  edicaoId: string,
): Promise<EventoEdicaoCalendarioData> {
  const supabase = await createClient();

  const [
    { data: edicaoData },
    { data: itensData },
    { data: turmasData },
    { data: gruposData },
  ] = await Promise.all([
    supabase
      .from("eventos_escola_edicoes")
      .select(
        `
          id,
          evento_id,
          titulo_exibicao,
          tema,
          ano_referencia,
          status,
          evento:eventos_escola (
            titulo
          )
        `,
      )
      .eq("id", edicaoId)
      .maybeSingle(),
    supabase
      .from("eventos_escola_edicao_calendario_itens")
      .select("*")
      .eq("edicao_id", edicaoId)
      .eq("ativo", true)
      .order("inicio", { ascending: true })
      .order("ordem", { ascending: true }),
    supabase
      .from("turmas")
      .select("turma_id, nome")
      .order("nome", { ascending: true })
      .limit(200),
    supabase
      .from("aluno_grupos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(200),
  ]);

  return {
    edicao: mapEventoEdicao((edicaoData as EventoEdicaoResumoRow | null) ?? null),
    itens: (itensData ?? []) as EventoEdicaoCalendarioItem[],
    turmas: (turmasData ?? []) as EventoCalendarioTurmaOption[],
    grupos: (gruposData ?? []) as EventoCalendarioGrupoOption[],
  };
}

export default async function EventoEdicaoCalendarioPage({
  params,
}: EventoEdicaoCalendarioPageProps) {
  const { edicaoId } = await params;
  const data = await carregarCalendarioEdicao(edicaoId);

  return <EventoEdicaoCalendarioClient data={data} />;
}
