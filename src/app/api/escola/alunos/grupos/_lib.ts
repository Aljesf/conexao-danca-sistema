export type GrupoApi = {
  id: number;
  nome: string;
  categoria: string;
  subcategoria: string | null;
  tipo: "TEMPORARIO" | "DURADOURO";
  descricao: string | null;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
  created_at?: string;
  updated_at?: string;
};

export type NucleoRow = {
  id: number;
  nome: string;
  categoria: string | null;
  subcategoria: string | null;
  tipo: string;
  descricao: string | null;
  created_at?: string;
  updated_at?: string;
};

export const NUCLEO_SELECT = "id,nome,categoria,subcategoria,tipo,descricao,created_at,updated_at";

export function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isGrupoTipo(value: unknown): value is "TEMPORARIO" | "DURADOURO" {
  return value === "TEMPORARIO" || value === "DURADOURO";
}

// Compatibilidade externa: a rota segue expondo "grupos", mas a origem real agora e public.nucleos.
export function mapNucleoToGrupo(row: NucleoRow): GrupoApi {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria ?? "",
    subcategoria: row.subcategoria ?? null,
    tipo: row.tipo === "TEMPORARIO" ? "TEMPORARIO" : "DURADOURO",
    descricao: row.descricao ?? null,
    ativo: true,
    data_inicio: null,
    data_fim: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
