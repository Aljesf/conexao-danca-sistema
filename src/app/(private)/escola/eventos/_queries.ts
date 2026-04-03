import type {
  EventoBaseOption,
  EventoEdicaoListItem,
} from "@/components/escola/eventos/types";
import { createClient } from "@/lib/supabase/server";

type EventoEdicaoListRow = {
  id: string;
  evento_id: string;
  titulo_exibicao: string;
  tema: string | null;
  descricao: string | null;
  ano_referencia: number;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  local_principal_nome: string | null;
  evento:
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
      }[]
    | {
        titulo: string;
        descricao: string | null;
        tipo_evento: string;
      }
    | null;
};

function mapEventoRowToListItem(row: EventoEdicaoListRow): EventoEdicaoListItem {
  const evento = Array.isArray(row.evento) ? row.evento[0] ?? null : row.evento;

  return {
    id: row.id,
    evento_id: row.evento_id,
    titulo_exibicao: row.titulo_exibicao,
    tema: row.tema,
    descricao: row.descricao,
    ano_referencia: row.ano_referencia,
    status: row.status,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    local_principal_nome: row.local_principal_nome,
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
          descricao: evento.descricao,
          tipo_evento: evento.tipo_evento,
          natureza_evento: "",
          abrangencia_evento: "",
          ativo: true,
          created_at: "",
          updated_at: "",
        }
      : null,
  };
}

export async function carregarEdicoesEventos(): Promise<EventoEdicaoListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("eventos_escola_edicoes")
    .select(
      `
        id,
        evento_id,
        titulo_exibicao,
        tema,
        descricao,
        ano_referencia,
        status,
        data_inicio,
        data_fim,
        local_principal_nome,
        evento:eventos_escola (
          titulo,
          descricao,
          tipo_evento
        )
      `,
    )
    .order("ano_referencia", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as EventoEdicaoListRow[]).map(mapEventoRowToListItem);
}

export async function carregarEventosBase(): Promise<EventoBaseOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("eventos_escola")
    .select("id, titulo, descricao, tipo_evento, ativo")
    .eq("ativo", true)
    .order("titulo", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as EventoBaseOption[];
}
