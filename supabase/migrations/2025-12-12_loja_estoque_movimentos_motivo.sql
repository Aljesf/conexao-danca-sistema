-- Adiciona coluna motivo aos movimentos de estoque e constraint de domínio
alter table public.loja_estoque_movimentos
add column if not exists motivo text;

-- Constraint: motivo deve ser nulo ou um dos valores permitidos
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'loja_estoque_movimentos_motivo_check'
  ) then
    alter table public.loja_estoque_movimentos
      add constraint loja_estoque_movimentos_motivo_check
      check (
        motivo is null or motivo in (
          'EXTRAVIO',
          'AVARIA',
          'USO_INTERNO',
          'INVENTARIO_POSITIVO',
          'INVENTARIO_NEGATIVO',
          'CORRECAO_CADASTRO',
          'DEVOLUCAO'
        )
      );
  end if;
end
$$;
