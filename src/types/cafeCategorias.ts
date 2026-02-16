export type CafeCategoria = {
  id: number;
  centro_custo_id: number | null;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
};

export type CafeSubcategoria = {
  id: number;
  categoria_id: number;
  nome: string;
  slug: string;
  ordem: number;
  ativo: boolean;
};

export type CafeCategoriaComSub = CafeCategoria & {
  subcategorias: CafeSubcategoria[];
};
